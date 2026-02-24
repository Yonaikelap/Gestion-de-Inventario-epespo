// src/components/Historial.jsx
import React, { useState, useEffect, useMemo } from "react";
import "../styles/historial.css";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { FaChartBar, FaClock, FaSearch, FaClipboardList } from "react-icons/fa";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";

const Historial = () => {
  const [mostrarModalResponsables, setMostrarModalResponsables] = useState(false);
  const [mostrarModalDepartamentos, setMostrarModalDepartamentos] = useState(false);
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false);
  const [mostrarModalMovimientos, setMostrarModalMovimientos] = useState(false);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDonado, setFiltroDonado] = useState("");

  const [productos, setProductos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [busquedaMov, setBusquedaMov] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");
  const [paginaMov, setPaginaMov] = useState(1);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const MOVS_POR_PAGINA = 5;

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [p, r, d, a, rec, m, u] = await Promise.all([
        axiosClient.get("/productos"),
        axiosClient.get("/responsables"),
        axiosClient.get("/departamentos"),
        axiosClient.get("/asignaciones"),
        axiosClient.get("/recepciones"),
        axiosClient.get("/movimientos"),
        axiosClient.get("/usuarios"),
      ]);

      setProductos(p.data || []);
      setResponsables(r.data || []);
      setDepartamentos(d.data || []);
      setAsignaciones(a.data || []);
      setRecepciones(rec.data || []);
      setMovimientos(m.data || []);
      setUsuarios(u.data || []);
    } catch (error) {
      toast.error("Error al cargar datos del historial");
    } finally {
      setTimeout(() => setCargando(false), 500);
    }
  };

  const getNombreUsuario = (mov) => {
    if (typeof mov === "string") return mov;
    if (mov?.usuarioRel?.nombre) return mov.usuarioRel.nombre;
    if (mov?.usuario_id && usuarios.length > 0) {
      const user = usuarios.find(u => u.id === mov.usuario_id);
      return user ? user.nombre : "Usuario desconocido";
    }
    return "Usuario desconocido";
  };

  const activos = productos.filter((p) => p.estado === "Activo").length;
  const inactivos = productos.filter((p) => p.estado === "Inactivo").length;

  const normalizarAccion = (accion) => (accion || "").toString().toLowerCase();
  const conteoMovimientos = useMemo(() => {
    const arr = movimientos || [];
    const total = arr.length;
    const recep = arr.filter((m) => normalizarAccion(m.accion).includes("recep")).length;
    const asig = arr.filter((m) => normalizarAccion(m.accion).includes("asign")).length;
    const prod = arr.filter((m) => normalizarAccion(m.accion).includes("producto")).length;
    return { total, recep, asig, prod };
  }, [movimientos]);

  const movimientosOrdenados = [...movimientos].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );

  const movimientosFiltrados = movimientosOrdenados.filter((m) => {
    const texto = (busquedaMov || "").toLowerCase();
    const coincideBusqueda =
      (m.accion || "").toLowerCase().includes(texto) ||
      (m.descripcion || "").toLowerCase().includes(texto) ||
      getNombreUsuario(m).toLowerCase().includes(texto);

    const coincideAccion = filtroAccion ? m.accion === filtroAccion : true;

    const fechaMov = new Date(m.fecha);
    let coincideFecha = true;
    if (fechaDesde && fechaMov < new Date(fechaDesde + "T00:00:00")) coincideFecha = false;
    if (fechaHasta && fechaMov > new Date(fechaHasta + "T23:59:59")) coincideFecha = false;

    return coincideBusqueda && coincideAccion && coincideFecha;
  });

  const totalPaginasMov = Math.ceil(movimientosFiltrados.length / MOVS_POR_PAGINA) || 0;

  const getPaginasMostradas = () => {
    const maxBotones = 10;
    if (totalPaginasMov === 0) return [];
    if (totalPaginasMov <= maxBotones) return Array.from({ length: totalPaginasMov }, (_, i) => i + 1);

    const paginas = [1];
    let inicio = Math.max(2, paginaMov - 2);
    let fin = Math.min(totalPaginasMov - 1, paginaMov + 2);

    if (inicio > 2) paginas.push("izq-ellipsis");
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    if (fin < totalPaginasMov - 1) paginas.push("der-ellipsis");
    paginas.push(totalPaginasMov);
    return paginas;
  };

  const paginasMostradas = getPaginasMostradas();
  const indiceUltimoMov = paginaMov * MOVS_POR_PAGINA;
  const indicePrimeroMov = indiceUltimoMov - MOVS_POR_PAGINA;
  const paginaMovimientos = movimientosFiltrados.slice(indicePrimeroMov, indiceUltimoMov);

  const accionesUnicas = [...new Set(movimientos.map((m) => m.accion))].filter(Boolean);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="content content-historial">
          <h2 className="titulo-seccion">Historial General del Sistema</h2>

          <div className="cards-grid-hi">
            <div className="card clickable" onClick={() => setMostrarModalResponsables(true)}>
              <FaChartBar className="card-icon" />
              <h2>{responsables.length}</h2>
              <p>Responsables</p>
            </div>

            <div className="card clickable" onClick={() => setMostrarModalDepartamentos(true)}>
              <FaChartBar className="card-icon" />
              <h2>{departamentos.length}</h2>
              <p>Departamentos</p>
            </div>

            <div className="card">
              <FaChartBar className="card-icon" />
              <h2>{asignaciones.length}</h2>
              <p>Asignaciones</p>
            </div>

            <div className="card">
              <FaClipboardList className="card-icon" />
              <h2>{recepciones.length}</h2>
              <p>Recepciones</p>
            </div>

            <div className="card clickable" onClick={() => setMostrarModalProductos(true)}>
              <FaChartBar className="card-icon" />
              <h2>Total Bienes: {productos.length}</h2>
              <p>
                <strong>Activos:</strong> {activos} | <strong>Inactivos:</strong> {inactivos}
              </p>
              
              <div style={{ fontSize: 12, marginTop: 10, lineHeight: 1.8, opacity: 0.85 }}>
                <p>Equipo Computo: <strong>{productos.filter(p => p.categoria === "Equipo de Computo").length}</strong></p>
                <p>Equipo Oficina: <strong>{productos.filter(p => p.categoria === "Equipo de Oficina").length}</strong></p>
                <p>Muebles y Enseres: <strong>{productos.filter(p => p.categoria === "Muebles y Enseres").length}</strong></p>
                <p>Instalaciones: <strong>{productos.filter(p => p.categoria === "Instalaciones, Maquinarias y Herramientass").length}</strong></p>
              </div>
            </div>

            <div className="card clickable" onClick={() => setMostrarModalMovimientos(true)}>
              <FaClock className="card-icon" />
              <h2>Movimientos</h2>
              <p className="contador-mov">{conteoMovimientos.total}</p>
              <p>Registros totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MOVIMIENTOS */}
      {mostrarModalMovimientos && (
        <div className="modal-overlay" onClick={() => setMostrarModalMovimientos(false)}>
          <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Movimientos del Sistema</h2>
            </div>

            <div className="modal-body">
              {cargando ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando movimientos...</p>
                </div>
              ) : (
                <>
                  <div className="filtro-bar filtro-bar-inline">
                    <div className="busqueda-contenedor-hi filtro-busqueda-flex">
                      <FaSearch className="icono-busqueda-hi" />
                      <input
                        type="text"
                        placeholder="Buscar por acción, usuario o descripción..."
                        value={busquedaMov}
                        onChange={(e) => {
                          setBusquedaMov(e.target.value);
                          setPaginaMov(1);
                        }}
                        className="input-busqueda-hi"
                      />
                    </div>

                    <div className="filtro-fecha">
                      <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => {
                          setFechaDesde(e.target.value);
                          setPaginaMov(1);
                        }}
                      />
                    </div>

                    <div className="filtro-fecha">
                      <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => {
                          setFechaHasta(e.target.value);
                          setPaginaMov(1);
                        }}
                      />
                    </div>

                    <select
                      className="select-filtro-hi"
                      value={filtroAccion}
                      onChange={(e) => {
                        setFiltroAccion(e.target.value);
                        setPaginaMov(1);
                      }}
                    >
                      <option value="">Todas las acciones</option>
                      {accionesUnicas.map((accion, i) => (
                        <option key={i} value={accion}>
                          {accion}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          <th>Acción</th>
                          <th>Descripción</th>
                          <th>Usuario</th>
                          <th>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginaMovimientos.length > 0 ? (
                          paginaMovimientos.map((m, i) => (
                            <tr key={i}>
                              <td>{m.accion}</td>
                              <td>{m.descripcion}</td>
                              <td>{getNombreUsuario(m)}</td>
                              <td>{new Date(m.fecha).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center" }}>
                              No hay movimientos registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINACIÓN */}
                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando{" "}
                      {movimientosFiltrados.length === 0 ? 0 : indicePrimeroMov + 1}{" "}
                      a{" "}
                      {movimientosFiltrados.length === 0
                        ? 0
                        : Math.min(indiceUltimoMov, movimientosFiltrados.length)}{" "}
                      de {movimientosFiltrados.length} movimientos
                    </span>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaMov === 1 || movimientosFiltrados.length === 0}
                        onClick={() => setPaginaMov((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

                      {paginasMostradas.map((item, idx) => {
                        if (item === "izq-ellipsis" || item === "der-ellipsis") {
                          return (
                            <span key={idx} className="page-ellipsis">
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={idx}
                            className={`page-btn ${paginaMov === item ? "active" : ""}`}
                            onClick={() => setPaginaMov(item)}
                          >
                            {item}
                          </button>
                        );
                      })}

                      <button
                        className="page-btn"
                        disabled={paginaMov === totalPaginasMov || movimientosFiltrados.length === 0}
                        onClick={() => setPaginaMov((prev) => Math.min(prev + 1, totalPaginasMov || 1))}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPONSABLES */}
{mostrarModalResponsables && (
  <div
    className="modal-overlay"
    onClick={() => setMostrarModalResponsables(false)}
  >
    <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title">Listado de Responsables</h2>
      </div>

      <div className="modal-body">
        {cargando ? (
          <div className="tabla-cargando">
            <div className="spinner"></div>
            <p>Cargando responsables...</p>
          </div>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla-elegante">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Cédula</th>
                  <th>Cargo</th>
                </tr>
              </thead>
              <tbody>
                {responsables.length > 0 ? (
                  responsables.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.nombre}</td>
                      <td>{r.apellido}</td>
                      <td>{r.cedula || "-"}</td>
                      <td>{r.cargo || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      No hay responsables registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
)}
{/* MODAL DEPARTAMENTOS */}
{mostrarModalDepartamentos && (
  <div
    className="modal-overlay"
    onClick={() => setMostrarModalDepartamentos(false)}
  >
    <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title">Listado de Departamentos</h2>
      </div>

      <div className="modal-body">
        {cargando ? (
          <div className="tabla-cargando">
            <div className="spinner"></div>
            <p>Cargando departamentos...</p>
          </div>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla-elegante">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre del Departamento</th>
                  <th>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {departamentos.length > 0 ? (
                  departamentos.map((d, i) => (
                    <tr key={d.id}>
                      <td>{i + 1}</td>
                      <td>{d.nombre}</td>
                      <td>{d.ubicacion || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center" }}>
                      No hay departamentos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
)}
{/* MODAL PRODUCTOS */}
{mostrarModalProductos && (
  <div
    className="modal-overlay"
    onClick={() => setMostrarModalProductos(false)}
  >
    <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2 className="modal-title">Listado de Productos</h2>
      </div>

      <div className="modal-body">
        {/* FILTROS */}
        <div className="filtro-bar filtro-bar-inline">
          {/* Input de búsqueda */}
          <div className="busqueda-contenedor-de">
            <FaSearch className="icono-busqueda-de" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              className="input-busqueda-de"
            />
          </div>

          {/* Filtro por categoría */}
          <select
            id="categoriaSelect"
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="input-busqueda-def"
          >
            <option value="">Todas las categorías</option>
            <option value="Equipo de Computo">Equipo de Computo</option>
            <option value="Equipo de Oficina">Equipo de Oficina</option>
            <option value="Muebles y Enseres">Muebles y Enseres</option>
            <option value="Instalaciones, Maquinarias y Herramientass">
              Instalaciones, Maquinarias y Herramientas
            </option>
          </select>

          {/* Filtro por estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-busqueda-def"
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          {/* Filtro por donado */}
          <select
            value={filtroDonado}
            onChange={(e) => setFiltroDonado(e.target.value)}
            className="input-busqueda-def"
          >
            <option value="">Todos los bienes</option>
            <option value="donado">Solo Donados</option>
            <option value="comprado">No Donados</option>
          </select>
        </div>

        {/* TABLA */}
        <div className="tabla-scroll">
          <table className="tabla-elegante">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Código Antiguo</th>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Categoría</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos
                .filter(
                  (p) =>
                    (!categoriaSeleccionada || p.categoria === categoriaSeleccionada) &&
                    (!busquedaProducto ||
                      p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())) &&
                    (!filtroEstado || p.estado === filtroEstado) &&
                    (!filtroDonado || (filtroDonado === "donado" ? p.es_donado : !p.es_donado))
                )
                .map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>{p.codigo}</td>
                    <td className="td-center">
                      {p.codigo_anterior && p.codigo_anterior.trim() !== "" ? (
                        <span className="codigo-anterior">{p.codigo_anterior}</span>
                      ) : (
                        <span className="sin-codigo">—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{p.nombre}</span>
                        {p.es_donado && (
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: 11,
                            fontWeight: "bold",
                            backgroundColor: "#E8F5E9",
                            color: "#2E7D32",
                            whiteSpace: "nowrap"
                          }}>
                            Donado
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{p.ubicacion_texto || "-"}</td>
                    <td>{p.categoria || "-"}</td>
                    <td>
                      <div
                        className={`estado-indicador ${
                          p.estado === "Activo"
                            ? "estado-activo"
                            : "estado-inactivo"
                        }`}
                      >
                        <span className="estado-circulo"></span>
                        {p.estado}
                      </div>
                    </td>
                  </tr>
                ))}
              {productos.filter(
                (p) =>
                  (!categoriaSeleccionada || p.categoria === categoriaSeleccionada) &&
                  (!busquedaProducto ||
                    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())) &&
                  (!filtroEstado || p.estado === filtroEstado) &&
                  (!filtroDonado || (filtroDonado === "donado" ? p.es_donado : !p.es_donado))
              ).length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No hay productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default Historial;
