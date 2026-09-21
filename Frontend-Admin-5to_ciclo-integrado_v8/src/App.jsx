import { useEffect, useState } from "react";

import AdminLayout from "./layouts/AdminLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Clientes from "./pages/Clientes";
import Personal from "./pages/Personal";
import Horarios from "./pages/Horarios";
import Turnos from "./pages/Turnos";
import Ausencias from "./pages/Ausencias";
import Servicios from "./pages/Servicios";
import Categorias from "./pages/Categorias";
import Productos from "./pages/Productos";
import Citas from "./pages/Citas";
import Ventas from "./pages/Ventas";
import Pagos from "./pages/Pagos";
import Caja from "./pages/Caja";
import Comisiones from "./pages/Comisiones";
import PublicSite from "./pages/PublicSite";

import "./Css/App.css";

const pages = {
  dashboard: <Dashboard />,
  usuarios: <Usuarios />,
  clientes: <Clientes />,
  personal: <Personal />,
  horarios: <Horarios />,
  turnos: <Turnos />,
  ausencias: <Ausencias />,
  servicios: <Servicios />,
  categorias: <Categorias />,
  productos: <Productos />,
  citas: <Citas />,
  ventas: <Ventas />,
  pagos: <Pagos />,
  caja: <Caja />,
  comisiones: <Comisiones />,
};

const PUBLIC_PAGES = ["inicio", "login"];

function getCurrentPage() {
  const hash = window.location.hash.replace("#", "");
  return hash || "inicio";
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(getCurrentPage());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage());

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Guarda de rutas: las páginas del panel administrativo requieren sesión
  // (el frontend no tenía ningún control de acceso antes de esta integración).
  useEffect(() => {
    if (!isAuthenticated && !PUBLIC_PAGES.includes(currentPage)) {
      window.location.hash = "login";
      setCurrentPage("login");
    }

    if (isAuthenticated && currentPage === "login") {
      window.location.hash = "dashboard";
      setCurrentPage("dashboard");
    }
  }, [isAuthenticated, currentPage]);

  if (currentPage === "login") {
    return isAuthenticated ? null : <Login />;
  }

  if (currentPage === "inicio") {
    return <PublicSite />;
  }

  if (!isAuthenticated) {
    // El efecto de arriba ya dispara la redirección a #login.
    return null;
  }

  return (
    <AdminLayout>
      {pages[currentPage] || <Dashboard />}
    </AdminLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
