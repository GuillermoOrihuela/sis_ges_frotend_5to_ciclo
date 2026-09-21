import { useAuth } from "../context/AuthContext";
import "../Css/Sidebar.css";

function Sidebar() {
  const { user, profile, logout } = useAuth();
  const currentPage = window.location.hash.replace("#", "") || "dashboard";
  const displayName = user?.username || "Usuario";
  const ROLE_LABELS = {
    ADMINISTRADOR: "Administrador/a",
    GERENTE: "Gerente",
    RECEPCIONISTA: "Recepcionista",
    ESPECIALISTA: "Especialista",
    VENDEDOR: "Vendedor/a",
  };
  const roleLabel = profile?.rol ? ROLE_LABELS[profile.rol] || profile.rol : "Panel de gestión";
  const menuItems = [
    {
      section: "Principal",
      items: [
        { label: "Dashboard", icon: "⌂", href: "#dashboard" },
      ],
    },
    {
      section: "Gestión",
      items: [
        { label: "Usuarios", icon: "♙", href: "#usuarios" },
        { label: "Clientes", icon: "♧", href: "#clientes" },
        { label: "Personal", icon: "♤", href: "#personal" },
        { label: "Horarios", icon: "◷", href: "#horarios" },
        { label: "Turnos", icon: "◐", href: "#turnos" },
        { label: "Ausencias", icon: "○", href: "#ausencias" },
      ],
    },
    {
      section: "Servicios y ventas",
      items: [
        { label: "Servicios", icon: "✦", href: "#servicios" },
        { label: "Categorías", icon: "▧", href: "#categorias" },
        { label: "Productos", icon: "□", href: "#productos" },
        { label: "Citas", icon: "▣", href: "#citas" },
        { label: "Ventas", icon: "◈", href: "#ventas" },
        { label: "Pagos", icon: "◉", href: "#pagos" },
        { label: "Caja", icon: "▤", href: "#caja" },
        { label: "Comisiones", icon: "◇", href: "#comisiones" },
      ],
    },
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <div className="sidebar-logo">
          NL
        </div>

        <div className="sidebar-brand-text">
          <strong>Nails by Lucero</strong>
          <span>Administración</span>
        </div>
      </div>

      <nav className="sidebar-navigation">
        {menuItems.map((section) => (
          <div className="sidebar-section" key={section.section}>

            <span className="sidebar-section-title">
              {section.section}
            </span>

            {section.items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={currentPage === item.href.replace("#", "") ? "sidebar-link active" : "sidebar-link"}
              >
                <span className="sidebar-icon">
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {item.pending && <small className="sidebar-pending">pronto</small>}
              </a>
            ))}

          </div>
        ))}
      </nav>

      <div className="sidebar-footer">

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>

        <button className="sidebar-logout" onClick={logout} type="button">
          ⇥ Cerrar sesión
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;