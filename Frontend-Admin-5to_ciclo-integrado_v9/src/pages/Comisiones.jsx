import { useState } from "react";

import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { comisionesApi } from "../services/api";
import "../Css/Comisiones.css";

const ESTADO_LABEL = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
};

function Comisiones() {
  const toast = useToast();
  const { items, pagination, params, setParams, loading, error, reload } =
    useResourceList(comisionesApi, { page: 1 });

  const [busyId, setBusyId] = useState(null);

  const runAction = async (accion, comision, mensajeOk, mensajeConfirmacion) => {
    if (!window.confirm(mensajeConfirmacion)) return;
    setBusyId(comision.id);
    try {
      await accion(comision.id);
      toast.success(mensajeOk);
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar la comisión.");
    } finally {
      setBusyId(null);
    }
  };

  const goToPage = (page) => setParams((prev) => ({ ...prev, page }));

  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>PAGOS A ESPECIALISTAS</span>
          <h2>Comisiones</h2>
          <p>
            Las comisiones se generan automáticamente al confirmar una venta.
            Aquí se aprueban y se marcan como pagadas.
          </p>
        </div>
      </div>

      <div className="crud-card">
        <div className="crud-card-header"><h3>Comisiones generadas</h3></div>

        {error && <p className="modal-field-error">{error}</p>}
        {loading && <p>Cargando comisiones...</p>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Venta</th>
                  <th>Base</th>
                  <th>% </th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7}>No hay comisiones generadas todavía.</td></tr>}
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>{c.empleado_nombre}</td>
                    <td>Venta #{c.venta}</td>
                    <td>S/ {c.monto_base}</td>
                    <td>{c.porcentaje}%</td>
                    <td><strong>S/ {c.monto_comision}</strong></td>
                    <td><span className={`status-badge ${c.estado === "PAGADA" ? "success" : ""}`}>{ESTADO_LABEL[c.estado] || c.estado}</span></td>
                    <td>
                      {c.estado === "PENDIENTE" && (
                        <button className="action-button" disabled={busyId === c.id} onClick={() => runAction(comisionesApi.aprobar, c, "Comisión aprobada.", `¿Aprobar la comisión de ${c.empleado_nombre} por S/ ${c.monto_comision}?`)}>
                          Aprobar
                        </button>
                      )}
                      {c.estado === "APROBADA" && (
                        <button className="action-button" disabled={busyId === c.id} onClick={() => runAction(comisionesApi.pagar, c, "Comisión pagada.", `¿Marcar como pagada la comisión de ${c.empleado_nombre} por S/ ${c.monto_comision}?`)}>
                          Marcar pagada
                        </button>
                      )}
                      {c.estado !== "PAGADA" && c.estado !== "ANULADA" && (
                        <button className="action-button danger" disabled={busyId === c.id} onClick={() => runAction(comisionesApi.anular, c, "Comisión anulada.", `¿Anular la comisión de ${c.empleado_nombre}? Esta acción no se puede deshacer.`)}>
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 4px" }}>
            <AdminButton variant="secondary" disabled={!pagination.previous} onClick={() => goToPage((params.page || 1) - 1)}>← Anterior</AdminButton>
            <span>{pagination.count} comisiones en total</span>
            <AdminButton variant="secondary" disabled={!pagination.next} onClick={() => goToPage((params.page || 1) + 1)}>Siguiente →</AdminButton>
          </div>
        )}
      </div>
    </section>
  );
}

export default Comisiones;
