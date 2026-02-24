import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axiosClient from "../api/axiosClient";
import { toast } from "react-toastify";
import { esAdmin } from "../utils/permisos";

import {
  FaSearch,
  FaFileWord,
  FaUpload,
  FaCheckCircle,
  FaFilePdf,
} from "react-icons/fa";
import "../styles/Actas.css";


const Actas = () => {
  const [actas, setActas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 5;
  const maxBotonesPagina = 5;
  const [modalSubirPdf, setModalSubirPdf] = useState(false);
  const [actaSeleccionada, setActaSeleccionada] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
const admin = esAdmin();
  const [subiendoPdf, setSubiendoPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadOk, setUploadOk] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  const LIMITE_MB = 10;
useEffect(() => {
  fetchActas();
}, []);

useEffect(() => {
  return () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
  };
}, [pdfPreviewUrl]);

  const fetchActas = async () => {
    try {
      setCargando(true);
      const { data } = await axiosClient.get("/actas");
      setActas(data || []);
    } catch (error) {
      toast.error("Error al cargar actas");
    } finally {
      setCargando(false);
    }
  };
  const obtenerNombreResponsable = (acta) => {
    if (acta.asignaciones && acta.asignaciones.length > 0) {
      const r = acta.asignaciones[0]?.responsable;
      if (r) return `${r.nombre} ${r.apellido || ""}`.trim();
    }
    if (acta.responsable) {
      return `${acta.responsable.nombre} ${acta.responsable.apellido || ""}`.trim();
    }

    return "";
  };
  const esActaRecepcion = (acta) => {
    const tieneAsignaciones = acta.asignaciones && acta.asignaciones.length > 0;
    const tieneRecepciones = acta.recepciones && acta.recepciones.length > 0;
    return !tieneAsignaciones && tieneRecepciones;
  };
  const obtenerProductosActa = (acta) => {
    if (acta.asignaciones && acta.asignaciones.length > 0) {
      return acta.asignaciones.flatMap((asig) => asig.productos || []);
    }
    if (acta.recepciones && acta.recepciones.length > 0) {
      return acta.recepciones.flatMap((rec) => rec.productos || []);
    }
    return [];
  };

  const responsablesUnicos = [
    ...new Set(actas.map((a) => obtenerNombreResponsable(a)).filter((x) => x && x !== "")),
  ];
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroResponsable, filtroTipo, fechaDesde, fechaHasta, actas]);
  const descargarActaWord = async (id, codigo) => {
    const endpoint = `/actas/${id}/descargar-word`;

    try {
      const response = await axiosClient.get(endpoint, { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${codigo || "ACTA"}-${id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 500);
      toast.success("Documento Word descargado correctamente ");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo descargar el documento Word ");
    }
  };
  const descargarPdfFirmado = async (id, codigo) => {
    const endpoint = `/actas/${id}/descargar-pdf`;

    try {
      const response = await axiosClient.get(endpoint, { responseType: "blob" });

      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${codigo || "ACTA"}-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 500);
      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo descargar el PDF ");
    }
  };
  const actasFiltradas = (() => {
    const lista = actas.filter((a) => {
      const texto = busqueda.toLowerCase();

      const nombreResponsable = obtenerNombreResponsable(a).toLowerCase();
      const fecha = a.fecha_creacion || "";
      const codigo = a.codigo?.toLowerCase() || "";
      const tipoActa = esActaRecepcion(a) ? "Recepción" : "Asignación";

      const coincideTexto =
        nombreResponsable.includes(texto) ||
        (fecha || "").toLowerCase().includes(texto) ||
        codigo.includes(texto) ||
        tipoActa.toLowerCase().includes(texto);

      const coincideResponsable = filtroResponsable
        ? obtenerNombreResponsable(a) === filtroResponsable
        : true;

      const coincideTipo = filtroTipo ? tipoActa === filtroTipo : true;

      let coincideFechas = true;
      if (fechaDesde && fecha < fechaDesde) coincideFechas = false;
      if (fechaHasta && fecha > fechaHasta) coincideFechas = false;

      return coincideTexto && coincideResponsable && coincideTipo && coincideFechas;
    });

    // ordenar dejando las anuladas al final
    lista.sort((x, y) => {
      const xAn =
        (x.asignaciones && x.asignaciones.some((z) => z.activo === false)) ||
        (x.recepciones && x.recepciones.some((z) => z.activo === false));
      const yAn =
        (y.asignaciones && y.asignaciones.some((z) => z.activo === false)) ||
        (y.recepciones && y.recepciones.some((z) => z.activo === false));
      if (xAn && !yAn) return 1;
      if (yAn && !xAn) return -1;
      return 0;
    });

    return lista;
  })();

  const totalActas = actasFiltradas.length;
  const totalPaginas = totalActas === 0 ? 1 : Math.ceil(totalActas / itemsPorPagina);

  const paginaSegura = paginaActual > totalPaginas ? totalPaginas : paginaActual;

  const indiceInicio = (paginaSegura - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const actasPaginadas = actasFiltradas.slice(indiceInicio, indiceFin);

  const grupoActual = Math.floor((paginaSegura - 1) / maxBotonesPagina);
  const paginaInicioGrupo = grupoActual * maxBotonesPagina + 1;
  const paginaFinGrupo = Math.min(paginaInicioGrupo + maxBotonesPagina - 1, totalPaginas);

  const paginasAmostrar = [];
  for (let p = paginaInicioGrupo; p <= paginaFinGrupo; p++) paginasAmostrar.push(p);

  const primerItem = totalActas === 0 ? 0 : indiceInicio + 1;
  const ultimoItem = totalActas === 0 ? 0 : Math.min(indiceFin, totalActas);
  const abrirModalSubirPdf = (acta) => {
    setActaSeleccionada(acta);
    setPdfFile(null);
    setUploadProgress(0);
    setUploadOk(false);
    setUploadError("");

    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);

    setModalSubirPdf(true);
  };

  const cerrarModalSubirPdf = () => {
    setModalSubirPdf(false);
    setActaSeleccionada(null);
    setPdfFile(null);
    setUploadProgress(0);
    setUploadOk(false);
    setUploadError("");

    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
  };

  const validarPdf = (file) => {
    if (!file) return "Selecciona un archivo primero.";
    const esPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!esPdf) return "El archivo debe ser PDF (.pdf).";

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITE_MB) return `El PDF supera el límite de ${LIMITE_MB}MB.`;

    return "";
  };

  const onElegirPdf = (file) => {
    setPdfFile(file);
    setUploadOk(false);
    setUploadProgress(0);

    const msg = validarPdf(file);
    setUploadError(msg);

    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);

    if (!msg && file) {
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
    } else {
      setPdfPreviewUrl(null);
    }
  };

  const confirmarSubidaPdf = async () => {
    if (!actaSeleccionada) return;

    const msg = validarPdf(pdfFile);
    if (msg) {
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubiendoPdf(true);
      setUploadError("");
      setUploadProgress(0);
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const { data } = await axiosClient.post(
        `/actas/${actaSeleccionada.id}/subir-pdf`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            const percent = Math.round((evt.loaded * 100) / evt.total);
            setUploadProgress(percent);
          },
        }
      );

      const path = data?.archivo_pdf_path || "ok";

      setActas((prev) =>
        prev.map((a) =>
          a.id === actaSeleccionada.id ? { ...a, archivo_pdf_path: path } : a
        )
      );

      setUploadOk(true);
      toast.success("PDF subido correctamente ");
      setTimeout(() => cerrarModalSubirPdf(), 700);
    } catch (err) {
      console.error(err);
      setUploadOk(false);
      setUploadProgress(0);

      const mensaje =
        err?.response?.data?.message ||
        "No se pudo subir el PDF (ruta backend o error del servidor).";

      setUploadError(mensaje);
      toast.error(mensaje);
    } finally {
      setSubiendoPdf(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content actas-main">
        <Navbar />
        <div className="content actas-content">
          <div className="actas-wrapper">
            <div className="titulo-actas">
              <h2>Actas generadas</h2>
            </div>

            <div className="actas-card">
              <div className="filtros-actas">
                <div className="filtro-item">
                  <span className="icono-busqueda">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por responsable, fecha, código o tipo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="input-busqueda-actas"
                  />
                </div>

                <div className="filtro-item">
                  <select
                    value={filtroResponsable}
                    onChange={(e) => setFiltroResponsable(e.target.value)}
                    className="select-filtro-actas"
                  >
                    <option value="">Filtrar por responsable...</option>
                    {responsablesUnicos.map((r, i) => (
                      <option key={i} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filtro-item">
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="select-filtro-actas"
                  >
                    <option value="">Filtrar por tipo...</option>
                    <option value="Asignación">Asignación</option>
                    <option value="Recepción">Recepción</option>
                  </select>
                </div>

                <div className="filtro-item">
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="select-filtro-actas"
                    title="Desde"
                  />
                </div>

                <div className="filtro-item">
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="select-filtro-actas"
                    title="Hasta"
                  />
                </div>
              </div>

              <div className="tabla-scroll" style={{ marginTop: "15px" }}>
                <table className="tabla-elegante">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Responsable</th>
                      <th className="th-productos">Productos</th>
                      <th>Documentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr>
                        <td colSpan="6">Cargando actas...</td>
                      </tr>
                    ) : actasPaginadas.length > 0 ? (
                      actasPaginadas.map((acta) => {
                        const nombreResponsable = obtenerNombreResponsable(acta);
                        const productos = obtenerProductosActa(acta);
                        const esRecepcion = esActaRecepcion(acta);
                        const tipoActa = esRecepcion ? "Recepción" : "Asignación";

                        const anulada =
                          (acta.asignaciones && acta.asignaciones.some((x) => x.activo === false)) ||
                          (acta.recepciones && acta.recepciones.some((x) => x.activo === false));

                        return (
                          <tr key={acta.id} className={anulada ? "fila-anulada" : ""}>
                            <td>
                              {tipoActa}
                              {anulada && (
                                <span className="badge-estado inactivo" style={{ marginLeft: 6 }}>
                                  Anulada
                                </span>
                              )}
                            </td>
                            <td>{acta.fecha_creacion}</td>
                            <td>{acta.codigo}</td>
                            <td>{nombreResponsable || "—"}</td>

                            <td className="col-productos">
                              {productos.length > 0
                                ? productos.map((p) => (
                                    <div
                                      key={`${acta.id}-${p.id}`}
                                      className="producto-mini-row"
                                    >
                                      {p.codigo ? `${p.codigo} - ` : ""}
                                      {p.nombre || ""}
                                    </div>
                                  ))
                                : "—"}
                            </td>

                            <td className="docs-cell">
                              <button
                                className="btn-accion btn-word"
                                onClick={() => descargarActaWord(acta.id, acta.codigo)}
                                title="Descargar en Word"
                                disabled={subiendoPdf || anulada}
                              >
                                <FaFileWord />
                              </button>
                          {admin && !acta.archivo_pdf_path && (
  <button
    className="btn-accion btn-upload"
    onClick={() => abrirModalSubirPdf(acta)}
    title="Subir PDF firmado"
    disabled={subiendoPdf || anulada}
  >
    <FaUpload />
  </button>
)}

                              {acta.archivo_pdf_path && (
                                <>
                                  <button
                                    className="btn-accion btn-pdf"
                                    onClick={() => descargarPdfFirmado(acta.id, acta.codigo)}
                                    title={`Descargar PDF firmado (${tipoActa})`}
                                    disabled={subiendoPdf || anulada}
                                  >
                                    <FaFilePdf />
                                  </button>

                                  <span className="pdf-ok" title="PDF registrado">
                                    <FaCheckCircle />
                                  </span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6">No hay actas registradas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!cargando && totalActas > 0 && (
                <div className="pagination-bar">
                  <span className="pagination-info">
                    Mostrando {primerItem} a {ultimoItem} de {totalActas} actas
                  </span>

                  <div className="pagination-circle">
                    <button
                      className="page-btn"
                      onClick={() => setPaginaActual(1)}
                      disabled={paginaSegura === 1}
                    >
                      «
                    </button>
                    <button
                      className="page-btn"
                      onClick={() =>
                        setPaginaActual(paginaSegura > 1 ? paginaSegura - 1 : 1)
                      }
                      disabled={paginaSegura === 1}
                    >
                      ‹
                    </button>

                    {paginasAmostrar.map((p) => (
                      <button
                        key={p}
                        className={`page-btn ${p === paginaSegura ? "active" : ""}`}
                        onClick={() => setPaginaActual(p)}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      className="page-btn"
                      onClick={() =>
                        setPaginaActual(
                          paginaSegura < totalPaginas ? paginaSegura + 1 : totalPaginas
                        )
                      }
                      disabled={paginaSegura === totalPaginas}
                    >
                      ›
                    </button>
                    <button
                      className="page-btn"
                      onClick={() => setPaginaActual(totalPaginas)}
                      disabled={paginaSegura === totalPaginas}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

     {admin && modalSubirPdf && actaSeleccionada && (

        <div className="modal-overlay-actas" onClick={cerrarModalSubirPdf}>
          <div className="modal-card-actas" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title-actas">
              Subir PDF ({esActaRecepcion(actaSeleccionada) ? "Recepción" : "Asignación"})
            </h3>

            <div className="modal-info-actas">
              <p><strong>Código:</strong> {actaSeleccionada.codigo}</p>
              <p><strong>Responsable:</strong> {obtenerNombreResponsable(actaSeleccionada) || "—"}</p>
              <p><strong>Fecha:</strong> {actaSeleccionada.fecha_creacion}</p>
            </div>

            <label className="file-label">
              Seleccionar PDF
              <input
                type="file"
                accept="application/pdf"
                disabled={subiendoPdf}
                onChange={(e) => onElegirPdf(e.target.files?.[0] || null)}
              />
            </label>

            {pdfFile && (
              <p className="file-name">
                📄 {pdfFile.name} — {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}

            {uploadError ? (
              <p className="upload-error"> {uploadError}</p>
            ) : pdfFile ? (
              <p className="upload-ok"> PDF válido</p>
            ) : null}

            {pdfPreviewUrl && (
              <div className="pdf-preview">
                <iframe title="preview-pdf" src={pdfPreviewUrl} />
              </div>
            )}

            {subiendoPdf && (
              <>
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span className="progress-text">{uploadProgress}%</span>
              </>
            )}
            {uploadOk && <p className="upload-ok"> Subido correctamente</p>}
            <div className="modal-actions-actas">
              <button className="btn-sec" onClick={cerrarModalSubirPdf} disabled={subiendoPdf}>
                Cancelar
              </button>
              <button className="btn-pri" onClick={confirmarSubidaPdf} disabled={subiendoPdf}>
                {subiendoPdf ? "Subiendo..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Actas;
