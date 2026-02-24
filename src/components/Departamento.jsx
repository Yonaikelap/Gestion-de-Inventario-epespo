import React, { useState, useEffect } from "react";
import "../styles/Departamento.css";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaAlignLeft,
  FaPlus,
  FaUserTie,
  FaSearch,
} from "react-icons/fa";
import {  toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { validarDepartamento } from "../Validaciones/validacionesDepartamento";
import "react-toastify/dist/ReactToastify.css";
import { useNotificaciones } from "../context/NotificacionesContext";
import { esAdmin, esLector } from "../utils/permisos";

const Departamento = () => {
  const [departamentos, setDepartamentos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [departamento, setDepartamento] = useState({});
  const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
  const [mostrarModalTabla, setMostrarModalTabla] = useState(false);
  const [editarId, setEditarId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState("");
  const departamentosFijos = ["Coordinación Académica", "Financiero", "TI"];
  const [paginaActual, setPaginaActual] = useState(1);
  const [errores, setErrores] = useState({});
  const { agregarNotificacion } = useNotificaciones();

  const admin = esAdmin();
  const lector = esLector();

  useEffect(() => {
    fetchDepartamentos();
    fetchResponsables();
  }, []);

  const fetchDepartamentos = async () => {
    try {
      setCargando(true);
      const res = await axiosClient.get("/departamentos");
      setDepartamentos(res.data);
    } catch {
      toast.error(" Error al cargar departamentos");
    } finally {
      setCargando(false);
    }
  };

  const fetchResponsables = async () => {
    try {
      const res = await axiosClient.get("/responsables");
      setResponsables(res.data);
    } catch {
      toast.error(" Error al cargar responsables");
    }
  };

  const descargarPlantillaExcel = () => {
    const encabezados = [["Departamento", "Ubicación", "Responsable"]];

    const ws = XLSX.utils.aoa_to_sheet(encabezados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "plantilla_departamentos.xlsx");

    toast.success("Plantilla Excel descargada");
  };

  const exportarExcel = () => {
    if (!departamentos.length)
      return toast.info("No hay departamentos para exportar ");

    const datos = departamentos.map((d) => ({
      Departamento: d.nombre,
      Ubicación: d.ubicacion,
      Responsable: d.responsable
        ? `${d.responsable.nombre} ${d.responsable.apellido}`
        : "",
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departamentos");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "departamentos.xlsx");

    toast.success("Archivo exportado correctamente");
  };

const importarExcel = (file) => {
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
        return;
      }

      const primeraFila = jsonData[0];
      const tieneNombre = ["Departamento", "nombre", "NOMBRE"].some(
        (k) => k in primeraFila
      );
      const tieneUbicacion = ["Ubicación", "ubicacion", "UBICACION"].some(
        (k) => k in primeraFila
      );

      if (!tieneNombre || !tieneUbicacion) {
        toast.dismiss(toastId);
        toast.error(
          "Formato inválido. Debe tener columnas: Departamento y Ubicación.",
          { autoClose: 3000 }
        );
        return;
      }

      const nuevosDepartamentos = [];

      for (const fila of jsonData) {
        const nombreDepto =
          fila.Departamento || fila.nombre || fila.NOMBRE || "";
        const ubicacion =
          fila.Ubicación || fila.ubicacion || fila.UBICACION || "";
        const responsableTexto =
          fila.Responsable || fila.responsable || fila.RESPONSABLE || "";
        let responsable_id = fila.responsable_id || null;
        if (!nombreDepto || !ubicacion) continue;
        if (!responsable_id && responsableTexto) {
          const textoNormalizado = responsableTexto
            .toString()
            .trim()
            .toLowerCase();

          const encontrado = responsables.find((r) => {
            const nombreCompleto = `${r.nombre} ${r.apellido}`
              .trim()
              .toLowerCase();
            return nombreCompleto === textoNormalizado;
          });

          if (encontrado) {
            responsable_id = encontrado.id;
          }
        }
        const payload = {
          nombre: nombreDepto,
          ubicacion,
          responsable_id,
        };

        const listaParaValidar = [...departamentos, ...nuevosDepartamentos];

        const erroresFila = validarDepartamento(
          payload,
          listaParaValidar,
          null,
          departamentosFijos
        );

        if (Object.keys(erroresFila).length > 0) continue;

        const res = await axiosClient.post("/departamentos", payload);
        nuevosDepartamentos.push(res.data);
      }

      await fetchDepartamentos();
      toast.dismiss(toastId);
      toast.success("Archivo subido exitosamente ", { autoClose: 2200 });
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Error al subir el archivo.", { autoClose: 2500 });
    }
  };

  reader.readAsBinaryString(file);
};

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDepartamento((prev) => ({ ...prev, [name]: value }));
    if (errores[name] || errores.nombreUbicacion) {
      setErrores((prev) => ({
        ...prev,
        [name]: undefined,
        nombreUbicacion:
          name === "nombre" || name === "ubicacion"
            ? undefined
            : prev.nombreUbicacion,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lector) {
      toast.warning("Solo lectura: no puedes modificar áreas ");
      return;
    }

    setErrores({});

    const erroresVal = validarDepartamento(
      departamento,
      departamentos,
      editarId,
      departamentosFijos
    );

    if (Object.keys(erroresVal).length > 0) {
      setErrores(erroresVal);
      return;
    }

    try {
      if (editarId) {
        await axiosClient.put(`/departamentos/${editarId}`, departamento);
        toast.success("Departamento actualizado");

        agregarNotificacion({
          titulo: "Departamento actualizado",
          mensaje: `Área: ${departamento.nombre} - ${
            departamento.ubicacion || "Sin ubicación"
          }`,
          fecha: new Date().toISOString(),
        });
      } else {
        await axiosClient.post("/departamentos", departamento);
        toast.success("Departamento registrado");

        agregarNotificacion({
          titulo: "Departamento registrado",
          mensaje: `Área: ${departamento.nombre} - ${
            departamento.ubicacion || "Sin ubicación"
          }`,
          fecha: new Date().toISOString(),
        });
      }

      setDepartamento({});
      setEditarId(null);
      setMostrarModalFormulario(false);
      setErrores({});
      fetchDepartamentos();
    } catch {
      toast.error("Error al guardar");
    }
  };

 const editarDepartamento = (item) => {
  if (lector) {
    toast.info("Solo lectura: no puedes editar áreas ");
    return;
  }

  setDepartamento({
    id: item.id,
    nombre: item.nombre,
    ubicacion: item.ubicacion,
    responsable_id: item.responsable_id,
  });

  setEditarId(item.id);
  setErrores({});
  setMostrarModalTabla(false);
  setMostrarModalFormulario(true);
};
  const eliminarDepartamento = async (id) => {
    if (lector) {
      toast.warning("Solo lectura: no puedes eliminar áreas ");
      return;
    }
    const confirm = await Swal.fire({
      title: "¿Eliminar área?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axiosClient.delete(`/departamentos/${id}`);
      toast.success("Departamento eliminado correctamente ");
      fetchDepartamentos();

      agregarNotificacion({
        titulo: "Departamento eliminado",
        mensaje: "Se eliminó un área del sistema",
        fecha: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);

      if (error.response?.status === 409) {
        toast.error(
          error.response.data.message ||
            "No se puede eliminar el departamento porque tiene productos asociados "
        );
      } else {
        toast.error("No se pudo eliminar el departamento ");
      }
    }
  };

  const departamentosFiltrados = departamentos.filter((d) => {
    const coincideDepto = filtroDepto ? d.nombre === filtroDepto : true;
    const coincideBusqueda = Object.values(d).some((v) =>
      v?.toString().toLowerCase().includes(busqueda.toLowerCase())
    );
    return coincideDepto && coincideBusqueda;
  });

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroDepto, departamentos.length]);

  const registrosPorPagina = 4;
  const indexFinal = paginaActual * registrosPorPagina;
  const indexInicio = indexFinal - registrosPorPagina;
  const departamentosPagina = departamentosFiltrados.slice(indexInicio, indexFinal);
  const totalPaginas = Math.ceil(departamentosFiltrados.length / registrosPorPagina);

  const paginas =
    totalPaginas > 0 ? Array.from({ length: totalPaginas }, (_, i) => i + 1) : [];

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="content">
          <div className="cards-grid-depto">
            {admin && (
              <div
                className="card clickable"
                onClick={() => {
                  setDepartamento({});
                  setEditarId(null);
                  setErrores({});
                  setMostrarModalFormulario(true);
                }}
              >
                <FaPlus className="card-icon" />
                <h2 className="card-title">Agregar Departamentos</h2>
                <p className="card-subtitle">Registrar nueva Departamentos</p>
              </div>
            )}

            <div
              className="card clickable"
              onClick={async () => {
                setMostrarModalTabla(true);
                setCargando(true);
                await fetchDepartamentos();
                setTimeout(() => setCargando(false), 800);
              }}
            >
              <FaBuilding className="card-icon" />
              <h2 className="card-title">Departamentos Registradas</h2>
              <p className="card-subtitle">Listado general</p>
            </div>
          </div>
        </div>
      </div>
      {mostrarModalFormulario && (
        <div
          className="modal-overlay-de"
          onClick={() => {
            setMostrarModalFormulario(false);
            setErrores({});
          }}
        >
          <div className="modal-form-de" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-de">{editarId ? "Editar Área" : "Agregar Área"}</h2>

            {errores.nombreUbicacion && (
              <p className="mensaje-error-general">{errores.nombreUbicacion}</p>
            )}

            <form onSubmit={handleSubmit}>
              <fieldset disabled={lector}>
                <div className="form-group-de-s">
                  <label>Departamento</label>
                  <div className={`input-icon-de ${errores.nombre ? "input-error" : ""}`}>
                    <FaBuilding className="icon-input-de" />
                    <select name="nombre" value={departamento.nombre || ""} onChange={handleChange}>
                      <option value="">-- Seleccione un Departamento --</option>
                      {departamentosFijos.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.nombre && <span className="mensaje-error">{errores.nombre}</span>}
                </div>
                <div className="form-group-de">
                  <label>Ubicación</label>
                  <div className={`input-icon-de ${errores.ubicacion ? "input-error" : ""}`}>
                    <FaAlignLeft className="icon-input-de" />
                    <input
                      name="ubicacion"
                      value={departamento.ubicacion || ""}
                      onChange={handleChange}
                      placeholder="Contabilidad, Sistemas..."
                    />
                  </div>
                  {errores.ubicacion && <span className="mensaje-error">{errores.ubicacion}</span>}
                </div>
                <div className="form-group-de-s">
                  <label>Responsable</label>
                  <div className={`input-icon-de ${errores.responsable_id ? "input-error" : ""}`}>
                    <FaUserTie className="icon-input-de" />
                    <select
                      name="responsable_id"
                      value={departamento.responsable_id || ""}
                      onChange={handleChange}
                    >
                      <option value="">-- Seleccione un responsable --</option>
                      {responsables.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} {r.apellido}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.responsable_id && (
                    <span className="mensaje-error">{errores.responsable_id}</span>
                  )}
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
                    Guardar
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
      {mostrarModalTabla && (
        <div className="modal-overlay-de" onClick={() => setMostrarModalTabla(false)}>
          <div className="modal-tabla-de" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-de">
              <h2 className="modal-title-de">Departamentos Registrado</h2>
            </div>

            <div className="modal-body-de">
              {cargando ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando Departamentos...</p>
                </div>
              ) : (
                <>
                  <div className="filtro-bar">
                    <div className="busqueda-contenedor-de">
                      <FaSearch className="icono-busqueda-de" />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input-busqueda-de"
                      />
                    </div>

                    <select
                      value={filtroDepto}
                      onChange={(e) => setFiltroDepto(e.target.value)}
                      className="input-busqueda-def"
                    >
                      <option value="">Todos los departamentos</option>
                      {departamentosFijos.map((d) => (
                        <option key={d} value={d}>
                          {d}
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
                                  importarExcel(archivo);
                                } else {
                                  toast.info("Importación cancelada ");
                                }

                                setTimeout(() => setArchivoNombre(""), 2000);
                              }}
                            />
                          </label>

                          {archivoNombre && (
                            <span className="nombre-archivo">{archivoNombre}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          <th>Departamento</th>
                          <th>Ubicación</th>
                          <th>Responsable</th>
                          {admin && <th>Acciones</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {departamentosPagina.length ? (
                          departamentosPagina.map((item) => (
                            <tr key={item.id}>
                              <td>{item.nombre}</td>
                              <td>{item.ubicacion}</td>
                              <td>
                                {item.responsable
                                  ? `${item.responsable.nombre} ${item.responsable.apellido}`
                                  : "Sin asignar"}
                              </td>

                              {admin && (
                                <td>
                                  <button
                                    className="btn-accion editar"
                                    onClick={() => editarDepartamento(item)}
                                    title="Editar Departamento"
                                  >
                                    <FaEdit />
                                  </button>

                                  <button
                                    className="btn-accion eliminar"
                                    onClick={() => eliminarDepartamento(item.id)}
                                    title="Eliminar Departamento"
                                  >
                                    <FaTrash />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={admin ? 4 : 3}>No hay datos</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div className="pagination-bar">
                      <span className="pagination-info">
                        Mostrando {departamentosFiltrados.length ? indexInicio + 1 : 0} a{" "}
                        {Math.min(indexFinal, departamentosFiltrados.length)} de{" "}
                        {departamentosFiltrados.length} registros
                      </span>

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

export default Departamento;
