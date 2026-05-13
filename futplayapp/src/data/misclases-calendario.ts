import { createClient } from "@/utils/supabase/client";

export type ClaseInscripcionRow = {
    id: string;
    asistencia: string | boolean | null;
    clase: {
        id: string;
        titulo: string;
        descripcion: string | null;
        sede: { nombre: string } | null;
        horario: { fecha_hora: string }[] | { fecha_hora: string } | null;
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
        sede:sede_id ( nombre ),
        horario ( fecha_hora )
      )`,
        )
        .eq("usuario_id", userId);

    if (error) {
        console.error("Error fetching mis clases:", error.message);
        return [];
    }

    return (data ?? []) as unknown as ClaseInscripcionRow[];
}
