# Nails by Lucero — Panel administrativo (Frontend)

Panel administrativo + sitio público del salón "Nails by Lucero", construido
con React 19 + Vite.

## Configuración

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Copia `.env.example` a `.env` y ajusta la URL del backend si hace falta:
   ```bash
   cp .env.example .env
   ```
3. Levanta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

El backend (Django + DRF) debe estar corriendo y accesible en la URL
configurada en `VITE_API_URL` (por defecto `http://localhost:8000/api/v1`).

## Integración con el backend

Toda la comunicación con la API vive en `src/services/api.js`. Ahí se
maneja: autenticación JWT (login, refresh automático), el "sobre" de
respuesta inconsistente del backend, y los recursos CRUD de cada módulo.

Ver **`INTEGRACION_BACKEND.md`** para el detalle de los hallazgos
(vulnerabilidades, inconsistencias y endpoints faltantes) encontrados
durante esta integración y que deben coordinarse con el equipo de backend.

## Estructura

- `src/services/api.js` — cliente HTTP central y recursos de la API.
- `src/context/` — `AuthContext` (sesión) y `ToastContext` (notificaciones).
- `src/hooks/useResourceList.js` — hook genérico para listar recursos CRUD.
- `src/pages/` — una página por módulo del panel.
- `src/components/PendingModule.jsx` — placeholder para módulos que el
  backend todavía no expone (Usuarios, Ventas, Pagos, Caja, Comisiones,
  Productos).

## Estado de los módulos

| Módulo | Estado |
|---|---|
| Login / sesión | ✅ Integrado |
| Clientes | ✅ Integrado (CRUD completo) |
| Servicios | ✅ Integrado (CRUD completo) |
| Personal (empleados) | ✅ Integrado (CRUD completo) |
| Horarios | ✅ Integrado (CRUD completo) |
| Ausencias | ✅ Integrado (CRUD completo) |
| Citas | ✅ Integrado (CRUD + transiciones de estado) |
| Sitio público (catálogo + reserva) | ✅ Integrado |
| Usuarios, Ventas, Pagos, Caja, Comisiones, Productos | ⏳ Pendiente en el backend |
