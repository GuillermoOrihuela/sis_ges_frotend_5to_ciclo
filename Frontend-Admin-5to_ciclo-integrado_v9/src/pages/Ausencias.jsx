import { useEffect, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { ausenciasApi, empleadosApi, ApiError } from "../services/api";
import "../Css/Ausencias.css";

const EMPTY_FORM = { empleado: "", fecha_inicio: "", fecha_fin: "", motivo: "" };

function Ausencias() {
  const toast = useToast();
  const { items, loading, error, reload } = useResourceList(ausenciasApi, { page_size: 100 });

  const [empleados, setEmpleados] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    empleadosApi.list({ page_size: 100 }).then((res) => {
      setEmpleados(Array.isArray(res) ? res : res.results || []);
    });
  }, []);

  const empleadoNombre = (id) => {
    const empleado = empleados.find((e) => e.id === id);
    return empleado ? `${empleado.nombres} ${empleado.apellidos}` : `#${id}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (ausencia) => {
    setEditingId(ausencia.id);
    setForm({
      empleado: ausencia.empleado,
      fecha_inicio: ausencia.fecha_inicio,
      fecha_fin: ausencia.fecha_fin,
      motivo: ausencia.motivo || "",
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload = { ...form, empleado: Number(form.empleado) };

    try {
      if (editingId) {
        await ausenciasApi.update(editingId, payload);
        toast.success("Ausencia actualizada.");
      } else {
        await ausenciasApi.create(payload);
        toast.success("Ausencia registrada.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || "No se pudo guardar la ausencia.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ausencia) => {
    if (!window.confirm("¿Eliminar esta ausencia?")) return;
    try {
      await ausenciasApi.remove(ausencia.id);
      toast.success("Ausencia eliminada.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar la ausencia.");
    }
  };

  return (
    <section className="ausencias-page">
      <div className="ausencias-header">
        <div>
          <span>DISPONIBILIDAD DEL PERSONAL</span>
          <h2>Ausencias y bloqueos</h2>
          <p>Gestiona vacaciones, permisos y bloqueos.</p>
        </div>

        <AdminButton onClick={openCreate}>+ Registrar ausencia</AdminButton>
      </div>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando ausencias...</p>}

      {!loading && !error && (
        <div className="ausencias-card">
          {items.length === 0 && <p>No hay ausencias registradas todavía.</p>}

          {items.map((ausencia) => (
            <div className="absence-item" key={ausencia.id}>
              <div className="absence-date">
                <strong>{ausencia.fecha_inicio}</strong>
                <span>hasta</span>
                <strong>{ausencia.fecha_fin}</strong>
              </div>

              <div className="absence-info">
                <h3>{empleadoNombre(ausencia.empleado)}</h3>
                <p>{ausencia.motivo}</p>
              </div>

              <button onClick={() => openEdit(ausencia)}>Editar</button>
              <button onClick={() => handleDelete(ausencia)}>Eliminar</button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? "Editar ausencia" : "Nueva ausencia"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </AdminButton>
              <AdminButton disabled={saving} type="submit" form="ausencia-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="ausencia-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <label>
              Empleado
              <select name="empleado" value={form.empleado} onChange={handleChange} required>
                <option value="" disabled>Selecciona un empleado</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>
                ))}
              </select>
              {fieldErrors.empleado && <span className="modal-field-error">{fieldErrors.empleado[0]}</span>}
            </label>

            <div className="modal-form-row">
              <label>
                Fecha inicio
                <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required />
                {fieldErrors.fecha_inicio && <span className="modal-field-error">{fieldErrors.fecha_inicio[0]}</span>}
              </label>

              <label>
                Fecha fin
                <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required />
                {fieldErrors.fecha_fin && <span className="modal-field-error">{fieldErrors.fecha_fin[0]}</span>}
              </label>
            </div>

            <label>
              Motivo
              <textarea name="motivo" rows="2" value={form.motivo} onChange={handleChange} required />
              {fieldErrors.motivo && <span className="modal-field-error">{fieldErrors.motivo[0]}</span>}
            </label>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Ausencias;
