import { useEffect, useState } from "react";

import StatCard from "../components/StatCard";
import { citasApi, clientesApi } from "../services/api";
import "../Css/Dashboard.css";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function Dashboard() {
  const [citasHoy, setCitasHoy] = useState([]);
  const [totalClientes, setTotalClientes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      citasApi.list({ fecha: hoyISO(), page_size: 100 }),
      clientesApi.list({ page_size: 1 }),
    ])
      .then(([citasRes, clientesRes]) => {
        if (!active) return;
        setCitasHoy(citasRes.results || []);
        setTotalClientes(clientesRes.pagination?.count ?? null);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const resumenPorEstado = citasHoy.reduce((acc, cita) => {
    acc[cita.estado] = (acc[cita.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="dashboard-page">

      <div className="dashboard-header">

        <div>
          <span className="dashboard-kicker">
            NAILS BY LUCERO
          </span>

          <h2>
            Resumen general
          </h2>

          <p>
            Consulta rápidamente el estado de las principales operaciones
            del salón.
          </p>
        </div>

        <div className="dashboard-date">
          <span>Hoy</span>

          <strong>
            {new Date().toLocaleDateString("es-PE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </strong>
        </div>

      </div>


      <div className="dashboard-stats">

        <StatCard
          title="Citas de hoy"
          value={loading ? "…" : String(citasHoy.length)}
          description={loading ? "Cargando" : `${resumenPorEstado.CONFIRMADA || 0} confirmadas`}
          icon="▣"
        />

        <StatCard
          title="Clientes registrados"
          value={loading ? "…" : String(totalClientes ?? "—")}
          description="Total de clientes"
          icon="♧"
        />

        <StatCard
          title="Ventas del día"
          value="—"
          description="Módulo pendiente en el backend"
          icon="◈"
        />

        <StatCard
          title="Productos"
          value="—"
          description="Módulo pendiente en el backend"
          icon="□"
        />

      </div>


      <div className="dashboard-grid">

        <section className="dashboard-panel">

          <div className="panel-header">

            <div>
              <span>
                AGENDA
              </span>

              <h3>
                Citas de hoy
              </h3>
            </div>

            <a href="#citas">
              Ver todas →
            </a>

          </div>


          <div className="appointment-list">

            {loading && <p>Cargando citas...</p>}

            {!loading && citasHoy.length === 0 && <p>No hay citas registradas para hoy.</p>}

            {!loading && citasHoy.slice(0, 6).map((cita) => {
              const [hora, minuto] = (cita.hora_inicio || "00:00").split(":");
              const horaNum = Number(hora);
              const periodo = horaNum >= 12 ? "PM" : "AM";
              const hora12 = ((horaNum + 11) % 12) + 1;

              return (
                <div className="appointment-item" key={cita.id}>
                  <div className="appointment-time">
                    <strong>{String(hora12).padStart(2, "0")}:{minuto}</strong>
                    <span>{periodo}</span>
                  </div>

                  <div className="appointment-client">
                    <strong>{cita.cliente_nombres || `Cliente #${cita.cliente}`}</strong>
                    <span>{cita.especialista_nombre || `Especialista #${cita.especialista}`}</span>
                  </div>

                  <span className="appointment-status">
                    {cita.estado}
                  </span>
                </div>
              );
            })}

          </div>

        </section>


        <section className="dashboard-panel">

          <div className="panel-header">

            <div>
              <span>
                RESUMEN
              </span>

              <h3>
                Citas de hoy por estado
              </h3>
            </div>

          </div>


          <div className="activity-list">

            {loading && <p>Cargando...</p>}

            {!loading && Object.keys(resumenPorEstado).length === 0 && (
              <p>Aún no hay citas registradas para el día de hoy.</p>
            )}

            {!loading && Object.entries(resumenPorEstado).map(([estado, cantidad]) => (
              <div className="activity-item" key={estado}>
                <div className="activity-icon">
                  {cantidad}
                </div>

                <div>
                  <strong>{estado.replace("_", " ")}</strong>
                  <span>{cantidad === 1 ? "1 cita" : `${cantidad} citas`}</span>
                </div>
              </div>
            ))}

          </div>

        </section>

      </div>


      <section className="dashboard-welcome">

        <div className="welcome-mark">
          NL
        </div>

        <div>
          <span>
            PANEL ADMINISTRATIVO
          </span>

          <h3>
            Bienvenida a Nails by Lucero
          </h3>

          <p>
            Desde este panel podrás gestionar las operaciones principales
            del salón de forma organizada y centralizada.
          </p>
        </div>

      </section>

    </section>
  );
}

export default Dashboard;
