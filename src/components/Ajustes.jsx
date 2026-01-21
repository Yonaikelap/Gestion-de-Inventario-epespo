import React, { useState, useEffect } from "react";
import "../styles/Ajustes.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { validarUsuario } from "../Validaciones/validacionesUsuario";
import {
  FaUsers,
  FaBoxOpen,
  FaEnvelope,
  FaUser,
  FaLock,
  FaUserTag,
  FaEdit,
  FaUserSlash,
  FaUserCheck,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosClient from "../api/axiosClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import { useNotificaciones } from "../context/NotificacionesContext";

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [usuario, setUsuario] = useState({});
  const [mostrarModalFormulario, setMostrarModalFormulario] = useState(false);
  const [mostrarModalTabla, setMostrarModalTabla] = useState(false);
  const [busquedaNombre, setBusquedaNombre] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 5;
  const maxBotonesPagina = 5;
  const [columnaOrden, setColumnaOrden] = useState(null);
  const [ordenAscendente, setOrdenAscendente] = useState(true);

  const [cargando, setCargando] = useState(false);
  const [rolUsuario, setRolUsuario] = useState(null);
  const [errores, setErrores] = useState({});

  const { agregarNotificacion } = useNotificaciones();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.rol) setRolUsuario(user.rol);
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setCargando(true);
      const response = await axiosClient.get("/usuarios");
      setUsuarios(response.data || []);
    } catch (error) {
      toast.error("Error al cargar usuarios");
    } finally {
      setTimeout(() => setCargando(false), 500);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const cleanValue = name === "correo" ? value.trim().toLowerCase() : value;

    setUsuario((prev) => ({ ...prev, [name]: cleanValue }));

    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: undefined }));
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrores({});

    const erroresVal = validarUsuario(usuario, usuarios, usuario.id || null);
    if (Object.keys(erroresVal).length > 0) {
      setErrores(erroresVal);
      return;
    }

    try {
      const payload = { ...usuario };
      if (payload.id && !payload.contrasena) {
        delete payload.contrasena;
      }

      if (payload.id) {
        await axiosClient.put(`/usuarios/${payload.id}`, payload);
        toast.success("Usuario actualizado correctamente");

        agregarNotificacion({
          titulo: "Usuario actualizado",
          mensaje: `Se actualizó el usuario ${payload.nombre} (${payload.correo}) con rol ${payload.rol}`,
          tipo: "usuario",
          fecha: new Date().toISOString(),
        });
      } else {
        await axiosClient.post("/usuarios", payload);
        toast.success("Usuario registrado correctamente ");

        agregarNotificacion({
          titulo: "Nuevo usuario registrado",
          mensaje: `Se registró el usuario ${payload.nombre} (${payload.correo}) con rol ${payload.rol}`,
          tipo: "usuario",
          fecha: new Date().toISOString(),
        });
      }

      setUsuario({});
      setErrores({});
      setMostrarModalFormulario(false);
      fetchUsuarios();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error al guardar usuario ");
    }
  };

  // ===== Activar/Desactivar (NO borrar) =====
  const toggleActivoUsuario = (item) => {
    const accion = item.activo ? "desactivar" : "activar";

    Swal.fire({
      title: `¿Deseas ${accion} este usuario?`,
      text: item.activo
        ? "El usuario no podrá ingresar al sistema mientras esté inactivo."
        : "El usuario volverá a tener acceso al sistema.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: item.activo ? "#e74c3c" : "#2ecc71",
      cancelButtonColor: "#3085d6",
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await axiosClient.patch(`/usuarios/${item.id}/toggle-activo`);
        toast.success(`Usuario ${accion}do `);

        agregarNotificacion({
          titulo: `Usuario ${accion}do`,
          mensaje: `Se ${accion}ó el usuario ${item.nombre} (${item.correo})`,
          tipo: "usuario",
          fecha: new Date().toISOString(),
        });

        fetchUsuarios();
      } catch (error) {
        toast.error(
          error?.response?.data?.error || "No se pudo cambiar el estado "
        );
      }
    });
  };
  const exportarExcel = () => {
    const lista = usuariosFiltrados;

    if (lista.length === 0) {
      toast.info("No hay datos para exportar");
      return;
    }

    const dataExcel = lista.map((u) => ({
      Nombre: u.nombre,
      Correo: u.correo,
      Rol: u.rol,
      Estado: u.activo ? "Activo" : "Inactivo",
      "Creado el": u.created_at ? new Date(u.created_at).toLocaleString() : "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "usuarios.xlsx");

    toast.success("Excel exportado correctamente ");
  };

  // ===== Filtrar + ordenar =====
  const usuariosFiltrados = [...usuarios]
    .filter((u) => {
      const okNombre = (u.nombre || "")
        .toLowerCase()
        .includes(busquedaNombre.toLowerCase());

      const okRol = filtroRol ? u.rol === filtroRol : true;

      const okEstado =
        filtroEstado === "activos"
          ? u.activo === true
          : filtroEstado === "inactivos"
          ? u.activo === false
          : true;

      return okNombre && okRol && okEstado;
    })
    .sort((a, b) => {
      if (!columnaOrden) return 0;
      const valorA = (a[columnaOrden] ?? "").toString().toLowerCase();
      const valorB = (b[columnaOrden] ?? "").toString().toLowerCase();
      return ordenAscendente
        ? valorA.localeCompare(valorB)
        : valorB.localeCompare(valorA);
    });
  const totalPaginas =
    usuariosFiltrados.length === 0
      ? 1
      : Math.ceil(usuariosFiltrados.length / usuariosPorPagina);

  const paginaSegura = paginaActual > totalPaginas ? totalPaginas : paginaActual;

  const indiceUltimo = paginaSegura * usuariosPorPagina;
  const indicePrimero = indiceUltimo - usuariosPorPagina;
  const usuariosPagina = usuariosFiltrados.slice(indicePrimero, indiceUltimo);

  const grupoActual = Math.floor((paginaSegura - 1) / maxBotonesPagina);
  const paginaInicioGrupo = grupoActual * maxBotonesPagina + 1;
  const paginaFinGrupo = Math.min(
    paginaInicioGrupo + maxBotonesPagina - 1,
    totalPaginas
  );

  const paginasAmostrar = [];
  for (let p = paginaInicioGrupo; p <= paginaFinGrupo; p++) paginasAmostrar.push(p);

  const primerItem = usuariosFiltrados.length === 0 ? 0 : indicePrimero + 1;
  const ultimoItem =
    usuariosFiltrados.length === 0
      ? 0
      : Math.min(indiceUltimo, usuariosFiltrados.length);
  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaNombre, filtroRol, filtroEstado]);

  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="main-content">
        <Navbar />

        <div className="content">
          <div className="cards-grid-usuarios">
            {rolUsuario === "admin" && (
              <div
                className="card clickable"
                onClick={() => {
                  setUsuario({});
                  setErrores({});
                  setMostrarModalFormulario(true);
                }}
              >
                <FaUsers className="card-icon" />
                <h2 className="card-title">Registrar Usuario</h2>
                <p className="card-subtitle">Agregar un nuevo usuario al sistema</p>
              </div>
            )}

            <div
              className="card clickable"
              onClick={async () => {
                setCargando(true);
                setMostrarModalTabla(true);
                await fetchUsuarios();
                setTimeout(() => setCargando(false), 500);
              }}
            >
              <FaBoxOpen className="card-icon" />
              <h2 className="card-title">Usuarios Registrados</h2>
              <p className="card-subtitle">Ver todos los usuarios</p>
            </div>
          </div>
        </div>
      </div>
      {rolUsuario === "admin" && mostrarModalFormulario && (
        <div
          className="modal-overlay-aju"
          onClick={() => {
            setMostrarModalFormulario(false);
            setErrores({});
          }}
        >
          <div className="modal-form-aju" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title-aju">
              {usuario.id ? "Editar Usuario" : "Registrar Usuario"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group-aju">
                <label>Nombre</label>
                <div className={`input-icon-aju ${errores.nombre ? "input-error" : ""}`}>
                  <FaUser className="icon-input-aju" />
                  <input
                    name="nombre"
                    value={usuario.nombre || ""}
                    onChange={handleChange}
                    placeholder="Ingrese el nombre"
                  />
                </div>
                {errores.nombre && <span className="mensaje-error">{errores.nombre}</span>}
              </div>

              <div className="form-group-aju">
                <label>Correo</label>
                <div className={`input-icon-aju ${errores.correo ? "input-error" : ""}`}>
                  <FaEnvelope className="icon-input-aju" />
                  <input
                    type="email"
                    name="correo"
                    value={usuario.correo || ""}
                    onChange={handleChange}
                    placeholder="Ingrese el correo"
                  />
                </div>
                {errores.correo && <span className="mensaje-error">{errores.correo}</span>}
              </div>
              <div className="form-group-aju">
                <label>Contraseña</label>

                <div className={`input-icon-aju ${errores.contrasena ? "input-error" : ""}`}>
                  <FaLock className="icon-input-aju" />

                  <input
                    type="password"
                    name="contrasena"
                    value={usuario.contrasena || ""}
                    onChange={handleChange}
                    placeholder={
                      usuario.id ? "Dejar en blanco para no cambiar" : "Ingrese la contraseña"
                    }
                  />
                </div>

                {errores.contrasena && (
                  <span className="mensaje-error">{errores.contrasena}</span>
                )}
              </div>
              <div className="form-group-aju">
                <label>Rol</label>
                <div className={`input-icon-aju ${errores.rol ? "input-error" : ""}`}>
                  <FaUserTag className="icon-input-aju" />
                  <select name="rol" value={usuario.rol || ""} onChange={handleChange}>
                    <option value="">Seleccione un rol</option>
                    <option value="admin">Administrador</option>
                    <option value="lector">Lector</option>
                  </select>
                </div>
                {errores.rol && <span className="mensaje-error">{errores.rol}</span>}
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
            </form>
          </div>
        </div>
      )}
      {mostrarModalTabla && (
        <div className="modal-overlay-aju" onClick={() => setMostrarModalTabla(false)}>
          <div className="modal-tabla" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Listado de Usuarios</h2>
            </div>

            <div className="modal-body">
              <div className="filtro-bar">
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={busquedaNombre}
                  onChange={(e) => setBusquedaNombre(e.target.value)}
                  className="input-busqueda"
                />

                <select
                  className="select-filtro"
                  value={filtroRol}
                  onChange={(e) => setFiltroRol(e.target.value)}
                >
                  <option value="">Todos los roles</option>
                  {[...new Set(usuarios.map((u) => u.rol))].map((rol, i) => (
                    <option key={i} value={rol}>
                      {rol}
                    </option>
                  ))}
                </select>

                <select
                  className="select-filtro"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>

                <div className="acciones-excel">
                  <button className="btn-excel-exportar" onClick={exportarExcel}>
                    Exportar Excel
                  </button>
                </div>
              </div>

              {cargando ? (
                <div className="tabla-cargando">
                  <div className="spinner"></div>
                  <p>Cargando usuarios...</p>
                </div>
              ) : (
                <div className="tabla-scroll">
                  <table className="tabla-elegante">
                    <thead>
                      <tr>
                        {["nombre", "correo", "rol"].map((col, i) => (
                          <th
                            key={i}
                            onClick={() => {
                              if (columnaOrden === col) setOrdenAscendente(!ordenAscendente);
                              else {
                                setColumnaOrden(col);
                                setOrdenAscendente(true);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {col.charAt(0).toUpperCase() + col.slice(1)}{" "}
                            {columnaOrden === col ? (ordenAscendente ? "▲" : "▼") : ""}
                          </th>
                        ))}
                        <th>Estado</th>
                        {rolUsuario === "admin" && <th>Acciones</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {usuariosPagina.length > 0 ? (
                        usuariosPagina.map((item) => (
                          <tr key={item.id}>
                            <td>{item.nombre}</td>
                            <td>{item.correo}</td>
                            <td>{item.rol}</td>

                            <td>
                              <span className={`badge-estado ${item.activo ? "activo" : "inactivo"}`}>
                                {item.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>

                            {rolUsuario === "admin" && (
                              <td className="acciones-tabla">
                                <button
                                  className="btn-accion editar"
                                  onClick={() => {
                                    setUsuario({ ...item, contrasena: "" });
                                    setErrores({});
                                    setMostrarModalFormulario(true);
                                    setMostrarModalTabla(false);
                                  }}
                                  title="Editar usuario"
                                >
                                  <FaEdit />
                                </button>

                                <button
                                  className={`btn-accion ${item.activo ? "eliminar" : "activar"}`}
                                  onClick={() => toggleActivoUsuario(item)}
                                  title={item.activo ? "Desactivar usuario" : "Activar usuario"}
                                >
                                  {item.activo ? <FaUserSlash /> : <FaUserCheck />}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={rolUsuario === "admin" ? 5 : 4}>
                            No hay usuarios registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="pagination-bar">
                <span className="pagination-info">
                  Mostrando {primerItem} a {ultimoItem} de {usuariosFiltrados.length} registros
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
                    onClick={() => setPaginaActual(paginaSegura > 1 ? paginaSegura - 1 : 1)}
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
                      setPaginaActual(paginaSegura < totalPaginas ? paginaSegura + 1 : totalPaginas)
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
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar closeButton={false} />
    </div>
  );
};

export default Usuarios;
