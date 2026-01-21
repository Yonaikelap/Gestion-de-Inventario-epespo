const norm = (v) => (v ?? "").toString().trim().toLowerCase();

export const validarDepartamento = (
  departamento,
  listaDepartamentos = [],
  editarId = null,
  departamentosPermitidos = null 
) => {
  const errores = {};

  if (!departamento.nombre || departamento.nombre.trim() === "") {
    errores.nombre = "El departamento es obligatorio";
  }
  if (
    departamentosPermitidos &&
    Array.isArray(departamentosPermitidos) &&
    departamento.nombre &&
    !departamentosPermitidos.includes(departamento.nombre)
  ) {
    errores.nombre = "Debe seleccionar un departamento válido";
  }

  if (!departamento.ubicacion || departamento.ubicacion.trim() === "") {
    errores.ubicacion = "La ubicación es obligatoria";
  }
  if (!departamento.responsable_id || departamento.responsable_id === "") {
    errores.responsable_id = "Debe seleccionar un responsable";
  }
  const nombreNorm = norm(departamento.nombre);
  const ubicNorm = norm(departamento.ubicacion);

  const existe = listaDepartamentos.some((d) => {
    const mismoId = editarId != null && Number(d.id) === Number(editarId);
    if (mismoId) return false;

    return norm(d.nombre) === nombreNorm && norm(d.ubicacion) === ubicNorm;
  });

  if (existe) {
    errores.nombreUbicacion = "Ya existe un departamento con ese nombre y ubicación";
  }

  return errores;
};
