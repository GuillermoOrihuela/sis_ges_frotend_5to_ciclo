import { useEffect, useState } from "react";

import { useToast } from "../context/ToastContext";
import { cajaApi, pagosApi } from "../services/api";
import "../Css/Caja.css";

function todayISO() {
  // OJO: no usar toISOString() acá — convierte a UTC, así que en Perú
  // (UTC-5) desde medianoche hasta las 7pm hora local, toISOString()
  // devuelve la fecha de MAÑANA en vez de hoy, y el resumen de caja
  // buscaba pagos en una fecha que todavía no llegaba. Se arma la fecha
  // con los componentes locales del navegador en su lugar.
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Caja() {
  const toast = useToast();
  const [fecha, setFecha] = useState(todayISO());
  const [resumen, setResumen] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async (f) => {
    setLoading(true);
    try {
      const [resumenData, pagosData] = await Promise.all([
        cajaApi.resumen(f),
        pagosApi.list({ fecha: f, page_size: 100 }),
      ]);
      setResumen(resumenData);
      setPagos(Array.isArray(pagosData) ? pagosData : pagosData?.results || []);
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el resumen de caja.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar(fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuscar = (event) => {
    event.preventDefault();
    cargar(fecha);
  };

  return (
    <section className="crud-page">
      <div className="crud-header">
        <div>
          <span>CONTROL DIARIO</span>
          <h2>Caja</h2>
          <p>
            Resumen de ingresos por método de pago. No existe todavía un módulo de
            apertura/cierre de caja con montos declarados a mano — este resumen se
            calcula a partir de los pagos y ventas del día.
          </p>
        </div>
        <form onSubmit={handleBuscar} style={{ display: "flex", gap: 8 }}>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <button className="crud-primary-button" type="submit">Consultar</button>
        </form>
      </div>

      {loading && <p>Cargando resumen de caja...</p>}

      {!loading && resumen && (
        <>
          <div className="caja-summary-grid">
            <div className="crud-card caja-metric">
              <span>Total ingresado</span>
              <strong>S/ {resumen.total_ingresos}</strong>
            </div>
            <div className="crud-card caja-metric">
              <span>Pagos registrados</span>
              <strong>{resumen.cantidad_pagos}</strong>
            </div>
            <div className="crud-card caja-metric">
              <span>Total anulado</span>
              <strong>S/ {resumen.total_anulado}</strong>
            </div>
            <div className="crud-card caja-metric">
              <span>Pagos anulados</span>
              <strong>{resumen.cantidad_anulados}</strong>
            </div>
          </div>

          <div className="crud-card" style={{ marginBottom: 20 }}>
            <div className="crud-card-header"><h3>Ingresos por método de pago — {resumen.fecha}</h3></div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr><th>Método de pago</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {resumen.por_metodo_pago.length === 0 && (
                    <tr><td colSpan={2}>No hay pagos registrados en esta fecha.</td></tr>
                  )}
                  {resumen.por_metodo_pago.map((m) => (
                    <tr key={m.metodo_pago}>
                      <td>{m.metodo_pago}</td>
                      <td>S/ {m.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="crud-card">
            <div className="crud-card-header"><h3>Pagos del día — {resumen.fecha}</h3></div>
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pago</th>
                    <th>Venta</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.length === 0 && (
                    <tr><td colSpan={6}>No se registraron pagos en esta fecha.</td></tr>
                  )}
                  {pagos.map((p) => (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>Venta #{p.venta}</td>
                      <td>S/ {p.monto}</td>
                      <td>{p.metodo_pago}</td>
                      <td><span className={`status-badge ${p.estado === "PAGADO" ? "success" : ""}`}>{p.estado}</span></td>
                      <td>{new Date(p.fecha).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Caja;
