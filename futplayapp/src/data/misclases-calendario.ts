import { createClient } from "@/utils/supabase/client";

export type ClaseConInscripcion = {
    id: string;
    titulo: string;
    descripcion: string | null;
    fecha_hora: string | null;
    sede: { nombre: string } | null;
    inscripcionId: string | null;
    asistencia: string | boolean | null;
};

export async function getAllClasesConInscripcion(
    userId: string,
): Promise<ClaseConInscripcion[]> {
    const supabase = createClient();

    const { data: clases, error: errorClases } = await supabase
        .from("clase")
        .select("id, titulo, descripcion, fecha_hora, sede:sede_id (nombre)")
        .order("fecha_hora", { ascending: false });

    if (errorClases) {
        console.error("Error fetching clases:", errorClases.message);
        return [];
    }

    const { data: inscripciones } = await supabase
        .from("clase_usuario")
        .select("id, asistencia, clase_id")
        .eq("usuario_id", userId);

    const inscMap = new Map<string, { id: string; asistencia: string | boolean | null }>();
    for (const ins of (inscripciones ?? [])) {
        inscMap.set(ins.clase_id, { id: ins.id, asistencia: ins.asistencia });
    }

    return (clases ?? []).map((clase: any) => {
        const ins = inscMap.get(clase.id);
        return {
            id: clase.id,
            titulo: clase.titulo,
            descripcion: clase.descripcion,
            fecha_hora: clase.fecha_hora,
            sede: (clase.sede as { nombre: string } | null) ?? null,
            inscripcionId: ins?.id ?? null,
            asistencia: ins?.asistencia ?? null,
        };
    });
}
