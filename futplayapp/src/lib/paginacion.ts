// Paginación de tablas del admin.

/** Página válida: entre 1 y el total (una lista vacía tiene 1 página). */
export function acotarPagina(pagina: number, totalPaginas: number): number {
  return Math.min(Math.max(1, pagina), Math.max(1, totalPaginas));
}

/**
 * Números de página a mostrar: la primera, la última y las vecinas de la
 * actual, con "…" en los saltos. Ej. (6 de 19) → 1 … 5 6 7 … 19.
 * Antes la tabla de usuarios mostraba siempre [1, 2, 3] y no se podía ir
 * directo a la página 4 en adelante.
 */
export function paginasVisibles(actual: number, totalPaginas: number, vecinas = 1): (number | "…")[] {
  if (totalPaginas <= 1) return [1];
  const paginas = new Set<number>([1, totalPaginas]);
  for (let p = actual - vecinas; p <= actual + vecinas; p++) {
    if (p >= 1 && p <= totalPaginas) paginas.add(p);
  }
  const orden = [...paginas].sort((a, b) => a - b);
  const salida: (number | "…")[] = [];
  orden.forEach((p, i) => {
    if (i > 0 && p - orden[i - 1] > 1) salida.push("…");
    salida.push(p);
  });
  return salida;
}
