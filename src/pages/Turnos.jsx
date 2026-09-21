import { useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { turnosApi, ApiError } from "../services/api";
import "../Css/Horarios.css";

const SUGERENCIAS = ["Mañana", "Tarde", "Noche", "Completo", "Fin de semana"];
const EMPTY_FORM = { nombre: "", hora_inicio: "", hora_fin: "", activo: true };

function Turnos() {
  const toast = useToast();
  const { items, loading, error, reload } = useResourceList(turnosApi, { page_size: 100 });

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

  const openEdit = (turno) => {
    setEditingId(turno.id);
    setForm({
      nombre: turno.nombre,
      hora_inicio: turno.hora_inicio?.slice(0, 5) || "",
      hora_fin: turno.hora_fin?.slice(0, 5) || "",
      activo: turno.activo,
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
        await turnosApi.update(editingId, form);
        toast.success("Turno actualizado.");
      } else {
        await turnosApi.create(form);
        toast.success("Turno creado.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || "No se pudo guardar el turno.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (turno) => {
    if (!window.confirm(`¿Eliminar el turno "${turno.nombre}"?`)) return;
    try {
      await turnosApi.remove(turno.id);
      toast.success("Turno eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el turno. Puede que siga usándose en algún horario.");
    }
  };

  return (
    <section className="horarios-page">
      <div className="horarios-header">
        <div>
          <span>ORGANIZACIÓN DEL PERSONAL</span>
          <h2>Turnos</h2>
          <p>Define los turnos disponibles (cada uno con su propio rango horario) para asignarlos luego en Horarios.</p>
        </div>
        <AdminButton onClick={openCreate}>+ Nuevo turno</AdminButton>
      </div>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando turnos...</p>}

      {!loading && !error && (
        <div className="horarios-card">
          <div className="horarios-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Turno</th>
                  <th>Hora inicio</th>
                  <th>Hora fin</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5}>No hay turnos registrados todavía.</td></tr>
                )}
                {items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nombre}</td>
                    <td>{t.hora_inicio?.slice(0, 5)}</td>
                    <td>{t.hora_fin?.slice(0, 5)}</td>
                    <td>{t.activo ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button className="table-action" onClick={() => openEdit(t)}>Editar</button>
                      <button className="table-action danger" onClick={() => handleDelete(t)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Editar turno" : "Nuevo turno"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton disabled={saving} type="submit" form="turno-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="turno-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <label>
              Nombre del turno
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ej: Mañana, Turno de Juan, Fin de semana..."
                list="turnos-sugeridos"
                required
              />
              <datalist id="turnos-sugeridos">
                {SUGERENCIAS.map((s) => <option key={s} value={s} />)}
              </datalist>
              {fieldErrors.nombre && <span className="modal-field-error">{fieldErrors.nombre[0]}</span>}
            </label>

            <div className="modal-form-row">
              <label>
                Hora inicio
                <input type="time" name="hora_inicio" value={form.hora_inicio} onChange={handleChange} required />
              </label>
              <label>
                Hora fin
                <input type="time" name="hora_fin" value={form.hora_fin} onChange={handleChange} required />
              </label>
            </div>

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
    </section>
  );
}

export default Turnos;
