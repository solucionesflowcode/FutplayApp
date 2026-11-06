// Fotos del campeonato: consultas y limpieza del lado del servidor.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { getAdminClient } from "@/utils/supabase/admin";
import { BUCKET_FOTOS, esUuid, FOTOS_POR_PAGINA, type ComentarioFoto, type LigaFotoVista, type PaginaFotos } from "@/lib/liga-fotos";

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

type FilaFoto = {
  id: string;
  liga_id: string;
  partido_id: string | null;
  ruta: string;
  ruta_miniatura: string;
  ancho: number;
  alto: number;
  pie: string | null;
  created_at: string;
};

export const COLUMNAS_FOTO = "id, liga_id, partido_id, ruta, ruta_miniatura, ancho, alto, pie, created_at";
export const COLUMNAS_COMENTARIO = "id, usuario_id, texto, created_at, usuario:usuario_id (nombre, foto_url)";

// storage.remove() acepta hasta 1000 rutas por llamada.
const RUTAS_POR_LLAMADA = 1000;

export async function usuarioConSesion() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() { } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function fotoVista(admin: AdminClient, fila: FilaFoto, extra?: Partial<LigaFotoVista>): LigaFotoVista {
  const url = (ruta: string) => admin.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl;
  return {
    id: fila.id,
    liga_id: fila.liga_id,
    partido_id: fila.partido_id,
    url: url(fila.ruta),
    miniatura_url: url(fila.ruta_miniatura),
    ancho: fila.ancho,
    alto: fila.alto,
    pie: fila.pie,
    created_at: fila.created_at,
    me_gusta_total: 0,
    comentarios_total: 0,
    me_gusta: false,
    ...extra,
  };
}

/**
 * Una página de fotos, de la más nueva a la más antigua, con sus contadores.
 * El cursor es el created_at de la última foto de la página anterior.
 */
export async function listarFotos(admin: AdminClient, opciones: {
  ligaId: string;
  usuarioId: string;
  cursor?: string | null;
  soloGenerales?: boolean;
  partidoIds?: string[] | null;
}): Promise<PaginaFotos> {
  const { ligaId, usuarioId, cursor, soloGenerales, partidoIds } = opciones;
  if (partidoIds?.length === 0) return { fotos: [], siguiente: null };

  let consulta = admin.from("liga_foto").select(COLUMNAS_FOTO).eq("liga_id", ligaId);
  if (soloGenerales) consulta = consulta.is("partido_id", null);
  if (partidoIds) consulta = consulta.in("partido_id", partidoIds);
  if (cursor) consulta = consulta.lt("created_at", cursor);

  // Se pide una de más para saber si hay otra página.
  const { data, error } = await consulta.order("created_at", { ascending: false }).limit(FOTOS_POR_PAGINA + 1);
  if (error) throw new Error(error.message);

  const filas = (data ?? []) as FilaFoto[];
  const pagina = filas.slice(0, FOTOS_POR_PAGINA);
  if (pagina.length === 0) return { fotos: [], siguiente: null };

  const ids = pagina.map((f) => f.id);
  const [{ data: reacciones, error: errorReacciones }, { data: comentarios, error: errorComentarios }] = await Promise.all([
    admin.from("liga_foto_reaccion").select("foto_id, usuario_id").in("foto_id", ids),
    admin.from("liga_foto_comentario").select("foto_id").in("foto_id", ids),
  ]);
  if (errorReacciones || errorComentarios) throw new Error((errorReacciones ?? errorComentarios)!.message);

  return {
    fotos: pagina.map((f) => {
      const deLaFoto = (reacciones ?? []).filter((r) => r.foto_id === f.id);
      return fotoVista(admin, f, {
        me_gusta_total: deLaFoto.length,
        me_gusta: deLaFoto.some((r) => r.usuario_id === usuarioId),
        comentarios_total: (comentarios ?? []).filter((c) => c.foto_id === f.id).length,
      });
    }),
    siguiente: filas.length > FOTOS_POR_PAGINA ? pagina[pagina.length - 1].created_at : null,
  };
}

export async function ligaPublicada(admin: AdminClient, ligaId: string): Promise<boolean> {
  if (!esUuid(ligaId)) return false;
  const { data } = await admin.from("liga").select("id").eq("id", ligaId).neq("estado", "borrador").maybeSingle();
  return !!data;
}

/** La foto solo si su liga está publicada (las ligas en borrador no se muestran a los jugadores). */
export async function fotoPublicada(admin: AdminClient, fotoId: string): Promise<{ id: string; liga_id: string } | null> {
  if (!esUuid(fotoId)) return null;
  const { data: foto } = await admin.from("liga_foto").select("id, liga_id").eq("id", fotoId).maybeSingle();
  if (!foto || !(await ligaPublicada(admin, foto.liga_id))) return null;
  return foto;
}

/** Solo expone nombre y foto del autor; usuario_id se usa aquí y no sale de la API. */
export function comentarioVista(fila: unknown, usuarioId: string): ComentarioFoto {
  const c = fila as { id: string; usuario_id: string; texto: string; created_at: string; usuario?: { nombre?: string; foto_url?: string | null } | null };
  return {
    id: c.id,
    texto: c.texto,
    created_at: c.created_at,
    autor: { nombre: c.usuario?.nombre ?? "Jugador", foto_url: c.usuario?.foto_url ?? null },
    propio: c.usuario_id === usuarioId,
  };
}

/** Rutas de todas las fotos de una liga, en tandas: una consulta devuelve máximo 1000 filas. */
export async function rutasFotosDeLiga(admin: AdminClient, ligaId: string): Promise<string[]> {
  const rutas: string[] = [];
  let ultimoId: string | null = null;
  for (;;) {
    let consulta = admin.from("liga_foto").select("id, ruta, ruta_miniatura").eq("liga_id", ligaId);
    if (ultimoId) consulta = consulta.gt("id", ultimoId);
    const { data, error } = await consulta.order("id").limit(RUTAS_POR_LLAMADA);
    if (error) throw new Error(error.message);
    if (!data?.length) return rutas;
    for (const f of data) rutas.push(f.ruta, f.ruta_miniatura);
    if (data.length < RUTAS_POR_LLAMADA) return rutas;
    ultimoId = data[data.length - 1].id;
  }
}

/** Borra archivos del bucket. Devuelve un aviso si falla (la fila ya se borró: solo queda el archivo huérfano). */
export async function borrarArchivosFotos(admin: AdminClient, rutas: string[]): Promise<string | null> {
  for (let i = 0; i < rutas.length; i += RUTAS_POR_LLAMADA) {
    const { error } = await admin.storage.from(BUCKET_FOTOS).remove(rutas.slice(i, i + RUTAS_POR_LLAMADA));
    if (error) {
      console.error("[liga-fotos] No se pudieron borrar archivos del storage:", error.message);
      return "No se pudieron borrar algunos archivos del almacenamiento.";
    }
  }
  return null;
}
