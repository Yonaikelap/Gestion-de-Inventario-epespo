import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import "../styles/Login.css";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const RestablecerContrasena = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const correoUrl = useMemo(() => params.get("correo") || "", [params]);
  const sentUrl = useMemo(() => params.get("sent") || "", [params]);

  const [correo, setCorreo] = useState(correoUrl);
  const [codigo, setCodigo] = useState("");

  const [contrasena, setContrasena] = useState("");
  const [contrasena_confirmation, setContrasenaConfirmation] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (!correoUrl) {
      navigate("/recuperar-contrasena", { replace: true });
    }
  }, [correoUrl, navigate]);

  useEffect(() => {
    if (sentUrl === "1") setCooldown(60);
  }, [sentUrl]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const validarCorreo = () => {
    const e = {};
    if (!correo) e.correo = "El correo es obligatorio";
    else if (!/^\S+@\S+\.\S+$/.test(correo)) e.correo = "Correo no válido";
    return e;
  };

  const validar = () => {
    const e = validarCorreo();

    if (!codigo) e.codigo = "El código es obligatorio";
    else if (!/^\d{6}$/.test(codigo)) e.codigo = "Debe tener 6 dígitos";

    if (!contrasena) e.contrasena = "La contraseña es obligatoria";
    else if (contrasena.length < 8) e.contrasena = "Mínimo 8 caracteres";

    if (!contrasena_confirmation)
      e.contrasena_confirmation = "Confirma la contraseña";
    else if (contrasena_confirmation !== contrasena)
      e.contrasena_confirmation = "No coincide";

    return e;
  };

  const handleResend = async () => {
    if (resendLoading || loading) return;
    if (cooldown > 0) return;

    const e = validarCorreo();
    if (Object.keys(e).length > 0) {
      setErrores((prev) => ({ ...prev, ...e }));
      toast.error("Ingresa un correo válido");
      return;
    }

    try {
      setResendLoading(true);
      await axiosClient.post("/forgot-password", { correo });

      toast.success("Código reenviado. Revisa tu correo.");
      setCooldown(60);
    } catch (error) {
      if (error.response) {
        const msg =
          error.response.data?.message ||
          error.response.data?.errors?.correo?.[0] ||
          "Error al reenviar código";
        toast.error(msg);
      } else if (error.request) {
        toast.error("No hay conexión con el servidor");
      } else {
        toast.error("Error inesperado");
      }
    } finally {
      setResendLoading(false);
    }
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
      await axiosClient.post("/reset-password", {
        correo,
        code: codigo, // ✅ importante: el backend espera "code"
        contrasena,
        contrasena_confirmation,
      });

      toast.success("Contraseña actualizada correctamente");
      setTimeout(() => navigate("/login"), 1400);
    } catch (error) {
      if (error.response) {
        const msg =
          error.response.data?.message ||
          error.response.data?.errors?.correo?.[0] ||
          error.response.data?.errors?.code?.[0] ||
          error.response.data?.errors?.contrasena?.[0] ||
          "Error al restablecer contraseña";
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

  const reenviarDeshabilitado = resendLoading || loading || cooldown > 0;

  return (
    <div className="login-background">
      <div className="login-container fade-in">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="login-title">Restablecer Contraseña</h2>

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
                disabled={loading || resendLoading}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ingresa tu correo"
              />
            </div>
            {errores.correo && (
              <span className="mensaje-error">{errores.correo}</span>
            )}
          </div>

          <div className="input-group-login">
            <label htmlFor="codigo">Código</label>
            <div
              className={`input-icon-login ${
                errores.codigo ? "input-error" : ""
              }`}
            >
              <FaLock className={`icon ${codigo ? "active" : ""}`} />
              <input
                id="codigo"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                disabled={loading}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                placeholder="Ingresa el código"
              />
            </div>
            {errores.codigo && (
              <span className="mensaje-error">{errores.codigo}</span>
            )}
          </div>

          <div className="input-group-login">
            <label htmlFor="contrasena">Nueva Contraseña</label>
            <div
              className={`input-icon-login ${
                errores.contrasena ? "input-error" : ""
              }`}
            >
              <FaLock className={`icon ${contrasena ? "active" : ""}`} />
              <input
                id="contrasena"
                type={showPassword ? "text" : "password"}
                value={contrasena}
                disabled={loading}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Nueva contraseña"
              />
              <span
                className="toggle-password"
                onClick={() => !loading && setShowPassword((p) => !p)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errores.contrasena && (
              <span className="mensaje-error">{errores.contrasena}</span>
            )}
          </div>

          <div className="input-group-login">
            <label htmlFor="contrasena_confirmation">Confirmar Contraseña</label>
            <div
              className={`input-icon-login ${
                errores.contrasena_confirmation ? "input-error" : ""
              }`}
            >
              <FaLock
                className={`icon ${contrasena_confirmation ? "active" : ""}`}
              />
              <input
                id="contrasena_confirmation"
                type={showPassword ? "text" : "password"}
                value={contrasena_confirmation}
                disabled={loading}
                onChange={(e) => setContrasenaConfirmation(e.target.value)}
                placeholder="Confirmar contraseña"
              />
            </div>
            {errores.contrasena_confirmation && (
              <span className="mensaje-error">
                {errores.contrasena_confirmation}
              </span>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? <span className="button-loader" /> : "Guardar nueva contraseña"}
          </button>

          <div
            className="forgot-password"
            onClick={() => !reenviarDeshabilitado && handleResend()}
            style={{
              marginTop: 8,
              opacity: reenviarDeshabilitado ? 0.6 : 1,
              cursor: reenviarDeshabilitado ? "not-allowed" : "pointer",
              pointerEvents: reenviarDeshabilitado ? "none" : "auto",
              textAlign: "center",
            }}
          >
            {resendLoading
              ? "Reenviando..."
              : cooldown > 0
              ? `Reenviar código (${cooldown}s)`
              : "Reenviar código"}
          </div>

          <div className="forgot-password" onClick={() => !loading && navigate("/login")}>
            Volver a iniciar sesión
          </div>
        </form>
      </div>

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar closeButton={false} />
    </div>
  );
};

export default RestablecerContrasena;
