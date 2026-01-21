// src/context/NotificacionesContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const NotificacionesContext = createContext();

export const useNotificaciones = () => useContext(NotificacionesContext);

export const NotificacionesProvider = ({ children }) => {
  // 👉 Cargar desde localStorage al iniciar
  const [notificaciones, setNotificaciones] = useState(() => {
    try {
      const guardadas = localStorage.getItem("notificaciones");
      return guardadas ? JSON.parse(guardadas) : [];
    } catch (e) {
      console.error("Error leyendo notificaciones de localStorage", e);
      return [];
    }
  });

  // 👉 Cada vez que cambien, guardarlas en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("notificaciones", JSON.stringify(notificaciones));
    } catch (e) {
      console.error("Error guardando notificaciones en localStorage", e);
    }
  }, [notificaciones]);

  const agregarNotificacion = (notif) => {
    const nueva = {
      id: Date.now(),
      titulo: notif.titulo || "Notificación",
      mensaje: notif.mensaje || "",
      fecha: notif.fecha || new Date().toISOString(),
      leido: false,
    };

    setNotificaciones((prev) => [nueva, ...prev].slice(0, 20)); // máximo 20
  };

  const marcarTodasLeidas = () => {
    setNotificaciones((prev) =>
      prev.map((n) => ({
        ...n,
        leido: true,
      }))
    );
  };

  const eliminarNotificacion = (id) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  };

  const noLeidas = notificaciones.filter((n) => !n.leido).length;

  return (
    <NotificacionesContext.Provider
      value={{
        notificaciones,
        noLeidas,
        agregarNotificacion,
        marcarTodasLeidas,
        eliminarNotificacion,
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
};
