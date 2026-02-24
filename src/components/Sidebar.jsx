import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaUserTie,
  FaBoxOpen,
  FaHistory,
  FaBuilding,
  FaFileAlt,
  FaSignOutAlt,
  FaTrashAlt,
} from "react-icons/fa";
import "../styles/Sidebar.css";
import logoEPESPO from "../assets/logo1_epespo.jpeg";

import axiosClient from "../api/axiosClient";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cerrando, setCerrando] = useState(false);
  const menuItems = [
    { name: "Inicio", icon: <FaHome />, route: "/dashboard" },
    { name: "Bienes", icon: <FaBoxOpen />, route: "/agregar-producto" },
    { name: "Responsable", icon: <FaUserTie />, route: "/responsable" },
    { name: "Asignación", icon: <FaClipboardList />, route: "/asignacion" },
    { name: "Historial", icon: <FaHistory />, route: "/historial" },
    { name: "Departamento", icon: <FaBuilding />, route: "/departamento" },
{ name: "Dar baja", icon: <FaTrashAlt />, route: "/dar-baja" },
    { name: "Actas", icon: <FaFileAlt />, route: "/actas"},
   // { name: "Ajustes", icon: <FaTools />, route: "/ajustes" },
  ];

  const menuVisible = menuItems;

  const handleLogout = async () => {
    if (cerrando) return;
    setCerrando(true);

    const toastId = toast.loading("Cerrando sesión...", { position: "top-right" });

    try {
      await axiosClient.post("/logout");
    } catch (error) {
      const status = error?.response?.status;

      toast.update(toastId, {
        render:
          status === 401
            ? "Sesión vencida. Cerrando sesión..."
            : "No se pudo contactar al servidor. Cerrando sesión...",
        type: "warning",
        isLoading: false,
        autoClose: 1200,
      });

      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      localStorage.removeItem("user");

      setTimeout(() => {
        setCerrando(false);
        navigate("/login");
      }, 900);

      return;
    }

    toast.update(toastId, {
      render: "Sesión cerrada correctamente",
      type: "success",
      isLoading: false,
      autoClose: 1200,
    });

    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("user");

    setTimeout(() => {
      setCerrando(false);
      navigate("/login");
    }, 900);
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar closeButton={false} />

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
            <img src={logoEPESPO} alt="EPESPO" className="logo-img" />
          </div>
          <div className="school-title">
            <span className="epespo-title">EPESPO</span>
            <span className="school-subtitle">ESCUELA DE PESCA DEL PACÍFICO ORIENTAL</span>
          </div>
        </div>

        <ul className="menu">
          {menuVisible.map((item) => (
            <li
              key={item.name}
              className={location.pathname === item.route ? "menu-item active" : "menu-item"}
              onClick={() => navigate(item.route)}
            >
              <span className="icon">{item.icon}</span>
              <span className="text">{item.name}</span>
            </li>
          ))}
        </ul>

        <div
          className={`sidebar-footer ${cerrando ? "disabled" : ""}`}
          onClick={handleLogout}
          title={cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
        >
          <span className="icon logout-icon">
            <FaSignOutAlt />
          </span>
          <span className="text logout-text">{cerrando ? "Cerrando..." : "Cerrar sesión"}</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
