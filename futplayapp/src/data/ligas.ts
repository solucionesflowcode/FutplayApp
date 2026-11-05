import type { FilaTabla, LigaEquipoBase, LigaEstado, LigaPartido } from "@/lib/liga-tabla";

export type LigaResumen = {
    id: string;
    nombre: string;
    temporada: string | null;
    estado: LigaEstado;
    clasificados_playoff: number | null;
    inscrito: boolean;
};

export type JugadorPlantel = {
    equipo_id: string;
    numero: number | null;
    nombre: string;
    foto_url: string | null;
    posicion: string | null;
};

export type MiLigaDetalle = {
    liga: LigaResumen;
    equipos: LigaEquipoBase[];
    jugadores: JugadorPlantel[];
    partidos: LigaPartido[];
    tabla: FilaTabla[];
    miEquipoId: string | null;
};

export type MiLigaRespuesta = { ligas: LigaResumen[]; detalle: MiLigaDetalle | null };

/** Vista de "Mi liga". Sin id, el servidor elige la liga en curso del jugador. */
export async function getMiLiga(id?: string): Promise<MiLigaRespuesta> {
    const res = await fetch(id ? `/api/ligas?id=${encodeURIComponent(id)}` : "/api/ligas");
    if (!res.ok) {
        console.error("Error fetching liga:", await res.text());
        throw new Error("No se pudo cargar la liga");
    }
    return res.json();
}
