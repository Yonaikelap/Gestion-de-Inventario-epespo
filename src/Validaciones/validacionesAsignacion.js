const esFechaValidaNoFutura = (fechaStr) => {
  if (!fechaStr) return { ok: false, msg: "La fecha es obligatoria" };

  const hoy = new Date();
  const f = new Date(fechaStr);

  if (Number.isNaN(f.getTime())) return { ok: false, msg: "La fecha no es válida" };

  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const d = new Date(f.getFullYear(), f.getMonth(), f.getDate());

  if (d > h) return { ok: false, msg: "La fecha no puede ser mayor a hoy" };

  return { ok: true };
};

const contarSeleccionados = (bienesSeleccionados = {}) => {
  const cats = Object.keys(bienesSeleccionados || {}).filter((cat) => (bienesSeleccionados[cat] || []).length > 0);

  const total = cats.reduce((acc, cat) => acc + (bienesSeleccionados[cat]?.length || 0), 0);
  return { cats, total };
};

export const validarAsignacion = (
  asignacion,
  bienesSeleccionados,
  asignacionesHistorial = [],
  asignacionesActuales = []
) => {
  const errores = {};

  if (!asignacion?.responsable_id) {
    errores.responsable_id = "Debe seleccionar un responsable";
  }

  const fval = esFechaValidaNoFutura(asignacion?.fecha_asignacion);
  if (!fval.ok) errores.fecha_asignacion = fval.msg;

  if (!asignacion?.area_id) {
    errores.area_id = "Debe seleccionar un departamento / área";
  }

  const { cats, total } = contarSeleccionados(bienesSeleccionados);

  if (total === 0) {
    errores.bienes = "Debe seleccionar al menos un bien para asignar";
    return errores;
  }

  const areaNum = Number(asignacion.area_id);
  const respNum = Number(asignacion.responsable_id);

  const yaExiste = (asignacionesHistorial || []).some(
    (a) => Number(a.responsable_id) === respNum && Number(a.area_id) === areaNum && cats.includes(a.categoria)
  );

  if (yaExiste) {
    errores.general = "Ya existe una asignación para ese responsable, área y categoría";
    return errores;
  }

  const ocupados = new Map();
  (asignacionesActuales || []).forEach((row) => {
    const pid = Number(row?.producto_id);
    if (!pid) return;
    ocupados.set(pid, row);
  });

  const conflictos = [];

  cats.forEach((cat) => {
    (bienesSeleccionados?.[cat] || []).forEach((p) => {
      const pid = Number(p?.id);
      if (!pid) return;

      const row = ocupados.get(pid);
      if (!row) return;

      conflictos.push(`${p?.codigo || "S/C"} - ${p?.nombre || "Sin nombre"}`);
    });
  });

  if (conflictos.length > 0) {
    errores.general = `Hay bienes que ya están asignados actualmente: ${conflictos.join(", ")}`;
  }

  return errores;
};

export const validarRecepcion = (
  recepcion,
  bienesSeleccionados,
  asignacionesActuales = []
) => {
  const errores = {};

  if (!recepcion?.responsable_id) {
    errores.responsable_id = "Debe seleccionar un responsable";
  }

  const fval = esFechaValidaNoFutura(recepcion?.fecha_devolucion);
  if (!fval.ok) errores.fecha_devolucion = fval.msg;

  if (!recepcion?.area_id) {
    errores.area_id = "Debe seleccionar un departamento / área";
  }

  const { cats, total } = contarSeleccionados(bienesSeleccionados);

  if (total === 0) {
    errores.bienes = "Debe seleccionar al menos un bien para la recepción";
    errores.general = errores.bienes;
    return errores;
  }

  const estadoActual = new Map();
  (asignacionesActuales || []).forEach((row) => {
    const pid = Number(row?.producto_id);
    if (!pid) return;
    estadoActual.set(pid, {
      responsable_id: Number(row?.responsable_id),
      area_id: Number(row?.area_id),
      asignacion_id: Number(row?.asignacion_id),
    });
  });

  const rid = Number(recepcion?.responsable_id);
  const noCorresponden = [];

  cats.forEach((cat) => {
    (bienesSeleccionados?.[cat] || []).forEach((p) => {
      const pid = Number(p?.id);
      if (!pid) return;

      const info = estadoActual.get(pid);
      if (!info || Number(info.responsable_id) !== rid) {
        noCorresponden.push(`${p?.codigo || "S/C"} - ${p?.nombre || "Sin nombre"}`);
      }
    });
  });

  if (noCorresponden.length > 0) {
    errores.general =
      "Estos bienes NO están asignados actualmente a este responsable (o ya fueron recibidos): " +
      noCorresponden.join(", ");
  }

  return errores;
};
