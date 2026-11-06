// Autores de los goles y jugador del partido (sin acceso a la BD: testeable).
import type { LigaGol, LigaPartido } from "@/lib/liga-tabla";

export type GolEntrada = { equipo_id: string; jugador_id?: string | null; autogol?: boolean };

type ContextoPartido = {
  local_id: string;
  visita_id: string;
  goles_local: number;
  goles_visita: number;
  /** Jugadores de los dos equipos: id en liga_jugador → equipo. */
  equipoDeJugador: Map<string, string>;
};

/** Valida los goles de un partido. Puede haber menos filas que goles (autor sin registrar), nunca más. */
export function errorGoles(goles: unknown, ctx: ContextoPartido): string | null {
  if (!Array.isArray(goles)) return "Los goles no son válidos";
  const contar = { local: 0, visita: 0 };
  for (const g of goles as GolEntrada[]) {
    if (g.equipo_id === ctx.local_id) contar.local++;
    else if (g.equipo_id === ctx.visita_id) contar.visita++;
    else return "Cada gol debe ser de uno de los dos equipos";

    if (g.autogol) {
      if (g.jugador_id) return "Un autogol no lleva autor";
    } else if (!g.jugador_id || ctx.equipoDeJugador.get(g.jugador_id) !== g.equipo_id) {
      return "El autor de un gol debe ser del equipo que lo anotó";
    }
  }
  if (contar.local > ctx.goles_local || contar.visita > ctx.goles_visita) return "Hay más autores que goles en el marcador";
  return null;
}

export function errorJugadorPartido(jugadorId: unknown, equipoDeJugador: Map<string, string>): string | null {
  if (!jugadorId) return null;
  return equipoDeJugador.has(jugadorId as string) ? null : "El jugador del partido debe ser de uno de los dos equipos";
}

/** Lo que se muestra bajo cada equipo: ["Juan ×2", "Pedro", "Autogol"]. */
export function resumenGoles(goles: LigaGol[], equipoId: string): string[] {
  const cuenta = new Map<string, number>();
  for (const g of goles) {
    if (g.equipo_id !== equipoId) continue;
    const nombre = g.autogol ? "Autogol" : g.nombre;
    if (nombre) cuenta.set(nombre, (cuenta.get(nombre) ?? 0) + 1);
  }
  return [...cuenta].map(([nombre, n]) => (n > 1 ? `${nombre} ×${n}` : nombre));
}

export type Goleador = { jugador_id: string; nombre: string; equipo_id: string; goles: number; posicion: number };

/**
 * Goleadores de toda la liga (fase regular y playoffs), de más a menos goles y luego por nombre.
 * Quienes empatan comparten posición: 1, 1, 3. No cuentan los autogoles ni los goles sin autor.
 */
export function calcularGoleadores(partidos: Pick<LigaPartido, "estado" | "goles">[]): Goleador[] {
  const porJugador = new Map<string, Goleador>();
  for (const p of partidos) {
    if (p.estado !== "jugado") continue;
    for (const g of p.goles ?? []) {
      if (g.autogol || !g.jugador_id) continue;
      const fila = porJugador.get(g.jugador_id);
      if (fila) fila.goles++;
      else porJugador.set(g.jugador_id, { jugador_id: g.jugador_id, nombre: g.nombre ?? "Jugador", equipo_id: g.equipo_id, goles: 1, posicion: 0 });
    }
  }
  const orden = [...porJugador.values()].sort((a, b) => b.goles - a.goles || a.nombre.localeCompare(b.nombre, "es"));
  orden.forEach((f, i) => { f.posicion = i > 0 && orden[i - 1].goles === f.goles ? orden[i - 1].posicion : i + 1; });
  return orden;
}

// Se embebe al leer partidos. Solo trae el nombre del jugador: la vista del jugador no expone más.
export const EMBED_DETALLE_PARTIDO =
  "goles:liga_gol (equipo_id, jugador_id, autogol, jugador:jugador_id (usuario:usuario_id (nombre))), mvp:jugador_partido_id (usuario:usuario_id (nombre))";

type FilaDetalle = {
  goles?: { equipo_id: string; jugador_id: string | null; autogol: boolean; jugador?: { usuario?: { nombre?: string } | null } | null }[] | null;
  mvp?: { usuario?: { nombre?: string } | null } | null;
};

/** Convierte los embebidos de EMBED_DETALLE_PARTIDO en los campos de LigaPartido. */
export function aplanarDetallePartido<T extends object>(fila: T) {
  const { goles, mvp, ...resto } = fila as T & FilaDetalle;
  return {
    ...resto,
    goles: (goles ?? []).map((g): LigaGol => ({
      equipo_id: g.equipo_id,
      jugador_id: g.jugador_id,
      autogol: g.autogol,
      nombre: g.jugador?.usuario?.nombre ?? null,
    })),
    jugador_partido_nombre: mvp?.usuario?.nombre ?? null,
  };
}
