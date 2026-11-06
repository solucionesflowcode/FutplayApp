// Fotos del campeonato: tipos, validaciones y filtros (sin acceso a la BD: testeable).
import { ETIQUETA_FASE, FASES_PLAYOFF, type LigaEquipoBase, type LigaFase, type LigaPartido } from "@/lib/liga-tabla";

export const BUCKET_FOTOS = "liga-fotos";
export const FOTOS_POR_PAGINA = 24;
export const MAX_BYTES_FOTO = 4 * 1024 * 1024;
export const MAX_BYTES_MINIATURA = 512 * 1024;
export const MAX_PIE = 200;
export const MAX_COMENTARIO = 500;

export type LigaFotoVista = {
  id: string;
  liga_id: string;
  partido_id: string | null;
  url: string;
  miniatura_url: string;
  ancho: number;
  alto: number;
  pie: string | null;
  created_at: string;
  me_gusta_total: number;
  comentarios_total: number;
  me_gusta: boolean;
};

export type PaginaFotos = { fotos: LigaFotoVista[]; siguiente: string | null };

export type ComentarioFoto = {
  id: string;
  texto: string;
  created_at: string;
  autor: { nombre: string; foto_url: string | null };
  propio: boolean;
};

export type FiltroFotos = {
  generales?: boolean;
  jornada?: number;
  fase?: LigaFase;
  equipo_id?: string;
  partido_id?: string;
};

type PartidoFiltrable = Pick<LigaPartido, "id" | "fase" | "jornada" | "local_id" | "visita_id">;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

export function filtrarPartidos<T extends PartidoFiltrable>(partidos: T[], filtro: FiltroFotos): T[] {
  return partidos.filter((p) =>
    (filtro.jornada === undefined || (p.fase === "regular" && p.jornada === filtro.jornada)) &&
    (filtro.fase === undefined || p.fase === filtro.fase) &&
    (filtro.equipo_id === undefined || p.local_id === filtro.equipo_id || p.visita_id === filtro.equipo_id) &&
    (filtro.partido_id === undefined || p.id === filtro.partido_id));
}

/** Ids de los partidos que deja el filtro, o null si no filtra por partido. */
export function idsPartidosDeFiltro(partidos: PartidoFiltrable[], filtro: FiltroFotos): string[] | null {
  const filtraPartido = filtro.jornada !== undefined || filtro.fase !== undefined || filtro.equipo_id !== undefined || filtro.partido_id !== undefined;
  return filtraPartido ? filtrarPartidos(partidos, filtro).map((p) => p.id) : null;
}

export function filtroDesdeParams(params: URLSearchParams): FiltroFotos {
  const filtro: FiltroFotos = {};
  if (params.get("generales") === "1") filtro.generales = true;
  const jornada = Number(params.get("jornada"));
  if (params.has("jornada") && Number.isInteger(jornada)) filtro.jornada = jornada;
  const fase = params.get("fase") as LigaFase | null;
  if (fase && FASES_PLAYOFF.includes(fase)) filtro.fase = fase;
  const equipo = params.get("equipo_id");
  if (esUuid(equipo)) filtro.equipo_id = equipo;
  const partido = params.get("partido_id");
  if (esUuid(partido)) filtro.partido_id = partido;
  return filtro;
}

export function paramsDeFiltro(filtro: FiltroFotos): URLSearchParams {
  const params = new URLSearchParams();
  if (filtro.generales) params.set("generales", "1");
  if (filtro.jornada !== undefined) params.set("jornada", String(filtro.jornada));
  if (filtro.fase) params.set("fase", filtro.fase);
  if (filtro.equipo_id) params.set("equipo_id", filtro.equipo_id);
  if (filtro.partido_id) params.set("partido_id", filtro.partido_id);
  return params;
}

export function errorPie(pie: unknown): string | null {
  if (pie === null || pie === undefined) return null;
  if (typeof pie !== "string") return "El pie de foto no es válido";
  return pie.trim().length > MAX_PIE ? `El pie de foto no puede superar ${MAX_PIE} caracteres` : null;
}

export function limpiarPie(pie: unknown): string | null {
  return typeof pie === "string" ? pie.trim() || null : null;
}

export function errorComentario(texto: unknown): string | null {
  if (typeof texto !== "string" || !texto.trim()) return "Escribe un comentario";
  return texto.trim().length > MAX_COMENTARIO ? `El comentario no puede superar ${MAX_COMENTARIO} caracteres` : null;
}

/** Revisa los primeros bytes: el tipo declarado por el navegador no basta en un bucket público. */
export function esImagenPermitida(tipo: string, bytes: Uint8Array): boolean {
  if (tipo === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (tipo === "image/webp") {
    const texto = (desde: number, hasta: number) => String.fromCharCode(...bytes.slice(desde, hasta));
    return texto(0, 4) === "RIFF" && texto(8, 12) === "WEBP";
  }
  return false;
}

/** Reduce manteniendo la proporción; nunca agranda. */
export function dimensionesEscaladas(ancho: number, alto: number, ladoMaximo: number): { ancho: number; alto: number } {
  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

/**
 * Enlace que descarga la foto en vez de abrirla. El atributo download no sirve
 * entre dominios: es Supabase Storage quien fuerza la descarga con este parámetro.
 */
export function urlDescarga(foto: Pick<LigaFotoVista, "id" | "url">): string {
  const extension = foto.url.split(".").pop() ?? "jpg";
  return `${foto.url}?download=${encodeURIComponent(`foto-campeonato-${foto.id.slice(0, 8)}.${extension}`)}`;
}

/** "Jornada 2 · Alfa vs Beta" o "Final · Alfa vs Beta". */
export function etiquetaPartido(partido: PartidoFiltrable, equipos: Pick<LigaEquipoBase, "id" | "nombre">[]): string {
  const nombre = (id: string) => equipos.find((e) => e.id === id)?.nombre ?? "Equipo";
  const etapa = partido.fase === "regular" && partido.jornada != null ? `Jornada ${partido.jornada}` : ETIQUETA_FASE[partido.fase];
  return `${etapa} · ${nombre(partido.local_id)} vs ${nombre(partido.visita_id)}`;
}
