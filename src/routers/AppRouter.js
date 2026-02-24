import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { NotificacionesProvider } from "../context/NotificacionesContext";

import "react-toastify/dist/ReactToastify.css";

import ProtectedRoute from "./ProtectedRoute";

import Login from "../components/Login";
import Dashboard from "../components/Dashboard";
import AgregarProducto from "../components/AgregarProducto";
import Responsable from "../components/Responsable";
import Asignacion from "../components/Asignacion";
import Ajustes from "../components/Ajustes";
import Departamento from "../components/Departamento";
import Historial from "../components/Historial";
import Darbaja from "../components/Darbaja";
import Actas from "../components/Actas";
import RecuperarContrasena from "../components/RecuperarContrasena";
import RestablecerContrasena from "../components/RestablecerContrasena";

const LoginRedirect = () => <Navigate to="/login" replace />;

const AppRouter = () => {
  return (
    <NotificacionesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
          <Route element={<ProtectedRoute rolesPermitidos={["admin", "lector"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agregar-producto" element={<AgregarProducto />} />
            <Route path="/responsable" element={<Responsable />} />
            <Route path="/asignacion" element={<Asignacion />} />
            <Route path="/departamento" element={<Departamento />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/actas" element={<Actas />} />
            <Route path="/dar-baja" element={<Darbaja />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </NotificacionesProvider>
  );
};

export default AppRouter;
