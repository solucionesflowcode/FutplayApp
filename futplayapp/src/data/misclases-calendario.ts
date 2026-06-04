import { createClient } from "@/utils/supabase/client";

export type ClaseInscripcionRow = {
    id: string;
    asistencia: string | boolean | null;
    clase: {
        id: string;
        titulo: string;
        descripcion: string | null;
        fecha_hora: string | null;
        sede: { nombre: string } | null;
    } | null;
};

export async function getMisClasesInscripciones(
    userId: string,
): Promise<ClaseInscripcionRow[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("clase_usuario")
        .select(
            `id, asistencia, clase:clase_id (
          id,
          titulo,
          descripcion,
          fecha_hora,
          sede:sede_id ( nombre )
        )`,
        )
        .eq("usuario_id", userId);

    if (error) {
        console.error("Error fetching mis clases:", error.message);
        return [];
    }

    return (data ?? []).map((item: any) => ({
        id: item.id,
        asistencia: item.asistencia,
        clase: item.clase ?? null,
    })) as ClaseInscripcionRow[];
}
