import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import "../styles/Login.css";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { validateLogin } from "../Validaciones/loginV";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const Login = () => {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errores, setErrores] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
      return;
    }

    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setCorreo(savedEmail);
      setRememberMe(true);
    }
  }, [navigate]);

  useEffect(() => {
    if (rememberMe && correo) localStorage.setItem("rememberedEmail", correo);
    else localStorage.removeItem("rememberedEmail");
  }, [rememberMe, correo]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevosErrores = validateLogin(correo, contrasena);
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error("Revisa los campos");
      return;
    }

    setErrores({});
    setLoading(true);

    try {
      const response = await axiosClient.post("/login", { correo, contrasena });
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("rol", user.rol);

      toast.success("Inicio de sesión exitoso");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message;

      if (status === 401) {
        toast.error(msg || "Credenciales incorrectas");
      } else if (status === 403) {
        toast.error(msg || "Usuario inactivo. Contacte al administrador");
      } else if (error.request) {
        toast.error("No hay conexión con el servidor");
      } else {
        toast.error("Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-container fade-in">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="login-title">Sistema de Inventario EPESPO</h2>

          <div className="input-group-login">
            <label htmlFor="correo">Correo</label>
            <div className={`input-icon-login ${errores.correo ? "input-error" : ""}`}>
              <FaUser className={`icon ${correo ? "active" : ""}`} />
              <input
                id="correo"
                type="email"
                value={correo}
                disabled={loading}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ingresa tu correo"
              />
            </div>
            {errores.correo && <span className="mensaje-error">{errores.correo}</span>}
          </div>

          <div className="input-group-login">
            <label htmlFor="contrasena">Contraseña</label>
            <div className={`input-icon-login ${errores.contrasena ? "input-error" : ""}`}>
              <FaLock className={`icon ${contrasena ? "active" : ""}`} />
              <input
                id="contrasena"
                type={showPassword ? "text" : "password"}
                value={contrasena}
                disabled={loading}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingresa tu contraseña"
              />
              <span
                className="toggle-password"
                onClick={() => !loading && setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errores.contrasena && <span className="mensaje-error">{errores.contrasena}</span>}
          </div>

          <div className="input-group remember">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                disabled={loading}
                onChange={() => setRememberMe((prev) => !prev)}
              />
              {"  "}Recordarme
            </label>
          </div>
<div
  className="forgot-password"
  onClick={() => !loading && navigate("/recuperar-contrasena")}
>
  ¿Olvidaste tu contraseña?
</div>
          <button type="submit" disabled={loading}>
            {loading ? <span className="button-loader" /> : "Iniciar Sesión"}
          </button>
        </form>
      </div>

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar closeButton={false} />
    </div>
  );
};

export default Login;
