import { useEffect, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { ventasApi, clientesApi, empleadosApi, serviciosApi, productosApi, ApiError } from "../services/api";
import "../Css/Ventas.css";

const EMPTY_FORM = { cliente: "", empleado: "", descuento: 0, items: [] };
const EMPTY_ITEM = { tipo_item: "SERVICIO", servicio: "", producto: "", cantidad: 1, descuento: 0 };

const ESTADO_LABEL = { BORRADOR: "Borrador", CONFIRMADA: "Confirmada", ANULADA: "Anulada" };

function Ventas() {
  const toast = useToast();
  const { items, pagination, params, setParams, loading, error, reload } =
    useResourceList(ventasApi, { page: 1 });

  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [productos, setProductos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [itemDraft, setItemDraft] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientesApi.list().then((res) => setClientes(res?.results || res || [])).catch(() => {});
    empleadosApi.list().then((res) => setEmpleados(res?.results || res || [])).catch(() => {});
    serviciosApi.list().then((res) => setServicios(res?.results || res || [])).catch(() => {});
    productosApi.list().then((res) => setProductos(res?.results || res || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setItemDraft(EMPTY_ITEM);
    setModalOpen(true);
  };

  const addItem = () => {
    if (itemDraft.tipo_item === "SERVICIO" && !itemDraft.servicio) {
      toast.error("Selecciona un servicio.");
      return;
    }
    if (itemDraft.tipo_item === "PRODUCTO" && !itemDraft.producto) {
      toast.error("Selecciona un producto.");
      return;
    }
    setForm((prev) => ({ ...prev, items: [...prev.items, itemDraft] }));
    setItemDraft(EMPTY_ITEM);
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const itemLabel = (item) => {
    if (item.tipo_item === "SERVICIO") {
      const s = servicios.find((x) => String(x.id) === String(item.servicio));
      return s ? `${s.nombre} (x${item.cantidad})` : `Servicio #${item.servicio} (x${item.cantidad})`;
    }
    const p = productos.find((x) => String(x.id) === String(item.producto));
    return p ? `${p.nombre} (x${item.cantidad})` : `Producto #${item.producto} (x${item.cantidad})`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.empleado) {
      toast.error("Selecciona el empleado que atiende la venta.");
      return;
    }
    if (form.items.length === 0) {
      toast.error("Agrega al menos un ítem a la venta.");
      return;
    }
    setSaving(true);
    const payload = {
      cliente: form.cliente ? Number(form.cliente) : null,
      empleado: Number(form.empleado),
      descuento: Number(form.descuento) || 0,
      items: form.items.map((it) => ({
        tipo_item: it.tipo_item,
        servicio: it.tipo_item === "SERVICIO" ? Number(it.servicio) : undefined,
        producto: it.tipo_item === "PRODUCTO" ? Number(it.producto) : undefined,
        cantidad: Number(it.cantidad) || 1,
        descuento: Number(it.descuento) || 0,
      })),
    };
    try {
      await ventasApi.create(payload);
      toast.success("Venta registrada correctamente.");
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmar = async (venta) => {
    if (!window.confirm(`¿Confirmar la venta #${venta.id}? Esto descontará stock y generará las comisiones correspondientes.`)) return;
    try {
      await ventasApi.confirmar(venta.id);
      toast.success("Venta confirmada. Se descontó stock y se generaron comisiones.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo confirmar la venta.");
    }
  };

  const handleAnular = async (venta) => {
    if (!window.confirm(`¿Anular la venta #${venta.id}?`)) return;
    try {
      await ventasApi.anular(venta.id);
      toast.success("Venta anulada.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo anular la venta.");
    }
  };

  const goToPage = (page) => setParams((prev) => ({ ...prev, page }));

  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>PUNTO DE VENTA</span>
          <h2>Ventas</h2>
          <p>Registra y confirma las ventas de servicios y productos.</p>
        </div>
        <AdminButton onClick={openCreate}>+ Nueva venta</AdminButton>
      </div>

      <div className="crud-card">
        <div className="crud-card-header"><h3>Ventas registradas</h3></div>

        {error && <p className="modal-field-error">{error}</p>}
        {loading && <p>Cargando ventas...</p>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Cliente</th>
                  <th>Empleado</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6}>No hay ventas registradas todavía.</td></tr>}
                {items.map((v) => (
                  <tr key={v.id}>
                    <td>#{v.id}<small>{new Date(v.fecha).toLocaleString()}</small></td>
                    <td>{v.cliente_nombre || "Cliente no registrado"}</td>
                    <td>{v.empleado_nombre}</td>
                    <td>S/ {v.total}</td>
                    <td><span className={`status-badge ${v.estado === "CONFIRMADA" ? "success" : ""}`}>{ESTADO_LABEL[v.estado] || v.estado}</span></td>
                    <td>
                      {v.estado === "BORRADOR" && (
                        <button className="action-button" onClick={() => handleConfirmar(v)}>Confirmar</button>
                      )}
                      {v.estado !== "ANULADA" && (
                        <button className="action-button danger" onClick={() => handleAnular(v)}>Anular</button>
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
            <span>{pagination.count} ventas en total</span>
            <AdminButton variant="secondary" disabled={!pagination.next} onClick={() => goToPage((params.page || 1) + 1)}>Siguiente →</AdminButton>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="Nueva venta"
          width={640}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton onClick={handleSubmit} disabled={saving} type="submit" form="venta-form">
                {saving ? "Guardando..." : "Registrar venta"}
              </AdminButton>
            </>
          }
        >
          <form id="venta-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
              <label>
                Cliente (opcional)
                <select value={form.cliente} onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))}>
                  <option value="">Sin cliente registrado</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
                </select>
              </label>
              <label>
                Empleado que atiende
                <select value={form.empleado} onChange={(e) => setForm((p) => ({ ...p, empleado: e.target.value }))} required>
                  <option value="">Selecciona un empleado</option>
                  {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>)}
                </select>
              </label>
            </div>

            <div className="modal-form-row" style={{ alignItems: "flex-end" }}>
              <label>
                Tipo de ítem
                <select value={itemDraft.tipo_item} onChange={(e) => setItemDraft((p) => ({ ...p, tipo_item: e.target.value }))}>
                  <option value="SERVICIO">Servicio</option>
                  <option value="PRODUCTO">Producto</option>
                </select>
              </label>
              {itemDraft.tipo_item === "SERVICIO" ? (
                <label>
                  Servicio
                  <select value={itemDraft.servicio} onChange={(e) => setItemDraft((p) => ({ ...p, servicio: e.target.value }))}>
                    <option value="">Selecciona un servicio</option>
                    {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} — S/ {s.precio}</option>)}
                  </select>
                </label>
              ) : (
                <label>
                  Producto
                  <select value={itemDraft.producto} onChange={(e) => setItemDraft((p) => ({ ...p, producto: e.target.value }))}>
                    <option value="">Selecciona un producto</option>
                    {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — S/ {p.precio_venta}</option>)}
                  </select>
                </label>
              )}
              <label style={{ maxWidth: 90 }}>
                Cant.
                <input type="number" min="1" step="0.01" value={itemDraft.cantidad} onChange={(e) => setItemDraft((p) => ({ ...p, cantidad: e.target.value }))} />
              </label>
              <AdminButton type="button" variant="secondary" onClick={addItem}>+ Agregar</AdminButton>
            </div>

            {form.items.length > 0 && (
              <ul className="venta-items-list">
                {form.items.map((it, idx) => (
                  <li key={idx}>
                    {itemLabel(it)}
                    <button type="button" className="action-button danger" onClick={() => removeItem(idx)}>Quitar</button>
                  </li>
                ))}
              </ul>
            )}

            <label>
              Descuento general (S/)
              <input type="number" step="0.01" min="0" value={form.descuento} onChange={(e) => setForm((p) => ({ ...p, descuento: e.target.value }))} />
            </label>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Ventas;
