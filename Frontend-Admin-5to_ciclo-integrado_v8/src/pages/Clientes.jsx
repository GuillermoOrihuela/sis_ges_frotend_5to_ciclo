import { useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { clientesApi, ApiError } from "../services/api";
import "../Css/Clientes.css";

const EMPTY_FORM = {
  nombres: "",
  apellidos: "",
  telefono: "",
  email: "",
  fecha_nacimiento: "",
  observaciones: "",
  activo: true,
};

function Clientes() {
  const toast = useToast();
  const { items, pagination, params, setParams, loading, error, reload } =
    useResourceList(clientesApi, { page: 1 });

  const [search, setSearch] = useState("");
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

  const openEdit = (cliente) => {
    setEditingId(cliente.id);
    setForm({
      nombres: cliente.nombres || "",
      apellidos: cliente.apellidos || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      fecha_nacimiento: cliente.fecha_nacimiento || "",
      observaciones: cliente.observaciones || "",
      activo: cliente.activo,
    });
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setParams((prev) => ({ ...prev, nombres: search, page: 1 }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload = {
      ...form,
      email: form.email || "",
      fecha_nacimiento: form.fecha_nacimiento || null,
      observaciones: form.observaciones || "",
    };

    try {
      if (editingId) {
        await clientesApi.update(editingId, payload);
        toast.success("Cliente actualizado correctamente.");
      } else {
        await clientesApi.create(payload);
        toast.success("Cliente creado correctamente.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
      }
      toast.error(err.message || "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cliente) => {
    if (!window.confirm(`¿Eliminar a ${cliente.nombres} ${cliente.apellidos}?`)) return;
    try {
      await clientesApi.remove(cliente.id);
      toast.success("Cliente eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el cliente.");
    }
  };

  const goToPage = (page) => setParams((prev) => ({ ...prev, page }));

  return (
    <section className="clientes-page">
      <div className="clientes-header">
        <div>
          <span>GESTIÓN DE CLIENTES</span>
          <h2>Clientes</h2>
          <p>Consulta y administra la información de tus clientes.</p>
        </div>

        <AdminButton onClick={openCreate}>+ Nuevo cliente</AdminButton>
      </div>

      <div className="clientes-card">
        <div className="clientes-toolbar">
          <h3>Clientes registrados</h3>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <AdminButton type="submit" variant="secondary">Buscar</AdminButton>
          </form>
        </div>

        {error && <p className="modal-field-error">{error}</p>}
        {loading && <p>Cargando clientes...</p>}

        {!loading && !error && (
          <div className="clientes-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5}>No hay clientes registrados todavía.</td>
                  </tr>
                )}

                {items.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.nombres} {cliente.apellidos}</td>
                    <td>{cliente.telefono}</td>
                    <td>{cliente.email || "—"}</td>
                    <td>{cliente.activo ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button className="table-action" onClick={() => openEdit(cliente)}>Editar</button>
                      <button className="table-action danger" onClick={() => handleDelete(cliente)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div className="clientes-pagination" style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 4px" }}>
            <AdminButton
              variant="secondary"
              disabled={!pagination.previous}
              onClick={() => goToPage((params.page || 1) - 1)}
            >
              ← Anterior
            </AdminButton>
            <span>{pagination.count} clientes en total</span>
            <AdminButton
              variant="secondary"
              disabled={!pagination.next}
              onClick={() => goToPage((params.page || 1) + 1)}
            >
              Siguiente →
            </AdminButton>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? "Editar cliente" : "Nuevo cliente"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </AdminButton>
              <AdminButton onClick={handleSubmit} disabled={saving} type="submit" form="cliente-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="cliente-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
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
                Email
                <input type="email" name="email" value={form.email} onChange={handleChange} />
                {fieldErrors.email && <span className="modal-field-error">{fieldErrors.email[0]}</span>}
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Fecha de nacimiento
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={form.fecha_nacimiento || ""}
                  onChange={handleChange}
                />
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

            <label>
              Observaciones
              <textarea name="observaciones" rows="3" value={form.observaciones} onChange={handleChange} />
            </label>
          </form>
        </Modal>
      )}
    </section>
  );
}

export default Clientes;
