import { useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { empleadosApi, ApiError } from "../services/api";
import "../Css/Personal.css";

const EMPTY_FORM = {
  nombres: "",
  apellidos: "",
  telefono: "",
  fecha_ingreso: "",
  cargo: "",
  activo: true,
};

function Personal() {
  const toast = useToast();
  const { items, loading, error, reload } = useResourceList(empleadosApi, { page_size: 100 });

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

  const openEdit = (empleado) => {
    setEditingId(empleado.id);
    setForm({
      nombres: empleado.nombres || "",
      apellidos: empleado.apellidos || "",
      telefono: empleado.telefono || "",
      fecha_ingreso: empleado.fecha_ingreso || "",
      cargo: empleado.cargo || "",
      activo: empleado.activo,
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
        await empleadosApi.update(editingId, form);
        toast.success("Empleado actualizado.");
      } else {
        await empleadosApi.create(form);
        toast.success("Empleado creado.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || "No se pudo guardar el empleado.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (empleado) => {
    if (!window.confirm(`¿Eliminar a ${empleado.nombres} ${empleado.apellidos}?`)) return;
    try {
      await empleadosApi.remove(empleado.id);
      toast.success("Empleado eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el empleado.");
    }
  };

  return (
    <section className="personal-page">
      <div className="personal-header">
        <div>
          <span>EQUIPO DE TRABAJO</span>
          <h2>Personal</h2>
          <p>Administra la información de los empleados y estilistas.</p>
        </div>

        <AdminButton onClick={openCreate}>+ Nuevo empleado</AdminButton>
      </div>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando personal...</p>}

      {!loading && !error && (
        <div className="personal-grid">
          {items.length === 0 && <p>No hay empleados registrados todavía.</p>}

          {items.map((persona) => (
            <article className="personal-card" key={persona.id}>
              <div className="personal-avatar">
                {persona.nombres?.charAt(0)}
              </div>

              <div className="personal-info">
                <h3>{persona.nombres} {persona.apellidos}</h3>
                <p>Cargo: {persona.cargo || "—"}</p>
                <p>Teléfono: {persona.telefono}</p>

                <span className={`personal-status ${persona.activo ? "active" : "vacation"}`}>
                  {persona.activo ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>

              <button className="personal-edit" onClick={() => openEdit(persona)}>
                Editar
              </button>
              <button className="personal-edit" onClick={() => handleDelete(persona)}>
                Eliminar
              </button>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Editar empleado" : "Nuevo empleado"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </AdminButton>
              <AdminButton disabled={saving} type="submit" form="personal-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="personal-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
              <label>
                Nombres
                <input name="nombres" value={form.nombres} onChange={handleChange} required />
                {fieldErrors.nombres && <span className="modal-field-error">{fieldErrors.nombres[0]}</span>}
              </label>

              <label>
                Apellidos
                <input name="apellidos" value={form.apellidos} onChange={handleChange} required />
                {fieldErrors.apellidos && <span className="modal-field-error">{fieldErrors.apellidos[0]}</span>}
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Teléfono
                <input name="telefono" value={form.telefono} onChange={handleChange} required />
                {fieldErrors.telefono && <span className="modal-field-error">{fieldErrors.telefono[0]}</span>}
              </label>

              <label>
                Fecha de ingreso
                <input type="date" name="fecha_ingreso" value={form.fecha_ingreso} onChange={handleChange} required />
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Cargo
                <input name="cargo" value={form.cargo} onChange={handleChange} />
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

export default Personal;
