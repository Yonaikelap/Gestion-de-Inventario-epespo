import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBoxOpen, FaBriefcase, FaCalendarAlt, FaClipboardList, FaInfoCircle, FaSearch, FaTrash, FaUser, FaUsers } from "react-icons/fa";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import axiosClient from "../api/axiosClient";
import { useNotificaciones } from "../context/NotificacionesContext";
import "../styles/Asignacion.css";
import { validarAsignacion, validarRecepcion } from "../Validaciones/validacionesAsignacion";
import { esAdmin, esLector } from "../utils/permisos";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const fechaHoy = () => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const nombreCompleto = (r) => {
  const nom = `${r?.nombre || ""} ${r?.apellido || ""}`.trim();
  return nom || "Sin nombre";
};

const getAxiosErrorMessage = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  const firstValidation =
    data?.errors &&
    (data.errors.productos?.[0] ||
      data.errors.responsable_id?.[0] ||
      data.errors.area_id?.[0] ||
      data.errors.fecha_asignacion?.[0] ||
      data.errors.fecha_devolucion?.[0] ||
      data.errors.categoria?.[0]);

  if (firstValidation) return firstValidation;
  if (data?.message) return data.message;

  if (status === 401) return "No autorizado. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permisos para esta acción.";
  if (status === 404) return "No encontrado.";
  if (status >= 500) return "Error del servidor. Intenta nuevamente.";

  return "Ocurrió un error inesperado.";
};

const Asignacion = () => {
  const [asignacion, setAsignacion] = useState({
    responsable_id: "",
    fecha_asignacion: fechaHoy(),
    area_id: "",
  });

  const [recepcion, setRecepcion] = useState({
    responsable_id: "",
    fecha_devolucion: fechaHoy(),
    area_id: "",
  });

  const [asignaciones, setAsignaciones] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [asignacionesActuales, setAsignacionesActuales] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [productos, setProductos] = useState({});
  const [bienesSeleccionados, setBienesSeleccionados] = useState({});
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [productoDetalle, setProductoDetalle] = useState(null);

  const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
  const [mostrarModalTabla, setMostrarModalTabla] = useState(false);
  const [mostrarModalTablaRecep, setMostrarModalTablaRecep] = useState(false);
  const [mostrarSubModal, setMostrarSubModal] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [mostrarModalRecepcion, setMostrarModalRecepcion] = useState(false);

  // editing disabled: only new assignments/recepciones can be created

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaProd, setBusquedaProd] = useState("");
  const [paginaAsignacionesActual, setPaginaAsignacionesActual] = useState(1);
  const asignacionesPorPagina = 5;

  const [busquedaRecep, setBusquedaRecep] = useState("");
  const [paginaRecepcionesActual, setPaginaRecepcionesActual] = useState(1);
  const recepcionesPorPagina = 5;

  const [paginaProductosActual, setPaginaProductosActual] = useState(1);
  const productosPorPagina = 5;

  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("");
  const [filtroCategoriaRecep, setFiltroCategoriaRecep] = useState("");
  const [filtroResponsableRecep, setFiltroResponsableRecep] = useState("");

  const [areas, setAreas] = useState([]);
  const ultimaAsignacionIdRef = useRef(null);
  const ultimaRecepcionIdRef = useRef(null);

  const [errores, setErrores] = useState({});
  const { agregarNotificacion } = useNotificaciones();

  const admin = esAdmin();
  const lector = esLector();

  const [modoSubmodal, setModoSubmodal] = useState("asignacion"); // usado para distinguir entre selección de bienes en asignación/recepción
  const [bienesDisponiblesRecep, setBienesDisponiblesRecep] = useState({});

  const mapaOcupados = useMemo(() => {
    const m = new Map();
    (asignacionesActuales || []).forEach((row) => {
      const pid = Number(row?.producto_id);
      if (!pid) return;
      m.set(pid, row);
    });
    return m;
  }, [asignacionesActuales]);

  useEffect(() => {
    fetchResponsables();
    fetchProductos();
    fetchAsignaciones();
    fetchAreas();
    fetchRecepciones();
    fetchAsignacionesActuales();
  }, []);

  const fetchAreas = async () => {
    try {
      const { data } = await axiosClient.get("/departamentos");
      setAreas(data || []);
    } catch {
      toast.error("Error al cargar departamentos ");
    }
  };

  const fetchResponsables = async () => {
    try {
      const { data } = await axiosClient.get("/responsables");
      setResponsables(data || []);
    } catch {
      toast.error("Error al cargar responsables ");
    }
  };

  const fetchProductos = async () => {
    try {
      const { data } = await axiosClient.get("/productos");
      const agrupados = {};
      (data || []).forEach((p) => {
        if (!agrupados[p.categoria]) agrupados[p.categoria] = [];
        agrupados[p.categoria].push(p);
      });
      setProductos(agrupados);
    } catch {
      toast.error("Error al cargar productos ");
    }
  };

  const fetchAsignaciones = async () => {
    try {
      setCargando(true);
      // pedir también las anuladas para que la tabla pueda resaltarlas
      const { data } = await axiosClient.get("/asignaciones?mostrarAnuladas=true");
      setAsignaciones(data || []);
      setPaginaAsignacionesActual(1);
    } catch {
      toast.error("Error al cargar asignaciones");
    } finally {
      setCargando(false);
    }
  };

  const fetchRecepciones = async () => {
    try {
      setCargando(true);
      // igualmente solicitamos las recepciones anuladas
      const { data } = await axiosClient.get("/recepciones?mostrarAnuladas=true");
      setRecepciones(data || []);
      setPaginaRecepcionesActual(1);
    } catch {
      toast.error("Error al cargar recepciones");
    } finally {
      setCargando(false);
    }
  };

  const fetchAsignacionesActuales = async () => {
    try {
      const { data } = await axiosClient.get("/producto-asignaciones-actuales");
      setAsignacionesActuales(data || []);
    } catch (error) {
      console.error("Error al cargar asignaciones actuales", error?.response?.data || error?.message);
      toast.error("Error al cargar asignaciones actuales");
    }
  };

  const cargarBienesActualesResponsable = async (responsableId) => {
    const rid = Number(responsableId);
    if (!rid) {
      setBienesDisponiblesRecep({});
      setBienesSeleccionados({});
      return;
    }

    try {
      const { data } = await axiosClient.get(`/responsables/${rid}/bienes-actuales`);
      const agrupados = data?.agrupados || {};
      const areaUnica = data?.areaUnica || null;

      setBienesDisponiblesRecep(agrupados);
      setBienesSeleccionados(agrupados);

      if (areaUnica) {
        setRecepcion((prev) => ({ ...prev, area_id: String(areaUnica) }));
      }
    } catch (err) {
      console.error(err?.response?.data || err?.message);
      toast.error("Error al cargar bienes asignados del responsable");
      setBienesDisponiblesRecep({});
      setBienesSeleccionados({});
    }
  };

  useEffect(() => {
    setPaginaAsignacionesActual(1);
  }, [busqueda, filtroCategoria, filtroResponsable]);

  useEffect(() => {
    setPaginaRecepcionesActual(1);
  }, [busquedaRecep, filtroCategoriaRecep, filtroResponsableRecep]);

  useEffect(() => {
    setPaginaProductosActual(1);
  }, [busquedaProd, categoriaSeleccionada]);

  // agrupamos registros que pertenecen a la misma acción de asignación
  // (misma persona, área, fecha y estado) porque el backend guarda
  // una fila por categoría. Para el usuario debe verse como un único
  // registro con productos combinados.
  const asignacionesAgrupadas = useMemo(() => {
    const map = new Map();
    (asignaciones || []).forEach((a) => {
      const key = `${a.responsable_id}-${a.area_id}-${a.fecha_asignacion}-${a.activo}`;
      if (!map.has(key)) {
        // clonar el objeto para no mutar el estado original
        map.set(key, {
          ...a,
          productos: [...(a.productos || [])],
          originalIds: [a.id],
        });
      } else {
        const existing = map.get(key);
        existing.productos = [...existing.productos, ...(a.productos || [])];
        existing.originalIds.push(a.id);
        // eliminar duplicados por id
        const unique = new Map();
        existing.productos.forEach((p) => {
          if (p && p.id != null) unique.set(p.id, p);
        });
        existing.productos = Array.from(unique.values());
      }
    });
    return Array.from(map.values());
  }, [asignaciones]);

  const opcionesResponsableAsign = useMemo(() => {
    const map = new Map();
    (asignacionesAgrupadas || []).forEach((a) => {
      if (a?.responsable_id && a?.responsable) {
        map.set(String(a.responsable_id), a.responsable);
      }
    });

    return [...map.entries()]
      .map(([id, r]) => ({ id, label: nombreCompleto(r) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [asignacionesAgrupadas]);

  const opcionesCategoriaAsign = useMemo(() => {
    const set = new Set();
    (asignacionesAgrupadas || []).forEach((a) => {
      (a.productos || []).forEach((p) => {
        if (p?.categoria) set.add(p.categoria);
      });
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [asignacionesAgrupadas]);

  const asignacionesFiltradas = useMemo(() => {
    const texto = (busqueda || "").toLowerCase().trim();

    const lista = (asignacionesAgrupadas || []).filter((a) => {
      const respTxt = nombreCompleto(a.responsable).toLowerCase();

      const coincideTexto =
        !texto ||
        respTxt.includes(texto) ||
        (a.productos || []).some((p) => {
          const n = (p?.nombre || "").toLowerCase();
          const c = (p?.codigo || "").toLowerCase();
          return n.includes(texto) || c.includes(texto);
        });

      const coincideCategoria = filtroCategoria
        ? (a.productos || []).some((p) => p.categoria === filtroCategoria)
        : true;

      const coincideResponsable = filtroResponsable ? String(a.responsable_id) === String(filtroResponsable) : true;

      return coincideTexto && coincideCategoria && coincideResponsable;
    });

    // mover anuladas al final
    lista.sort((x, y) => {
      if (x.activo === false && y.activo !== false) return 1;
      if (y.activo === false && x.activo !== false) return -1;
      return 0;
    });

    return lista;
  }, [asignacionesAgrupadas, busqueda, filtroCategoria, filtroResponsable]);

  const indiceUltimoAsign = paginaAsignacionesActual * asignacionesPorPagina;
  const indicePrimeroAsign = indiceUltimoAsign - asignacionesPorPagina;

  const paginaAsignaciones = useMemo(
    () => asignacionesFiltradas.slice(indicePrimeroAsign, indiceUltimoAsign),
    [asignacionesFiltradas, indicePrimeroAsign, indiceUltimoAsign]
  );

  const totalPaginasAsign = Math.ceil(asignacionesFiltradas.length / asignacionesPorPagina);

  const paginasAsign =
    totalPaginasAsign > 0 ? Array.from({ length: totalPaginasAsign }, (_, i) => i + 1) : [];

  const opcionesResponsableRecep = useMemo(() => {
    const map = new Map();
    (recepciones || []).forEach((r) => {
      if (r?.responsable_id && r?.responsable) {
        map.set(String(r.responsable_id), r.responsable);
      }
    });

    return [...map.entries()]
      .map(([id, r]) => ({ id, label: nombreCompleto(r) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [recepciones]);

  const opcionesCategoriaRecep = useMemo(() => {
    const set = new Set();
    (recepciones || []).forEach((r) => {
      (r.productos || []).forEach((p) => {
        if (p?.categoria) set.add(p.categoria);
      });
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [recepciones]);

  const recepcionesFiltradas = useMemo(() => {
    const texto = (busquedaRecep || "").toLowerCase().trim();

    const lista = (recepciones || []).filter((r) => {
      const respTxt = nombreCompleto(r.responsable).toLowerCase();

      const coincideTexto =
        !texto ||
        respTxt.includes(texto) ||
        (r.productos || []).some((p) => {
          const n = (p?.nombre || "").toLowerCase();
          const c = (p?.codigo || "").toLowerCase();
          return n.includes(texto) || c.includes(texto);
        });

      const coincideCategoria = filtroCategoriaRecep
        ? (r.productos || []).some((p) => p.categoria === filtroCategoriaRecep)
        : true;

      const coincideResponsable = filtroResponsableRecep ? String(r.responsable_id) === String(filtroResponsableRecep) : true;

      return coincideTexto && coincideCategoria && coincideResponsable;
    });

    lista.sort((x, y) => {
      if (x.activo === false && y.activo !== false) return 1;
      if (y.activo === false && x.activo !== false) return -1;
      return 0;
    });

    return lista;
  }, [recepciones, busquedaRecep, filtroCategoriaRecep, filtroResponsableRecep]);

  const indiceUltimaRecep = paginaRecepcionesActual * recepcionesPorPagina;
  const indicePrimeraRecep = indiceUltimaRecep - recepcionesPorPagina;

  const paginaRecepciones = useMemo(
    () => recepcionesFiltradas.slice(indicePrimeraRecep, indiceUltimaRecep),
    [recepcionesFiltradas, indicePrimeraRecep, indiceUltimaRecep]
  );

  const totalPaginasRecep = Math.ceil(recepcionesFiltradas.length / recepcionesPorPagina);

  const paginasRecep =
    totalPaginasRecep > 0 ? Array.from({ length: totalPaginasRecep }, (_, i) => i + 1) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lector) {
      toast.info("Solo lectura: no puedes crear asignaciones ");
      return;
    }

    setErrores({});

    const erroresVal = validarAsignacion(
      asignacion,
      bienesSeleccionados,
      asignaciones,
      asignacionesActuales
    );

    if (Object.keys(erroresVal).length > 0) {
      setErrores(erroresVal);
      return;
    }

    const toastId = toast.loading("Guardando asignaciones... ");
    setGuardando(true);

    try {
      const categoriasSeleccionadas = Object.keys(bienesSeleccionados).filter(
        (cat) => (bienesSeleccionados[cat] || []).length > 0
      );

      for (const categoria of categoriasSeleccionadas) {
        const productosCategoria = bienesSeleccionados[categoria] || [];
        if (productosCategoria.length === 0) continue;

        const productosIds = productosCategoria.map((p) => p.id);

        const payload = {
          responsable_id: asignacion.responsable_id,
          area_id: asignacion.area_id,
          fecha_asignacion: asignacion.fecha_asignacion,
          categoria,
          productos: productosIds,
        };

        const resp = await axiosClient.post("/asignaciones", payload);
        ultimaAsignacionIdRef.current = resp.data.id;
      }

      await fetchAsignaciones();
      await fetchRecepciones();
      await fetchAsignacionesActuales();

      const respSel = responsables.find((r) => String(r.id) === String(asignacion.responsable_id));
      const nombreResponsable = respSel ? nombreCompleto(respSel) : "Responsable no encontrado";

      const totalProductos = Object.keys(bienesSeleccionados).reduce(
        (acc, cat) => acc + (bienesSeleccionados[cat]?.length || 0),
        0
      );

      setMostrarModalFormulario(false);
      setAsignacion({
        responsable_id: "",
        fecha_asignacion: fechaHoy(),
        area_id: "",
      });
      setBienesSeleccionados({});
      setErrores({});

      toast.update(toastId, {
        render: "Asignaciones registradas correctamente ",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });

      agregarNotificacion({
        titulo: "Nueva asignación",
        mensaje: `Responsable: ${nombreResponsable} | Productos: ${totalProductos}`,
        fecha: new Date().toISOString(),
      });

      Swal.fire({
        title: "Generar Acta",
        text: "Se ha generado el Acta de las asignaciones correspondientes, podrás editarla para ajustar los campos.",
        icon: "warning",
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#635BFF",
        showCancelButton: false,
      }).then(async (result) => {
        if (!result.isConfirmed) return;

        try {
          if (ultimaAsignacionIdRef.current) {
            await axiosClient.post("/actas/generar", { asignacion_id: ultimaAsignacionIdRef.current });
            toast.success("Acta generada correctamente ");
          } else {
            toast.warning("No se encontró la asignación para generar el acta ");
          }
        } catch (err) {
          console.error(err);
          toast.error("La asignación se guardó, pero no se pudo generar el acta ");
        }
      });
    } catch (error) {
      console.error(error.response?.data || error.message);
      toast.update(toastId, {
        render: getAxiosErrorMessage(error),
        type: "error",
        isLoading: false,
        autoClose: 3500,
      });
      await fetchAsignacionesActuales();
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmitRecepcion = async (e) => {
    e.preventDefault();

    if (lector) {
      toast.info("Solo lectura: no puedes crear actas de recepción ");
      return;
    }

    setErrores({});

    const erroresVal = validarRecepcion(
      recepcion,
      bienesSeleccionados,
      asignacionesActuales
    );

    if (Object.keys(erroresVal).length > 0) {
      setErrores(erroresVal);
      toast.error(erroresVal.general || "Corrige los errores del formulario");
      return;
    }

    let categoriasSeleccionadas = Object.keys(bienesSeleccionados).filter(
      (cat) => (bienesSeleccionados[cat] || []).length > 0
    );


    const toastId = toast.loading("Guardando recepción...");

    try {
      let baseRecepcionId = null;

      for (const categoria of categoriasSeleccionadas) {
        const productosCategoria = bienesSeleccionados[categoria] || [];
        if (productosCategoria.length === 0) continue;

        const productosIds = productosCategoria.map((p) => p.id);

        const payload = {
          responsable_id: recepcion.responsable_id,
          area_id: recepcion.area_id,
          fecha_devolucion: recepcion.fecha_devolucion,
          categoria,
          productos: productosIds,
        };

        const resp = await axiosClient.post("/recepciones", payload);
        if (!baseRecepcionId) baseRecepcionId = resp.data.id;
      }

      await fetchRecepciones();
      await fetchAsignaciones();
      await fetchAsignacionesActuales();

      toast.update(toastId, {
        render: "Recepción registrada correctamente ",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });

      setMostrarModalRecepcion(false);
      setRecepcion({
        responsable_id: "",
        fecha_devolucion: fechaHoy(),
        area_id: "",
      });
      setBienesSeleccionados({});
      setBienesDisponiblesRecep({});
      setErrores({});

      if (baseRecepcionId) {
        ultimaRecepcionIdRef.current = baseRecepcionId;

        Swal.fire({
          title: "Generar Acta de Recepción",
          text: "Se ha generado el Acta de recepción correspondiente.",
          icon: "warning",
          confirmButtonText: "Aceptar",
          confirmButtonColor: "#635BFF",
          showCancelButton: false,
        }).then(async (result) => {
          if (!result.isConfirmed) {
            ultimaRecepcionIdRef.current = null;
            return;
          }

          try {
            await axiosClient.post("/actas/generar-recepcion", { recepcion_id: ultimaRecepcionIdRef.current });
            toast.success("Acta de recepción generada correctamente ");
          } catch (err) {
            console.error(err);
            toast.error("La recepción se guardó, pero no se pudo generar el acta de recepción ");
          } finally {
            ultimaRecepcionIdRef.current = null;
          }
        });
      }
    } catch (error) {
      console.error(error.response?.data || error.message);
      toast.update(toastId, {
        render: getAxiosErrorMessage(error),
        type: "error",
        isLoading: false,
        autoClose: 3500,
      });
      await fetchAsignacionesActuales();
    }
  };

  // anula una o varias asignaciones que forman un mismo registro agrupado
  const anularAsignacion = async (ids) => {
    if (lector) {
      toast.info("Solo lectura: no puedes anular asignaciones ");
      return;
    }

    const result = await Swal.fire({
      title: "¿Anular asignación?",
      text: "La asignación se marcará como anulada. Puedes indicar el motivo.",
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Motivo...",
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const motivo = result.value;
    const toastId = toast.loading("Anulando asignación... ");

    try {
      // ids puede ser número o arreglo
      const arrayIds = Array.isArray(ids) ? ids : [ids];
      for (const id of arrayIds) {
        await axiosClient.put(`/asignaciones/${id}`, {
          activo: false,
          motivo_anulacion: motivo || null,
        });
      }

      await fetchAsignaciones();
      await fetchRecepciones();
      await fetchAsignacionesActuales();

      toast.update(toastId, {
        render: "Asignación anulada correctamente ",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      agregarNotificacion({
        titulo: "Asignación anulada",
        mensaje: motivo ? `Motivo: ${motivo}` : "Se anuló una asignación",
        fecha: new Date().toISOString(),
      });
    } catch {
      toast.update(toastId, {
        render: "Error al anular la asignación ",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // edición deshabilitada: las asignaciones no se pueden modificar, sólo anular.
  // const editarAsignacion = (item) => { ... }  // función removida intencionalmente


  const anularRecepcion = async (id) => {
    if (lector) {
      toast.info("Solo lectura: no puedes anular recepciones ");
      return;
    }

    const result = await Swal.fire({
      title: "¿Anular recepción?",
      text: "La recepción se marcará como anulada. Puedes indicar un motivo opcional.",
      icon: "warning",
      input: "textarea",
      inputPlaceholder: "Motivo (opcional)",
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const motivo = result.value;
    const toastId = toast.loading("Anulando recepción... ");

    try {
      await axiosClient.put(`/recepciones/${id}`, {
        activo: false,
        motivo_anulacion: motivo || null,
      });
      await fetchRecepciones();
      await fetchAsignaciones();
      await fetchAsignacionesActuales();

      toast.update(toastId, {
        render: "Recepción anulada correctamente ",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch {
      toast.update(toastId, {
        render: "Error al anular la recepción ",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  // edición deshabilitada: las recepciones no se pueden modificar, sólo anular.
  // const editarRecepcion = (item) => { ... }  // función removida intencionalmente


  const exportarExcelAsignaciones = () => {
    if (asignacionesFiltradas.length === 0) {
      toast.info("No hay datos para exportar ");
      return;
    }

    const datosExport = asignacionesFiltradas.map((a) => ({
      Responsable: nombreCompleto(a.responsable),
      Fecha: a.fecha_asignacion,
      Categorías: [...new Set((a.productos || []).map((p) => p.categoria))].join(", "),
      Productos: (a.productos || []).map((p) => `${p.codigo} - ${p.nombre}`).join("; "),
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asignaciones");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "asignaciones.xlsx");
    toast.success("Archivo Excel exportado correctamente ");
  };
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
          <div className="cards-grid-asig">
            {admin && (
              <>
                <div
                  className="card clickable"
                  onClick={() => {
                    setAsignacion({
                      responsable_id: "",
                      fecha_asignacion: fechaHoy(),
                      area_id: "",
                    });
                    setBienesSeleccionados({});
                    setErrores({});
                    setModoSubmodal("asignacion");
                    setMostrarModalFormulario(true);
                    fetchAsignacionesActuales();
                  }}
                >
                  <FaUsers className="card-icon" />
                  <h2 className="card-title">Asignar Responsable</h2>
                  <p className="card-subtitle">Asignar productos a un responsable</p>
                </div>

                <div
                  className="card clickable"
                  onClick={() => {
                    setRecepcion({
                      responsable_id: "",
                      fecha_devolucion: fechaHoy(),
                      area_id: "",
                    });
                    setBienesSeleccionados({});
                    setBienesDisponiblesRecep({});
                    setErrores({});
                    setModoSubmodal("recepcion");
                    setMostrarModalRecepcion(true);
                    fetchAsignacionesActuales();
                  }}
                >
                  <FaClipboardList className="card-icon" />
                  <h2 className="card-title">Adjudicar Bienes</h2>
                  <p className="card-subtitle">Adjudicar bienes a un responsable</p>
                </div>
              </>
            )}

            <div
              className="card clickable"
              onClick={() => {
                setMostrarModalTabla(true);
                fetchAsignaciones();
                fetchAsignacionesActuales();
              }}
            >
              <FaBoxOpen className="card-icon" />
              <h2 className="card-title">Asignaciones</h2>
              <p className="card-subtitle">Ver todas las asignaciones</p>
            </div>

            <div
              className="card clickable"
              onClick={() => {
                setMostrarModalTablaRecep(true);
                fetchRecepciones();
                fetchAsignacionesActuales();
              }}
            >
              <FaClipboardList className="card-icon" />
              <h2 className="card-title">Recepciones</h2>
              <p className="card-subtitle">Ver todas las recepciones hechas</p>
            </div>
          </div>
        </div>
      </div>

      {mostrarModalFormulario && (
        <div
          className="modal-overlay-asi"
          onClick={() => {
            setMostrarModalFormulario(false);
            setErrores({});
          }}
        >
          <div className="modal-form-asi" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-asi">Nueva Asignación</h2>

            {errores.general && <p className="mensaje-error-general">{errores.general}</p>}

            <form onSubmit={handleSubmit}>
              <fieldset disabled={lector}>
                <div className="form-group-asi">
                  <label>Responsable</label>
                  <div className={`input-icon-asi ${errores.responsable_id ? "input-error" : ""}`}>
                    <FaUser className="icon-input-asi" />
                    <select
                      name="responsable_id"
                      className="select-responsable-scroll"
                      value={asignacion.responsable_id}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAsignacion((prev) => ({ ...prev, responsable_id: value }));
                        if (errores.responsable_id || errores.general) {
                          setErrores((prev) => ({
                            ...prev,
                            responsable_id: undefined,
                            general: undefined,
                          }));
                        }
                      }}
                    >
                      <option value="">-- Seleccione un responsable --</option>
                      {responsables.map((r) => (
                        <option key={r.id} value={r.id}>
                          {nombreCompleto(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.responsable_id && <span className="mensaje-error">{errores.responsable_id}</span>}
                </div>

                <div className="form-group-asi">
                  <label>Fecha de Asignación</label>
                  <div className={`input-icon-asi ${errores.fecha_asignacion ? "input-error" : ""}`}>
                    <FaCalendarAlt className="icon-input-asi" />
                    <input
                      type="date"
                      name="fecha_asignacion"
                      value={asignacion.fecha_asignacion}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAsignacion((prev) => ({ ...prev, fecha_asignacion: value }));
                        if (errores.fecha_asignacion) {
                          setErrores((prev) => ({ ...prev, fecha_asignacion: undefined }));
                        }
                      }}
                    />
                  </div>
                  {errores.fecha_asignacion && <span className="mensaje-error">{errores.fecha_asignacion}</span>}
                </div>

                <div className="form-group-asi">
                  <label>Departamento</label>
                  <div className={`input-icon-asi ${errores.area_id ? "input-error" : ""}`}>
                    <FaBriefcase className="icon-input-asi" />
                    <select
                      name="area_id"
                      value={asignacion.area_id || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAsignacion((prev) => ({ ...prev, area_id: value }));
                        if (errores.area_id) {
                          setErrores((prev) => ({ ...prev, area_id: undefined }));
                        }
                      }}
                    >
                      <option value="">-- Seleccione un Departamento --</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} {a.ubicacion ? `- ${a.ubicacion}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.area_id && <span className="mensaje-error">{errores.area_id}</span>}
                </div>

                <div className="form-group-asi">
                  <label>Seleccionar Bienes por Categoría</label>

                  {Object.keys(productos).map((cat) => (
                    <div key={cat} className="categoria-item">
                      <label className="categoria-label">
                        <FaBriefcase className="categoria-icon" />
                        {cat}
                      </label>

                      <div className="input-icon-asi">
                        <FaClipboardList className="icon-input-asi" />
                        <input
                          readOnly
                          placeholder="-- Seleccione productos --"
                          value={
                            bienesSeleccionados[cat]
                              ? bienesSeleccionados[cat].map((p) => p.nombre).join(", ")
                              : ""
                          }
                          onClick={() => {
      
                            setModoSubmodal("asignacion");
                            setCategoriaSeleccionada(cat);
                            setPaginaProductosActual(1);
                            setMostrarSubModal(true);

                            fetchAsignacionesActuales();

                            if (errores.bienes || errores.general) {
                              setErrores((prev) => ({
                                ...prev,
                                bienes: undefined,
                                general: undefined,
                              }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {errores.bienes && <span className="mensaje-error">{errores.bienes}</span>}
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
                  <button type="submit" className="btn-submit" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {mostrarModalRecepcion && (
        <div
          className="modal-overlay-asi"
          onClick={() => {
            setMostrarModalRecepcion(false);
            setErrores({});
          }}
        >
          <div className="modal-form-asi" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-asi">Nueva adjudicación</h2>

            {errores.general && <p className="mensaje-error-general">{errores.general}</p>}

            <form onSubmit={handleSubmitRecepcion}>
              <fieldset disabled={lector}>
                <div className="form-group-asi">
                  <label>Responsable</label>
                  <div className={`input-icon-asi ${errores.responsable_id ? "input-error" : ""}`}>
                    <FaUser className="icon-input-asi" />
                    <select
                      name="responsable_id"
                      className="select-responsable-scroll"
                      value={recepcion.responsable_id}

                      onChange={(e) => {
                        const value = e.target.value;
                        setRecepcion((prev) => ({ ...prev, responsable_id: value }));
                        cargarBienesActualesResponsable(value);
                        setErrores((prev) => ({
                          ...prev,
                          responsable_id: undefined,
                          bienes: undefined,
                          general: undefined,
                        }));
                      }}
                    >
                      <option value="">-- Seleccione un responsable --</option>
                      {responsables.map((r) => (
                        <option key={r.id} value={r.id}>
                          {nombreCompleto(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.responsable_id && <span className="mensaje-error">{errores.responsable_id}</span>}
                </div>

                <div className="form-group-asi">
                  <label>Fecha de Devolución</label>
                  <div className={`input-icon-asi ${errores.fecha_devolucion ? "input-error" : ""}`}>
                    <FaCalendarAlt className="icon-input-asi" />
                    <input
                      type="date"
                      name="fecha_devolucion"
                      value={recepcion.fecha_devolucion}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRecepcion((prev) => ({ ...prev, fecha_devolucion: value }));
                        if (errores.fecha_devolucion) {
                          setErrores((prev) => ({ ...prev, fecha_devolucion: undefined }));
                        }
                      }}
                    />
                  </div>
                  {errores.fecha_devolucion && <span className="mensaje-error">{errores.fecha_devolucion}</span>}
                </div>

                <div className="form-group-asi">
                  <label>Departamento</label>
                  <div className={`input-icon-asi ${errores.area_id ? "input-error" : ""}`}>
                    <FaBriefcase className="icon-input-asi" />
                    <select
                      name="area_id"
                      value={recepcion.area_id || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRecepcion((prev) => ({ ...prev, area_id: value }));
                        if (errores.area_id) {
                          setErrores((prev) => ({ ...prev, area_id: undefined }));
                        }
                      }}
                    >
                      <option value="">-- Seleccione un Departamento --</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} {a.ubicacion ? `- ${a.ubicacion}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.area_id && <span className="mensaje-error">{errores.area_id}</span>}
                </div>

                <div className="form-group-asi">
                  <label>Bienes asignados al responsable</label>

                  {!recepcion.responsable_id ? (
                    <p style={{ marginTop: 6, opacity: 0.8 }}>
                      Selecciona un responsable para ver sus bienes asignados.
                    </p>
                  ) : Object.keys(bienesDisponiblesRecep).length === 0 ? (
                    <p style={{ marginTop: 6, opacity: 0.8 }}>
                      Este responsable no tiene bienes asignados actualmente.
                    </p>
                  ) : (
                    Object.keys(bienesDisponiblesRecep).map((cat) => (
                      <div key={cat} className="categoria-item">
                        <label className="categoria-label">
                          <FaBriefcase className="categoria-icon" />
                          {cat}
                        </label>

                        <div className="input-icon-asi">
                          <FaClipboardList className="icon-input-asi" />
                          <input
                            readOnly
                            placeholder="-- Seleccione productos --"
                            value={
                              bienesSeleccionados[cat]
                                ? bienesSeleccionados[cat].map((p) => p.nombre).join(", ")
                                : ""
                            }
                            onClick={() => {
                              if (!recepcion.responsable_id) {
                                toast.info("Primero selecciona un responsable");
                                return;
                              }


                              setModoSubmodal("recepcion");
                              setCategoriaSeleccionada(cat);
                              setPaginaProductosActual(1);
                              setMostrarSubModal(true);

                              fetchAsignacionesActuales();

                              if (errores.bienes || errores.general) {
                                setErrores((prev) => ({
                                  ...prev,
                                  bienes: undefined,
                                  general: undefined,
                                }));
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}

                  {errores.bienes && <span className="mensaje-error">{errores.bienes}</span>}
                </div>
              </fieldset>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setMostrarModalRecepcion(false);
                    setErrores({});
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-submit">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalTabla && (
        <div className="modal-overlay" onClick={() => setMostrarModalTabla(false)}>
          <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Asignaciones Registradas</h2>
            </div>

            <div className="modal-body">
              {cargando ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando asignaciones...</p>
                </div>
              ) : (
                <>
                  <div className="filtro-bar">
                    <div className="busqueda-contenedor-asi">
                      <FaSearch className="icono-busqueda-asi" />
                      <input
                        type="text"
                        placeholder="Buscar responsable o producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input-busqueda-asi"
                      />
                    </div>

                    <select className="select-filtro" value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)}>
                      <option value="">Filtrar por responsable...</option>
                      {opcionesResponsableAsign.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>

                    <select className="select-filtro" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                      <option value="">Filtrar por categoría...</option>
                      {opcionesCategoriaAsign.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <div className="acciones-excel">
                      <button className="btn-excel-exportar" onClick={exportarExcelAsignaciones}>
                        Exportar Excel
                      </button>
                    </div>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          <th>Responsable</th>
                          <th>Ubicación</th>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Productos</th>
                          {admin && <th>Accciones</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {paginaAsignaciones.length > 0 ? (
                          paginaAsignaciones.map((a) => (
                            <tr key={a.id} className={a.activo === false ? "fila-anulada" : ""}>
                              <td>
                                {nombreCompleto(a.responsable)}
                                {!a.activo && (
                                  <span className="badge-estado inactivo" style={{ marginLeft: 8 }}>
                                    Anulada
                                  </span>
                                )}
                              </td>
                              <td>
                                {a.area
                                  ? `${a.area.nombre || a.area.area || "sin nombre"}${a.area.ubicacion ? " - " + a.area.ubicacion : ""}`
                                  : "Sin nombre "}
                              </td>
                              <td>{a.fecha_asignacion ? a.fecha_asignacion.slice(0, 10) : ""}</td>
                              <td>{[...new Set((a.productos || []).map((p) => p.categoria))].join(", ")}</td>
                              <td>
                                {(a.productos || []).map((p) => (
                                  <div key={p.id} className="producto-mini-row">
                                    {p.codigo} - {p.nombre}
                                  </div>
                                ))}
                              </td>
                              {admin && (
                                <td>
                                  <button
                                    className="btn-accion eliminar"
                                    onClick={() =>
                                      anularAsignacion(a.originalIds ? a.originalIds : a.id)
                                    }
                                    disabled={a.activo === false}
                                    title="Dar de baja"
                                  >
                                    <FaTrash />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6">No hay asignaciones</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando {asignacionesFiltradas.length === 0 ? 0 : indicePrimeroAsign + 1} a{" "}
                      {Math.min(indiceUltimoAsign, asignacionesFiltradas.length)} de {asignacionesFiltradas.length}
                    </span>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaAsignacionesActual === 1 || totalPaginasAsign === 0}
                        onClick={() => setPaginaAsignacionesActual((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

                      {paginasAsign.map((num) => (
                        <button
                          key={num}
                          className={`page-btn ${paginaAsignacionesActual === num ? "active" : ""}`}
                          onClick={() => setPaginaAsignacionesActual(num)}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        className="page-btn"
                        disabled={paginaAsignacionesActual === totalPaginasAsign || totalPaginasAsign === 0}
                        onClick={() => setPaginaAsignacionesActual((prev) => Math.min(prev + 1, totalPaginasAsign))}
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

      {mostrarModalTablaRecep && (
        <div className="modal-overlay" onClick={() => setMostrarModalTablaRecep(false)}>
          <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Recepciones Registradas</h2>
            </div>

            <div className="modal-body">
              {cargando ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando recepciones...</p>
                </div>
              ) : (
                <>
                  <div className="filtro-bar">
                    <div className="busqueda-contenedor-asi">
                      <FaSearch className="icono-busqueda-asi" />
                      <input
                        type="text"
                        placeholder="Buscar responsable o producto..."
                        value={busquedaRecep}
                        onChange={(e) => setBusquedaRecep(e.target.value)}
                        className="input-busqueda-asi"
                      />
                    </div>

                    <select className="select-filtro" value={filtroResponsableRecep} onChange={(e) => setFiltroResponsableRecep(e.target.value)}>
                      <option value="">Filtrar por responsable...</option>
                      {opcionesResponsableRecep.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>

                    <select className="select-filtro" value={filtroCategoriaRecep} onChange={(e) => setFiltroCategoriaRecep(e.target.value)}>
                      <option value="">Filtrar por categoría...</option>
                      {opcionesCategoriaRecep.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          <th>Responsable</th>
                          <th>Ubicación</th>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Productos</th>
                          {admin && <th>Accciones</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {paginaRecepciones.length > 0 ? (
                          paginaRecepciones.map((r) => (
                            <tr key={r.id} className={r.activo === false ? "fila-anulada" : ""}>
                              <td>
                                {nombreCompleto(r.responsable)}
                                {!r.activo && (
                                  <span className="badge-estado inactivo" style={{ marginLeft: 8 }}>
                                    Anulada
                                  </span>
                                )}
                              </td>
                              <td>
                                {r.area
                                  ? `${r.area.nombre || r.area.area || "sin nombre"}${r.area.ubicacion ? " - " + r.area.ubicacion : ""}`
                                  : "Sin nombre "}
                              </td>
                              <td>{r.fecha_devolucion ? r.fecha_devolucion.slice(0, 10) : ""}</td>
                              <td>{[...new Set((r.productos || []).map((p) => p.categoria))].join(", ")}</td>
                              <td>
                                {(r.productos || []).map((p) => (
                                  <div key={p.id} className="producto-mini-row">
                                    {p.codigo} - {p.nombre}
                                  </div>
                                ))}
                              </td>
                              {admin && (
                                <td>
                                  <button
                                    className="btn-accion eliminar"
                                    onClick={() => anularRecepcion(r.id)}
                                    disabled={r.activo === false}
                                    title="Dar de baja"
                                  >
                                    <FaTrash />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={admin ? 6 : 5}>No hay recepciones</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando {recepcionesFiltradas.length === 0 ? 0 : indicePrimeraRecep + 1} a{" "}
                      {Math.min(indiceUltimaRecep, recepcionesFiltradas.length)} de {recepcionesFiltradas.length}
                    </span>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaRecepcionesActual === 1 || totalPaginasRecep === 0}
                        onClick={() => setPaginaRecepcionesActual((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

                      {paginasRecep.map((num) => (
                        <button
                          key={num}
                          className={`page-btn ${paginaRecepcionesActual === num ? "active" : ""}`}
                          onClick={() => setPaginaRecepcionesActual(num)}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        className="page-btn"
                        disabled={paginaRecepcionesActual === totalPaginasRecep || totalPaginasRecep === 0}
                        onClick={() => setPaginaRecepcionesActual((prev) => Math.min(prev + 1, totalPaginasRecep))}
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

      {mostrarSubModal && categoriaSeleccionada && (
        <div className="modal-overlay" onClick={() => setMostrarSubModal(false)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{categoriaSeleccionada}</h3>

            {(() => {
              let productosCat =
                modoSubmodal === "recepcion"
                  ? bienesDisponiblesRecep[categoriaSeleccionada] || []
                  : productos[categoriaSeleccionada] || [];

              const textoBusquedaProd = (busquedaProd || "").toLowerCase().trim();
              if (textoBusquedaProd) {
                productosCat = productosCat.filter((p) => {
                  const nombre = (p?.nombre || "").toLowerCase();
                  const codigo = (p?.codigo || "").toLowerCase();
                  const desc = (p?.descripcion || "").toLowerCase();
                  return (
                    nombre.includes(textoBusquedaProd) ||
                    codigo.includes(textoBusquedaProd) ||
                    desc.includes(textoBusquedaProd)
                  );
                });
              }

              const totalPaginasProd = Math.ceil(productosCat.length / productosPorPagina);
              const indiceUltimoProd = paginaProductosActual * productosPorPagina;
              const indicePrimeroProd = indiceUltimoProd - productosPorPagina;
              const productosPagina = productosCat.slice(indicePrimeroProd, indiceUltimoProd);


              return (
                <>
                <div className="filtro-bar">
                  <div className="busqueda-contenedor-pro">
                                      <FaSearch className="icono-busqueda-pro" />
                                      <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={busquedaProd}
                                        onChange={(e) => setBusquedaProd(e.target.value)}
                                        className="input-busqueda-pro"
                                      />
                                    </div>
                  <table className="tabla-elegante mini">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Descripción</th>
                        <th>Detalles</th>
                        <th>Seleccionar</th>
                      </tr>
                    </thead>

                    <tbody>
                      {productosPagina.map((p) => {
                        const seleccionados = bienesSeleccionados[categoriaSeleccionada] || [];
                        const estaSeleccionado = seleccionados.some((x) => x.id === p.id);

                        const ocupadoRow = modoSubmodal === "asignacion" ? mapaOcupados.get(Number(p.id)) : null;

                        const estaOcupado =
                          !!ocupadoRow;

                        const disabledCheckbox =
                          lector ||
                          (modoSubmodal === "asignacion" && estaOcupado);

                        return (
                          <tr key={p.id} style={estaOcupado ? { opacity: 0.65 } : undefined}>
                            <td>{p.codigo}</td>
                            <td>
                              {p.nombre}{" "}
                              {modoSubmodal === "asignacion" && estaOcupado && (
                                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.9 }}>
                                  (Ocupado{ocupadoRow?.responsable ? `: ${nombreCompleto(ocupadoRow.responsable)}` : ""})
                                </span>
                              )}
                            </td>
                            <td>{p.descripcion || "Sin descripción"}</td>
                            <td style={{ textAlign: "center" }}>
                              <FaInfoCircle
                                className="info-icon"
                                onClick={() => {
                                  setProductoDetalle(p);
                                  setMostrarDetalles(true);
                                }}
                              />
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={estaSeleccionado}
                                disabled={disabledCheckbox}
                                onChange={() => {
                                  if (lector) {
                                    toast.info("Solo lectura: no puedes modificar los bienes ");
                                    return;
                                  }


                                  if (modoSubmodal === "asignacion" && estaOcupado) {
                                    toast.info("Este bien ya está asignado actualmente.");
                                    return;
                                  }

                                  let nuevos = [...seleccionados];
                                  if (estaSeleccionado) {
                                    nuevos = nuevos.filter((x) => x.id !== p.id);
                                  } else {
                                    nuevos.push(p);
                                  }

                                  setBienesSeleccionados({
                                    ...bienesSeleccionados,
                                    [categoriaSeleccionada]: nuevos,
                                  });

                                  if (errores.bienes || errores.general) {
                                    setErrores((prev) => ({
                                      ...prev,
                                      bienes: undefined,
                                      general: undefined,
                                    }));
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
</div>
                  <div className="pagination-bar">
                    <span className="pagination-info">
                      Mostrando {productosCat.length === 0 ? 0 : indicePrimeroProd + 1} a{" "}
                      {Math.min(indiceUltimoProd, productosCat.length)} de {productosCat.length}
                    </span>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={paginaProductosActual === 1 || totalPaginasProd === 0}
                        onClick={() => setPaginaProductosActual((prev) => Math.max(prev - 1, 1))}
                      >
                        ‹
                      </button>

                {obtenerPaginasVisibles(paginaProductosActual, totalPaginasProd).map((num, i) =>
  num === "..." ? (
    <span key={i} className="page-ellipsis">...</span>
  ) : (
    <button
      key={i}
      className={`page-btn ${paginaProductosActual === num ? "active" : ""}`}
      onClick={() => setPaginaProductosActual(num)}
    >
      {num}
    </button>
  )
)}


                      <button
                        className="page-btn"
                        disabled={paginaProductosActual === totalPaginasProd || totalPaginasProd === 0}
                        onClick={() => setPaginaProductosActual((prev) => Math.min(prev + 1, totalPaginasProd))}
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button className="btn-cancel" onClick={() => setMostrarSubModal(false)}>
                      Cerrar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {mostrarDetalles && productoDetalle && (
        <div className="modal-overlay" onClick={() => setMostrarDetalles(false)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Detalle del Producto</h2>

            <p>
              <strong>Nombre:</strong> {productoDetalle.nombre}
            </p>
            <p>
              <strong>Código:</strong> {productoDetalle.codigo}
            </p>
            <p>
              <strong>Descripción:</strong> {productoDetalle.descripcion || "Sin descripción"}
            </p>
            <p>
              <strong>Categoría:</strong> {productoDetalle.categoria}
            </p>
            <p>
              <strong>Fecha Ingreso:</strong>{" "}
              {productoDetalle.fecha_ingreso ? productoDetalle.fecha_ingreso.slice(0, 10) : "Sin fecha"}
            </p>

            {(productoDetalle.categoria === "Equipo de Computo" || productoDetalle.categoria === "Equipo de Oficina") && (
              <>
                <p>
                  <strong>Marca:</strong> {productoDetalle.marca}
                </p>
                <p>
                  <strong>Modelo:</strong> {productoDetalle.modelo}
                </p>
                <p>
                  <strong>N° Serie:</strong> {productoDetalle.numero_serie}
                </p>
              </>
            )}

            {productoDetalle.categoria === "Muebles y Enseres" && (
              <>
                <p>
                  <strong>Dimensiones:</strong> {productoDetalle.dimensiones}
                </p>
                <p>
                  <strong>Color:</strong> {productoDetalle.color}
                </p>
              </>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setMostrarDetalles(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Asignacion;
