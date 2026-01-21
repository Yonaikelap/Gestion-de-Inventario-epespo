

export const validarUsuario = (
  usuario,
  listaUsuarios = [],
  editarId = null
) => {
  const errores = {};

  const nombre = (usuario.nombre || "").trim();
  const correo = (usuario.correo || "").trim();
  const contrasena = usuario.contrasena || "";
  const rol = (usuario.rol || "").trim();


  if (!nombre) {
    errores.nombre = "El nombre es obligatorio";
  } else if (nombre.length < 3) {
    errores.nombre = "El nombre debe tener al menos 3 caracteres";
  }
  if (!correo) {
    errores.correo = "El correo es obligatorio";
  } else {
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexCorreo.test(correo)) {
      errores.correo = "El correo no tiene un formato válido";
    }
  }

  if (!editarId) {
    if (!contrasena) {
      errores.contrasena = "La contraseña es obligatoria";
    } else if (contrasena.length < 6) {
      errores.contrasena = "La contraseña debe tener al menos 6 caracteres";
    }
  } else if (contrasena && contrasena.length < 6) {
    errores.contrasena =
      "Si cambia la contraseña, debe tener al menos 6 caracteres";
  }

  
  if (!rol) {
    errores.rol = "Debe seleccionar un rol";
  }

  const correoNorm = correo.toLowerCase();
  const existeCorreo = listaUsuarios.some(
    (u) => u.id !== editarId && u.correo?.toLowerCase() === correoNorm
  );
  if (existeCorreo) {
    errores.correo = "Ya existe un usuario con este correo";
  }

  return errores; 
};
