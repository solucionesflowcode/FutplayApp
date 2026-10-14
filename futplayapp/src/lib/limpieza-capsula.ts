import { deleteVideo } from "@/lib/bunny";
import type { getAdminClient } from "@/utils/supabase/admin";

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

export const BUCKET_DOCUMENTOS = "modulos_documentos";

/** url_archivo puede ser el filePath o la URL completa (registros antiguos). */
export function rutaDocumento(url: string): string {
  return url.startsWith("http") ? url.split("/").pop() || url : url;
}

/**
 * CAP-05: borra los PDF del storage. Devuelve un aviso si falla (la fila ya se
 * borró: no se revierte, solo queda el archivo huérfano).
 */
export async function borrarArchivosDocumentos(admin: AdminClient, urls: string[]): Promise<string | null> {
  const rutas = urls.filter(Boolean).map(rutaDocumento);
  if (rutas.length === 0) return null;
  const { error } = await admin.storage.from(BUCKET_DOCUMENTOS).remove(rutas);
  if (error) {
    console.error("[capsulas] No se pudo borrar el PDF del storage:", error.message);
    return "No se pudo borrar el PDF del almacenamiento.";
  }
  return null;
}

/**
 * CAP-05: borra el video de Bunny si ninguna otra cápsula lo usa. Un 404 de
 * Bunny cuenta como borrado (el video ya no estaba).
 */
export async function borrarVideoSiNoSeUsa(
  admin: AdminClient,
  videoId: string | null | undefined,
  capsulaBorradaId: string,
): Promise<string | null> {
  if (!videoId) return null;
  const { count } = await admin
    .from("capsula")
    .select("*", { count: "exact", head: true })
    .eq("bunny_video_id", videoId)
    .neq("id", capsulaBorradaId);
  if (count && count > 0) return null;
  try {
    await deleteVideo(videoId);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) return null;
    console.error("[capsulas] No se pudo borrar el video de Bunny:", message);
    return "No se pudo borrar el video en Bunny: bórralo desde su panel.";
  }
}
