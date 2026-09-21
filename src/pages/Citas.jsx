import { useEffect, useMemo, useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import {
  citasApi,
  clientesApi,
  empleadosApi,
  serviciosApi,
  TRANSICIONES_VALIDAS,
  ESTADOS_CITA,
} from "../services/api";
import "../Css/Citas.css";

const EMPTY_FORM = { cliente: "", especialista: "", fecha: "", hora_inicio: "", servicios: [] };

function Citas() {
  const toast = useToast();
  const { items, loading, error, reload, params, setParams } = useResourceList(citasApi, { page_size: 100 });

  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [servicios, setServicios] = useState([]);

  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [transitioningId, setTransitioningId] = useState(null);

  useEffect(() => {
    clientesApi.list({ page_size: 100 }).then((res) => setClientes(res.results || res || []));
    empleadosApi.list({ page_size: 100 }).then((res) => setEmpleados(Array.isArray(res) ? res : res.results || []));
    serviciosApi.list({ page_size: 100 }).then((res) => setServicios(Array.isArray(res) ? res : res.results || []));
  }, []);

  const clienteNombre = (id) => {
    const c = clientes.find((c) => c.id === id);
    return c ? `${c.nombres} ${c.apellidos}` : `#${id}`;
  };
  const empleadoNombre = (id) => {
    const e = empleados.find((e) => e.id === id);
    return e ? `${e.nombres} ${e.apellidos}` : `#${id}`;
  };

  const handleFiltrar = (event) => {
    event.preventDefault();
    setParams((prev) => ({
      ...prev,
      fecha: filtroFecha || undefined,
      estado: filtroEstado || undefined,
    }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const toggleServicio = (id) => {
    setForm((prev) => ({
      ...prev,
      servicios: prev.servicios.includes(id)
        ? prev.servicios.filter((s) => s !== id)
        : [...prev.servicios, id],
    }));
  };

  const serviciosSeleccionados = useMemo(
    () => servicios.filter((s) => form.servicios.includes(s.id)),
    [servicios, form.servicios]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.servicios.length === 0) {
      toast.error("Selecciona al menos un servicio.");
      return;
    }

    setSaving(true);

    // El backend corregido ahora reutiliza CitaService.crear_cita_gestion en
    // CitaSerializer.create(): calcula hora_fin y codigo_reserva en el
    // servidor y valida choques de horario del especialista. El único dato
    // que el cliente debe enviar es la lista de IDs de servicio en el campo
    // "servicios" (ya NO "detalles", que ahora es de solo lectura).
    const payload = {
      cliente: Number(form.cliente),
      especialista: Number(form.especialista),
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      servicios: form.servicios,
    };

    try {
      await citasApi.create(payload);
      toast.success("Cita creada correctamente.");
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo crear la cita.");
    } finally {
      setSaving(false);
    }
  };

  const ejecutarTransicion = async (cita, accion, estadoDestino) => {
    const etiqueta = estadoDestino.replace("_", " ").toLowerCase();
    if (!window.confirm(`¿Cambiar el estado de esta cita a "${etiqueta}"?`)) return;
    setTransitioningId(cita.id);
    try {
      await citasApi[accion](cita.id);
      toast.success("Estado de la cita actualizado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el estado.");
    } finally {
      setTransitioningId(null);
    }
  };

  const handleDelete = async (cita) => {
    if (!window.confirm("¿Eliminar esta cita?")) return;
    try {
      await citasApi.remove(cita.id);
      toast.success("Cita eliminada.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar la cita.");
    }
  };

  const accionesDisponibles = (estado) => {
    const permitidas = TRANSICIONES_VALIDAS[estado] || [];
    const map = {
      CONFIRMADA: "confirmar",
      CANCELADA: "cancelar",
      EN_PROCESO: "iniciar",
      FINALIZADA: "finalizar",
      NO_ASISTIO: "noAsistio",
    };
    return permitidas.map((estadoDestino) => ({ estadoDestino, accion: map[estadoDestino] }));
  };

  return (
    <section className="citas-page">
      <div className="citas-header">
        <div>
          <span>AGENDA</span>
          <h2>Citas</h2>
          <p>Gestiona las citas y servicios de los clientes.</p>
        </div>

        <AdminButton onClick={openCreate}>+ Nueva cita</AdminButton>
      </div>

      <form className="citas-filters" onSubmit={handleFiltrar}>
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_CITA.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </select>
        <button type="submit">Filtrar</button>
      </form>

      {error && <p className="modal-field-error">{error}</p>}
      {loading && <p>Cargando citas...</p>}

      {!loading && !error && (
        <div className="citas-card">
          <div className="citas-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Especialista</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6}>No hay citas para el filtro seleccionado.</td>
                  </tr>
                )}

                {items.map((cita) => (
                  <tr key={cita.id}>
                    <td>{cita.fecha}</td>
                    <td>{cita.hora_inicio?.slice(0, 5)}</td>
                    <td>{cita.cliente_nombres || clienteNombre(cita.cliente)}</td>
                    <td>{cita.especialista_nombre || empleadoNombre(cita.especialista)}</td>
                    <td>
                      <span className={`cita-status ${cita.estado}`}>{cita.estado}</span>
                    </td>
                    <td>
                      {accionesDisponibles(cita.estado).map(({ estadoDestino, accion }) => (
                        <button
                          key={accion}
                          className="cita-action"
                          disabled={transitioningId === cita.id}
                          onClick={() => ejecutarTransicion(cita, accion, estadoDestino)}
                        >
                          {estadoDestino.replace("_", " ")}
                        </button>
                      ))}
                      <button className="cita-action" onClick={() => handleDelete(cita)}>Eliminar</button>
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
          title="Nueva cita"
          onClose={() => setModalOpen(false)}
          width="600px"
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </AdminButton>
              <AdminButton disabled={saving} type="submit" form="cita-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="cita-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
              <label>
                Cliente
                <select name="cliente" value={form.cliente} onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))} required>
                  <option value="" disabled>Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                  ))}
                </select>
              </label>

              <label>
                Especialista
                <select name="especialista" value={form.especialista} onChange={(e) => setForm((p) => ({ ...p, especialista: e.target.value }))} required>
                  <option value="" disabled>Selecciona un especialista</option>
                  {empleados.filter((e) => e.activo).map((e) => (
                    <option key={e.id} value={e.id}>{e.nombres} {e.apellidos}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Fecha
                <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} required />
              </label>

              <label>
                Hora de inicio
                <input type="time" value={form.hora_inicio} onChange={(e) => setForm((p) => ({ ...p, hora_inicio: e.target.value }))} required />
              </label>
            </div>

            <label>
              Servicios
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {servicios.filter((s) => s.activo).map((s) => (
                  <label key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, border: "1px solid #e4d6dc", borderRadius: 8, padding: "6px 10px" }}>
                    <input
                      type="checkbox"
                      checked={form.servicios.includes(s.id)}
                      onChange={() => toggleServicio(s.id)}
                    />
                    {s.nombre} ({s.duracion_minutos} min · S/ {s.precio})
                  </label>
                ))}
              </div>
            </label>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Citas;
