// src/utils/permisos.js
export const obtenerRol = () => localStorage.getItem("rol");

export const esAdmin = () => obtenerRol() === "admin";

export const esLector = () => obtenerRol() === "lector";
