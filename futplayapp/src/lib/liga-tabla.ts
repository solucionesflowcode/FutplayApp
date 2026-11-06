// Tipos y tabla de posiciones de las ligas (sin acceso a la BD: testeable).

export type LigaFase = "regular" | "cuartos" | "semifinal" | "final";
export type LigaPartidoEstado = "programado" | "jugado" | "suspendido";
export type LigaEstado = "borrador" | "en_curso" | "finalizada";

export const FASES_PLAYOFF: LigaFase[] = ["cuartos", "semifinal", "final"];

export const ETIQUETA_FASE: Record<LigaFase, string> = {
    regular: "Fase regular",
    cuartos: "Cuartos de final",
    semifinal: "Semifinal",
    final: "Final",
};

export interface LigaEquipoBase {
    id: string;
    nombre: string;
    logo_url?: string | null;
    /** Sede del equipo: ahí se juegan sus partidos de local. */
    sede?: { nombre: string } | null;
}

export interface LigaGol {
    equipo_id: string;
    jugador_id: string | null;
    autogol: boolean;
    nombre: string | null;
}

export interface LigaPartido {
    id: string;
    liga_id: string;
    fase: LigaFase;
    jornada: number | null;
    llave: number | null;
    local_id: string;
    visita_id: string;
    fecha_hora: string | null;
    cancha: string | null;
    goles_local: number | null;
    goles_visita: number | null;
    penales_local: number | null;
    penales_visita: number | null;
    estado: LigaPartidoEstado;
    goles?: LigaGol[];
    jugador_partido_id?: string | null;
    jugador_partido_nombre?: string | null;
}

export interface FilaTabla {
    equipo: LigaEquipoBase;
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    dg: number;
    pts: number;
}

export const PUNTOS_VICTORIA = 3;
export const PUNTOS_EMPATE = 1;

/**
 * Tabla de la fase regular: solo cuentan los partidos jugados.
 * Orden: puntos, diferencia de gol, goles a favor y nombre.
 */
export function calcularTabla(equipos: LigaEquipoBase[], partidos: Pick<LigaPartido, "fase" | "estado" | "local_id" | "visita_id" | "goles_local" | "goles_visita">[]): FilaTabla[] {
    const filas = new Map<string, FilaTabla>(
        equipos.map((e) => [e.id, { equipo: e, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 }])
    );

    for (const p of partidos) {
        if (p.fase !== "regular" || p.estado !== "jugado") continue;
        if (p.goles_local == null || p.goles_visita == null) continue;
        const local = filas.get(p.local_id);
        const visita = filas.get(p.visita_id);
        if (!local || !visita) continue;

        sumar(local, p.goles_local, p.goles_visita);
        sumar(visita, p.goles_visita, p.goles_local);
    }

    return [...filas.values()].sort(
        (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.equipo.nombre.localeCompare(b.equipo.nombre, "es")
    );
}

function sumar(f: FilaTabla, favor: number, contra: number) {
    f.pj++;
    f.gf += favor;
    f.gc += contra;
    f.dg = f.gf - f.gc;
    if (favor > contra) { f.pg++; f.pts += PUNTOS_VICTORIA; }
    else if (favor === contra) { f.pe++; f.pts += PUNTOS_EMPATE; }
    else f.pp++;
}
