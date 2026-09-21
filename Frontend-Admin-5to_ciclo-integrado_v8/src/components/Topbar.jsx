import { useAuth } from "../context/AuthContext";
import "../Css/Topbar.css";

function Topbar() {
  const { user } = useAuth();
  const currentPage = window.location.hash.replace("#", "") || "dashboard";
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
  const displayName = user?.username || "Usuario";

  return (
    <header className="topbar">

      <div className="topbar-left">
        <div>
          <span className="topbar-small">
            PANEL ADMINISTRATIVO
          </span>

          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar-right">

        <button
          className="topbar-icon-button"
          aria-label="Notificaciones"
        >
          ♡
          <span className="notification-dot"></span>
        </button>

        <div className="topbar-divider"></div>

        <div className="topbar-user">

          <div className="topbar-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="topbar-user-info">
            <strong>{displayName}</strong>
            <span>{user?.is_staff ? "STAFF" : "USUARIO"}</span>
          </div>

          <span className="topbar-arrow">
            ▾
          </span>

        </div>

      </div>

    </header>
  );
}

export default Topbar;