// src/components/Historial.jsx
import React, { useState, useEffect, useMemo } from "react";
import "../styles/historial.css";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import {
  FaChartBar,
  FaClock,
  FaSearch,
  FaClipboardList,
} from "react-icons/fa";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { esAdmin } from "../utils/permisos";

const Historial = () => {
  const [productos, setProductos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [recepciones, setRecepciones] = useState([]); 
  const [departamentos, setDepartamentos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [mostrarModalMovimientos, setMostrarModalMovimientos] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [busquedaMov, setBusquedaMov] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");
  const [paginaMov, setPaginaMov] = useState(1);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const MOVS_POR_PAGINA = 5;
  const admin = esAdmin();

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [p, r, d, a, rec, m] = await Promise.all([
        axiosClient.get("/productos"),
        axiosClient.get("/responsables"),
        axiosClient.get("/departamentos"),
        axiosClient.get("/asignaciones"),
        axiosClient.get("/recepciones"), 
        axiosClient.get("/movimientos"),
      ]);

      setProductos(p.data || []);
      setResponsables(r.data || []);
      setDepartamentos(d.data || []);
      setAsignaciones(a.data || []);
      setRecepciones(rec.data || []); 
      setMovimientos(m.data || []);
    } catch (error) {
      toast.error("Error al cargar datos del historial");
    } finally {
      setTimeout(() => setCargando(false), 500);
    }
  };

  const getNombreUsuario = (usuarioField) => {
    if (!usuarioField) return "Usuario desconocido";
    if (typeof usuarioField === "string") return usuarioField;

    if (typeof usuarioField === "object") {
      const nombre = usuarioField.nombre || "";
      const apellido = usuarioField.apellido || "";
      const completo = `${nombre} ${apellido}`.trim();
      if (completo) return completo;
    }

    const user = responsables.find(
      (r) => r.id === usuarioField || r.id === usuarioField?.id
    );
    return user ? `${user.nombre} ${user.apellido}` : "Usuario desconocido";
  };

  const activos = productos.filter((p) => p.estado === "Activo").length;
  const inactivos = productos.filter((p) => p.estado === "Inactivo").length;
  const normalizarAccion = (accion) => (accion || "").toString().toLowerCase();
  const conteoMovimientos = useMemo(() => {
    const arr = movimientos || [];
    const total = arr.length;

    const recep = arr.filter((m) =>
      normalizarAccion(m.accion).includes("recep")
    ).length;

    const asig = arr.filter((m) =>
      normalizarAccion(m.accion).includes("asign")
    ).length;

    const prod = arr.filter((m) =>
      normalizarAccion(m.accion).includes("producto")
    ).length;

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
      getNombreUsuario(m.usuario).toLowerCase().includes(texto);

    const coincideAccion = filtroAccion ? m.accion === filtroAccion : true;

    const fechaMov = new Date(m.fecha);
    let coincideFecha = true;

    if (fechaDesde) {
      const desde = new Date(fechaDesde + "T00:00:00");
      if (fechaMov < desde) coincideFecha = false;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta + "T23:59:59");
      if (fechaMov > hasta) coincideFecha = false;
    }

    return coincideBusqueda && coincideAccion && coincideFecha;
  });
  const totalPaginasMovCalculado = Math.ceil(
    movimientosFiltrados.length / MOVS_POR_PAGINA
  );
  const totalPaginasMov = totalPaginasMovCalculado || 0;

  const getPaginasMostradas = () => {
    const maxBotones = 10;
    const total = totalPaginasMov;
    const actual = paginaMov;

    if (total === 0) return [];

    if (total <= maxBotones) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const paginas = [];
    paginas.push(1);

    let inicio = Math.max(2, actual - 2);
    let fin = Math.min(total - 1, actual + 2);

    if (inicio > 2) paginas.push("izq-ellipsis");

    for (let i = inicio; i <= fin; i++) paginas.push(i);

    if (fin < total - 1) paginas.push("der-ellipsis");

    paginas.push(total);
    return paginas;
  };

  const paginasMostradas = getPaginasMostradas();

  const indiceUltimoMov = paginaMov * MOVS_POR_PAGINA;
  const indicePrimeroMov = indiceUltimoMov - MOVS_POR_PAGINA;

  const paginaMovimientos = movimientosFiltrados.slice(
    indicePrimeroMov,
    indiceUltimoMov
  );

  const accionesUnicas = [...new Set(movimientos.map((m) => m.accion))].filter(
    Boolean
  );

  const exportarExcelMovimientos = () => {
    if (!admin) {
      toast.info("Solo lectura: no puedes exportar el historial");
      return;
    }

    if (movimientosFiltrados.length === 0) {
      toast.info("No hay movimientos para exportar");
      return;
    }

    const datosExport = movimientosFiltrados.map((m) => ({
      Acción: m.accion,
      Descripción: m.descripcion,
      Usuario: getNombreUsuario(m.usuario),
      Fecha: new Date(m.fecha).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "movimientos_sistema.xlsx");
    toast.success("Historial exportado correctamente");
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="content content-historial">
          <h2 className="titulo-seccion">Historial General del Sistema</h2>

          <div className="cards-grid-hi">
            <div className="card">
              <FaChartBar className="card-icon" />
              <h2>{responsables.length}</h2>
              <p>Responsables</p>
            </div>

            <div className="card">
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

            <div className="card">
              <FaChartBar className="card-icon" />
              <h2>Total Productos</h2>
              <p>
                <strong>Activos:</strong> {activos}
              </p>
              <p>
                <strong>Inactivos:</strong> {inactivos}
              </p>
            </div>
            {admin && (
              <div
                className="card clickable"
                onClick={() => setMostrarModalMovimientos(true)}
              >
                <FaClock className="card-icon" />
                <h2>Movimientos</h2>
                <p className="contador-mov">{conteoMovimientos.total}</p>
                <p>Registros totales</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {mostrarModalMovimientos && admin && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalMovimientos(false)}
        >
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

                    <button
                      className="btn-excel-exportar btn-excel-inline"
                      onClick={exportarExcelMovimientos}
                    >
                      Exportar Excel
                    </button>
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
                              <td>{getNombreUsuario(m.usuario)}</td>
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

                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando{" "}
                      {movimientosFiltrados.length === 0
                        ? 0
                        : indicePrimeroMov + 1}{" "}
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
                        disabled={
                          paginaMov === totalPaginasMov ||
                          movimientosFiltrados.length === 0
                        }
                        onClick={() =>
                          setPaginaMov((prev) =>
                            Math.min(prev + 1, totalPaginasMov || 1)
                          )
                        }
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
    </div>
  );
};

export default Historial;
