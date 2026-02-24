import React, { useState, useRef, useEffect, useMemo } from "react";
import "../styles/AgregarProducto.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import {
  FaBoxOpen,
  FaLaptop,
  FaUsers,
  FaCouch,
  FaTools,
  FaTag,
  FaAlignLeft,
  FaRulerCombined,
  FaPalette,
  FaIndustry,
  FaQrcode,
  FaDownload,
  FaSearch,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEdit,
  FaBarcode,
  FaPlus,
  FaInfoCircle,} from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QRCodeCanvas } from "qrcode.react";
import {
  validarTexto,
  validarDimensiones,
  validarCategoria,
  validarFecha,
  validarNumeroSerie,
  validarNumeroSerieUnico,
  normalizarTexto,
  normalizarClave,
} from "../Validaciones/validacionesProducto";
import axiosCliente from "../api/axiosClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { esAdmin, esLector } from "../utils/permisos";
import logoEpespo from "../assets/logo1_epespo.jpeg";
import { useNotificaciones } from "../context/NotificacionesContext";
const PREFIJOS = {
  "Equipo de Computo": "E-EC",
  "Equipo de Oficina": "E-EO",
  "Muebles y Enseres": "E-ME",
  "Instalaciones, Maquinarias y Herramientas": "E-IM",
};
const CATEGORIAS_CON_SERIE = ["Equipo de Computo", "Equipo de Oficina"];
const CAMPOS_CATEGORIA = {
  "Equipo de Computo": [
    { label: "Marca", name: "marca", icon: <FaIndustry /> },
    { label: "Modelo", name: "modelo", icon: <FaBoxOpen /> },
    { label: "Número de Serie", name: "numero_serie", icon: <FaBarcode /> },
  ],
  "Equipo de Oficina": [
    { label: "Marca", name: "marca", icon: <FaIndustry /> },
    { label: "Modelo", name: "modelo", icon: <FaBoxOpen /> },
    { label: "Número de Serie", name: "numero_serie", icon: <FaBarcode /> },
  ],
  "Muebles y Enseres": [
    { label: "Dimensiones", name: "dimensiones", icon: <FaRulerCombined /> },
    { label: "Color", name: "color", icon: <FaPalette /> },
  ],
  "Instalaciones, Maquinarias y Herramientas": [],
};
const COLUMNAS_POR_CATEGORIA = {
  "Equipo de Computo": [
    "codigo",
    "codigo_anterior",
    "nombre",
    "descripcion",
    "marca",
    "modelo",
    "numero_serie",
    "fecha_ingreso",
    "ubicacion_id",
    "estado",
  ],
  "Equipo de Oficina": [
    "codigo",
    "codigo_anterior",
    "nombre",
    "descripcion",
    "marca",
    "modelo",
    "numero_serie",
    "fecha_ingreso",
    "ubicacion_id",
    "estado",
  ],
  "Muebles y Enseres": [
    "codigo",
    "codigo_anterior",
    "nombre",
    "descripcion",
    "dimensiones",
    "color",
    "fecha_ingreso",
    "ubicacion_id",
    "estado",
  ],
  "Instalaciones, Maquinarias y Herramientas": [
    "codigo",
    "codigo_anterior",
    "nombre",
    "descripcion",
    "fecha_ingreso",
    "ubicacion_id",
    "estado",
  ],
};
const COLUMNAS_REQUERIDAS_IMPORT = {
  "Equipo de Computo": [
    "nombre",
    "descripcion",
    "marca",
    "modelo",
    "numero_serie",
    "fecha_ingreso",
    "ubicacion",
  ],
  "Equipo de Oficina": [
    "nombre",
    "descripcion",
    "marca",
    "modelo",
    "numero_serie",
    "fecha_ingreso",
    "ubicacion",
  ],
  "Muebles y Enseres": [
    "nombre",
    "descripcion",
    "dimensiones",
    "color",
    "fecha_ingreso",
    "ubicacion",
  ],
  "Instalaciones, Maquinarias y Herramientas": [
    "nombre",
    "descripcion",
    "fecha_ingreso",
    "ubicacion",
  ],
};
const obtenerNombreHojaExcel = (categoriaTabla) => {
  if (!categoriaTabla) return "Datos";
  const MAPA = {
    "Equipo de Computo": "Equipo_Computo",
    "Equipo de Oficina": "Equipo_Oficina",
    "Muebles y Enseres": "Muebles_Enseres",
    "Instalaciones, Maquinarias y Herramientas": "Inst_Maq_Herr",
  };
  let nombre = MAPA[categoriaTabla] || categoriaTabla;
  nombre = nombre.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
  if (nombre.length > 31) nombre = nombre.slice(0, 31);
  return nombre;
};
const obtenerEtiquetaColumna = (col) => {
  switch (col) {
    case "codigo_anterior":
  return "Codigo Antiguo";
    case "fecha_ingreso":
      return "Fecha ingreso";
    case "ubicacion_id":
      return "Ubicación";
    default:
      return col
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase());
  }
};
const obtenerSiguienteSecuencia = (categoriaSeleccionada, listaProductos) => {
  const prefijo = PREFIJOS[categoriaSeleccionada];
  const año = new Date().getFullYear();
  const re = new RegExp(`^${prefijo}-${año}-(\\d{3})$`);
  let max = 0;

  for (const p of listaProductos) {
    if (p.categoria !== categoriaSeleccionada) continue;
    const m = (p.codigo || "").match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
};
const generarCodigoConSecuencia = (categoriaSeleccionada, secuencia) => {
  const prefijo = PREFIJOS[categoriaSeleccionada];
  const año = new Date().getFullYear();
  return `${prefijo}-${año}-${String(secuencia).padStart(3, "0")}`;
};
const AgregarProducto = () => {
  const [categoria, setCategoria] = useState("");
  const [producto, setProducto] = useState({
  es_donado: false,
  codigo_anterior: "",
});

  const [productos, setProductos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const PRODUCTOS_POR_PAGINA = 5;
  const PRODUCTOS_POR_PAGINA_IMPRESION = 5;
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [mostrarModalTabla, setMostrarModalTabla] = useState(false);
  const [mostrarQRModal, setMostrarQRModal] = useState(false);
  const [productoQR, setProductoQR] = useState(null);
  const qrRef = useRef();
  const [tablaDatos, setTablaDatos] = useState([]);
  const [categoriaTabla, setCategoriaTabla] = useState("");
  const [editarId, setEditarId] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [donadoFiltro, setDonadoFiltro] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [columnaOrden, setColumnaOrden] = useState(null);
  const [ordenAsc, setOrdenAsc] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [mostrarModalImpresion, setMostrarModalImpresion] = useState(false);
  const [productosSeleccionImpresion, setProductosSeleccionImpresion] =useState([]);
  const [marcarTodasImpresion, setMarcarTodasImpresion] = useState(false);
  const [paginaImpresion, setPaginaImpresion] = useState(1);
  const [mostrarDetallesProducto, setMostrarDetallesProducto] =useState(false);
  const [productoDetalle, setProductoDetalle] = useState(null);
  const admin = esAdmin();
  const lector = esLector();
  const { agregarNotificacion } = useNotificaciones();
  const [errores, setErrores] = useState({});
  const [tieneCodigoAnterior, setTieneCodigoAnterior] = useState(false);


  useEffect(() => {
    fetchProductos();      
    fetchDepartamentos(); 
  }, []);
  
  const fetchProductos = async () => {
    try {
      const { data } = await axiosCliente.get("/productos");
      setProductos(data);
    } catch (error) {
      console.error("Error al cargar productos", error);
      toast.error("Error al cargar productos");
    }
  };
  const fetchDepartamentos = async () => {
    try {
      const { data } = await axiosCliente.get("/departamentos");
      setDepartamentos(data);
    } catch (error) {
      console.error("Error al cargar departamentos", error);
      toast.error("Error al cargar departamentos ");
    }
  };
  const depPorId = useMemo(() => {
    const map = new Map();
    departamentos.forEach((d) => map.set(Number(d.id), d));
    return map;
  }, [departamentos]);
  const handleCategoria = (e) => {
    const nuevaCategoria = e.target.value;
    setCategoria(nuevaCategoria); 
    setProducto((prev) => ({
      ...prev,
      nombre: "",
      descripcion: "",
      marca: "",
      modelo: "",
      numero_serie: "",
      dimensiones: "",
      color: "",
      fecha_ingreso: "",
      ubicacion_id: "",
      es_donado: prev.es_donado,
    }));
    setEditarId(null);
    setErrores({});
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => {
      if (!prev[name]) return prev;
      const copia = { ...prev };
      delete copia[name];
      return copia;
    });
  };
  const generarCodigo = (categoriaSeleccionada) => {
    const prefijo = PREFIJOS[categoriaSeleccionada];
    const año = new Date().getFullYear();
    const productosCat = productos.filter(
      (p) => p.categoria === categoriaSeleccionada
    );
    const numero = (productosCat.length + 1).toString().padStart(3, "0");
    return `${prefijo}-${año}-${numero}`;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lector) {
      toast.info("Solo lectura: no puedes registrar ni editar bienes ");
      return;
    }
    const nuevosErrores = {};
 const prod = {
  ...producto,
  codigo: producto.codigo, // 🔥 CLAVE
  nombre: normalizarTexto(producto.nombre),
  descripcion: normalizarTexto(producto.descripcion),
  marca: normalizarTexto(producto.marca),
  modelo: normalizarTexto(producto.modelo),
  numero_serie: normalizarTexto(producto.numero_serie),
  dimensiones: normalizarTexto(producto.dimensiones),
  color: normalizarTexto(producto.color),
  fecha_ingreso: producto.fecha_ingreso,
  ubicacion_id: producto.ubicacion_id,
  es_donado: !!producto.es_donado,
};

    const errorCategoria = validarCategoria(categoria);
    if (errorCategoria) nuevosErrores.categoria = errorCategoria;
    const errorNombre = validarTexto(prod.nombre, "nombre");
    if (errorNombre) nuevosErrores.nombre = errorNombre;
    const errorDescripcion = validarTexto(prod.descripcion, "descripción");
    if (errorDescripcion) nuevosErrores.descripcion = errorDescripcion;
    if (CATEGORIAS_CON_SERIE.includes(categoria)) {
      const errorMarca = validarTexto(prod.marca, "marca");
      if (errorMarca) nuevosErrores.marca = errorMarca;
      const errorModelo = validarTexto(prod.modelo, "modelo");
      if (errorModelo) nuevosErrores.modelo = errorModelo;
      const errorNumSerie = validarNumeroSerie(prod.numero_serie);
      if (errorNumSerie) nuevosErrores.numero_serie = errorNumSerie;
      const errorUnico = validarNumeroSerieUnico(
        prod.numero_serie,
        productos,
        categoria,
        editarId
      );
      if (errorUnico) nuevosErrores.numero_serie = errorUnico;
    }
    if (categoria === "Muebles y Enseres") {
      const errorDimensiones = validarDimensiones(prod.dimensiones);
      if (errorDimensiones) nuevosErrores.dimensiones = errorDimensiones;

      const errorColor = validarTexto(prod.color, "color");
      if (errorColor) nuevosErrores.color = errorColor;
    }
    const errorFecha = validarFecha(prod.fecha_ingreso);
    if (errorFecha) nuevosErrores.fecha_ingreso = errorFecha;
    if (!prod.ubicacion_id) {
      nuevosErrores.ubicacion_id =
        "Debe seleccionar la ubicación / departamento";
    }
      if (tieneCodigoAnterior) {
  if (!producto.codigo_anterior?.trim()) {
    nuevosErrores.codigo_anterior = "Debe ingresar el código anterior";
  } else {
    const existe = productos.some(
      (p) =>
        p.codigo_anterior?.toLowerCase() ===
          producto.codigo_anterior.toLowerCase() &&
        p.id !== editarId
    );

    if (existe) {
      nuevosErrores.codigo_anterior =
        "Este código anterior ya está registrado";
    }
  }
}
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    setErrores({});
    try {
      setCargando(true);
const nuevoProducto = {
  ...prod,
  categoria,
  fecha_ingreso: prod.fecha_ingreso,
  ubicacion_id: prod.ubicacion_id ? Number(prod.ubicacion_id) : "",
  es_donado: !!prod.es_donado,
  codigo_anterior: tieneCodigoAnterior
    ? producto.codigo_anterior
    : null,
};


if (editarId && admin && producto.codigo) {
  nuevoProducto.codigo = producto.codigo;
}

      if (!editarId) {
        if (tieneCodigoAnterior) {
          nuevoProducto.codigo = producto.codigo_anterior;
        } else {
          nuevoProducto.codigo = generarCodigo(categoria);
        }
        await axiosCliente.post("/productos", nuevoProducto);
        toast.success("Producto agregado con éxito ");
        agregarNotificacion({
          titulo: "Producto agregado",
          mensaje: `Se registró el producto: ${nuevoProducto.nombre}`,
          fecha: new Date().toISOString(),
        });
      } else {
        await axiosCliente.put(`/productos/${editarId}`, nuevoProducto);
        toast.success("Producto editado con éxito ");
        agregarNotificacion({
          titulo: "Producto editado",
          mensaje: `Se actualizó el producto: ${nuevoProducto.nombre}`,
          fecha: new Date().toISOString(),
        });
      }
  const { data: productosActualizados } = await axiosCliente.get("/productos");

setProductos(productosActualizados);

// ...existing code...
if (categoriaTabla) {
  setTablaDatos(
    productosActualizados.filter(
      (p) => p.categoria === categoriaTabla
    )
  );
} else {
  setTablaDatos(productosActualizados);
}

      setProducto({ es_donado: false, codigo_anterior: "" });
setTieneCodigoAnterior(false);

      setCategoria("");
      setMostrarModalProducto(false);
      setEditarId(null);
    }
     
finally {
      setCargando(false);
    }


  
  };
  const renderCamposCategoria = () =>
    CAMPOS_CATEGORIA[categoria]?.map((campo, i) => {
      const errorCampo = errores[campo.name];
      return (
        <div className="form-group-pro" key={i}>
          <label>{campo.label}</label>
          <div
            className={`input-icon-pro ${errorCampo ? "input-error" : ""}`}
          >
            {campo.icon && <span className="icon-input-pro">{campo.icon}</span>}
            <input
              type="text"
              name={campo.name}
              value={producto[campo.name] || ""}
              onChange={handleChange}
              placeholder={`Ingrese ${campo.label.toLowerCase()}`}
            />
          </div>
          {errorCampo && (
            <span className="mensaje-error">{errorCampo}</span>
          )}
        </div>
      );
    });
const editarProducto = (item) => {
  setProducto({
    ...item,
    fecha_ingreso: item.fecha_ingreso ? item.fecha_ingreso.slice(0, 10) : "",
    ubicacion_id: item.ubicacion_id || "",
    es_donado: !!item.es_donado,
  });

  setTieneCodigoAnterior(!!item.codigo_anterior);
  setCategoria(item.categoria);
  setEditarId(item.id);
  setMostrarModalProducto(true);
  setMostrarModalTabla(false);
  setErrores({});
};

  const abrirModalTabla = async (cat) => {
    setCategoriaTabla(cat);
    setMostrarModalTabla(true);
    setCargando(true);
    setBusqueda("");
    setEstadoFiltro("");
    setDonadoFiltro("");
    setPaginaActual(1);
    try {
      const { data } = await axiosCliente.get("/productos", {
        params: { categoria: cat },
      });
      setTablaDatos(data);
      setProductos((prev) => {
        const otros = prev.filter((p) => p.categoria !== cat);
        return [...otros, ...data];
      });
    } catch (error) {
      console.error("Error al cargar productos:", error);
      toast.error("Error al cargar productos ");
    } finally {
      setCargando(false);
    }
  };
  const ordenarPorColumna = (columna) => {
    const nuevaOrdenAsc = columnaOrden === columna ? !ordenAsc : true;
    setColumnaOrden(columna);
    setOrdenAsc(nuevaOrdenAsc);
    const datosOrdenados = [...tablaDatos].sort((a, b) => {
      const valorA = a[columna]?.toString().toLowerCase() || "";
      const valorB = b[columna]?.toString().toLowerCase() || "";
      return nuevaOrdenAsc
        ? valorA.localeCompare(valorB)
        : valorB.localeCompare(valorA);
    });
    setTablaDatos(datosOrdenados);
  };
  const productosFiltrados = tablaDatos.filter((p) => {
    const coincideNombre = (p.nombre || "")
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    const coincideEstado = estadoFiltro ? p.estado === estadoFiltro : true;
    const coincideDonado =
      donadoFiltro === ""
        ? true
        : donadoFiltro === "donado"
        ? !!p.es_donado
        : !p.es_donado;

    return coincideNombre && coincideEstado && coincideDonado;
  });
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, estadoFiltro, donadoFiltro, tablaDatos.length]);

  const indiceUltimo = paginaActual * PRODUCTOS_POR_PAGINA;
  const indicePrimero = indiceUltimo - PRODUCTOS_POR_PAGINA;
  const productosPagina = productosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(
    productosFiltrados.length / PRODUCTOS_POR_PAGINA
  );
 // const paginas =
   // totalPaginas > 0
     // ? Array.from({ length: totalPaginas }, (_, i) => i + 1)
      //: [];
  const totalPaginasImpresion = Math.ceil(
    tablaDatos.length / PRODUCTOS_POR_PAGINA_IMPRESION
  );
  const indiceUltimoImp = paginaImpresion * PRODUCTOS_POR_PAGINA_IMPRESION;
  const indicePrimeroImp =
    indiceUltimoImp - PRODUCTOS_POR_PAGINA_IMPRESION;
  const productosPaginaImpresion = tablaDatos.slice(
    indicePrimeroImp,
    indiceUltimoImp
  );
  const paginasImpresion =
    totalPaginasImpresion > 0
      ? Array.from({ length: totalPaginasImpresion }, (_, i) => i + 1)
      : [];

  const descargarPlantillaExcel = () => {
    if (!categoriaTabla) {
      toast.info("Seleccione una categoría primero ");
      return;
    }

    const columnasBase = COLUMNAS_POR_CATEGORIA[categoriaTabla].filter(
      (c) => c !== "codigo" && c !== "estado"
    );

    const columnas = columnasBase.map((col) =>
      col === "ubicacion_id" ? "ubicacion" : col
    );

    const encabezados = [columnas];
    const ws = XLSX.utils.aoa_to_sheet(encabezados);
    const wb = XLSX.utils.book_new();

    const nombreHoja = obtenerNombreHojaExcel(categoriaTabla);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `plantilla_${nombreHoja}.xlsx`);

    toast.success("Plantilla Excel descargada ");
  };
  const exportarExcel = () => {
    const datosParaExportar = productosFiltrados;

    if (!categoriaTabla) {
      toast.info("Seleccione una categoría primero ");
      return;
    }

    if (!datosParaExportar || datosParaExportar.length === 0) {
      toast.info("No hay productos para exportar ");
      return;
    }

    const columnas = COLUMNAS_POR_CATEGORIA[categoriaTabla];
    const headers = columnas.map((c) => (c === "ubicacion_id" ? "ubicacion" : c));

    const filas = datosParaExportar.map((p) => {
      const row = {};
      columnas.forEach((col) => {
        if (col === "ubicacion_id") {
          const dep = depPorId.get(Number(p.ubicacion_id));
          row["ubicacion"] = dep ? `${dep.ubicacion}` : "Sin ubicación";
        } else if (col === "fecha_ingreso") {
          row[col] = p.fecha_ingreso ? String(p.fecha_ingreso).slice(0, 10) : "";
        } else {
          row[col] = p[col] ?? "";
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(filas, { header: headers });
    XLSX.utils.sheet_add_aoa(
      ws,
      [headers.map((h) => obtenerEtiquetaColumna(h))],
      { origin: "A1" }
    );

    const wb = XLSX.utils.book_new();
    const nombreHoja = obtenerNombreHojaExcel(categoriaTabla);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/octet-stream" });

    saveAs(blob, `${nombreHoja}_productos.xlsx`);
    toast.success("Archivo Excel exportado correctamente ");
  };
 const importarExcel = (e) => {
  const fileInput = e.target;
  const file = fileInput.files?.[0];
  if (!file) return;
  const loadingId = toast.loading("Subiendo archivo...");
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      if (!categoriaTabla) {
        toast.dismiss(loadingId);
        toast.error("Seleccione una categoría antes de importar.");
        fileInput.value = "";
        return;
      }

      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (!jsonData || jsonData.length === 0) {
        toast.dismiss(loadingId);
        toast.error("El archivo Excel no contiene datos.");
        fileInput.value = "";
        return;
      }

      const columnasRequeridas = COLUMNAS_REQUERIDAS_IMPORT[categoriaTabla];
      if (!columnasRequeridas) {
        toast.dismiss(loadingId);
        toast.error("Configuración de columnas no encontrada.");
        fileInput.value = "";
        return;
      }

      const encabezados = Object.keys(jsonData[0] || {});
      const faltan = columnasRequeridas.filter((c) => !encabezados.includes(c));

      if (faltan.length > 0) {
        toast.dismiss(loadingId);
        toast.error(`Faltan columnas obligatorias: ${faltan.join(", ")}`);
        fileInput.value = "";
        return;
      }

      setCargando(true);

      let secuencia = obtenerSiguienteSecuencia(categoriaTabla, productos);
      const seriesEnBD = new Set(
        productos
          .filter((p) => p.categoria === categoriaTabla)
          .map((p) => `${categoriaTabla}|${normalizarClave(p.numero_serie || "")}`)
      );

      const vistosSerie = new Set();

      for (const prod of jsonData) {
        prod.nombre = normalizarTexto(prod.nombre);
        prod.descripcion = normalizarTexto(prod.descripcion);
        prod.marca = normalizarTexto(prod.marca);
        prod.modelo = normalizarTexto(prod.modelo);
        prod.numero_serie = normalizarTexto(prod.numero_serie);
        prod.dimensiones = normalizarTexto(prod.dimensiones);
        prod.color = normalizarTexto(prod.color);
        // Normalizar código anterior si existe en la plantilla/archivo
        prod.codigo_anterior = prod.codigo_anterior ? normalizarTexto(prod.codigo_anterior) : "";
        if (validarTexto(prod.nombre, "nombre")) continue;
        if (validarTexto(prod.descripcion, "descripción")) continue; 

        if (CATEGORIAS_CON_SERIE.includes(categoriaTabla)) {
          if (validarTexto(prod.marca, "marca")) continue;
          if (validarTexto(prod.modelo, "modelo")) continue;
          if (validarNumeroSerie(prod.numero_serie)) continue;

          const clave = `${categoriaTabla}|${normalizarClave(prod.numero_serie)}`;
          if (vistosSerie.has(clave)) continue;
          vistosSerie.add(clave);

          if (seriesEnBD.has(clave)) continue;
          seriesEnBD.add(clave);
        }

        if (categoriaTabla === "Muebles y Enseres") {
          if (validarDimensiones(prod.dimensiones)) continue;
          if (validarTexto(prod.color, "color")) continue;
        }
        if (typeof prod.fecha_ingreso === "number") {
          const fecha = XLSX.SSF.parse_date_code(prod.fecha_ingreso);
          if (!fecha?.y || !fecha?.m || !fecha?.d) continue;
          prod.fecha_ingreso = `${fecha.y}-${String(fecha.m).padStart(2, "0")}-${String(fecha.d).padStart(2, "0")}`;
        }

        if (validarFecha(prod.fecha_ingreso)) continue;
        const textoUbic = (prod.ubicacion || "").toString().trim().toLowerCase();
        const depEncontrado = departamentos.find(
          (d) => (d.ubicacion || "").toString().trim().toLowerCase() === textoUbic
        );
        if (!depEncontrado) continue;

        prod.ubicacion_id = depEncontrado.id;
        delete prod.ubicacion;

        const codigoGenerado = generarCodigoConSecuencia(categoriaTabla, secuencia);
        secuencia++;

        // Si el excel incluye un codigo_anterior válido para la categoría y no existe en la BD, úsalo como código final
        let codigoFinal = codigoGenerado;
        if (prod.codigo_anterior && prod.codigo_anterior.trim() !== "") {
          try {
const patron = new RegExp(
  `^${PREFIJOS[categoriaTabla]}-\\d{4}-\\d{3}$`
);
            if (patron.test(prod.codigo_anterior)) {
              const existeCodigo = productos.some((p) => p.codigo === prod.codigo_anterior);
              if (!existeCodigo) {
                codigoFinal = prod.codigo_anterior;
              }
            }
          } catch (e) {
            // Si algo falla, se usa el código generado
          }
        }

        const nuevoProducto = {
          ...prod,
          codigo: codigoFinal,
          categoria: categoriaTabla,
          estado: "Activo",
          es_donado: !!prod.es_donado,
        }; 

        await axiosCliente.post("/productos", nuevoProducto);
      }

      const { data: nuevosProductos } = await axiosCliente.get("/productos");
      setProductos(nuevosProductos);
      setTablaDatos(nuevosProductos.filter((p) => p.categoria === categoriaTabla));
      toast.dismiss(loadingId);
      toast.success("Archivo subido exitosamente", { autoClose: 2200 });
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingId);
      toast.error("Error durante la importación.", { autoClose: 2500 });
    } finally {
      setCargando(false);
      fileInput.value = "";
    }
  };

  reader.readAsBinaryString(file);
};

  const mostrarQR = (productoSel) => {
    const dep = depPorId.get(Number(productoSel.ubicacion_id));
    const ubicacion_texto = dep
      ? `${dep.nombre} - ${dep.ubicacion}`
      : "Sin ubicación";

    setProductoQR({ ...productoSel, ubicacion_texto });
    setMostrarQRModal(true);
  };
  const descargarQR = () => {
    if (!qrRef.current || !productoQR) return;

    const canvasQR = qrRef.current.querySelector("canvas");
    if (!canvasQR) return;

    const qrSize = 200;
    const headerHeight = 90;
    const footerHeight = 90;
    const width = 400;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = headerHeight + qrSize + footerHeight;

    const ctx = tempCanvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const logo = new Image();
    logo.src = logoEpespo;

    logo.onload = () => {
      const logoSize = 60;
      const logoX = 30;
      const logoY = 15;
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

      ctx.fillStyle = "#003366";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "left";
      ctx.fillText("EPESPO", logoX + logoSize + 20, logoY + 25);

      ctx.font = "12px Arial";
      ctx.fillText(
        "Escuela de Pesca del Pacífico Oriental",
        logoX + logoSize + 20,
        logoY + 45
      );

      const qrX = (tempCanvas.width - qrSize) / 2;
      const qrY = headerHeight;
      ctx.drawImage(canvasQR, qrX, qrY, qrSize, qrSize);

      ctx.textAlign = "center";
      ctx.fillStyle = "#000000";

      let yText = headerHeight + qrSize + 25;

      ctx.font = "bold 16px Arial";
      ctx.fillText(
        productoQR.nombre || "Producto sin nombre",
        tempCanvas.width / 2,
        yText
      );

      ctx.font = "14px Arial";
      yText += 22;
      ctx.fillText(
        `${productoQR.categoria || "Sin categoría"}`,
        tempCanvas.width / 2,
        yText
      );

      const ubicacionTexto = productoQR.ubicacion_texto || "No asignada";

      yText += 22;
      ctx.fillText(ubicacionTexto, tempCanvas.width / 2, yText);

      // Si existe código anterior, mostrarlo en la etiqueta inferior
      if (productoQR.codigo_anterior) {
        yText += 22;
        ctx.fillText(`Código Antiguo: ${productoQR.codigo_anterior}`, tempCanvas.width / 2, yText);
      }

      const enlace = document.createElement("a");
      enlace.href = tempCanvas.toDataURL("image/png");
      enlace.download = `${(productoQR.nombre || "producto").replace(
        /\s/g,
        "_"
      )}_QR.png`;
      enlace.click();

      toast.info("QR descargado correctamente ");
    };

    logo.onerror = () => {
      console.error("Error al cargar el logo de EPESPO");
      toast.error("No se pudo cargar el logo de EPESPO ");
    };
  };
const cerrarModalProducto = () => {
  setMostrarModalProducto(false);
  setProducto({ es_donado: false, codigo_anterior: "" });
  setCategoria("");
  setEditarId(null);
  setTieneCodigoAnterior(false);
  setErrores({});
};

  const abrirModalImpresion = () => {
    if (tablaDatos.length === 0) {
      toast.info("No hay productos para imprimir ");
      return;
    }
    setProductosSeleccionImpresion([]);
    setMarcarTodasImpresion(false);
    setPaginaImpresion(1);
    setMostrarModalImpresion(true);
  };
  const cerrarModalImpresion = () => {
    setMostrarModalImpresion(false);
  };
  const toggleProductoImpresion = (productoSel) => {
    setProductosSeleccionImpresion((prev) => {
      const existe = prev.some((p) => p.id === productoSel.id);
      let nuevo;
      if (existe) {
        nuevo = prev.filter((p) => p.id !== productoSel.id);
      } else {
        nuevo = [...prev, productoSel];
      }

      if (nuevo.length === tablaDatos.length && tablaDatos.length > 0) {
        setMarcarTodasImpresion(true);
      } else {
        setMarcarTodasImpresion(false);
      }

      return nuevo;
    });
  };
  const toggleMarcarTodasImpresion = (e) => {
    const checked = e.target.checked;
    setMarcarTodasImpresion(checked);

    if (checked) {
      setProductosSeleccionImpresion(tablaDatos);
    } else {
      setProductosSeleccionImpresion([]);
    }
  };
  const handleGenerarDocWord = async () => {
    if (productosSeleccionImpresion.length === 0) {
      toast.info("Selecciona al menos un bien para generar el documento.");
      return;
    }

    try {
      const ids = productosSeleccionImpresion.map((p) => p.id);
      // Enviar también los productos seleccionados (incluye codigo_anterior) para que el backend pueda usarlos en la plantilla
      const productosParaExportar = productosSeleccionImpresion.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        codigo_anterior: p.codigo_anterior || null,
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria: p.categoria,
        fecha_ingreso: p.fecha_ingreso,
        ubicacion_id: p.ubicacion_id,
      }));

      const response = await axiosCliente.post(
        "/productos/exportar-word",
        { ids, productos: productosParaExportar },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const hoy = new Date().toISOString().slice(0, 10);
      const nombreCategoria = (categoriaTabla || "Inventario")
        .replace(/\s+/g, "_")
        .replace(/,/g, "");

      link.href = url;
      link.download = `Inventario_${nombreCategoria}_${hoy}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Documento generado correctamente.");
      cerrarModalImpresion();
    } catch (error) {
      console.error(error);
      toast.error("Error al generar el documento Word.");
    }
  };
  const obtenerPaginasVisibles = (
  paginaActual,
  totalPaginas,
  rango = 3
) => {
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
         
              <div
                className="card clickable"
                onClick={() => abrirModalTabla("Equipo de Computo")}
              >
                <FaLaptop className="card-icon" />
                <h2 className="card-title">Equipo de Computo</h2>
                <p className="card-subtitle">Ver Bienes</p>
              </div>
              <div
                className="card clickable"
                onClick={() => abrirModalTabla("Equipo de Oficina")}
              >
                <FaUsers className="card-icon" />
                <h2 className="card-title">Equipo de Oficina</h2>
                <p className="card-subtitle">Ver Bienes</p>
              </div>
            </div>

            <div className="cards-row">
              <div
                className="card clickable"
                onClick={() => abrirModalTabla("Muebles y Enseres")}
              >
                <FaCouch className="card-icon" />
                <h2 className="card-title">Muebles y Enseres</h2>
                <p className="card-subtitle">Ver Bienes</p>
              </div>
              <div
                className="card clickable"
                onClick={() =>
                  abrirModalTabla("Instalaciones, Maquinarias y Herramientas")
                }
              >
                <FaTools className="card-icon" />
                <h2 className="card-title">
                  Instalaciones, Maquinarias y Herramientas
                </h2>
                <p className="card-subtitle">Ver Bienes</p>
              </div>
            </div>
          </div>
          
        </div>
{admin && (
  <button
    className="fab-agregar"
    onClick={() => setMostrarModalProducto(true)}
    aria-label="Agregar nuevo bien"
    title="Agregar nuevo bien"
  >
    <FaPlus />
    <span className="fab-tooltip">Agregar nuevo bien</span>
  </button>
)}


      </div>
      
      {mostrarModalProducto && (
        <div className="modal-overlay-pro" onClick={cerrarModalProducto}>
          <div
            className="modal-pro scrollable-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title-pro">
              {editarId ? "Editar Producto" : "Formulario de Producto"}
            </h2>
            <form className="form" onSubmit={handleSubmit}>
              <fieldset disabled={lector}>
                <div className="form-group-pro-s">
                  <label>Categoría</label>
                  <div
                    className={`input-icon-pro ${
                      errores.categoria ? "input-error" : ""
                    }`}
                  >
                    <select value={categoria} onChange={handleCategoria}>
                      <option value="">
                        -- Seleccione una categoría --
                      </option>
                      {Object.keys(PREFIJOS).map((cat, i) => (
                        <option key={i} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errores.categoria && (
                    <span className="mensaje-error">
                      {errores.categoria}
                    </span>
                  )}
                </div>

                {categoria && (
                  <>
         

                    <div className="form-group-pro">
                      <label>Nombre de Producto</label>
                      <div
                        className={`input-icon-pro ${
                          errores.nombre ? "input-error" : ""
                        }`}
                      >
                        <FaTag className="icon-input-pro" />
                        <input
                          type="text"
                          name="nombre"
                          value={producto.nombre || ""}
                          onChange={handleChange}
                          placeholder="Ingrese el nombre de producto"
                        />
                      </div>
                      {errores.nombre && (
                        <span className="mensaje-error">
                          {errores.nombre}
                        </span>
                      )}
                    </div>
                    <div className="form-group-pro">
                      <label>Descripción</label>
                      <div
                        className={`input-icon-pro ${
                          errores.descripcion ? "input-error" : ""
                        }`}
                      >
                        <FaAlignLeft className="icon-input-pro" />
                        <input
                          type="text"
                          name="descripcion"
                          value={producto.descripcion || ""}
                          onChange={handleChange}
                          placeholder="Ingrese una breve descripción"
                        />
                      </div>
                      {errores.descripcion && (
                        <span className="mensaje-error">
                          {errores.descripcion}
                        </span>
                      )}
                    </div>
                    <div className="form-group-pro">
                      <label>Fecha de Ingreso</label>
                      <div
                        className={`input-icon-pro ${
                          errores.fecha_ingreso ? "input-error" : ""
                        }`}
                      >
                        <FaCalendarAlt className="icon-input-pro" />
                        <input
                          type="date"
                          name="fecha_ingreso"
                          value={producto.fecha_ingreso || ""}
                          onChange={handleChange}
                        />
                      </div>
                      {errores.fecha_ingreso && (
                        <span className="mensaje-error">
                          {errores.fecha_ingreso}
                        </span>
                      )}
                    </div>
                    <div className="form-group-pro-s">
                      <label>Ubicación</label>
                      <div
                        className={`input-icon-pro ${
                          errores.ubicacion_id ? "input-error" : ""
                        }`}
                      >
                        <FaMapMarkerAlt className="icon-input-pro" />
                        <select
                          name="ubicacion_id"
                          value={producto.ubicacion_id || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setProducto((prev) => ({
                              ...prev,
                              ubicacion_id: value,
                            }));
                            setErrores((prev) => {
                              if (!prev.ubicacion_id) return prev;
                              const copia = { ...prev };
                              delete copia.ubicacion_id;
                              return copia;
                            });
                          }}
                        >
                          <option value="">
                            -- Seleccione un departamento --
                          </option>
                          {departamentos.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.nombre} - {d.ubicacion}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errores.ubicacion_id && (
                        <span className="mensaje-error">
                          {errores.ubicacion_id}
                        </span>
                      )}
                    </div>
                    <div className="form-group-pro-s form-check-donado">
                      <label className="label-checkbox-donado">
                        <input
                          type="checkbox"
                          checked={!!producto.es_donado}
                          onChange={(e) =>
                            setProducto((prev) => ({
                              ...prev,
                              es_donado: e.target.checked,
                            }))
                          }
                        />
                        Bien donado
                      </label>
                      <small className="help-text-donado">
                        Marca esta opción si el bien fue recibido por
                        donación.
                      </small>
                    </div>
{!editarId && (
  <>
    <div className="form-group-pro-s form-check-donado">
      <label className="label-checkbox-donado">
        <input
          type="checkbox"
          checked={tieneCodigoAnterior}
          onChange={(e) => {
            setTieneCodigoAnterior(e.target.checked);
            if (!e.target.checked) {
              setProducto((prev) => ({
                ...prev,
                codigo_anterior: "",
              }));
            }
          }}
        />
        ¿Tiene código anterior?
      </label>
      <small className="help-text-donado">
        Marca esta opción si el bien ya tenía un código previo.
      </small>
    </div>

    {tieneCodigoAnterior && (
      <div className="form-group-pro">
        <label>Codigo Anterior</label>
        <div
          className={`input-icon-pro ${
            errores.codigo_anterior ? "input-error" : ""
          }`}
        >
          
          <input
            type="text"
            name="codigo_anterior"
            value={producto.codigo_anterior || ""}
            onChange={handleChange}
            placeholder="Ingrese el código anterior"
           pattern={categoria 
  ? `^${PREFIJOS[categoria]}-\\d{4}-\\d{3}$` 
  : undefined
}
        title={
  categoria
    ? `Formato: ${PREFIJOS[categoria]}-AAAA-001`
    : "Seleccione la categoría para ver el formato"
}
          />
          <small className="help-text-codigo">
            {categoria
              ? `Formato: ${PREFIJOS[categoria]}-${new Date().getFullYear()}-NNN — Ej: ${PREFIJOS[categoria]}-${new Date().getFullYear()}-001`
              : "Selecciona la categoría para ver el formato ejemplo."}
          </small>
        </div>
        {errores.codigo_anterior && (
          <span className="mensaje-error">
            {errores.codigo_anterior}
          </span>
        )}
      </div>
    )}
  </>
)}


                    {renderCamposCategoria()}
                  </>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={cerrarModalProducto}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={cargando}
                  >
                    {cargando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
      {mostrarModalTabla && (
        <div
          className="modal-overlay-pro"
          onClick={() => setMostrarModalTabla(false)}
        >
          <div
            className="modal-tabla-pro"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                Inventario - {categoriaTabla}
              </h2>
            </div>

            <div className="modal-body">
              {cargando ? (
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
                        placeholder="Buscar producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="input-busqueda-pro"
                      />
                    </div>

                    <div className="filtro-avanzado">
                      <select
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                      >
                        <option value="">Todos los estados</option>
                        <option value="Activo">Activos</option>
                        <option value="Inactivo">Inactivos</option>
                      </select>
                      <select
                        value={donadoFiltro}
                        onChange={(e) => setDonadoFiltro(e.target.value)}
                      >
                        <option value="">Todos los bienes</option>
                        <option value="donado">Solo donados</option>
                        <option value="no_donado">No donados</option>
                      </select>
                    </div>

                    <div className="acciones-excel">
                      <button
                        className="btn-excel-exportar"
                        onClick={exportarExcel}
                      >
                        Exportar Excel
                      </button>
                      {admin && (
                        <>
                          <button
                            className="btn-excel-importar"
                            onClick={descargarPlantillaExcel}
                          >
                            Plantilla
                          </button>

                          <label className="btn-excel-importar">
                            Importar Excel
                            <input
                              type="file"
                              accept=".xlsx, .xls"
                              onChange={importarExcel}
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="tabla-scroll">
                    <table className="tabla-elegante">
                      <thead>
                        <tr>
                          {COLUMNAS_POR_CATEGORIA[categoriaTabla].map(
                            (col, i) => (
                              <th
                                key={i}
                                onClick={() => ordenarPorColumna(col)}
                              >
                                {obtenerEtiquetaColumna(col)}{" "}
                                {columnaOrden === col
                                  ? ordenAsc
                                    ? "▲"
                                    : "▼"
                                  : ""}
                              </th>
                            )
                          )}
                          <th>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {productosPagina.length > 0 ? (
                          productosPagina.map((item, i) => (
                            <tr key={i}>
                              {COLUMNAS_POR_CATEGORIA[categoriaTabla].map(
                                (col, j) => (
                                  <td key={j}>
                                    {col === "estado" ? (
                                      <span
                                        className={`estado-indicador ${
                                          item.estado === "Inactivo"
                                            ? "estado-inactivo"
                                            : "estado-activo"
                                        }`}
                                      >
                                        <span className="estado-circulo"></span>
                                        {item.estado}
                                      </span>
                                    ) : col === "fecha_ingreso" ? (
                                      item.fecha_ingreso
                                        ? item.fecha_ingreso.slice(0, 10)
                                        : ""
                                    ) : col === "ubicacion_id" ? (
                                      (() => {
                                        const dep = depPorId.get(
                                          Number(item.ubicacion_id)
                                        );
                                        return dep
                                          ? `${dep.ubicacion}`
                                          : "Sin ubicación";
                                      })()
                                    ) : col === "nombre" ? (
                                      <>
                                        {item.nombre}
                                        {item.es_donado && (
                                          <span className="donacion-badge">
                                            Donado
                                          </span>
                                        )}
                                      </>
                                    ) : col === "codigo_anterior" ? (
                                      <div className="td-center">
                                        {item.codigo_anterior && item.codigo_anterior.trim() !== "" ? (
                                          <span className="codigo-anterior">{item.codigo_anterior}</span>
                                        ) : (
                                          <span className="sin-codigo">—</span>
                                        )}
                                      </div>
                                    ) : (
                                      item[col]
                                    )}
                                  </td>
                                )
                              )}
                              <td>
                                {admin && (
                                  <button
                                    className="btn-accion editar"
                                    onClick={() => editarProducto(item)}
                                    title="Editar producto"
                                  >
                                    <FaEdit />
                                  </button>
                                )}
                                <button
                                  className="btn-accion qr"
                                  onClick={() => mostrarQR(item)}
                                  title="Generar código QR"
                                >
                                  <FaQrcode />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={
                                COLUMNAS_POR_CATEGORIA[categoriaTabla].length +
                                1
                              }
                            >
                              No hay resultados disponibles.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination-bar">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span className="pagination-info">
                        Mostrando{" "}
                        {productosFiltrados.length === 0
                          ? 0
                          : indicePrimero + 1}{" "}
                        a{" "}
                        {Math.min(
                          indiceUltimo,
                          productosFiltrados.length
                        )}{" "}
                        de {productosFiltrados.length} registros
                      </span>

                      {productosFiltrados.length > 0 && (
                        <button
                          type="button"
                          className="btn-excel-importar"
                          onClick={abrirModalImpresion}
                        >
                          Impresión
                        </button>
                      )}
                    </div>

                    <div className="pagination-circle">
                      <button
                        className="page-btn"
                        disabled={
                          paginaActual === 1 || totalPaginas === 0
                        }
                        onClick={() =>
                          setPaginaActual((prev) =>
                            Math.max(prev - 1, 1)
                          )
                        }
                      >
                        ‹
                      </button>

                {obtenerPaginasVisibles(paginaActual, totalPaginas).map((num, i) =>
  num === "..." ? (
    <span key={i} className="page-ellipsis">...</span>
  ) : (
    <button
      key={i}
      className={`page-btn ${
        paginaActual === num ? "active" : ""
      }`}
      onClick={() => setPaginaActual(num)}
    >
      {num}
    </button>
  )
)}


                      <button
                        className="page-btn"
                        disabled={
                          paginaActual === totalPaginas ||
                          totalPaginas === 0
                        }
                        onClick={() =>
                          setPaginaActual((prev) =>
                            Math.min(prev + 1, totalPaginas)
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
      {mostrarModalImpresion && (
        <div
          className="modal-overlay"
          onClick={cerrarModalImpresion}
        >
          <div
            className="modal small"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">{categoriaTabla}</h2>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={marcarTodasImpresion}
                  onChange={toggleMarcarTodasImpresion}
                />
                Marcar todas
              </label>
            </div>

            <div className="tabla-scroll">
              <table className="tabla-elegante mini">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>CÓDIGO ANTIGUO</th>
                    <th>PRODUCTO</th>
                    <th>DESCRIPCIÓN</th>
                    <th>DETALLES</th>
                    <th>SELECCIONAR</th>
                  </tr>
                </thead>
                <tbody>
                  {productosPaginaImpresion.length > 0 ? (
                    productosPaginaImpresion.map((p) => {
                      const estaSeleccionado =
                        productosSeleccionImpresion.some(
                          (x) => x.id === p.id
                        );
                      return (
                        <tr key={p.id}>
                          <td>{p.codigo}</td>
                          <td className="td-center">
                            {p.codigo_anterior && p.codigo_anterior.trim() !== "" ? (
                              <span className="codigo-anterior">{p.codigo_anterior}</span>
                            ) : (
                              <span className="sin-codigo">—</span>
                            )}
                          </td>
                          <td>
                            {p.nombre}
                            {p.es_donado && (
                              <span className="donacion-badge">
                                Donado
                              </span>
                            )}
                          </td>
                          <td>{p.descripcion || "Sin descripción"}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn-detalle-info"
                              onClick={() => {
                                setProductoDetalle(p);
                                setMostrarDetallesProducto(true);
                              }}
                              title="Ver detalles del producto"
                            >
                              <FaInfoCircle className="info-icon" />
                            </button>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={estaSeleccionado}
                              onChange={() => toggleProductoImpresion(p)}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5}>No hay productos disponibles.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <span className="pagination-info">
                Mostrando{" "}
                {tablaDatos.length === 0 ? 0 : indicePrimeroImp + 1}{" "}
                a{" "}
                {Math.min(
                  indiceUltimoImp,
                  tablaDatos.length
                )}{" "}
                de {tablaDatos.length}
              </span>
              <div className="pagination-circle">
                <button
                  className="page-btn"
                  disabled={
                    paginaImpresion === 1 || totalPaginasImpresion === 0
                  }
                  onClick={() =>
                    setPaginaImpresion((prev) =>
                      Math.max(prev - 1, 1)
                    )
                  }
                >
                  ‹
                </button>

                {paginasImpresion.map((num) => (
                  <button
                    key={num}
                    className={`page-btn ${
                      paginaImpresion === num ? "active" : ""
                    }`}
                    onClick={() => setPaginaImpresion(num)}
                  >
                    {num}
                  </button>
                ))}

                <button
                  className="page-btn"
                  disabled={
                    paginaImpresion === totalPaginasImpresion ||
                    totalPaginasImpresion === 0
                  }
                  onClick={() =>
                    setPaginaImpresion((prev) =>
                      Math.min(prev + 1, totalPaginasImpresion)
                    )
                  }
                >
                  ›
                </button>
              </div>
            </div>
            <div
              className="modal-actions"
              style={{
                marginTop: "16px",
                justifyContent: "center",
                gap: "16px",
              }}
            >
              <button
                type="button"
                className="btn-cancel"
                onClick={cerrarModalImpresion}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleGenerarDocWord}
              >
                Generar Doc
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarDetallesProducto && productoDetalle && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarDetallesProducto(false)}
        >
          <div
            className="modal small"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Detalle del Producto</h2>

            <p>
              <strong>Nombre:</strong> {productoDetalle.nombre}
            </p>
            <p>
              <strong>Código:</strong> {productoDetalle.codigo}
            </p>
            <p>
              <strong>Código anterior:</strong> {productoDetalle.codigo_anterior || "—"}
            </p>
            <p>
              <strong>Descripción:</strong>{" "}
              {productoDetalle.descripcion || "Sin descripción"}
            </p>
            <p>
              <strong>Categoría:</strong> {productoDetalle.categoria}
            </p>
            <p>
              <strong>Fecha Ingreso:</strong>{" "}
              {productoDetalle.fecha_ingreso
                ? productoDetalle.fecha_ingreso.slice(0, 10)
                : "Sin fecha"}
            </p>

            {productoDetalle.categoria === "Equipo de Computo" && (
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

            {productoDetalle.categoria === "Equipo de Oficina" && (
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

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setMostrarDetallesProducto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {mostrarQRModal && productoQR && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarQRModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Código QR del Producto</h2>

            <div ref={qrRef} className="qr-preview">
              <div className="qr-header">
                <img
                  src={logoEpespo}
                  alt="Logo EPESPO"
                  className="qr-logo-epespo"
                />
                <div className="qr-header-text">
                  <span className="qr-epespo-title">EPESPO</span>
                  <span className="qr-epespo-subtitle">
                    Escuela de Pesca del Pacífico Oriental
                  </span>
                </div>
              </div>

              <div className="qr-center">
                <QRCodeCanvas
                  value={`📦 Producto: ${productoQR.nombre}
🔖 Código: ${productoQR.codigo}
${productoQR.codigo_anterior ? `🧾 Código Antiguo: ${productoQR.codigo_anterior}\n` : ""}📂 Categoría: ${productoQR.categoria}
📍 Ubicación: ${productoQR.ubicacion_texto}
📝 Descripción: ${productoQR.descripcion}`}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />
              </div>

              <div className="qr-info">
                <p className="qr-product-name">
                  {productoQR.nombre || "Producto sin nombre"}
                </p>
                <p className="qr-product-cat">
                  {productoQR.categoria || "Sin categoría"}
                </p>
                <p className="qr-product-ubic">{productoQR.ubicacion_texto}</p>
                {productoQR.codigo_anterior && (
                  <p className="qr-product-codigo-ant">Código antiguo: {productoQR.codigo_anterior}</p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-submit" onClick={descargarQR}>
                <FaDownload /> Descargar QR
              </button>
              <button
                className="btn-cancel"
                onClick={() => setMostrarQRModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AgregarProducto;
