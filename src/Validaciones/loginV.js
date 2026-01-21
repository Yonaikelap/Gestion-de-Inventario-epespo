
export const validateEmail = (email) => {
  if (!email) return "El correo es obligatorio !";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Correo no válido ";
  return "";
};

export const validatePassword = (password) => {
  if (!password) return "La contraseña es obligatoria !";
  if (password.length < 6)
    return "La contraseña debe tener al menos 6 caracteres ";
  return "";
};

export const validateLogin = (email, password) => {
  const errores = {};

  const emailError = validateEmail(email);
  if (emailError) errores.correo = emailError;

  const passwordError = validatePassword(password);
  if (passwordError) errores.contrasena = passwordError;

  return errores;
};
