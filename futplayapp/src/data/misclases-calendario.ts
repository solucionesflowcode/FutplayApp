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
            `id, asistencia, horario:horario_id (
        fecha_hora,
        clase:clase_id (
          id,
          titulo,
          descripcion,
          sede:sede_id ( nombre )
        )
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
        clase: item.horario?.clase
            ? {
                  ...item.horario.clase,
                  horario: { fecha_hora: item.horario.fecha_hora },
              }
            : null,
    })) as ClaseInscripcionRow[];
}
