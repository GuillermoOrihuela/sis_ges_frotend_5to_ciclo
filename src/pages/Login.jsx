import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import "../Css/Login.css";

function Login() {
  const { login } = useAuth();

  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.username, form.password, form.remember);
      window.location.hash = "dashboard";
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-decoration">
        <div className="login-brand">
          <span className="login-logo">NL</span>

          <h1>Nails by Lucero</h1>

          <p>
            Gestión y administración
          </p>
        </div>
      </div>


      <div className="login-container">

        <div className="login-box">

          <div className="login-header">
            <span className="login-welcome">
              BIENVENIDA
            </span>

            <h2>
              Iniciar sesión
            </h2>

            <p>
              Ingresa tus datos para acceder al panel administrativo.
            </p>
          </div>


          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <label>
              Usuario o correo

              <input
                type="text"
                name="username"
                placeholder="Ingresa tu usuario"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </label>


            <label>
              Contraseña

              <input
                type="password"
                name="password"
                placeholder="Ingresa tu contraseña"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </label>


            <div className="login-options">

              <label className="remember-option">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                />

                <span>
                  Recordarme
                </span>
              </label>

              <a href="#recuperar">
                ¿Olvidaste tu contraseña?
              </a>

            </div>


            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

          </form>


          <p className="login-footer">
            Acceso exclusivo para personal autorizado.
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;
