// Teléfonos móviles de Chile: se guardan como +569XXXXXXXX. El bot de WhatsApp
// busca al alumno por esos dígitos: un teléfono con espacios o sin el 9 no se
// encontraba y sus respuestas se ignoraban.

// Prefijo fijo +569: el usuario solo escribe los 8 dígitos del móvil.
// Normaliza cualquier formato existente (56, +56, 9, espacios, guiones)
// a +569XXXXXXXX sin repetir el 9 del prefijo.
export function normalizeTelefono(value: string): string {
  let digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("56")) digits = digits.slice(2); // +569 → 9...
  if (digits.startsWith("9")) digits = digits.slice(1);  // quita el 9 del prefijo
  return `+569${digits.slice(0, 8)}`;
}

/**
 * Teléfono para guardar desde un formulario del admin.
 *   ""/null/undefined → null (borra el teléfono)
 *   válido            → +569XXXXXXXX
 *   inválido          → { error }
 */
export function telefonoParaGuardar(value: string | null | undefined): string | null | { error: string } {
  const texto = (value ?? "").trim();
  if (!texto) return null;
  const normalizado = normalizeTelefono(texto);
  if (!/^\+569\d{8}$/.test(normalizado)) {
    return { error: "El teléfono debe ser un celular chileno de 8 dígitos (+569 XXXX XXXX)" };
  }
  return normalizado;
}
