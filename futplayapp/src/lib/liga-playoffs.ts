// Cuadro de playoffs de las ligas (sin acceso a la BD: testeable).
import type { FilaTabla, LigaFase, LigaPartido } from "@/lib/liga-tabla";

export type Clasificados = 2 | 4 | 8;

export interface CruceNuevo {
    fase: LigaFase;
    llave: number;
    local_id: string;
    visita_id: string;
}

const FASE_POR_EQUIPOS: Record<number, LigaFase> = { 8: "cuartos", 4: "semifinal", 2: "final" };

export function esClasificados(n: unknown): n is Clasificados {
    return n === 2 || n === 4 || n === 8;
}

/**
 * Primera ronda desde la tabla: 1° vs último clasificado, 2° vs penúltimo…
 * El mejor ubicado juega de local. Las llaves quedan en el orden del cuadro
 * (1v8, 4v5, 2v7, 3v6) para que en la ronda siguiente el 1° y el 2° solo se
 * crucen en la final.
 */
export function generarPrimeraRonda(tabla: FilaTabla[], n: Clasificados): CruceNuevo[] {
    if (tabla.length < n) {
        throw new Error(`Se necesitan al menos ${n} equipos para jugar playoffs con ${n} clasificados.`);
    }
    const orden: Record<Clasificados, [number, number][]> = {
        2: [[1, 2]],
        4: [[1, 4], [2, 3]],
        8: [[1, 8], [4, 5], [2, 7], [3, 6]],
    };
    return orden[n].map(([a, b], i) => ({
        fase: FASE_POR_EQUIPOS[n],
        llave: i + 1,
        local_id: tabla[a - 1].equipo.id,
        visita_id: tabla[b - 1].equipo.id,
    }));
}

/** Ganador de un partido de playoff: por goles y, si empatan, por penales. null si aún no se define. */
export function ganador(p: Pick<LigaPartido, "estado" | "local_id" | "visita_id" | "goles_local" | "goles_visita" | "penales_local" | "penales_visita">): string | null {
    if (p.estado !== "jugado" || p.goles_local == null || p.goles_visita == null) return null;
    if (p.goles_local !== p.goles_visita) return p.goles_local > p.goles_visita ? p.local_id : p.visita_id;
    if (p.penales_local == null || p.penales_visita == null || p.penales_local === p.penales_visita) return null;
    return p.penales_local > p.penales_visita ? p.local_id : p.visita_id;
}

/** Ronda siguiente a partir de los partidos de la ronda actual (todos deben tener ganador). */
export function generarSiguienteRonda(ronda: LigaPartido[]): CruceNuevo[] {
    if (ronda.length === 0) throw new Error("No hay una ronda de playoffs para avanzar.");
    const fase = ronda[0].fase;
    if (fase === "final") throw new Error("La final ya está generada.");
    if (fase === "regular") throw new Error("La ronda indicada no es de playoffs.");

    const ordenados = [...ronda].sort((a, b) => (a.llave ?? 0) - (b.llave ?? 0));
    const ganadores = ordenados.map(ganador);
    if (ganadores.some((g) => g == null)) {
        throw new Error("Faltan resultados: todos los partidos de la ronda deben estar jugados y con ganador (usa penales si hubo empate).");
    }

    const siguiente: LigaFase = fase === "cuartos" ? "semifinal" : "final";
    const cruces: CruceNuevo[] = [];
    for (let i = 0; i < ganadores.length; i += 2) {
        cruces.push({ fase: siguiente, llave: i / 2 + 1, local_id: ganadores[i]!, visita_id: ganadores[i + 1]! });
    }
    return cruces;
}

/** Ronda de playoffs más avanzada que ya existe (o null si aún no hay playoffs). */
export function rondaActual(partidos: Pick<LigaPartido, "fase">[]): LigaFase | null {
    for (const f of ["final", "semifinal", "cuartos"] as LigaFase[]) {
        if (partidos.some((p) => p.fase === f)) return f;
    }
    return null;
}
