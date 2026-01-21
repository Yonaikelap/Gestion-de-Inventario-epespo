const normalizar = (v) => (v ?? "").toString().trim().replace(/\s+/g, " ");
const normalizarCorreo = (v) => normalizar(v).toLowerCase();
const soloNumeros = (v) => normalizar(v).replace(/\D/g, "");

const validarCedulaEcuatoriana = (cedula) => {
  const c = soloNumeros(cedula);

  if (c.length !== 10) return "La cédula debe tener exactamente 10 dígitos";

  const provincia = parseInt(c.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return "La cédula no pertenece a una provincia válida";

  const digitos = c.split("").map(Number);
  let total = 0;

  for (let i = 0; i < 9; i++) {
    let num = digitos[i];
    if (i % 2 === 0) num *= 2;
    if (num > 9) num -= 9;
    total += num;
  }

  const verificador = total % 10 === 0 ? 0 : 10 - (total % 10);
  if (verificador !== digitos[9]) return "La cédula ecuatoriana no es válida";

  return null;
};

export const validarResponsable = (responsable) => {
  const errores = {};

  const titulo = normalizar(responsable?.titulo);
  const nombre = normalizar(responsable?.nombre);
  const apellido = normalizar(responsable?.apellido);
  const correo = normalizarCorreo(responsable?.correo);
  const cedula = soloNumeros(responsable?.cedula);
  const cargo = normalizar(responsable?.cargo);

  // ✅ Título (solo obligatorio, sin lista)
  if (!titulo) {
    errores.titulo = "El título profesional es obligatorio";
  }

  // Nombre
  if (!nombre) {
    errores.nombre = "El nombre es obligatorio";
  } else if (nombre.length < 2) {
    errores.nombre = "El nombre debe tener al menos 2 caracteres";
  } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/.test(nombre)) {
    errores.nombre = "El nombre solo puede contener letras y espacios";
  }

  // Apellido
  if (!apellido) {
    errores.apellido = "El apellido es obligatorio";
  } else if (apellido.length < 2) {
    errores.apellido = "El apellido debe tener al menos 2 caracteres";
  } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s'-]+$/.test(apellido)) {
    errores.apellido = "El apellido solo puede contener letras y espacios";
  }

  // Correo
  if (!correo) {
    errores.correo = "El correo es obligatorio";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = "El correo no es válido";
  }

  // Cédula
  if (!cedula) {
    errores.cedula = "La cédula es obligatoria";
  } else {
    const errCed = validarCedulaEcuatoriana(cedula);
    if (errCed) errores.cedula = errCed;
  }

  // Cargo
  if (!cargo) {
    errores.cargo = "El cargo es obligatorio";
  } else if (cargo.length < 2) {
    errores.cargo = "El cargo debe tener al menos 2 caracteres";
  } else if (cargo.length > 100) {
    errores.cargo = "El cargo no debe superar 100 caracteres";
  } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s.,\-()]+$/.test(cargo)) {
    errores.cargo = "El cargo contiene caracteres no válidos";
  }

  return errores;
};
