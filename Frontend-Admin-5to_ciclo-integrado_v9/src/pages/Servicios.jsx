import { useEffect, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { serviciosApi, categoriasServicioApi, ApiError } from "../services/api";
import "../Css/Servicios.css";

const EMPTY_FORM = {
  categoria: "",
  nombre: "",
  descripcion: "",
  duracion_minutos: "",
  precio: "",
  activo: true,
};

function Servicios() {
  const toast = useToast();
  const { items, loading, error, reload } = useResourceList(serviciosApi, { page_size: 100 });
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    categoriasServicioApi.list({ page_size: 100 }).then((res) => {
      setCategorias(Array.isArray(res) ? res : res.results || []);
    }).catch(() => {});
  }, []);

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

  const openEdit = (servicio) => {
    setEditingId(servicio.id);
    setForm({
      categoria: servicio.categoria ?? "",
      nombre: servicio.nombre || "",
      descripcion: servicio.descripcion || "",
      duracion_minutos: servicio.duracion_minutos || "",
      precio: servicio.precio || "",
      activo: servicio.activo,
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

    const payload = {
      categoria: Number(form.categoria),
      nombre: form.nombre,
      descripcion: form.descripcion,
      duracion_minutos: Number(form.duracion_minutos),
      precio: form.precio,
      activo: form.activo,
    };

    try {
      if (editingId) {
        await serviciosApi.update(editingId, payload);
        toast.success("Servicio actualizado.");
      } else {
        await serviciosApi.create(payload);
        toast.success("Servicio creado.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (servicio) => {
    if (!window.confirm(`¿Eliminar "${servicio.nombre}"?`)) return;
    try {
      await serviciosApi.remove(servicio.id);
      toast.success("Servicio eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el servicio.");
    }
  };

  return (
    <section className="servicios-page">
      <div className="servicios-header">
        <div>
          <span>CATÁLOGO</span>
          <h2>Servicios</h2>
          <p>Gestiona los servicios ofrecidos por el salón.</p>
        </div>

        <AdminButton onClick={openCreate}>+ Nuevo servicio</AdminButton>
      </div>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando servicios...</p>}

      {!loading && !error && (
        <div className="servicios-grid">
          {items.length === 0 && <p>No hay servicios registrados todavía.</p>}

          {items.map((servicio) => (
            <article className="servicio-admin-card" key={servicio.id}>
              <div className="servicio-admin-icon">✦</div>

              <span className="servicio-sku">
                {servicio.categoria_nombre || `Categoría #${servicio.categoria}`}
              </span>

              <h3>{servicio.nombre}</h3>

              <div className="servicio-meta">
                <span>{servicio.duracion_minutos} min</span>
                <strong>S/ {servicio.precio}</strong>
              </div>

              <div className="servicio-card-footer">
                <span className={servicio.activo ? "service-active" : "service-inactive"}>
                  {servicio.activo ? "Activo" : "Inactivo"}
                </span>

                <button onClick={() => openEdit(servicio)}>Editar</button>
                <button onClick={() => handleDelete(servicio)}>Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Editar servicio" : "Nuevo servicio"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </AdminButton>
              <AdminButton disabled={saving} type="submit" form="servicio-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="servicio-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <label>
              Nombre
              <input name="nombre" value={form.nombre} onChange={handleChange} required />
              {fieldErrors.nombre && <span className="modal-field-error">{fieldErrors.nombre[0]}</span>}
            </label>

            <label>
              Descripción
              <textarea name="descripcion" rows="2" value={form.descripcion} onChange={handleChange} />
            </label>

            <div className="modal-form-row">
              <label>
                Categoría
                <select name="categoria" value={form.categoria} onChange={handleChange} required>
                  <option value="" disabled>Selecciona una categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {categorias.length === 0 && (
                  <small>No hay categorías creadas todavía — puedes crearlas en la sección "Categorías" del menú.</small>
                )}
                {fieldErrors.categoria && <span className="modal-field-error">{fieldErrors.categoria[0]}</span>}
              </label>

              <label>
                Duración (min)
                <input
                  type="number"
                  name="duracion_minutos"
                  value={form.duracion_minutos}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Precio (S/)
                <input type="number" step="0.01" name="precio" value={form.precio} onChange={handleChange} required />
                {fieldErrors.precio && <span className="modal-field-error">{fieldErrors.precio[0]}</span>}
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
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Servicios;
