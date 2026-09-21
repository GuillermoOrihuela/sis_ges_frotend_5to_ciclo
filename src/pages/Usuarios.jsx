import { useState } from "react";

import Modal from "../components/Modal";
import AdminButton from "../components/AdminButton";
import { useResourceList } from "../hooks/useResourceList";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { usuariosApi, ApiError } from "../services/api";
import "../Css/Usuarios.css";

const ROLES = ["ADMINISTRADOR", "GERENTE", "RECEPCIONISTA", "ESPECIALISTA", "VENDEDOR"];

const EMPTY_FORM = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  telefono: "",
  rol: "RECEPCIONISTA",
  is_active: true,
  password: "",
};

function Usuarios() {
  const toast = useToast();
  const { user: sessionUser } = useAuth();
  const { items, pagination, params, setParams, loading, error, reload } =
    useResourceList(usuariosApi, { page: 1 });

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

  const openEdit = (usuario) => {
    setEditingId(usuario.id);
    setForm({
      username: usuario.username || "",
      first_name: usuario.first_name || "",
      last_name: usuario.last_name || "",
      email: usuario.email || "",
      telefono: usuario.telefono || "",
      rol: usuario.rol || "RECEPCIONISTA",
      is_active: usuario.is_active,
      password: "",
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

    const payload = { ...form };
    if (!payload.password) delete payload.password; // no forzar cambio de clave al editar

    try {
      if (editingId) {
        await usuariosApi.update(editingId, payload);
        toast.success("Usuario actualizado correctamente.");
      } else {
        if (!payload.password) {
          setFieldErrors({ password: ["La contraseña es obligatoria al crear un usuario."] });
          setSaving(false);
          return;
        }
        await usuariosApi.create(payload);
        toast.success("Usuario creado correctamente.");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      toast.error(err.message || "No se pudo guardar el usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Eliminar al usuario ${usuario.username}?`)) return;
    try {
      await usuariosApi.remove(usuario.id);
      toast.success("Usuario eliminado.");
      reload();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el usuario.");
    }
  };

  const goToPage = (page) => setParams((prev) => ({ ...prev, page }));

  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>GESTIÓN DE ACCESOS</span>
          <h2>Usuarios</h2>
          <p>Administra los usuarios y roles del sistema.</p>
        </div>
        <AdminButton onClick={openCreate}>+ Nuevo usuario</AdminButton>
      </div>

      <div className="crud-card">
        <div className="crud-card-header">
          <h3>Usuarios del sistema</h3>
        </div>

        {error && <p className="modal-field-error">{error}</p>}
        {loading && <p>Cargando usuarios...</p>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Empleado vinculado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5}>No hay usuarios registrados todavía.</td></tr>
                )}
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                      <small>{[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "—"}</small>
                    </td>
                    <td><span className="role-badge">{u.rol}</span></td>
                    <td>{u.empleado_id ? `#${u.empleado_id}` : "—"}</td>
                    <td>
                      <span className={`status-badge ${u.is_active ? "success" : ""}`}>
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <button className="action-button" onClick={() => openEdit(u)}>Editar</button>
                      <button
                        className="action-button danger"
                        onClick={() => handleDelete(u)}
                        disabled={u.id === sessionUser?.user_id}
                        title={u.id === sessionUser?.user_id ? "No puedes eliminar tu propio usuario" : ""}
                      >
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
          <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 4px" }}>
            <AdminButton variant="secondary" disabled={!pagination.previous} onClick={() => goToPage((params.page || 1) - 1)}>
              ← Anterior
            </AdminButton>
            <span>{pagination.count} usuarios en total</span>
            <AdminButton variant="secondary" disabled={!pagination.next} onClick={() => goToPage((params.page || 1) + 1)}>
              Siguiente →
            </AdminButton>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? "Editar usuario" : "Nuevo usuario"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <AdminButton variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancelar</AdminButton>
              <AdminButton onClick={handleSubmit} disabled={saving} type="submit" form="usuario-form">
                {saving ? "Guardando..." : "Guardar"}
              </AdminButton>
            </>
          }
        >
          <form id="usuario-form" onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="modal-form-row">
              <label>
                Usuario
                <input name="username" value={form.username} onChange={handleChange} required />
                {fieldErrors.username && <span className="modal-field-error">{fieldErrors.username[0]}</span>}
              </label>
              <label>
                Rol
                <select name="rol" value={form.rol} onChange={handleChange}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Nombres
                <input name="first_name" value={form.first_name} onChange={handleChange} />
              </label>
              <label>
                Apellidos
                <input name="last_name" value={form.last_name} onChange={handleChange} />
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                Email
                <input type="email" name="email" value={form.email} onChange={handleChange} />
              </label>
              <label>
                Teléfono
                <input name="telefono" value={form.telefono} onChange={handleChange} />
              </label>
            </div>

            <div className="modal-form-row">
              <label>
                {editingId ? "Nueva contraseña (opcional)" : "Contraseña"}
                <input type="password" name="password" value={form.password} onChange={handleChange} minLength={8} />
                {fieldErrors.password && <span className="modal-field-error">{fieldErrors.password[0]}</span>}
              </label>
              <label>
                Estado
                <select
                  name="is_active"
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === "true" }))}
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

export default Usuarios;
