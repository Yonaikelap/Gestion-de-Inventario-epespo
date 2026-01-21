import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import "../styles/Login.css";
import { FaUser } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const RecuperarContrasena = () => {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});
  const navigate = useNavigate();

  const validar = () => {
    const e = {};
    if (!correo) e.correo = "El correo es obligatorio";
    else if (!/^\S+@\S+\.\S+$/.test(correo)) e.correo = "Correo no válido";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      toast.error("Revisa los campos");
      return;
    }

    setErrores({});
    setLoading(true);

    try {
      await axiosClient.post("/forgot-password", { correo });

      toast.success("Te enviamos un código. Revisa tu correo.");

      setTimeout(() => {
        navigate(
          `/restablecer-contrasena?correo=${encodeURIComponent(correo)}&sent=1`
        );
      }, 900);
    } catch (error) {
      // ✅ Primero response (422/404/500)
      if (error.response) {
        const msg =
          error.response.data?.message ||
          error.response.data?.errors?.correo?.[0] ||
          "Error al enviar solicitud";
        toast.error(msg);
      } else if (error.request) {
        toast.error("No hay conexión con el servidor");
      } else {
        toast.error("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-container fade-in">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="login-title">Recuperar Contraseña</h2>

          <div className="input-group-login">
            <label htmlFor="correo">Correo</label>
            <div
              className={`input-icon-login ${
                errores.correo ? "input-error" : ""
              }`}
            >
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
            {errores.correo && (
              <span className="mensaje-error">{errores.correo}</span>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <span className="button-loader" /> : "Enviar código"}
          </button>

          <div
            className="forgot-password"
            onClick={() => !loading && navigate("/login")}
          >
            Volver a iniciar sesión
          </div>
        </form>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar
        closeButton={false}
      />
    </div>
  );
};

export default RecuperarContrasena;
