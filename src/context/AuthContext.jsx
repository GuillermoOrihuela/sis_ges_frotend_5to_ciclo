import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { authApi, meApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.getCurrentUser());
  // Perfil real (rol, empleado_id) desde /auth/me/. Antes el frontend sólo
  // tenía lo que venía en el JWT (username, is_staff) porque el backend no
  // exponía este endpoint — ver INTEGRACION_BACKEND.md, punto 3, ya
  // resuelto.
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await meApi.get();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password, remember = false) => {
    const decoded = await authApi.login(username, password, remember);
    setUser(decoded);
    await loadProfile();
    return decoded;
  }, [loadProfile]);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setProfile(null);
    window.location.hash = "login";
  }, []);

  useEffect(() => {
    if (user) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Revalida al volver a la pestaña, por si el access token ya venció
    // (la sesión dura hasta 8 horas — ver settings.SIMPLE_JWT).
    const check = () => {
      const current = authApi.getCurrentUser();
      setUser(current);
      if (!current) setProfile(null);
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  const value = {
    user,
    profile,
    profileLoading,
    rol: profile?.rol || null,
    isAuthenticated: !!user,
    hasRole: (...roles) => !!profile?.rol && roles.includes(profile.rol),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
