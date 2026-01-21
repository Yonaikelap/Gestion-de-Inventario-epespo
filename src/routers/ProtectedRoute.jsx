import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

// rolesPermitidos opcional: ["admin"] o ["admin","lector"]
const ProtectedRoute = ({ rolesPermitidos = null }) => {
  const location = useLocation();

  const token = localStorage.getItem("token");

  // Rol: primero del user, si no, del localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const rol = user?.rol || localStorage.getItem("rol");

  // 1) sin token => a login
  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 2) si pide rol y no cumple => fuera
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    if (!rol || !rolesPermitidos.includes(rol)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
