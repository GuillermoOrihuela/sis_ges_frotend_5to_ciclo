# Informe de integración frontend ↔ backend

**Para:** equipo de backend
**De:** equipo de frontend (panel administrativo "Nails by Lucero")
**Basado en:** `API_DOCUMENTACION.md` (v. generada a partir de `backend.rar`) y las pruebas de integración realizadas al conectar el panel a la API.

Este documento resume los problemas, inconsistencias y vulnerabilidades
encontrados al integrar el frontend con la API. Está ordenado por
severidad/urgencia. Donde fue posible, el frontend implementó una
mitigación temporal — se indica en cada punto — pero varias cosas sólo se
pueden corregir del lado del servidor.

---

## 1. 🔴 Autorización: no hay control de acceso por rol

El modelo `Usuario` tiene un campo `rol` (`ADMINISTRADOR`, `GERENTE`,
`RECEPCIONISTA`, `ESPECIALISTA`, `VENDEDOR`), pero **ninguna vista aplica
permisos diferenciados por rol** — todo usa `IsAuthenticated` genérico.

En la práctica, esto significa que **cualquier usuario autenticado**
(incluyendo un `VENDEDOR` o `ESPECIALISTA`) puede:
- Eliminar clientes, empleados, servicios, horarios, ausencias y citas de
  cualquier otro empleado.
- Crear o editar empleados y horarios de terceros.
- Ejecutar las transiciones de estado de cualquier cita (confirmar,
  cancelar, iniciar, finalizar), no sólo las propias.

**Riesgo:** escalación de privilegios horizontal/vertical. Un usuario con
un rol de bajo privilegio (p. ej. recepción) tiene, en la práctica, los
mismos permisos que un administrador sobre todos los recursos del sistema.

**Recomendación:** implementar clases de permisos por rol (`IsAdminUser`
custom basado en `rol`, o permisos por objeto) en los `ModelViewSet`,
al menos para las operaciones destructivas (`DELETE`) y para la gestión
de empleados/usuarios.

**Mitigación en frontend:** ninguna es posible de forma confiable — un
control de acceso que sólo vive en el frontend no impide llamadas
directas a la API. El panel administrativo no oculta ni distingue
acciones por rol porque **no hay forma de conocer el rol del usuario
logueado** (ver punto 3).

---

## 2. 🔴 CORS abierto a cualquier origen

`CORS_ALLOW_ALL_ORIGINS = True` está activo. Esto es razonable en
desarrollo, pero si esta configuración llega a producción tal cual,
**cualquier sitio web puede hacer peticiones autenticadas a la API**
desde el navegador de un usuario que tenga un token válido en memoria/
almacenamiento (dentro de las limitaciones que impone JWT vía header,
que no es tan explotable como cookies + CORS abierto, pero sigue
facilitando ataques de robo de datos si se combina con XSS en cualquier
otro sitio que el usuario tenga abierto).

**Recomendación:** antes de desplegar a producción, restringir
`CORS_ALLOWED_ORIGINS` a la(s) URL(s) real(es) del frontend (admin +
sitio público), y desactivar `CORS_ALLOW_ALL_ORIGINS`.

---

## 3. 🟠 No existe endpoint `/auth/me/` (perfil del usuario logueado)

El JWT sólo trae `username` e `is_staff` como claims. No expone el
campo `rol` del negocio, y no existe ningún endpoint para consultarlo
tras el login.

**Impacto en frontend:** el panel no puede mostrar el rol real del
usuario, no puede ocultar/mostrar secciones del menú según permisos,
y no puede saber a qué `Empleado` está vinculado el usuario logueado
(por ejemplo, para pre-seleccionar "mis citas de hoy").

**Recomendación:** agregar `GET /api/v1/auth/me/` que devuelva al menos
`{ id, username, rol, empleado_id }` del usuario autenticado.

**Mitigación en frontend:** se decodifica el JWT en el cliente para
mostrar el `username`; el rol no se muestra porque no está disponible.

---

## 4. 🟠 JWT sin rotación de refresh token ni blacklist

Se usa la configuración por defecto de `simplejwt`:
- `ACCESS_TOKEN_LIFETIME` = 5 minutos
- `REFRESH_TOKEN_LIFETIME` = 1 día
- Sin rotación de refresh tokens, sin blacklist tras logout.

Esto significa que un refresh token robado (por ejemplo, mediante XSS)
sigue siendo válido durante **24 horas** después de que el usuario cierre
sesión en el frontend, porque "cerrar sesión" sólo borra el token del
lado del cliente — el backend no tiene forma de invalidarlo.

**Recomendación:**
- Configurar `ROTATE_REFRESH_TOKENS = True` y
  `BLACKLIST_AFTER_ROTATION = True` (requiere la app
  `rest_framework_simplejwt.token_blacklist`).
- Exponer un endpoint de logout que invalide el refresh token
  (`POST /api/v1/auth/logout/` con blacklist), en vez de depender
  únicamente del borrado en el cliente.
- Evaluar acortar `REFRESH_TOKEN_LIFETIME` si el negocio lo permite.

**Mitigación en frontend:** los tokens se guardan en `sessionStorage`
por defecto (se pierden al cerrar la pestaña) y sólo se usa
`localStorage` si el usuario marca explícitamente "Recordarme" en el
login. Aun así, esto no reemplaza una invalidación real del lado del
servidor.

---

## 5. 🟠 `POST /gestion/citas/` no reutiliza `CitaService`

Documentado ya en `API_DOCUMENTACION.md`, pero se remarca aquí por su
impacto real en el panel administrativo: al crear una cita desde
`/gestion/citas/` (en vez de `/public/citas/reservar/`), el endpoint:

- **No valida** la regla de "una cita activa por día por cliente".
- **No calcula** `hora_fin` automáticamente.
- **No genera** `codigo_reserva` (campo `unique`, por lo que si se
  envía vacío o repetido, el `POST` puede fallar o dejar el registro
  inconsistente).
- No queda claro, sin acceso al código fuente del serializer, si acepta
  `detalles` anidados (servicios con precio/duración congelados) de la
  misma forma que `CitaService`.

**Mitigación en frontend:** el formulario de "Nueva cita" del panel
replica esta lógica manualmente: calcula `hora_fin` sumando la duración
de los servicios elegidos y genera un `codigo_reserva` aleatorio de 8
caracteres en el cliente antes de enviar el `POST`. Esto es frágil por
naturaleza (dos administradores creando citas al mismo tiempo podrían
generar códigos duplicados, aunque la probabilidad es baja con 8
caracteres alfanuméricos) y **no aplica la regla de negocio de citas
duplicadas**, porque esa validación vive en `CitaService` y no en el
serializer usado por este endpoint.

**Recomendación:** hacer que la vista de creación en
`/gestion/citas/` reutilice `CitaService` (o exponer un endpoint
específico, p. ej. `POST /gestion/citas/crear-manual/`, que sí lo use),
para que el panel administrativo tenga las mismas garantías de
integridad que el flujo público.

---

## 6. 🟠 Transiciones de estado de citas sin validar máquina de estados

`confirmar/cancelar/iniciar/finalizar` simplemente sobrescriben el
campo `estado`, sin comprobar que la transición sea válida desde el
estado actual. Actualmente es posible, por ejemplo, "confirmar" una
cita que ya está `CANCELADA` o `FINALIZADA`.

**Recomendación:** validar la transición en el backend (rechazar con
400 si no es válida desde el estado actual), y no depender únicamente
del frontend para esto.

**Mitigación en frontend:** el panel sólo muestra los botones de
transición válidos según el estado actual de la cita (tabla de
transiciones definida en `src/services/api.js`,
`TRANSICIONES_VALIDAS`), pero esto no impide que alguien llame al
endpoint directamente y fuerce una transición inválida.

---

## 7. 🟡 `GET /public/disponibilidad/` es un placeholder no funcional

Siempre devuelve el mismo mensaje fijo, sin filtrar por
especialista/fecha ni calcular horarios libres reales.

**Impacto:** el formulario de reserva pública **no puede** mostrar
horarios realmente disponibles; el frontend usa una lista fija de
franjas horarias (09:00–18:00 cada hora) y deja que el backend rechace
la reserva si hay conflicto (vía la regla de "una cita activa por día").
Esto no evita dos clientes distintos reservando la misma hora con el
mismo especialista, ya que la única validación real hoy es "una cita
activa por cliente por día", no por especialista/horario.

**Recomendación:** priorizar la implementación real de este endpoint
(recibiendo `especialista_id` y `fecha`, devolviendo franjas libres
según `Horario`, `Ausencia` y citas ya agendadas ese día), y agregar
también una validación de solapamiento de horario por especialista en
`CitaService` (hoy sólo se valida por cliente).

---

## 8. 🟡 Endpoint público de especialistas expone campos internos

`GET /public/especialistas/` reutiliza `EmpleadoSerializer` completo,
incluyendo el campo `usuario` (FK al `Usuario` del sistema vinculado a
ese empleado). Es información interna (IDs de usuarios del sistema) que
no debería ser pública.

**Recomendación:** crear un serializer público más reducido para este
endpoint (`id`, `nombres`, `apellidos`, `cargo`), sin el campo `usuario`.

**Mitigación en frontend:** el panel público sólo lee `id`, `nombres` y
`apellidos` de la respuesta; no se muestra el campo `usuario` en
ninguna pantalla, pero el dato sigue siendo visible en la respuesta
cruda de la API para cualquiera que la inspeccione.

---

## 9. 🟡 Falta de throttling en endpoints públicos

No hay indicios (según la documentación) de `throttling` configurado en
DRF para los endpoints públicos (`/auth/login/`,
`/public/citas/reservar/`, `/public/disponibilidad/`). Esto los deja
expuestos a fuerza bruta (login) y abuso/spam de reservas.

**Recomendación:** configurar `DEFAULT_THROTTLE_CLASSES` /
`DEFAULT_THROTTLE_RATES` de DRF, con límites más estrictos para
`AnonRateThrottle` en estos endpoints puntuales.

---

## 10. ⚪ Inconsistencia del "sobre" de respuesta `{success,message,data}`

Ya documentada en `API_DOCUMENTACION.md` (sección 1), se incluye aquí
sólo para confirmar que **fue la principal fuente de fricción** al
integrar el frontend: cada endpoint hay que tratarlo caso por caso
según si envuelve o no la respuesta.

**Mitigación en frontend:** se normalizó en un único punto
(`src/services/api.js`, función `request`), que detecta la presencia de
la clave `success` y devuelve siempre la forma "pelada" al resto de la
aplicación. El resto del frontend no necesita conocer esta
inconsistencia.

**Recomendación (no bloqueante):** para nuevos endpoints, sería ideal
unificar el comportamiento (por ejemplo, con un `Renderer` global de
DRF que envuelva *todas* las respuestas, incluyendo `retrieve` /
`create` / `update` de los `ModelViewSet` estándar), para reducir la
superficie de casos especiales a futuro.

---

## 11. ⚪ Módulos sin exponer vía API

Los siguientes módulos ya tienen modelos y lógica de servicio, pero
`urls.py` está vacío y no hay serializers/vistas activos:

- `ventas` (Venta, DetalleVenta)
- `pagos` (Pago)
- `comisiones` (Comisión)
- `inventario` (Almacén, Categoría, Existencia, Movimiento, Producto)
- `informes`
- `auditoria`
- `configuracion`
- Gestión de **usuarios** del sistema (alta/baja/edición, asignación de
  rol) — tampoco existe endpoint alguno.
- `CategoriaServicio` — el serializer existe pero no está enruteado.

**Estado en frontend:** las páginas correspondientes (`Usuarios`,
`Ventas`, `Pagos`, `Caja`, `Comisiones`, `Productos`) ya no muestran
datos de ejemplo/inventados — se reemplazaron por un aviso explícito de
"módulo pendiente en el backend" (componente `PendingModule`), para no
inducir a error a quien use el panel. Se activarán en cuanto existan
los endpoints.

En `Servicios`, como no hay endpoint para listar `CategoriaServicio`,
el formulario de creación/edición pide el **ID numérico de la
categoría** directamente (con una nota visible al usuario) en lugar de
un selector — es una solución temporal, no ideal para uso real por
personal no técnico.

**Recomendación:** priorizar, en este orden sugerido según impacto en
el panel actual: (1) `CategoriaServicio` (bloquea una buena UX en
Servicios), (2) gestión de usuarios (bloquea el módulo "Usuarios" y el
punto 1 de este informe), (3) el resto según roadmap de negocio.

---

## Resumen de severidad

| # | Hallazgo | Severidad |
|---|---|---|
| 1 | Sin control de acceso por rol (cualquiera borra/edita todo) | 🔴 Alta |
| 2 | CORS abierto a cualquier origen | 🔴 Alta (si llega a producción así) |
| 3 | Sin endpoint `/auth/me/` | 🟠 Media |
| 4 | JWT sin rotación/blacklist | 🟠 Media |
| 5 | `POST /gestion/citas/` no usa `CitaService` | 🟠 Media |
| 6 | Transiciones de cita sin validar máquina de estados | 🟠 Media |
| 7 | Disponibilidad pública es un placeholder | 🟡 Media-baja |
| 8 | Especialistas públicos exponen campo `usuario` | 🟡 Media-baja |
| 9 | Sin throttling en endpoints públicos | 🟡 Media-baja |
| 10 | Sobre de respuesta inconsistente | ⚪ Baja (ya mitigado en frontend) |
| 11 | Módulos sin exponer vía API | ⚪ Roadmap |

---

*Este documento se generó como parte de la integración del panel
administrativo con la API. Cualquier corrección del lado del backend
en los puntos 1, 5 y 6 en particular debería coordinarse con el
frontend, ya que hoy existen mitigaciones parciales del lado del
cliente que dejarían de ser necesarias (o deberían ajustarse) una vez
resueltas en el servidor.*
