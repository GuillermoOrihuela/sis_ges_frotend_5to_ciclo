// src/services/api.js
//
// Capa de integración con la API REST del backend (Django + DRF).
// Referencia: API_DOCUMENTACION.md. Ver también INTEGRACION_BACKEND.md
// (raíz del proyecto) para las inconsistencias/vulnerabilidades detectadas
// durante esta integración y que deben coordinarse con el equipo backend.

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://julio32.pythonanywhere.com/api/v1/";

const ACCESS_KEY = "nbl_access_token";
const REFRESH_KEY = "nbl_refresh_token";

// ---------------------------------------------------------------------------
// Almacenamiento de tokens
// ---------------------------------------------------------------------------
// NOTA DE SEGURIDAD: el backend sólo emite JWT "planos" (SimpleJWT estándar),
// sin flujo de cookies httpOnly. Guardarlos en almacenamiento del navegador
// los deja expuestos ante un XSS. Se usa sessionStorage (se borra al cerrar
// la pestaña, no se comparte entre pestañas) como mitigación parcial mientras
// el backend no ofrezca algo más seguro. Ver INTEGRACION_BACKEND.md, punto 1.
export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY),
  // remember=true (checkbox "Recordarme") -> localStorage, persiste entre
  // pestañas/reinicios del navegador. remember=false -> sessionStorage,
  // se borra al cerrar la pestaña (más seguro por defecto).
  setTokens: ({ access, refresh }, remember = false) => {
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    if (access) store.setItem(ACCESS_KEY, access);
    if (refresh) store.setItem(REFRESH_KEY, refresh);
    other.removeItem(ACCESS_KEY);
    other.removeItem(REFRESH_KEY);
  },
  clear: () => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export function decodeJwt(token) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  // Pequeño margen (10s) para evitar carreras justo antes de expirar.
  return Date.now() >= payload.exp * 1000 - 10000;
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message, { status, errors, payload } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors || {};
    this.payload = payload;
  }
}

// ---------------------------------------------------------------------------
// Cliente HTTP central
// ---------------------------------------------------------------------------
let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new ApiError("Sesión expirada.", { status: 401 });

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError("No se pudo renovar la sesión.", { status: res.status });
        const data = await res.json();
        tokenStorage.setTokens({ access: data.access });
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

async function request(path, { method = "GET", body, auth = true, isRetry = false, params } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    let access = tokenStorage.getAccess();
    if (access && isTokenExpired(access) && !isRetry) {
      try {
        access = await refreshAccessToken();
      } catch {
        tokenStorage.clear();
        window.location.hash = "login";
        throw new ApiError("Tu sesión expiró. Vuelve a iniciar sesión.", { status: 401 });
      }
    }
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  let res;
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Verifica tu conexión.", { status: 0 });
  }

  // Reintento único ante un 401 (token vencido a mitad de sesión).
  if (res.status === 401 && auth && !isRetry) {
    try {
      await refreshAccessToken();
      return request(path, { method, body, auth, isRetry: true, params });
    } catch {
      tokenStorage.clear();
      window.location.hash = "login";
      throw new ApiError("Tu sesión expiró. Vuelve a iniciar sesión.", { status: 401 });
    }
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    // Formato de error estándar del backend: {success:false, message, errors}
    const detailFromErrors = Array.isArray(payload?.errors?.detail)
      ? payload.errors.detail[0]
      : payload?.errors?.detail;

    const message =
      payload?.message || detailFromErrors || "Ocurrió un error al procesar la solicitud.";

    throw new ApiError(message, { status: res.status, errors: payload?.errors || {}, payload });
  }

  // El "sobre" {success,message,data} sólo aplica a algunos endpoints (ver
  // API_DOCUMENTACION.md, sección 1). Se normaliza aquí para que el resto
  // del frontend siempre reciba el recurso "pelado" y, si existe, la
  // paginación por separado.
  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.pagination) {
      return { results: payload.data, pagination: payload.pagination };
    }
    return payload.data;
  }

  return payload;
}

export { API_BASE_URL };

// ---------------------------------------------------------------------------
// Factory de recursos CRUD estándar (ModelViewSet)
// ---------------------------------------------------------------------------
function createCrudResource(basePath) {
  return {
    list: (params) => request(`${basePath}/`, { params }),
    get: (id) => request(`${basePath}/${id}/`),
    create: (data) => request(`${basePath}/`, { method: "POST", body: data }),
    update: (id, data) => request(`${basePath}/${id}/`, { method: "PUT", body: data }),
    patch: (id, data) => request(`${basePath}/${id}/`, { method: "PATCH", body: data }),
    remove: (id) => request(`${basePath}/${id}/`, { method: "DELETE" }),
  };
}

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------
export const authApi = {
  login: async (username, password, remember = false) => {
    const data = await request("/auth/login/", {
      method: "POST",
      body: { username, password },
      auth: false,
    });
    tokenStorage.setTokens(data, remember);
    return decodeJwt(data.access);
  },
  logout: () => {
    tokenStorage.clear();
  },
  getCurrentUser: () => {
    const access = tokenStorage.getAccess();
    if (!access || isTokenExpired(access)) return null;
    return decodeJwt(access);
  },
};

// ---------------------------------------------------------------------------
// Recursos de gestión (requieren JWT)
// ---------------------------------------------------------------------------
export const clientesApi = createCrudResource("/gestion/clientes");
export const serviciosApi = createCrudResource("/gestion/servicios");
export const empleadosApi = createCrudResource("/gestion/empleados");
export const turnosApi = createCrudResource("/gestion/turnos");
export const horariosApi = createCrudResource("/gestion/horarios");
export const ausenciasApi = createCrudResource("/gestion/ausencias");

const citasCrud = createCrudResource("/gestion/citas");
export const citasApi = {
  ...citasCrud,
  confirmar: (id) => request(`/gestion/citas/${id}/confirmar/`, { method: "POST" }),
  cancelar: (id) => request(`/gestion/citas/${id}/cancelar/`, { method: "POST" }),
  iniciar: (id) => request(`/gestion/citas/${id}/iniciar/`, { method: "POST" }),
  finalizar: (id) => request(`/gestion/citas/${id}/finalizar/`, { method: "POST" }),
  noAsistio: (id) => request(`/gestion/citas/${id}/no-asistio/`, { method: "POST" }),
  reprogramar: (id, data) => request(`/gestion/citas/${id}/reprogramar/`, { method: "POST", body: data }),
};

// El backend corregido ahora sí valida la máquina de estados en el servidor
// (CitaService.TRANSICIONES_PERMITIDAS), así que esta tabla es sólo para
// decidir qué botones mostrar en el panel; ya no es la única defensa.
export const TRANSICIONES_VALIDAS = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA", "NO_ASISTIO"],
  CONFIRMADA: ["EN_PROCESO", "CANCELADA", "NO_ASISTIO"],
  EN_PROCESO: ["FINALIZADA", "CANCELADA"],
  FINALIZADA: [],
  CANCELADA: [],
  NO_ASISTIO: [],
};

export const ESTADOS_CITA = [
  "PENDIENTE",
  "CONFIRMADA",
  "EN_PROCESO",
  "FINALIZADA",
  "CANCELADA",
  "NO_ASISTIO",
];

// ---------------------------------------------------------------------------
// Endpoints públicos (sin autenticación) — usados por PublicSite
// ---------------------------------------------------------------------------
export const publicApi = {
  servicios: (params) => request("/public/servicios/", { auth: false, params }),
  especialistas: (params) => request("/public/especialistas/", { auth: false, params }),
  disponibilidad: (params) => request("/public/disponibilidad/", { auth: false, params }),
  reservar: (data) => request("/public/citas/reservar/", { method: "POST", body: data, auth: false }),
};

// ---------------------------------------------------------------------------
// Usuarios del sistema (ADMINISTRADOR/GERENTE) + perfil propio
// ---------------------------------------------------------------------------
export const usuariosApi = createCrudResource("/gestion/usuarios");

export const meApi = {
  get: () => request("/auth/me/"),
};

export const categoriasProductoApi = createCrudResource("/gestion/categorias-producto");
export const categoriasServicioApi = createCrudResource("/gestion/categorias-servicio");
export const almacenesApi = createCrudResource("/gestion/almacenes");
export const existenciasApi = { list: (params) => request("/gestion/existencias/", { params }) };

const productosCrud = createCrudResource("/gestion/productos");
export const productosApi = {
  ...productosCrud,
  registrarMovimiento: (data) => request("/gestion/movimientos-inventario/", { method: "POST", body: data }),
  movimientos: (params) => request("/gestion/movimientos-inventario/", { params }),
};

const ventasCrud = createCrudResource("/gestion/ventas");
export const ventasApi = {
  list: ventasCrud.list,
  get: ventasCrud.get,
  create: ventasCrud.create,
  confirmar: (id, almacen) => request(`/gestion/ventas/${id}/confirmar/`, { method: "POST", body: almacen ? { almacen } : undefined }),
  anular: (id) => request(`/gestion/ventas/${id}/anular/`, { method: "POST" }),
};

const pagosCrud = createCrudResource("/gestion/pagos");
export const pagosApi = {
  list: pagosCrud.list,
  get: pagosCrud.get,
  create: pagosCrud.create,
  anular: (id) => request(`/gestion/pagos/${id}/anular/`, { method: "POST" }),
};

export const cajaApi = {
  resumen: (fecha) => request("/gestion/caja/resumen/", { params: fecha ? { fecha } : undefined }),
};

const comisionesCrud = createCrudResource("/gestion/comisiones");
export const comisionesApi = {
  list: comisionesCrud.list,
  get: comisionesCrud.get,
  aprobar: (id) => request(`/gestion/comisiones/${id}/aprobar/`, { method: "POST" }),
  pagar: (id) => request(`/gestion/comisiones/${id}/pagar/`, { method: "POST" }),
  anular: (id) => request(`/gestion/comisiones/${id}/anular/`, { method: "POST" }),
};
