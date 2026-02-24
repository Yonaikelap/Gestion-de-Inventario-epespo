import React, { useState, useEffect, useMemo } from "react";
import "../styles/AgregarProducto.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { FaTrash, FaBoxOpen, FaSearch, FaPowerOff } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosCliente from "../api/axiosClient";
import { esAdmin } from "../utils/permisos";
import { useNotificaciones } from "../context/NotificacionesContext";
import Swal from "sweetalert2";

const GestionBajas = () => {
  const [productos, setProductos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [asignacionesActuales, setAsignacionesActuales] = useState([]);
  const [mostrarModalGestionBaja, setMostrarModalGestionBaja] = useState(false);
  const [mostrarModalBienesInactivos, setMostrarModalBienesInactivos] = useState(false);
  const [mostrarModalBaja, setMostrarModalBaja] = useState(false);
  const [productoBaja, setProductoBaja] = useState(null);
  const [motivoBaja, setMotivoBaja] = useState("");
  const [busquedaBaja, setBusquedaBaja] = useState("");
  const [busquedaInactivos, setBusquedaInactivos] = useState("");
  const [filtroCategoriaActivos, setFiltroCategoriaActivos] = useState("");
  const [filtroUbicacionActivos, setFiltroUbicacionActivos] = useState("");
  const [filtroCategoriaInactivos, setFiltroCategoriaInactivos] = useState("");
  const [filtroUbicacionInactivos, setFiltroUbicacionInactivos] = useState("");
  const [cargandoBase, setCargandoBase] = useState(false);
  const [cargandoOcupados, setCargandoOcupados] = useState(false);
  const [guardandoBaja, setGuardandoBaja] = useState(false);
  const registrosPorPagina = 5;
  const [paginaActivos, setPaginaActivos] = useState(1);
  const [paginaInactivos, setPaginaInactivos] = useState(1);
  const admin = esAdmin();
  const { agregarNotificacion } = useNotificaciones();
  const buildOcupadosSet = (arr) => {
    const s = new Set();
    (arr || []).forEach((row) => {
      if (row?.producto_id != null) s.add(Number(row.producto_id));
    });
    return s;
  };
  useEffect(() => {
    fetchBase();
  }, []);
  const fetchBase = async () => {
    setCargandoBase(true);
    try {
      const [p, d, a] = await Promise.all([
        axiosCliente.get("/productos"),
        axiosCliente.get("/departamentos"),
        axiosCliente.get("/producto-asignaciones-actuales"),
      ]);
      setProductos(p.data || []);
      setDepartamentos(d.data || []);
      setAsignacionesActuales(a.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos");
    } finally {
      setCargandoBase(false);
    }
  };
  const fetchProductos = async () => {
    try {
      setCargandoBase(true);
      const { data } = await axiosCliente.get("/productos");
      setProductos(data || []);
    } catch (error) {
      console.error("Error al cargar productos", error);
      toast.error("Error al cargar productos");
    } finally {
      setCargandoBase(false);
    }
  };
  const fetchAsignacionesActuales = async ({ showLoading = false } = {}) => {
    try {
      if (showLoading) setCargandoOcupados(true);
      const { data } = await axiosCliente.get("/producto-asignaciones-actuales");
      const arr = data || [];
      setAsignacionesActuales(arr);
      return arr;
    } catch (error) {
      console.error(error);
      if (showLoading) toast.error("Error al cargar asignaciones actuales");
      return [];
    } finally {
      if (showLoading) setCargandoOcupados(false);
    }
  };
  const setOcupados = useMemo(() => buildOcupadosSet(asignacionesActuales), [asignacionesActuales]);

  // ✅ Mapa de departamentos (O(1) en vez de find por fila)
  const departamentosMap = useMemo(() => {
    const m = new Map();
    (departamentos || []).forEach((d) => {
      m.set(Number(d.id), d.ubicacion);
    });
    return m;
  }, [departamentos]);

  const abrirModalGestionBaja = () => {
    if (!admin) {
      toast.info("Solo lectura: no puedes dar de baja ");
      return;
    }
    setMostrarModalGestionBaja(true);
    fetchAsignacionesActuales({ showLoading: true });
  };

  const abrirModalBienesInactivos = () => {
    setMostrarModalBienesInactivos(true);
  };

  const abrirModalBaja = async (productoSeleccionado) => {
    if (!admin) {
      toast.info("Solo lectura: no puedes dar de baja ");
      return;
    }
    const fresh = await fetchAsignacionesActuales({ showLoading: true });
    const ocupadosFresh = buildOcupadosSet(fresh);

    if (ocupadosFresh.has(Number(productoSeleccionado.id))) {
      toast.warning("No puedes dar de baja este bien porque está asignado actualmente.");
      return;
    }

    setProductoBaja(productoSeleccionado);
    setMotivoBaja("");
    setMostrarModalBaja(true);
    
  };

  const obtenerUbicacionTexto = (item) => {
    if (item?.ubicacion_texto) return item.ubicacion_texto;
    return departamentosMap.get(Number(item?.ubicacion_id)) || "Sin ubicación";
  };

  const validarMotivo = (txt) => {
    const t = (txt || "").trim();
    if (!t) return "Debe ingresar un motivo de baja.";
    if (t.length < 10) return "El motivo debe tener al menos 10 caracteres.";
    if (t.length > 500) return "El motivo no debe superar 500 caracteres.";
    return null;
  };

  const darDeBajaProducto = async () => {
    if (!admin) {
      toast.warning("Solo lectura: no puedes dar de baja ");
      return;
    }
    if (!productoBaja) return;

    const errMotivo = validarMotivo(motivoBaja);
    if (errMotivo) {
      toast.warning(errMotivo);
      return;
    }
    const fresh = await fetchAsignacionesActuales({ showLoading: true });
    const ocupadosFresh = buildOcupadosSet(fresh);

    if (ocupadosFresh.has(Number(productoBaja.id))) {
      toast.warning("No puedes dar de baja: el bien se asignó mientras estabas aquí.");
      setMostrarModalBaja(false);
      return;
    }
setMostrarModalBaja(false);

const confirm = await Swal.fire({
  title: "¿Confirmar baja?",
  text: "Este bien pasará a estado INACTIVO.",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Sí, dar de baja",
  cancelButtonText: "Cancelar",
  confirmButtonColor: "#d33",
});
if (!confirm.isConfirmed) {
  setMostrarModalBaja(true);
  return;
}


    setGuardandoBaja(true);
    const toastId = toast.loading("Dando de baja...");

    try {
      await axiosCliente.put(`/productos/${productoBaja.id}`, {
        ...productoBaja,
        estado: "Inactivo",
        motivo_baja: motivoBaja.trim(),
        // fecha_baja: backend
      });

      await fetchProductos();

      toast.update(toastId, {
        render: "Producto dado de baja",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });

      setMostrarModalBaja(false);
      setMotivoBaja("");

      agregarNotificacion({
        titulo: "Producto dado de baja",
        mensaje: `${productoBaja.codigo} - ${productoBaja.nombre} | Motivo: ${motivoBaja.trim()}`,
        fecha: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error al dar de baja:", error);
      toast.update(toastId, {
        render: "Error al dar de baja",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setGuardandoBaja(false);
    }
  };

  // 🔹 Activos / Inactivos
  const productosActivos = productos.filter((p) => (p.estado || "Activo") === "Activo");
  const productosInactivos = productos.filter((p) => p.estado === "Inactivo");

  const categoriasActivos = [...new Set(productosActivos.map((p) => p.categoria).filter(Boolean))];
  const categoriasInactivos = [...new Set(productosInactivos.map((p) => p.categoria).filter(Boolean))];

  const ubicacionesActivos = [
    ...new Set(productosActivos.map((p) => obtenerUbicacionTexto(p)).filter((u) => u && u !== "Sin ubicación")),
  ];
  const ubicacionesInactivos = [
    ...new Set(productosInactivos.map((p) => obtenerUbicacionTexto(p)).filter((u) => u && u !== "Sin ubicación")),
  ];

  const productosActivosFiltrados = productosActivos.filter((p) => {
    const texto = `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase();
    const coincideTexto = texto.includes(busquedaBaja.toLowerCase());

    const coincideCategoria = filtroCategoriaActivos ? p.categoria === filtroCategoriaActivos : true;

    const ubicacionTexto = obtenerUbicacionTexto(p);
    const coincideUbicacion = filtroUbicacionActivos ? ubicacionTexto === filtroUbicacionActivos : true;

    return coincideTexto && coincideCategoria && coincideUbicacion;
  });

  const productosInactivosFiltrados = productosInactivos.filter((p) => {
    const texto = `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase();
    const coincideTexto = texto.includes(busquedaInactivos.toLowerCase());

    const coincideCategoria = filtroCategoriaInactivos ? p.categoria === filtroCategoriaInactivos : true;

    const ubicacionTexto = obtenerUbicacionTexto(p);
    const coincideUbicacion = filtroUbicacionInactivos ? ubicacionTexto === filtroUbicacionInactivos : true;

    return coincideTexto && coincideCategoria && coincideUbicacion;
  });

  useEffect(() => setPaginaActivos(1), [
    busquedaBaja,
    filtroCategoriaActivos,
    filtroUbicacionActivos,
    productosActivosFiltrados.length,
  ]);

  useEffect(() => setPaginaInactivos(1), [
    busquedaInactivos,
    filtroCategoriaInactivos,
    filtroUbicacionInactivos,
    productosInactivosFiltrados.length,
  ]);

  const indexFinalActivos = paginaActivos * registrosPorPagina;
  const indexInicioActivos = indexFinalActivos - registrosPorPagina;
  const activosPagina = productosActivosFiltrados.slice(indexInicioActivos, indexFinalActivos);
  const totalPaginasActivos = Math.ceil(productosActivosFiltrados.length / registrosPorPagina);
//  const paginasActivos =
  //  totalPaginasActivos > 0 ? Array.from({ length: totalPaginasActivos }, (_, i) => i + 1) : [];

  const indexFinalInactivos = paginaInactivos * registrosPorPagina;
  const indexInicioInactivos = indexFinalInactivos - registrosPorPagina;
  const inactivosPagina = productosInactivosFiltrados.slice(indexInicioInactivos, indexFinalInactivos);
  const totalPaginasInactivos = Math.ceil(productosInactivosFiltrados.length / registrosPorPagina);
  //const paginasInactivos =
  // totalPaginasInactivos > 0 ? Array.from({ length: totalPaginasInactivos }, (_, i) => i + 1) : [];
const obtenerPaginasVisibles = (paginaActual, totalPaginas, rango = 2) => {
  const paginas = [];

  const inicio = Math.max(1, paginaActual - rango);
  const fin = Math.min(totalPaginas, paginaActual + rango);

  if (inicio > 1) {
    paginas.push(1);
    if (inicio > 2) paginas.push("...");
  }

  for (let i = inicio; i <= fin; i++) {
    paginas.push(i);
  }

  if (fin < totalPaginas) {
    if (fin < totalPaginas - 1) paginas.push("...");
    paginas.push(totalPaginas);
  }

  return paginas;
};

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content">
          <div className="cards-grid">
            <div className="cards-row">
              {admin && (
                <div className="card clickable" onClick={abrirModalGestionBaja}>
                  <FaPowerOff className="card-icon" />
                  <h2 className="card-title">Dar de baja</h2>
                  <p className="card-subtitle">Gestionar baja de los bienes</p>
                </div>
              )}
              <div className="card clickable" onClick={abrirModalBienesInactivos}>
                <FaBoxOpen className="card-icon" />
                <h2 className="card-title">Bienes dados de baja</h2>
                <p className="card-subtitle">Ver bienes inactivos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🟥 Modal: Gestión de baja (bienes activos) */}
      {mostrarModalGestionBaja && (
        <div className="modal-overlay-pro" onClick={() => setMostrarModalGestionBaja(false)}>
          <div className="modal-tabla-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Dar de baja bienes</h2>
            </div>

            <div className="modal-body">
              {cargandoBase ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando productos...</p>
                </div>
              ) : (
                <>
                  {/* ✅ indicador leve mientras actualiza ocupados */}
                  {cargandoOcupados && (
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
                      Actualizando asignaciones...
                    </div>
                  )}

                  <div className="filtro-bar">
                    <div className="busqueda-contenedor-pro">
                      <FaSearch className="icono-busqueda-pro" />
                      <input
                        type="text"
                        placeholder="Buscar por código, nombre o categoría..."
                        value={busquedaBaja}
                        onChange={(e) => setBusquedaBaja(e.target.value)}
                        className="input-busqueda-pro"
                      />
                    </div>

                    <div className="filtros-extra">
                      <select
                        className="select-filtro"
                        value={filtroCategoriaActivos}
                        onChange={(e) => setFiltroCategoriaActivos(e.target.value)}
                      >
                        <option value="">Todas las categorías</option>
                        {categoriasActivos.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <select
                        className="select-filtro"
                        value={filtroUbicacionActivos}
                        onChange={(e) => setFiltroUbicacionActivos(e.target.value)}
                      >
                        <option value="">Todas las ubicaciones</option>
                        {ubicacionesActivos.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Categoría</th>
                          <th>Ubicación</th>
                          <th>Estado</th>
                          {admin && <th>Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {activosPagina.length > 0 ? (
                          activosPagina.map((item) => {
                            const ocupado = setOcupados.has(Number(item.id));
                            return (
                              <tr key={item.id} style={ocupado ? { opacity: 0.65 } : undefined}>
                                <td>{item.codigo}</td>
                                <td>
                                  {item.nombre}
                                  {item.es_donado && <span className="donacion-badge">Donado</span>}
                                  {ocupado && (
                                    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
                                      (Asignado)
                                    </span>
                                  )}
                                </td>
                                <td>{item.categoria}</td>
                                <td>{obtenerUbicacionTexto(item)}</td>
                                <td>
                                  <span className="estado-indicador estado-activo">
                                    <span className="estado-circulo"></span>
                                    Activo
                                  </span>
                                </td>
                                {admin && (
                                  <td>
                                    <button
                                      className="btn-accion eliminar"
                                      onClick={() => abrirModalBaja(item)}
                                      title={ocupado ? "No se puede: está asignado" : "Dar de baja producto"}
                                      disabled={ocupado}
                                      style={ocupado ? { cursor: "not-allowed", opacity: 0.6 } : undefined}
                                    >
                                      <FaTrash />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={admin ? 6 : 5}>No hay bienes activos para mostrar.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando {productosActivosFiltrados.length ? indexInicioActivos + 1 : 0} a{" "}
                      {Math.min(indexFinalActivos, productosActivosFiltrados.length)} de{" "}
                      {productosActivosFiltrados.length} registros
                    </span>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaActivos === 1 || totalPaginasActivos === 0}
                        onClick={() => setPaginaActivos((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

                 {obtenerPaginasVisibles(paginaActivos, totalPaginasActivos).map((num, i) =>
  num === "..." ? (
    <span key={i} className="page-ellipsis">...</span>
  ) : (
    <button
      key={i}
      className={`page-btn ${paginaActivos === num ? "active" : ""}`}
      onClick={() => setPaginaActivos(num)}
    >
      {num}
    </button>
  )
)}


                      <button
                        className="page-btn"
                        disabled={paginaActivos === totalPaginasActivos || totalPaginasActivos === 0}
                        onClick={() => setPaginaActivos((prev) => Math.min(prev + 1, totalPaginasActivos))}
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

      {/* 🟦 Modal: Bienes inactivos */}
      {mostrarModalBienesInactivos && (
        <div className="modal-overlay-pro" onClick={() => setMostrarModalBienesInactivos(false)}>
          <div className="modal-tabla-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Bienes dados de baja</h2>
            </div>

            <div className="modal-body">
              {cargandoBase ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando productos...</p>
                </div>
              ) : (
                <>
                  <div className="filtro-bar">
                    <div className="busqueda-contenedor-pro">
                      <FaSearch className="icono-busqueda-pro" />
                      <input
                        type="text"
                        placeholder="Buscar por código, nombre o categoría..."
                        value={busquedaInactivos}
                        onChange={(e) => setBusquedaInactivos(e.target.value)}
                        className="input-busqueda-pro"
                      />
                    </div>

                    <div className="filtros-extra">
                      <select
                        className="select-filtro"
                        value={filtroCategoriaInactivos}
                        onChange={(e) => setFiltroCategoriaInactivos(e.target.value)}
                      >
                        <option value="">Todas las categorías</option>
                        {categoriasInactivos.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <select
                        className="select-filtro"
                        value={filtroUbicacionInactivos}
                        onChange={(e) => setFiltroUbicacionInactivos(e.target.value)}
                      >
                        <option value="">Todas las ubicaciones</option>
                        {ubicacionesInactivos.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Descripción</th>
                          <th>Categoría</th>
                          <th>Ubicación</th>
                          <th>Fecha de baja</th>
                          <th>Motivo de baja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inactivosPagina.length > 0 ? (
                          inactivosPagina.map((item) => (
                            <tr key={item.id}>
                              <td>{item.codigo}</td>
                              <td>
                                {item.nombre}
                                {item.es_donado && <span className="donacion-badge">Donado</span>}
                              </td>
                              <td>{item.descripcion}</td>
                              <td>{item.categoria}</td>
                              <td>{obtenerUbicacionTexto(item)}</td>
                              <td>
                                {item.fecha_baja ? new Date(item.fecha_baja).toLocaleDateString() : "No registrada"}
                              </td>
                              <td>{item.motivo_baja || "Sin motivo registrado"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7}>No hay bienes inactivos para mostrar.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando {productosInactivosFiltrados.length ? indexInicioInactivos + 1 : 0} a{" "}
                      {Math.min(indexFinalInactivos, productosInactivosFiltrados.length)} de{" "}
                      {productosInactivosFiltrados.length} registros
                    </span>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaInactivos === 1 || totalPaginasInactivos === 0}
                        onClick={() => setPaginaInactivos((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

              {obtenerPaginasVisibles(paginaInactivos, totalPaginasInactivos).map((num, i) =>
  num === "..." ? (
    <span key={i} className="page-ellipsis">...</span>
  ) : (
    <button
      key={i}
      className={`page-btn ${paginaInactivos === num ? "active" : ""}`}
      onClick={() => setPaginaInactivos(num)}
    >
      {num}
    </button>
  )
)}


                      <button
                        className="page-btn"
                        disabled={paginaInactivos === totalPaginasInactivos || totalPaginasInactivos === 0}
                        onClick={() => setPaginaInactivos((prev) => Math.min(prev + 1, totalPaginasInactivos))}
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

      {/* 🟥 Modal confirmar baja */}
      {mostrarModalBaja && productoBaja && (
        <div className="modal-overlay" onClick={() => setMostrarModalBaja(false)}>
          <div className="modal modal-baja" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Dar de Baja Producto</h2>

            <p className="producto-nombre-baja">
              <strong>{productoBaja.nombre}</strong>
            </p>

            <div className="form-group form-group-baja">
              <label className="label-baja">
                Motivo de baja <span style={{ opacity: 0.7 }}>({motivoBaja.trim().length}/500)</span>
              </label>
              <textarea
                className="textarea-baja"
                rows="4"
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                placeholder="Describa el motivo de la baja..."
                disabled={!admin || guardandoBaja}
                maxLength={500}
              />
            </div>

            <div className="modal-actions modal-actions-baja">
              <button className="btn-cancel" onClick={() => setMostrarModalBaja(false)} disabled={guardandoBaja}>
                Cancelar
              </button>

              <button className="btn-submit" onClick={darDeBajaProducto} disabled={!admin || guardandoBaja}>
                {guardandoBaja ? "Guardando..." : "Confirmar baja"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar closeButton={false} />
    </div>
  );
};

export default GestionBajas;
