import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../services/api";

// Hook genérico para listar un recurso CRUD estándar del backend
// (maneja el "sobre" de paginación, loading y errores de forma uniforme).
export function useResourceList(api, initialParams = {}) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [params, setParams] = useState(initialParams);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list(params);
      if (res && Array.isArray(res.results)) {
        setItems(res.results);
        setPagination(res.pagination);
      } else if (Array.isArray(res)) {
        setItems(res);
        setPagination(null);
      } else {
        setItems([]);
        setPagination(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar la información.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, pagination, params, setParams, loading, error, reload, setItems };
}
