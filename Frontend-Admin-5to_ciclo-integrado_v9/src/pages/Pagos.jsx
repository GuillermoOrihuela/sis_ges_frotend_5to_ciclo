import { useEffect, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { pagosApi, ventasApi, ApiError } from "../services/api";
import "../Css/Pagos.css";

const METODOS = ["EFECTIVO", "TARJETA", "YAPE", "PLIN", "TRANSFERENCIA", "OTRO"];
const EMPTY_FORM = { venta: "", monto: "", metodo_pago: "EFECTIVO", referencia: "" };

function Pagos() {
  const toast = useToast();
  const { items, pagination, params, setParams, loading, error, reload } =
    useResourceList(pagosApi, { page: 1 });

  const [ventasPendientes, setVentasPendientes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ventasApi.list().then((res) => {
      const lista = res?.results || res || [];
      setVentasPendientes(lista.filter((v) => v.estado !== "ANULADA"));
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await pagosApi.create({
        venta: Number(form.venta),
        monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        referencia: form.referencia,
      });
      toast.success("Pago registrado correctamente.");
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async (pago) => {
    if (!window.confirm(`¿Anular el pago #${pago.id}?`)) return;
    try {
      await pagosApi.anular(pago.id);
      toast.success("Pago anulado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo anular el pago.");
    }
  };

  const goToPage = (page) => setParams((prev) => ({ ...prev, page }));

  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>COBRANZA</span>
          <h2>Pagos</h2>
          <p>Registra los pagos recibidos por cada venta.</p>
        </div>
        <AdminButton onClick={openCreate}>+ Nuevo pago</AdminButton>
      </div>

      <div className="crud-card">
        <div className="crud-card-header"><h3>Pagos registrados</h3></div>

        {error && <p className="modal-field-error">{error}</p>}
        {loading && <p>Cargando pagos...</p>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pago</th>
                  <th>Venta</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6}>No hay pagos registrados todavía.</td></tr>}
                {items.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}<small>{new Date(p.fecha).toLocaleString()}</small></td>
                    <td>Venta #{p.venta}</td>
                    <td>S/ {p.monto}</td>
                    <td>{p.metodo_pago}</td>
                    <td><span className={`status-badge ${p.estado === "PAGADO" ? "success" : ""}`}>{p.estado}</span></td>
                    <td>
                      {p.estado === "PAGADO" && (
                        <button className="action-button danger" onClick={() => handleAnular(p)}>Anular</button>
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
            <span>{pagination.count} pagos en total</span>
            <AdminButton variant="secondary" disabled={!pagination.next} onClick={() => goToPage((params.page || 1) + 1)}>Siguiente →</AdminButton>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="Nuevo pago"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton onClick={handleSubmit} disabled={saving} type="submit" form="pago-form">
                {saving ? "Guardando..." : "Registrar pago"}
              </AdminButton>
            </>
          }
        >
          <form id="pago-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <label>
              Venta
              <select name="venta" value={form.venta} onChange={handleChange} required>
                <option value="">Selecciona una venta</option>
                {ventasPendientes.map((v) => (
                  <option key={v.id} value={v.id}>#{v.id} — {v.cliente_nombre || "Sin cliente"} — Total S/ {v.total}</option>
                ))}
              </select>
            </label>

            <div className="modal-form-row">
              <label>
                Monto
                <input type="number" step="0.01" name="monto" value={form.monto} onChange={handleChange} required />
              </label>
              <label>
                Método de pago
                <select name="metodo_pago" value={form.metodo_pago} onChange={handleChange}>
                  {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>

            <label>
              Referencia (opcional)
              <input name="referencia" value={form.referencia} onChange={handleChange} placeholder="N° de operación, voucher, etc." />
            </label>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Pagos;
