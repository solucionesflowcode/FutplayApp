// Filtro por sede principal del usuario (contabilidad por sede).
// Valor del filtro: null = todas, "sin" = usuarios sin sede, o el id de una sede.
export type FiltroSede = string | null;

export const SIN_SEDE = "sin";

export function coincideSede(sedeId: string | null | undefined, filtro: FiltroSede): boolean {
  if (!filtro) return true;
  if (filtro === SIN_SEDE) return !sedeId;
  return sedeId === filtro;
}

/** Devuelve un predicado por usuario_id según la sede de cada usuario. */
export function filtroSede(
  filtro: FiltroSede,
  usuarios: { id: string; sede_id: string | null }[],
): (usuarioId: string) => boolean {
  if (!filtro) return () => true;
  const sedes = new Map(usuarios.map((u) => [u.id, u.sede_id]));
  return (usuarioId) => coincideSede(sedes.get(usuarioId), filtro);
}
