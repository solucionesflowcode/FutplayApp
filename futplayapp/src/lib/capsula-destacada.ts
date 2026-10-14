import { getAdminClient } from "@/utils/supabase/admin";

/**
 * Cápsula destacada del E-learning: columna capsula.destacada (como mucho una
 * en true, índice único parcial capsula_una_destacada).
 *
 * Antes se guardaba en .data/capsula-destacada.json: en Vercel el sistema de
 * archivos es de solo lectura y efímero, así que marcarla fallaba ("Error al
 * guardar") y los alumnos nunca veían una destacada.
 */
export async function getCapsulaDestacadaId(): Promise<string | null> {
  try {
    const admin = await getAdminClient();
    const { data, error } = await admin.from("capsula").select("id").eq("destacada", true).limit(1).maybeSingle();
    if (error) {
      console.error("[capsula-destacada] No se pudo leer:", error.message);
      return null;
    }
    return (data?.id as string | undefined) ?? null;
  } catch (err) {
    console.error("[capsula-destacada] No se pudo leer:", err);
    return null;
  }
}

/** null quita la destacada. Devuelve false si falla o la cápsula no existe. */
export async function setCapsulaDestacadaId(capsulaId: string | null): Promise<boolean> {
  try {
    const admin = await getAdminClient();
    // Primero se quita la actual: el índice único no permite dos en true.
    const { error: errorQuitar } = await admin.from("capsula").update({ destacada: false }).eq("destacada", true);
    if (errorQuitar) {
      console.error("[capsula-destacada] No se pudo quitar la actual:", errorQuitar.message);
      return false;
    }
    if (!capsulaId) return true;

    const { data, error } = await admin.from("capsula").update({ destacada: true }).eq("id", capsulaId).select("id").maybeSingle();
    if (error || !data) {
      console.error("[capsula-destacada] No se pudo marcar:", error?.message ?? "cápsula no encontrada");
      return false;
    }
    return true;
  } catch (err) {
    console.error("[capsula-destacada] No se pudo guardar:", err);
    return false;
  }
}
