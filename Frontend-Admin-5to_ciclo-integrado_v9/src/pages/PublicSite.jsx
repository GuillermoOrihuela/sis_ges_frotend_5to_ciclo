import { useEffect, useState } from "react";

import { publicApi, ApiError } from "../services/api";
import "../Css/PublicSite.css";

// Imágenes decorativas (el backend no gestiona imágenes de servicios).
const serviceImages = [
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1519014816548-bf5e9c1b5be3?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=900&q=85",
];

const gallery = [
  "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1519014816548-bf5e9c1b5be3?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=1000&q=85",
];

const HORAS_DISPONIBLES = [
  "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

const EMPTY_BOOKING = {
  nombres: "",
  apellidos: "",
  telefono: "",
  email: "",
  fecha: "",
  hora_inicio: "",
  especialista_id: "",
  servicios: [],
};

function Brand({ light = false }) {
  return <a className={`public-brand ${light ? "public-brand-light" : ""}`} href="#inicio"><span>Nails</span><small>by</small><strong>Lucero</strong></a>;
}

function PublicSite() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [services, setServices] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingResult, setBookingResult] = useState(null);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    let active = true;

    Promise.all([publicApi.servicios({ page_size: 100 }), publicApi.especialistas({ page_size: 100 })])
      .then(([serviciosRes, especialistasRes]) => {
        if (!active) return;
        const listaServicios = Array.isArray(serviciosRes) ? serviciosRes : serviciosRes.results || [];
        const listaEspecialistas = Array.isArray(especialistasRes) ? especialistasRes : especialistasRes.results || [];
        setServices(listaServicios);
        setEspecialistas(listaEspecialistas);
      })
      .catch(() => {
        if (active) setCatalogError("No se pudo cargar el catálogo. Intenta recargar la página.");
      })
      .finally(() => active && setCatalogLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const toggleServicio = (id) => {
    setBooking((prev) => ({
      ...prev,
      servicios: prev.servicios.includes(id)
        ? prev.servicios.filter((s) => s !== id)
        : [...prev.servicios, id],
    }));
  };

  const handleBookingChange = (event) => {
    const { name, value } = event.target;
    setBooking((prev) => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setBookingError("");
    setBookingResult(null);

    if (booking.servicios.length === 0) {
      setBookingError("Selecciona al menos un servicio.");
      return;
    }

    setBookingLoading(true);
    try {
      const data = await publicApi.reservar({
        nombres: booking.nombres,
        apellidos: booking.apellidos,
        telefono: booking.telefono,
        email: booking.email,
        fecha: booking.fecha,
        hora_inicio: booking.hora_inicio,
        especialista_id: Number(booking.especialista_id),
        servicios: booking.servicios,
      });
      setBookingResult(data);
      setBooking(EMPTY_BOOKING);
    } catch (err) {
      setBookingError(
        err instanceof ApiError
          ? err.message
          : "No se pudo reservar la cita. Intenta nuevamente."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="public-site">
      <header className="public-header">
        <Brand />
        <button className="public-menu-button" aria-label="Abrir menú" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
        <nav className={menuOpen ? "public-nav is-open" : "public-nav"}>
          <a href="#inicio" onClick={closeMenu}>Inicio</a>
          <a href="#servicios" onClick={closeMenu}>Servicios</a>
          <a href="#nosotros" onClick={closeMenu}>Nosotros</a>
          <a href="#galeria" onClick={closeMenu}>Galería</a>
          <a href="#contacto" onClick={closeMenu}>Contacto</a>
          <a className="public-cta" href="#reservar" onClick={closeMenu}>Reservar cita <span>↗</span></a>
        </nav>
      </header>

      <main>
        <section className="public-hero" id="inicio">
          <div className="hero-content">
            <p className="eyebrow">ESTUDIO DE UÑAS · LIMA</p>
            <h1>Tus uñas,<br /><em>tu estilo.</em></h1>
            <p className="hero-copy">Una experiencia de belleza pensada para ti. Cuidamos cada detalle para que te sientas increíble.</p>
            <div className="hero-actions"><a className="button button-primary" href="#reservar">Reservar cita <span>↗</span></a><a className="button button-ghost" href="#servicios">Ver servicios <span>↓</span></a></div>
          </div>
          <div className="hero-note"><span>01</span><i /> Experiencias que se sienten</div>
          <div className="hero-scroll">DESLIZA <span>↓</span></div>
        </section>

        <section className="benefits"><div className="benefit"><span>✦</span><div><strong>Atención personalizada</strong><small>Tu tiempo es nuestro ritual</small></div></div><div className="benefit"><span>◌</span><div><strong>Profesionales especializados</strong><small>Manos expertas y cuidadosas</small></div></div><div className="benefit"><span>◇</span><div><strong>Productos de calidad</strong><small>Resultados que perduran</small></div></div></section>

        <section className="public-section services-section" id="servicios">
          <div className="section-heading"><div><p className="eyebrow">PARA TI</p><h2>Nuestros servicios</h2></div><p>Todo lo que necesitas para cuidar<br />y expresar tu estilo.</p></div>

          {catalogLoading && <p style={{ padding: "0 24px" }}>Cargando servicios...</p>}
          {catalogError && <p style={{ padding: "0 24px", color: "#c0392b" }}>{catalogError}</p>}

          {!catalogLoading && !catalogError && (
            <div className="service-grid">
              {services.map((service, index) => (
                <article className="service-card" key={service.id}>
                  <div className="service-image">
                    <img src={serviceImages[index % serviceImages.length]} alt={service.nombre} />
                    <span>↗</span>
                  </div>
                  <div className="service-info">
                    <div>
                      <h3>{service.nombre}</h3>
                      <p>{service.descripcion}</p>
                    </div>
                    <strong>S/ {service.precio}</strong>
                  </div>
                  <a href="#reservar">Ver detalles <span>→</span></a>
                </article>
              ))}

              {services.length === 0 && <p>Pronto publicaremos nuestro catálogo de servicios.</p>}
            </div>
          )}
        </section>

        <section className="about-section" id="nosotros"><div className="about-image"><img src="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=85" alt="Interior de Nails by Lucero" /><div className="about-stamp">NL<br /><small>EST. 2020</small></div></div><div className="about-copy"><p className="eyebrow">NUESTRA ESENCIA</p><h2>Belleza, cuidado<br /><em>y detalle.</em></h2><p>Creemos que el cuidado personal es una forma de volver a ti. En Nails by Lucero creamos momentos de calma, con manos expertas, productos seleccionados y una atención que se siente personal.</p><div className="about-stats"><div><strong>+500</strong><small>clientas felices</small></div><div><strong>+5</strong><small>años de experiencia</small></div><div><strong>100%</strong><small>dedicación</small></div></div></div></section>

        <section className="public-section gallery-section" id="galeria"><div className="section-heading"><div><p className="eyebrow">INSPIRACIÓN</p><h2>Hecho para mirarte<br /><em>con cariño.</em></h2></div><a className="text-link" href="#reservar">Agenda tu momento <span>↗</span></a></div><div className="gallery-grid">{gallery.map((image, index) => <a className={`gallery-item gallery-${index + 1}`} href={image} target="_blank" rel="noreferrer" key={image}><img src={image} alt={`Diseño de uñas ${index + 1}`} /><span>Ver detalle ↗</span></a>)}</div></section>

        <section className="booking-section" id="reservar">
          <div className="booking-intro">
            <p className="eyebrow">TU MOMENTO</p>
            <h2>Reserva tu<br /><em>cita.</em></h2>
            <p>Cuéntanos qué te gustaría y nos encargaremos del resto. Recibirás un código de reserva al confirmar.</p>
            <div className="booking-contact"><span>¿Tienes alguna duda?</span><a href="#contacto">Conversemos →</a></div>
          </div>

          {bookingResult && (
            <div className="booking-success" style={{ background: "#eaf6ee", border: "1px solid #bfe3cb", borderRadius: 12, padding: 24, maxWidth: 480 }}>
              <h3 style={{ marginTop: 0 }}>¡Cita reservada!</h3>
              <p>Tu código de reserva es:</p>
              <strong style={{ fontSize: "1.4rem", letterSpacing: "0.08em" }}>{bookingResult.codigo_reserva}</strong>
              <p style={{ marginTop: 12 }}>
                {bookingResult.fecha} a las {bookingResult.hora_inicio?.slice(0, 5)} con {bookingResult.especialista_nombre}.
              </p>
              <button className="button button-ghost" onClick={() => setBookingResult(null)} type="button">
                Hacer otra reserva
              </button>
            </div>
          )}

          {!bookingResult && (
            <form className="booking-form" onSubmit={handleBookingSubmit}>
              {bookingError && (
                <p style={{ color: "#c0392b", background: "#fbeceb", border: "1px solid #f3c3c0", borderRadius: 8, padding: "10px 14px" }}>
                  {bookingError}
                </p>
              )}

              <div className="form-row">
                <label>
                  Nombre completo
                  <input name="nombres" placeholder="Tu nombre" value={booking.nombres} onChange={handleBookingChange} required />
                </label>
                <label>
                  Apellidos
                  <input name="apellidos" placeholder="Tus apellidos" value={booking.apellidos} onChange={handleBookingChange} required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Teléfono
                  <input name="telefono" placeholder="+51 999 999 999" value={booking.telefono} onChange={handleBookingChange} required />
                </label>
                <label>
                  Correo electrónico
                  <input type="email" name="email" placeholder="tu@email.com" value={booking.email} onChange={handleBookingChange} />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Especialista
                  <select name="especialista_id" value={booking.especialista_id} onChange={handleBookingChange} required>
                    <option value="" disabled>Selecciona un especialista</option>
                    {especialistas.map((especialista) => (
                      <option key={especialista.id} value={especialista.id}>
                        {especialista.nombres} {especialista.apellidos}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Servicios
                  <select
                    multiple
                    value={booking.servicios.map(String)}
                    onChange={(event) => {
                      const values = Array.from(event.target.selectedOptions).map((o) => Number(o.value));
                      setBooking((prev) => ({ ...prev, servicios: values }));
                    }}
                    required
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>{service.nombre}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Fecha
                  <input type="date" name="fecha" value={booking.fecha} onChange={handleBookingChange} required />
                </label>
                <label>
                  Hora
                  <select name="hora_inicio" value={booking.hora_inicio} onChange={handleBookingChange} required>
                    <option value="" disabled>Selecciona un horario</option>
                    {HORAS_DISPONIBLES.map((hora) => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </label>
              </div>

              <button className="button button-primary" type="submit" disabled={bookingLoading}>
                {bookingLoading ? "Reservando..." : "Confirmar reserva"} <span>↗</span>
              </button>
            </form>
          )}
        </section>

        <section className="contact-section" id="contacto"><div><p className="eyebrow">ENCUÉNTRANOS</p><h2>Tu próximo ritual<br /><em>empieza aquí.</em></h2></div><div className="contact-details"><div><span>Dirección</span><strong>Av. Primavera 123, Surco<br />Lima, Perú</strong></div><div><span>Horario de atención</span><strong>Lun - Sáb · 9:00 a. m. - 7:00 p. m.</strong></div><div><span>Contacto</span><strong>+51 987 654 321<br />hola@nailsbylucero.pe</strong></div></div><div className="map-card"><span>NL</span><p>Av. Primavera<br />Surco, Lima</p><a href="https://maps.google.com" target="_blank" rel="noreferrer">Ver ubicación ↗</a></div></section>
      </main>

      <footer className="public-footer"><div><Brand light /><p>Un espacio para cuidar<br />de ti, con intención.</p></div><div className="footer-links"><div><span>Explora</span><a href="#servicios">Servicios</a><a href="#nosotros">Nosotros</a><a href="#galeria">Galería</a></div><div><span>Conecta</span><a href="#contacto">Contacto</a><a href="#reservar">Reservar cita</a><a href="#dashboard">Acceso admin</a></div></div><div className="footer-bottom"><span>© 2026 Nails by Lucero</span><span>Hecho con cuidado en Lima</span></div></footer>
    </div>
  );
}

export default PublicSite;
