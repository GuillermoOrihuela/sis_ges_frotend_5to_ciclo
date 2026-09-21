import { useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { categoriasServicioApi, categoriasProductoApi, ApiError } from "../services/api";
import "../Css/Usuarios.css";

const EMPTY_FORM = { nombre: "", descripcion: "", activo: true };

/**
 * Bloque de CRUD genérico para una categoría (de servicio o de producto):
 * ambos modelos tienen exactamente los mismos campos (nombre, descripción,
 * activo), así que se reutiliza el mismo componente para no duplicar el
 * formulario dos veces.
 */
function CategoriaBloque({ titulo, subtitulo, api, entidadLabel }) {
  const toast = useToast();
  const { items, loading, error, reload } = useResourceList(api, { page_size: 100 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (categoria) => {
    setEditingId(categoria.id);
    setForm({
      nombre: categoria.nombre || "",
      descripcion: categoria.descripcion || "",
      activo: categoria.activo,
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
    try {
      if (editingId) {
        await api.update(editingId, form);
        toast.success(`${entidadLabel} actualizada correctamente.`);
      } else {
        await api.create(form);
        toast.success(`${entidadLabel} creada correctamente.`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || `No se pudo guardar la ${entidadLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoria) => {
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    try {
      await api.remove(categoria.id);
      toast.success(`${entidadLabel} eliminada.`);
      reload();
    } catch (err) {
      // El FK a esta categoría es on_delete=PROTECT: si hay servicios/productos
      // usándola, el backend rechaza el borrado en vez de dejarlos huérfanos.
      toast.error(err.message || `No se pudo eliminar: puede que siga en uso.`);
    }
  };

  return (
    <div className="crud-card" style={{ marginBottom: 24 }}>
      <div className="crud-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3>{titulo}</h3>
          <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{subtitulo}</p>
        </div>
        <AdminButton onClick={openCreate}>+ Nueva categoría</AdminButton>
      </div>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando categorías...</p>}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={4}>No hay categorías registradas todavía.</td></tr>}
              {items.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.nombre}</strong></td>
                  <td>{c.descripcion || "—"}</td>
                  <td><span className={`status-badge ${c.activo ? "success" : ""}`}>{c.activo ? "Activa" : "Inactiva"}</span></td>
                  <td>
                    <button className="action-button" onClick={() => openEdit(c)}>Editar</button>
                    <button className="action-button danger" onClick={() => handleDelete(c)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Editar categoría" : "Nueva categoría"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton onClick={handleSubmit} disabled={saving} type="submit" form={`form-${entidadLabel}`}>
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id={`form-${entidadLabel}`} onSubmit={handleSubmit} style={{ display: "contents" }}>
            <label>
              Nombre
              <input name="nombre" value={form.nombre} onChange={handleChange} required />
              {fieldErrors.nombre && <span className="modal-field-error">{fieldErrors.nombre[0]}</span>}
            </label>
            <label>
              Descripción (opcional)
              <textarea name="descripcion" rows="2" value={form.descripcion} onChange={handleChange} />
            </label>
            <label>
              Estado
              <select
                name="activo"
                value={form.activo ? "true" : "false"}
                onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.value === "true" }))}
              >
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Categorias() {
  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>CATÁLOGO</span>
          <h2>Categorías</h2>
          <p>Administra las categorías que agrupan a los servicios y a los productos.</p>
        </div>
      </div>

      <CategoriaBloque
        titulo="Categorías de servicios"
        subtitulo="Se usan al crear o editar un servicio."
        api={categoriasServicioApi}
        entidadLabel="Categoría de servicio"
      />

      <CategoriaBloque
        titulo="Categorías de productos"
        subtitulo="Se usan al crear o editar un producto del inventario."
        api={categoriasProductoApi}
        entidadLabel="Categoría de producto"
      />
    </section>
  );
}

export default Categorias;
