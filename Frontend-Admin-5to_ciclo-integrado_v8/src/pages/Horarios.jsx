import { useEffect, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { horariosApi, empleadosApi, turnosApi, ApiError } from "../services/api";
import "../Css/Horarios.css";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const EMPTY_FORM = {
  empleado: "",
  turno: "",
  dia_semana: "0",
  hora_inicio: "",
  hora_fin: "",
  activo: true,
};

function Horarios() {
  const toast = useToast();
  const [empleadoFiltro, setEmpleadoFiltro] = useState("");
  const { items, params, setParams, loading, error, reload } =
    useResourceList(horariosApi, { page_size: 100 });

  useEffect(() => {
    setParams((prev) => {
      const next = { ...prev, page_size: 100 };
      if (empleadoFiltro) next.empleado = empleadoFiltro;
      else delete next.empleado;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoFiltro]);

  const [empleados, setEmpleados] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    empleadosApi.list({ page_size: 100 }).then((res) => {
      setEmpleados(Array.isArray(res) ? res : res.results || []);
    });
    turnosApi.list({ page_size: 100 }).then((res) => {
      setTurnos(Array.isArray(res) ? res : res.results || []);
    });
  }, []);

  const empleadoNombre = (id) => {
    const empleado = empleados.find((e) => e.id === id);
    return empleado ? `${empleado.nombres} ${empleado.apellidos}` : `#${id}`;
  };

  const turnoNombre = (id) => {
    const turno = turnos.find((t) => t.id === id);
    return turno ? turno.nombre : `#${id}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEdit = (horario) => {
    setEditingId(horario.id);
    setForm({
      empleado: horario.empleado,
      turno: horario.turno,
      dia_semana: String(horario.dia_semana),
      hora_inicio: horario.hora_inicio?.slice(0, 5) || "",
      hora_fin: horario.hora_fin?.slice(0, 5) || "",
      activo: horario.activo,
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: type === "checkbox" ? checked : value };
      // Al elegir un turno, se copian sus horas por defecto — así no hay
      // que volver a escribirlas si el horario del empleado coincide con
      // las del turno. Igual quedan editables por si ese empleado puntual
      // entra/sale a una hora distinta dentro del mismo turno.
      if (name === "turno") {
        const turnoSeleccionado = turnos.find((t) => String(t.id) === String(value));
        if (turnoSeleccionado) {
          next.hora_inicio = turnoSeleccionado.hora_inicio?.slice(0, 5) || prev.hora_inicio;
          next.hora_fin = turnoSeleccionado.hora_fin?.slice(0, 5) || prev.hora_fin;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload = {
      empleado: Number(form.empleado),
      turno: Number(form.turno),
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      activo: form.activo,
    };

    try {
      if (editingId) {
        await horariosApi.update(editingId, payload);
        toast.success("Horario actualizado.");
      } else {
        await horariosApi.create(payload);
        toast.success("Horario creado.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      // El backend ahora sí permite varios horarios el mismo día para un
      // empleado (turno partido: mañana + tarde), siempre que los rangos
      // de hora no se superpongan. Si se superponen, este mensaje viene
      // del servidor (HorarioEmpleadoSerializer.validate).
      toast.error(err.message || "No se pudo guardar el horario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (horario) => {
    if (!window.confirm("¿Eliminar este horario?")) return;
    try {
      await horariosApi.remove(horario.id);
      toast.success("Horario eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el horario.");
    }
  };

  return (
    <section className="horarios-page">
      <div className="horarios-header">
        <div>
          <span>ORGANIZACIÓN DEL PERSONAL</span>
          <h2>Horarios</h2>
          <p>Asigna uno o varios turnos por día a cada empleado (por ejemplo, turno partido mañana + tarde).</p>
        </div>

        <AdminButton onClick={openCreate}>+ Agregar horario</AdminButton>
      </div>

      <div className="horarios-card" style={{ marginBottom: 16, padding: "12px 16px" }}>
        <label style={{ maxWidth: 320 }}>
          Filtrar por empleado
          <select value={empleadoFiltro} onChange={(e) => setEmpleadoFiltro(e.target.value)}>
            <option value="">Todos los empleados</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando horarios...</p>}

      {!loading && !error && (
        <div className="horarios-card">
          <div className="horarios-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Día</th>
                  <th>Turno</th>
                  <th>Hora inicio</th>
                  <th>Hora fin</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7}>No hay horarios registrados todavía.</td>
                  </tr>
                )}

                {items.map((horario) => (
                  <tr key={horario.id}>
                    <td>{empleadoNombre(horario.empleado)}</td>
                    <td>{DIAS[horario.dia_semana]}</td>
                    <td>{turnoNombre(horario.turno)}</td>
                    <td>{horario.hora_inicio?.slice(0, 5)}</td>
                    <td>{horario.hora_fin?.slice(0, 5)}</td>
                    <td>{horario.activo ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button className="table-action" onClick={() => openEdit(horario)}>Editar</button>
                      <button className="table-action danger" onClick={() => handleDelete(horario)}>Eliminar</button>
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
          title={editingId ? "Editar horario" : "Nuevo horario"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </AdminButton>
              <AdminButton disabled={saving} type="submit" form="horario-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="horario-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
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

              <label>
                Turno
                <select name="turno" value={form.turno} onChange={handleChange} required>
                  <option value="" disabled>Selecciona un turno</option>
                  {turnos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre} ({t.hora_inicio?.slice(0, 5)}-{t.hora_fin?.slice(0, 5)})</option>
                  ))}
                </select>
                {fieldErrors.turno && <span className="modal-field-error">{fieldErrors.turno[0]}</span>}
              </label>
            </div>

            <label>
              Día de la semana
              <select name="dia_semana" value={form.dia_semana} onChange={handleChange}>
                {DIAS.map((dia, index) => (
                  <option key={dia} value={index}>{dia}</option>
                ))}
              </select>
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
            <p style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: -8 }}>
              Se completan automáticamente con el horario del turno elegido; ajústalas solo si
              este empleado entra o sale en un horario distinto al del turno.
            </p>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Horarios;
