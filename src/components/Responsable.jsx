import React, { useState, useEffect, useMemo } from "react";
import "../styles/Responsable.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import {
  FaUsers,
  FaBoxOpen,
  FaEdit,
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaBriefcase,
  FaSearch,
  FaUserTie,
  FaPrint,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosClient from "../api/axiosClient";
import { validarResponsable } from "../Validaciones/validacionesResponsable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { esAdmin, esLector } from "../utils/permisos";
import { useNotificaciones } from "../context/NotificacionesContext";

// Opciones de título profesional
const TITULOS_PROFESIONALES = ["Ing", "Lcdo", "Lcda", "Tnlgo", "Tnlga", "Econ", "Mag", "Biol"];

const normalizar = (v) => (v ?? "").toString().trim().replace(/\s+/g, " ");
const normalizarCorreo = (v) => normalizar(v).toLowerCase();
const soloNumeros = (v) => normalizar(v).replace(/\D/g, "");

const COLUMNAS_RESP = ["titulo", "nombre", "apellido", "correo", "cedula", "cargo"];

const etiquetaCol = (col) => {
  switch (col) {
    case "titulo":
      return "Título";
    case "nombre":
      return "Nombre";
    case "apellido":
      return "Apellido";
    case "correo":
      return "Correo";
    case "cedula":
      return "Cédula";
    case "cargo":
      return "Cargo";
    default:
      return col;
  }
};

const Responsable = () => {
  const [responsable, setResponsable] = useState({});
  const [responsables, setResponsables] = useState([]);

  const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
  const [mostrarModalTabla, setMostrarModalTabla] = useState(false);
  const [editarId, setEditarId] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [cargoFiltro, setCargoFiltro] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const responsablesPorPagina = 5;

  const [archivoNombre, setArchivoNombre] = useState("");
  const [columnaOrden, setColumnaOrden] = useState(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);

  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});

  const admin = esAdmin();
  const lector = esLector();
  const { agregarNotificacion } = useNotificaciones();

  useEffect(() => {
    fetchResponsables();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, cargoFiltro]);

  const fetchResponsables = async () => {
    try {
      setCargando(true);
      const response = await axiosClient.get("/responsables");
      setResponsables(response.data || []);
      setPaginaActual(1);
    } catch (error) {
      toast.error("Error al cargar responsables ");
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setResponsable((prev) => ({ ...prev, [name]: value }));

    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validarDuplicados = (r) => {
    const errs = {};
    const ced = soloNumeros(r.cedula);
    const mail = normalizarCorreo(r.correo);

    const existeCed = responsables.some((x) => x.id !== editarId && soloNumeros(x.cedula) === ced);
    const existeMail = responsables.some(
      (x) => x.id !== editarId && normalizarCorreo(x.correo) === mail
    );

    if (existeCed) errs.cedula = "Ya existe un responsable con esta cédula";
    if (existeMail) errs.correo = "Ya existe un responsable con este correo";

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lector) {
      toast.info("Solo lectura: no puedes agregar ni editar responsables ");
      return;
    }

    const payload = {
      ...responsable,
      titulo: normalizar(responsable.titulo),
      nombre: normalizar(responsable.nombre),
      apellido: normalizar(responsable.apellido),
      correo: normalizarCorreo(responsable.correo),
      cedula: soloNumeros(responsable.cedula),
      cargo: normalizar(responsable.cargo),
    };

    const erroresVal = validarResponsable(payload);
    const erroresDup = validarDuplicados(payload);

    const erroresFinales = { ...erroresVal, ...erroresDup };
    if (Object.keys(erroresFinales).length > 0) {
      setErrores(erroresFinales);
      return;
    }

    setErrores({});

    try {
      setCargando(true);

      if (editarId) {
        await axiosClient.put(`/responsables/${editarId}`, payload);
        toast.success("Responsable editado correctamente ");

        agregarNotificacion({
          titulo: "Responsable editado",
          mensaje: `Se actualizó a: ${payload.nombre} ${payload.apellido}`,
          fecha: new Date().toISOString(),
        });
      } else {
        await axiosClient.post("/responsables", payload);
        toast.success("Responsable agregado correctamente ");

        agregarNotificacion({
          titulo: "Responsable agregado",
          mensaje: `Se registró a: ${payload.nombre} ${payload.apellido}`,
          fecha: new Date().toISOString(),
        });
      }

      setResponsable({});
      setEditarId(null);
      setMostrarModalFormulario(false);
      await fetchResponsables();
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(msg || "Error al guardar responsable ");
    } finally {
      setCargando(false);
    }
  };

  const editarResponsable = (item) => {
    if (lector) {
      toast.info("Solo lectura: no puedes editar responsables ");
      return;
    }

    setResponsable({
      ...item,
      correo: normalizarCorreo(item.correo),
      cedula: soloNumeros(item.cedula),
    });

    setEditarId(item.id);
    setErrores({});
    setMostrarModalFormulario(true);
    setMostrarModalTabla(false);
  };

  // ========= EXCEL =========
  const descargarPlantillaExcel = () => {
    const encabezados = [["titulo", "nombre", "apellido", "correo", "cedula", "cargo"]];
    const ws = XLSX.utils.aoa_to_sheet(encabezados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "plantilla_responsables.xlsx");

    toast.success("Plantilla Excel descargada ");
  };

  const exportarExcel = () => {
    if (responsablesFiltrados.length === 0) {
      toast.info("No hay datos para exportar ");
      return;
    }

    const datos = responsablesFiltrados.map((r) => ({
      titulo: r.titulo || "",
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      correo: r.correo || "",
      cedula: r.cedula || "",
      cargo: r.cargo || "",
    }));

    const ws = XLSX.utils.json_to_sheet(datos, { header: COLUMNAS_RESP });
    XLSX.utils.sheet_add_aoa(ws, [COLUMNAS_RESP.map(etiquetaCol)], { origin: "A1" });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responsables");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "responsables.xlsx");
    toast.success("Archivo Excel exportado correctamente ");
  };

const importarExcel = (e) => {
  const input = e.target;
  const file = input.files?.[0];
  if (!file) return;

  const toastId = toast.loading("Subiendo archivo...");

  const reader = new FileReader();

  reader.onload = async (evt) => {
    try {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (!jsonData || jsonData.length === 0) {
        toast.dismiss(toastId);
        toast.error("El archivo está vacío.", { autoClose: 2500 });
        input.value = "";
        return;
      }

      const encabezados = Object.keys(jsonData[0] || {});
      const requeridos = ["titulo", "nombre", "apellido", "correo", "cedula", "cargo"];
      const faltan = requeridos.filter((c) => !encabezados.includes(c));

      if (faltan.length > 0) {
        toast.dismiss(toastId);
        toast.error(`Faltan columnas obligatorias: ${faltan.join(", ")}`, { autoClose: 3000 });
        input.value = "";
        return;
      }

      setCargando(true);

      const setCed = new Set(responsables.map((r) => soloNumeros(r.cedula)));
      const setMail = new Set(responsables.map((r) => normalizarCorreo(r.correo)));

      for (const r of jsonData) {
        const responsableExcel = {
          titulo: normalizar(r.titulo),
          nombre: normalizar(r.nombre),
          apellido: normalizar(r.apellido),
          correo: normalizarCorreo(r.correo),
          cedula: soloNumeros(r.cedula),
          cargo: normalizar(r.cargo),
        };

        const erroresFila = validarResponsable(responsableExcel);
        if (Object.keys(erroresFila).length > 0) continue;

        if (setCed.has(responsableExcel.cedula) || setMail.has(responsableExcel.correo)) continue;

        await axiosClient.post("/responsables", responsableExcel);

        setCed.add(responsableExcel.cedula);
        setMail.add(responsableExcel.correo);
      }

      await fetchResponsables();

      toast.dismiss(toastId);
      toast.success("Archivo subido exitosamente ", { autoClose: 2200 });
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Error al subir el archivo.", { autoClose: 2500 });
    } finally {
      setCargando(false);
      input.value = "";
    }
  };

  reader.readAsBinaryString(file);
};

  // ====== FILTRO + ORDEN + PAGINACIÓN ======
  const responsablesFiltrados = useMemo(() => {
    const txt = busqueda.toLowerCase();

    return [...responsables]
      .filter((r) => {
        const coincideTexto =
          !txt || Object.values(r).some((v) => v?.toString().toLowerCase().includes(txt));

        const coincideCargo = cargoFiltro
          ? (r.cargo || "").toString().toLowerCase() === cargoFiltro.toLowerCase()
          : true;

        return coincideTexto && coincideCargo;
      })
      .sort((a, b) => {
        if (!columnaOrden) return 0;
        const valorA = a[columnaOrden]?.toString().toLowerCase() || "";
        const valorB = b[columnaOrden]?.toString().toLowerCase() || "";
        if (valorA < valorB) return ordenAscendente ? -1 : 1;
        if (valorA > valorB) return ordenAscendente ? 1 : -1;
        return 0;
      });
  }, [responsables, busqueda, cargoFiltro, columnaOrden, ordenAscendente]);

  const cargoOptions = useMemo(() => {
    const set = new Set();
    responsables.forEach((r) => {
      const c = (r.cargo || "").toString().trim();
      if (c) set.add(c);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [responsables]);

  const indiceUltimo = paginaActual * responsablesPorPagina;
  const indicePrimero = indiceUltimo - responsablesPorPagina;
  const responsablesPagina = responsablesFiltrados.slice(indicePrimero, indiceUltimo);

  const totalPaginas = Math.ceil(responsablesFiltrados.length / responsablesPorPagina);
  const paginas = totalPaginas > 0 ? Array.from({ length: totalPaginas }, (_, i) => i + 1) : [];

  // ========= IMPRESIÓN (DESCARGA DIRECTA) =========
  const handleImprimirWord = async () => {
    if (responsablesFiltrados.length === 0) {
      toast.info("No hay responsables para imprimir ");
      return;
    }

    const idsAImprimir = responsablesFiltrados.map((r) => r.id);

    try {
      const response = await axiosClient.post(
        "/responsables/exportar-word",
        { ids: idsAImprimir },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const hoy = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `Responsables_${hoy}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Documento generado (filtrados: ${responsablesFiltrados.length}).`);
    } catch (error) {
      console.error(error);
      toast.error("Error al generar el documento Word.");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content">
          <div className="cards-grid-resp">
            {admin && (
              <div
                className="card clickable"
                onClick={() => {
                  setResponsable({});
                  setEditarId(null);
                  setErrores({});
                  setMostrarModalFormulario(true);
                }}
              >
                <FaUsers className="card-icon" />
                <h2 className="card-title">Agregar Responsable</h2>
                <p className="card-subtitle">Registrar un nuevo Responsable</p>
              </div>
            )}

            <div
              className="card clickable"
              onClick={() => {
                setMostrarModalTabla(true);
                if (responsables.length === 0) fetchResponsables();
              }}
            >
              <FaBoxOpen className="card-icon" />
              <h2 className="card-title">Responsables</h2>
              <p className="card-subtitle">Listado de responsables registrados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Formulario */}
      {mostrarModalFormulario && (
        <div
          className="modal-overlay-re"
          onClick={() => {
            setMostrarModalFormulario(false);
            setErrores({});
          }}
        >
          <div className="modal-form-re" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-re">{editarId ? "Editar Responsable" : "Agregar Responsable"}</h2>

            <form onSubmit={handleSubmit}>
              <fieldset disabled={lector || cargando}>
                <div className="form-group-re">
                  <label>Título profesional</label>
                  <div className={`input-icon-re ${errores.titulo ? "input-error" : ""}`}>
                    <FaUserTie className="icon-input-re" />
                    <select name="titulo" value={responsable.titulo || ""} onChange={handleChange}>
                      <option value="">-- Seleccione un título --</option>
                      {TITULOS_PROFESIONALES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.titulo && <span className="mensaje-error">{errores.titulo}</span>}
                </div>

                <div className="form-group-re">
                  <label>Nombre</label>
                  <div className={`input-icon-re ${errores.nombre ? "input-error" : ""}`}>
                    <FaUser className="icon-input-re" />
                    <input
                      type="text"
                      name="nombre"
                      value={responsable.nombre || ""}
                      onChange={handleChange}
                      placeholder="Ingrese el nombre"
                    />
                  </div>
                  {errores.nombre && <span className="mensaje-error">{errores.nombre}</span>}
                </div>

                <div className="form-group-re">
                  <label>Apellido</label>
                  <div className={`input-icon-re ${errores.apellido ? "input-error" : ""}`}>
                    <FaUser className="icon-input-re" />
                    <input
                      type="text"
                      name="apellido"
                      value={responsable.apellido || ""}
                      onChange={handleChange}
                      placeholder="Ingrese el apellido"
                    />
                  </div>
                  {errores.apellido && <span className="mensaje-error">{errores.apellido}</span>}
                </div>

                <div className="form-group-re">
                  <label>Correo</label>
                  <div className={`input-icon-re ${errores.correo ? "input-error" : ""}`}>
                    <FaEnvelope className="icon-input-re" />
                    <input
                      type="email"
                      name="correo"
                      value={responsable.correo || ""}
                      onChange={handleChange}
                      placeholder="Ingrese el correo"
                    />
                  </div>
                  {errores.correo && <span className="mensaje-error">{errores.correo}</span>}
                </div>

                <div className="form-group-re">
                  <label>Cédula</label>
                  <div className={`input-icon-re ${errores.cedula ? "input-error" : ""}`}>
                    <FaIdCard className="icon-input-re" />
                    <input
                      type="text"
                      inputMode="numeric"
                      name="cedula"
                      value={responsable.cedula || ""}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, "");
                        if (valor.length <= 10) {
                          setResponsable((prev) => ({ ...prev, cedula: valor }));
                          if (errores.cedula) setErrores((prev) => ({ ...prev, cedula: undefined }));
                        }
                      }}
                      placeholder="Ingrese la cédula"
                    />
                  </div>
                  {errores.cedula && <span className="mensaje-error">{errores.cedula}</span>}
                </div>

                <div className="form-group-re">
                  <label>Cargo</label>
                  <div className={`input-icon-re ${errores.cargo ? "input-error" : ""}`}>
                    <FaBriefcase className="icon-input-re" />
                    <input
                      type="text"
                      name="cargo"
                      value={responsable.cargo || ""}
                      onChange={handleChange}
                      placeholder="Ingrese el cargo"
                    />
                  </div>
                  {errores.cargo && <span className="mensaje-error">{errores.cargo}</span>}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setMostrarModalFormulario(false);
                      setErrores({});
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-submit">
                    {cargando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tabla */}
      {mostrarModalTabla && (
        <div className="modal-overlay-re" onClick={() => setMostrarModalTabla(false)}>
          <div className="modal-tabla-re" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title-re">Listado de Responsables</h2>
            </div>

            <div className="modal-body">
              {cargando ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando responsables...</p>
                </div>
              ) : (
                <>
                  <div className="filtro-bar">
                    <div className="busqueda-contenedor-resp">
                      <FaSearch className="icono-busqueda-resp" />
                      <input
                        type="text"
                        placeholder="Buscar responsable..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input-busqueda-resp"
                      />
                    </div>

                    <select
                      className="select-filtro"
                      value={cargoFiltro}
                      onChange={(e) => setCargoFiltro(e.target.value)}
                    >
                      <option value="">Filtrar por cargo...</option>
                      {cargoOptions.map((cargo) => (
                        <option key={cargo} value={cargo}>
                          {cargo}
                        </option>
                      ))}
                    </select>

                    <div className="acciones-excel">
                      <button className="btn-excel-exportar" onClick={exportarExcel}>
                        Exportar Excel
                      </button>

                      {admin && (
                        <>
                          <button className="btn-excel-importar" onClick={descargarPlantillaExcel}>
                            Descargar Plantilla
                          </button>

                          <label className="btn-excel-importar">
                            Importar Excel
                            <input
                              type="file"
                              accept=".xlsx, .xls"
                              onChange={async (e) => {
                                const archivo = e.target.files?.[0];
                                if (!archivo) return;

                                setArchivoNombre(archivo.name);

                                const result = await Swal.fire({
                                  title: "Confirmar importación",
                                  text: `¿Deseas importar el archivo "${archivo.name}"?`,
                                  icon: "question",
                                  showCancelButton: true,
                                  confirmButtonText: "Sí, importar",
                                  cancelButtonText: "Cancelar",
                                });

                                if (result.isConfirmed) {
                                  importarExcel(e);
                                } else {
                                  toast.info("Importación cancelada ");
                                  e.target.value = "";
                                }

                                setTimeout(() => setArchivoNombre(""), 2000);
                              }}
                            />
                          </label>
                        </>
                      )}

                      {archivoNombre && <span className="nombre-archivo">{archivoNombre}</span>}
                    </div>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          {COLUMNAS_RESP.map((col) => (
                            <th
                              key={col}
                              onClick={() => {
                                if (columnaOrden === col) setOrdenAscendente(!ordenAscendente);
                                else {
                                  setColumnaOrden(col);
                                  setOrdenAscendente(true);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {etiquetaCol(col)}{" "}
                              {columnaOrden === col ? (ordenAscendente ? "▲" : "▼") : ""}
                            </th>
                          ))}
                          <th>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {responsablesPagina.length > 0 ? (
                          responsablesPagina.map((item) => (
                            <tr key={item.id}>
                              <td>{item.titulo ? `${item.titulo}.` : "-"}</td>
                              <td>{item.nombre}</td>
                              <td>{item.apellido}</td>
                              <td>{item.correo}</td>
                              <td>{item.cedula}</td>
                              <td>{item.cargo}</td>
                              <td>
                                {admin && (
                                  <button
                                    className="btn-accion editar"
                                    onClick={() => editarResponsable(item)}
                                    title="Editar responsable"
                                  >
                                    <FaEdit />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7">No hay responsables registrados</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="pagination-info">
                        Mostrando {responsablesFiltrados.length === 0 ? 0 : indicePrimero + 1} a{" "}
                        {Math.min(indiceUltimo, responsablesFiltrados.length)} de{" "}
                        {responsablesFiltrados.length}
                      </span>

                      {responsablesFiltrados.length > 0 && (
                        <button type="button" className="btn-excel-importar" onClick={handleImprimirWord}>
                          <FaPrint style={{ marginRight: 6 }} />
                          Impresión
                        </button>
                      )}
                    </div>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaActual === 1 || totalPaginas === 0}
                        onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

                      {paginas.map((num) => (
                        <button
                          key={num}
                          className={`page-btn ${paginaActual === num ? "active" : ""}`}
                          onClick={() => setPaginaActual(num)}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        className="page-btn"
                        disabled={paginaActual === totalPaginas || totalPaginas === 0}
                        onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
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

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar closeButton={false} />
    </div>
  );
};

export default Responsable;
