import "../Css/PendingModule.css";

// Componente para módulos cuyo backend todavía no expone endpoints (ver
// INTEGRACION_BACKEND.md, sección "Módulos sin exponer"). Se usa en vez de
// dejar datos de ejemplo/inventados en pantalla, para no confundir a quien
// use el panel con información que no es real.
function PendingModule({ kicker, title, description, modelos }) {
  return (
    <section className="pending-module">
      <div className="pending-module-header">
        <div>
          <span>{kicker}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="pending-module-card">
        <div className="pending-module-icon">◐</div>
        <h3>Módulo pendiente en el backend</h3>
        <p>
          El backend todavía no expone endpoints REST para este módulo
          (el modelo existe, pero <code>urls.py</code> está vacío). Esta
          sección se activará automáticamente en cuanto el equipo de backend
          publique las rutas correspondientes.
        </p>
        {modelos && (
          <p className="pending-module-models">
            Modelos pendientes: <code>{modelos}</code>
          </p>
        )}
      </div>
    </section>
  );
}

export default PendingModule;
