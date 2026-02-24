import React, { useState, useEffect, useRef } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import "../styles/Navbar.css";
import { useNotificaciones } from "../context/NotificacionesContext";

const Navbar = () => {
  const {
    notificaciones,
    noLeidas,
    marcarTodasLeidas,
    eliminarNotificacion,
  } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const notiWrapperRef = useRef(null);
  const [datosUsuario, setDatosUsuario] = useState({
    nombre: "",
    rolTexto: "",
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user && user.rol) {
      if (user.rol === "admin") {
        
        setDatosUsuario({
          nombre: "Admin",
          rolTexto: "Inventario", 
        });
      } else if (user.rol === "lector") {
        setDatosUsuario({
          nombre: user.nombre || "Lector",
          rolTexto: "Directora",
        });
      } else {
        setDatosUsuario({
          nombre: user.nombre || "Usuario",
          rolTexto: user.rol,
        });
      }
    } else {
      setDatosUsuario({
        nombre: "Invitado",
        rolTexto: "",
      });
    }
  }, []);

  const handleVerNotificaciones = () => {
    const seVaAbrir = !abierto;
    setAbierto((prev) => !prev);

    if (seVaAbrir && noLeidas > 0) {
      marcarTodasLeidas();
    }
  };
  useEffect(() => {
    if (!abierto) return;

    const handleClickOutside = (e) => {
      if (
        notiWrapperRef.current &&
        !notiWrapperRef.current.contains(e.target)
      ) {
        setAbierto(false);
      }
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [abierto]);

  return (
    <header className="topbar">
      <div className="topbar-right">
        <div className="noti-wrapper" ref={notiWrapperRef}>
          <button
            className="icon-btn"
            title="Notificaciones"
            onClick={handleVerNotificaciones}
          >
            <FaBell />
            {noLeidas > 0 && (
              <span className="badge-noti">{noLeidas}</span>
            )}
          </button>

          {abierto && (
            <div className="noti-dropdown">
              <div className="noti-header">
                <span>Notificaciones</span>
              </div>

              <div className="noti-list">
                {notificaciones.length === 0 ? (
                  <p className="noti-empty">Sin notificaciones</p>
                ) : (
                  notificaciones.map((n) => (
                    <div
                      key={n.id}
                      className={`noti-item ${
                        n.leido ? "noti-leido" : "noti-no-leido"
                      }`}
                    >
                      <div className="noti-icon">
                        <FaBell />
                      </div>

                      <div className="noti-textos">
                        <div className="noti-title-row">
                          <span className="noti-title">{n.titulo}</span>
                          {!n.leido && (
                            <span className="badge-nuevo">Nuevo</span>
                          )}
                        </div>

                        <p>{n.mensaje}</p>

                        <span className="noti-fecha">
                          {new Date(n.fecha).toLocaleString()}
                        </span>
                      </div>

                      <button
                        className="noti-delete"
                        onClick={() => eliminarNotificacion(n.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="user-box">
          <FaUserCircle className="user-avatar" />
          <div className="user-info">
            <span className="user-name">{datosUsuario.nombre}</span>
            <span className="user-role">{datosUsuario.rolTexto}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
