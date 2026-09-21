import { useEffect, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { productosApi, categoriasProductoApi, almacenesApi, ApiError } from "../services/api";
import "../Css/Productos.css";

const EMPTY_FORM = { categoria: "", nombre: "", descripcion: "", codigo: "", precio_venta: "", activo: true };
const EMPTY_MOVIMIENTO = { producto: "", almacen: "", tipo_movimiento: "ENTRADA", cantidad: "", motivo: "" };

function Productos() {
  const toast = useToast();
  const { items, pagination, params, setParams, loading, error, reload } =
    useResourceList(productosApi, { page: 1 });

  const [categorias, setCategorias] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movForm, setMovForm] = useState(EMPTY_MOVIMIENTO);
  const [movSaving, setMovSaving] = useState(false);

  useEffect(() => {
    categoriasProductoApi.list().then((res) => setCategorias(res?.results || res || [])).catch(() => {});
    almacenesApi.list().then((res) => setAlmacenes(res?.results || res || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (producto) => {
    setEditingId(producto.id);
    setForm({
      categoria: producto.categoria,
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      codigo: producto.codigo,
      precio_venta: producto.precio_venta,
      activo: producto.activo,
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    const payload = { ...form, categoria: Number(form.categoria) };
    try {
      if (editingId) {
        await productosApi.update(editingId, payload);
        toast.success("Producto actualizado correctamente.");
      } else {
        await productosApi.create(payload);
        toast.success("Producto creado correctamente.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (producto) => {
    if (!window.confirm(`¿Eliminar ${producto.nombre}?`)) return;
    try {
      await productosApi.remove(producto.id);
      toast.success("Producto eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el producto.");
    }
  };

  const openMovimiento = (producto) => {
    setMovForm({ ...EMPTY_MOVIMIENTO, producto: producto.id, almacen: almacenes[0]?.id || "" });
    setMovModalOpen(true);
  };

  const handleMovChange = (event) => {
    const { name, value } = event.target;
    setMovForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMovSubmit = async (event) => {
    event.preventDefault();
    setMovSaving(true);
    try {
      await productosApi.registrarMovimiento({
        ...movForm,
        producto: Number(movForm.producto),
        almacen: Number(movForm.almacen),
        cantidad: Number(movForm.cantidad),
      });
      toast.success("Movimiento de inventario registrado.");
      setMovModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo registrar el movimiento.");
    } finally {
      setMovSaving(false);
    }
  };

  const goToPage = (page) => setParams((prev) => ({ ...prev, page }));

  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>INVENTARIO</span>
          <h2>Productos</h2>
          <p>Catálogo de productos y su stock disponible.</p>
        </div>
        <AdminButton onClick={openCreate}>+ Nuevo producto</AdminButton>
      </div>

      <div className="crud-card">
        <div className="crud-card-header"><h3>Productos</h3></div>

        {error && <p className="modal-field-error">{error}</p>}
        {loading && <p>Cargando productos...</p>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6}>No hay productos registrados todavía.</td></tr>}
                {items.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.nombre}</strong><small>{p.codigo}</small></td>
                    <td>{p.categoria_nombre}</td>
                    <td>S/ {p.precio_venta}</td>
                    <td>{p.stock_total}</td>
                    <td><span className={`status-badge ${p.activo ? "success" : ""}`}>{p.activo ? "Activo" : "Inactivo"}</span></td>
                    <td>
                      <button className="action-button" onClick={() => openEdit(p)}>Editar</button>
                      <button className="action-button" onClick={() => openMovimiento(p)}>Mov. stock</button>
                      <button className="action-button danger" onClick={() => handleDelete(p)}>Eliminar</button>
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
            <span>{pagination.count} productos en total</span>
            <AdminButton variant="secondary" disabled={!pagination.next} onClick={() => goToPage((params.page || 1) + 1)}>Siguiente →</AdminButton>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? "Editar producto" : "Nuevo producto"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton onClick={handleSubmit} disabled={saving} type="submit" form="producto-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="producto-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
              <label>
                Nombre
                <input name="nombre" value={form.nombre} onChange={handleChange} required />
              </label>
              <label>
                Código
                <input name="codigo" value={form.codigo} onChange={handleChange} required />
                {fieldErrors.codigo && <span className="modal-field-error">{fieldErrors.codigo[0]}</span>}
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Categoría
                <select name="categoria" value={form.categoria} onChange={handleChange} required>
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label>
                Precio de venta
                <input type="number" step="0.01" name="precio_venta" value={form.precio_venta} onChange={handleChange} required />
              </label>
            </div>

            <label>
              Descripción
              <textarea name="descripcion" rows="3" value={form.descripcion} onChange={handleChange} />
            </label>

            <label>
              Estado
              <select
                name="activo"
                value={form.activo ? "true" : "false"}
                onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.value === "true" }))}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
          </form>
        </Modal>
      )}

      {movModalOpen && (
        <Modal
          title="Registrar movimiento de inventario"
          onClose={() => setMovModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setMovModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton onClick={handleMovSubmit} disabled={movSaving} type="submit" form="mov-form">
                {movSaving ? "Guardando..." : "Registrar"}
              </AdminButton>
            </>
          }
        >
          <form id="mov-form" onSubmit={handleMovSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
              <label>
                Almacén
                <select name="almacen" value={movForm.almacen} onChange={handleMovChange} required>
                  <option value="">Selecciona un almacén</option>
                  {almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </label>
              <label>
                Tipo de movimiento
                <select name="tipo_movimiento" value={movForm.tipo_movimiento} onChange={handleMovChange}>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SALIDA">Salida</option>
                  <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
                  <option value="DEVOLUCION">Devolución</option>
                </select>
              </label>
            </div>
            <div className="modal-form-row">
              <label>
                Cantidad
                <input type="number" step="0.01" name="cantidad" value={movForm.cantidad} onChange={handleMovChange} required />
              </label>
              <label>
                Motivo
                <input name="motivo" value={movForm.motivo} onChange={handleMovChange} />
              </label>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Productos;
