import type { FilaTabla, LigaEquipoBase, LigaEstado, LigaPartido } from "@/lib/liga-tabla";
import { paramsDeFiltro, type ComentarioFoto, type FiltroFotos, type PaginaFotos } from "@/lib/liga-fotos";

/** Devuelve el JSON de la respuesta o lanza el mensaje de la API. */
async function leer<T>(res: Response, mensaje: string): Promise<T> {
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? mensaje);
    return json as T;
}

export async function getFotosLiga(ligaId: string, filtro: FiltroFotos, cursor?: string): Promise<PaginaFotos> {
    const params = paramsDeFiltro(filtro);
    params.set("liga_id", ligaId);
    if (cursor) params.set("cursor", cursor);
    return leer(await fetch(`/api/ligas/fotos?${params}`), "No se pudieron cargar las fotos");
}

export async function cambiarMeGusta(fotoId: string, meGusta: boolean): Promise<{ me_gusta: boolean; total: number }> {
    const res = await fetch(`/api/ligas/fotos/${encodeURIComponent(fotoId)}/reaccion`, { method: meGusta ? "POST" : "DELETE" });
    return leer(res, "No se pudo guardar tu me gusta");
}

export async function getComentariosFoto(fotoId: string): Promise<ComentarioFoto[]> {
    return leer(await fetch(`/api/ligas/fotos/${encodeURIComponent(fotoId)}/comentarios`), "No se pudieron cargar los comentarios");
}

export async function comentarFoto(fotoId: string, texto: string): Promise<ComentarioFoto> {
    const res = await fetch(`/api/ligas/fotos/${encodeURIComponent(fotoId)}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
    });
    return leer(res, "No se pudo publicar el comentario");
}

export async function borrarComentarioFoto(id: string): Promise<void> {
    await leer(await fetch(`/api/ligas/fotos/comentarios/${encodeURIComponent(id)}`, { method: "DELETE" }), "No se pudo borrar el comentario");
}

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
