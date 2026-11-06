import type { LigaEstado, LigaPartido, LigaPartidoEstado } from "@/lib/liga-tabla";
import type { Clasificados } from "@/lib/liga-playoffs";
import type { LigaFotoVista, PaginaFotos } from "@/lib/liga-fotos";

export type LigaAdmin = {
  id: string;
  nombre: string;
  temporada: string | null;
  estado: LigaEstado;
  clasificados_playoff: Clasificados | null;
  created_at: string;
  total_equipos?: number;
  total_partidos?: number;
  partidos_jugados?: number;
};

export type LigaEquipoAdmin = { id: string; liga_id: string; nombre: string; logo_url: string | null; sede_id: string | null; sede?: { nombre: string } | null };

export type LigaJugadorAdmin = {
  id: string;
  equipo_id: string;
  usuario_id: string;
  numero: number | null;
  usuario: { nombre: string; email: string | null; foto_url: string | null; posicion: string | null } | null;
};

export type LigaDetalleAdmin = {
  liga: LigaAdmin;
  equipos: LigaEquipoAdmin[];
  jugadores: LigaJugadorAdmin[];
  partidos: LigaPartido[];
};

export type JugadorBuscado = { id: string; nombre: string; email: string | null; foto_url: string | null; posicion: string | null; equipo_id: string | null };

type Resultado<T = undefined> = { success: boolean; error?: string; data?: T };

async function enviar<T>(url: string, method: string, body?: unknown): Promise<Resultado<T>> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { success: false, error: json?.error };
  return { success: true, data: json as T };
}

export async function getLigasAdmin(): Promise<LigaAdmin[]> {
  const res = await fetch("/api/admin/ligas");
  if (!res.ok) {
    console.error("Error fetching ligas:", await res.text());
    throw new Error("No se pudieron cargar las ligas");
  }
  return res.json();
}

export async function getLigaAdmin(id: string): Promise<LigaDetalleAdmin> {
  const res = await fetch(`/api/admin/ligas?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    console.error("Error fetching liga:", await res.text());
    throw new Error(res.status === 404 ? "La liga no existe" : "No se pudo cargar la liga");
  }
  return res.json();
}

export type DatosLiga = {
  nombre?: string;
  temporada?: string | null;
  estado?: LigaEstado;
  clasificados_playoff?: Clasificados | null;
};

export const crearLiga = (datos: DatosLiga) => enviar<LigaAdmin>("/api/admin/ligas", "POST", datos);
export const actualizarLiga = (id: string, datos: DatosLiga) => enviar("/api/admin/ligas", "PUT", { id, ...datos });
export const eliminarLiga = (id: string) => enviar(`/api/admin/ligas?id=${encodeURIComponent(id)}`, "DELETE");

export const crearEquipo = (liga_id: string, datos: { nombre: string; sede_id: string; logo_url?: string | null }) =>
  enviar<LigaEquipoAdmin>("/api/admin/ligas/equipos", "POST", { liga_id, ...datos });
export const actualizarEquipo = (id: string, datos: { nombre?: string; sede_id?: string; logo_url?: string | null }) =>
  enviar("/api/admin/ligas/equipos", "PUT", { id, ...datos });
export const eliminarEquipo = (id: string) => enviar(`/api/admin/ligas/equipos?id=${encodeURIComponent(id)}`, "DELETE");

export async function subirLogoEquipo(file: File): Promise<Resultado<{ url: string }>> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/ligas/logo", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { success: false, error: json?.error };
  return { success: true, data: json };
}

export async function getFotosLigaAdmin(ligaId: string, cursor?: string): Promise<PaginaFotos> {
  const params = new URLSearchParams({ liga_id: ligaId });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/admin/ligas/fotos?${params}`);
  if (!res.ok) throw new Error("No se pudieron cargar las fotos");
  return res.json();
}

export async function subirFotoLiga(form: FormData): Promise<Resultado<LigaFotoVista>> {
  const res = await fetch("/api/admin/ligas/fotos", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { success: false, error: json?.error };
  return { success: true, data: json };
}

export const actualizarFotoLiga = (id: string, datos: { pie: string | null; partido_id: string | null }) =>
  enviar("/api/admin/ligas/fotos", "PUT", { id, ...datos });
export const eliminarFotoLiga = (id: string) => enviar(`/api/admin/ligas/fotos?id=${encodeURIComponent(id)}`, "DELETE");

export async function buscarJugadores(texto: string, ligaId: string): Promise<JugadorBuscado[]> {
  const res = await fetch(`/api/admin/ligas/jugadores?buscar=${encodeURIComponent(texto)}&liga_id=${encodeURIComponent(ligaId)}`);
  if (!res.ok) return [];
  return res.json();
}

export const agregarJugador = (datos: { liga_id: string; equipo_id: string; usuario_id: string; numero?: number | null }) =>
  enviar("/api/admin/ligas/jugadores", "POST", datos);
export const actualizarJugador = (id: string, datos: { numero?: number | null; equipo_id?: string }) =>
  enviar("/api/admin/ligas/jugadores", "PUT", { id, ...datos });
export const quitarJugador = (id: string) => enviar(`/api/admin/ligas/jugadores?id=${encodeURIComponent(id)}`, "DELETE");

export type DatosPartido = {
  jornada?: number;
  local_id?: string;
  visita_id?: string;
  fecha_hora?: string | null;
  cancha?: string | null;
  estado?: LigaPartidoEstado;
  goles_local?: number | null;
  goles_visita?: number | null;
  penales_local?: number | null;
  penales_visita?: number | null;
  goles?: { equipo_id: string; jugador_id: string | null; autogol: boolean }[];
  jugador_partido_id?: string | null;
};

export const crearPartido = (liga_id: string, datos: DatosPartido) => enviar<LigaPartido>("/api/admin/ligas/partidos", "POST", { liga_id, ...datos });
export const actualizarPartido = (id: string, datos: DatosPartido) => enviar("/api/admin/ligas/partidos", "PUT", { id, ...datos });
export const eliminarPartido = (id: string) => enviar(`/api/admin/ligas/partidos?id=${encodeURIComponent(id)}`, "DELETE");

export const generarPlayoffs = (liga_id: string, clasificados: Clasificados) =>
  enviar("/api/admin/ligas/playoffs", "POST", { liga_id, accion: "generar", clasificados });
export const siguienteRondaPlayoffs = (liga_id: string) => enviar("/api/admin/ligas/playoffs", "POST", { liga_id, accion: "siguiente" });
export const reiniciarPlayoffs = (liga_id: string) => enviar("/api/admin/ligas/playoffs", "POST", { liga_id, accion: "reiniciar" });
