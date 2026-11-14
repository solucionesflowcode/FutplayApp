import { createClient } from "@/utils/supabase/client";

export type CupoClase = {
    clase_id: string;
    cupo_maximo: number | null;
    inscritos: number;
};

export type ClaseConInscripcion = {
    id: string;
    titulo: string;
    descripcion: string | null;
    fecha_hora: string | null;
    sede: { nombre: string } | null;
    inscripcionId: string | null;
    asistencia: string | boolean | null;
    tipo_evento: "entrenamiento" | "partido";
    cupo_maximo: number | null;
    inscritos: number;
};

export async function getCuposClases(): Promise<Record<string, CupoClase>> {
    try {
        const res = await fetch("/api/clases/cupos", { cache: "no-store" });
        if (!res.ok) return {};
        const data = (await res.json()) as CupoClase[];
        return Object.fromEntries(data.map((c) => [c.clase_id, c]));
    } catch {
        return {};
    }
}

export async function getAllClasesConInscripcion(
    userId: string,
): Promise<ClaseConInscripcion[]> {
    const supabase = createClient();

    const { data: clases, error: errorClases } = await supabase
        .from("clase")
        .select("id, titulo, descripcion, fecha_hora, tipo_evento, sede:sede_id (nombre)")
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

    const cupos = await getCuposClases();

    type ClaseRaw = { id: string; titulo: string; descripcion: string | null; fecha_hora: string | null; sede: { nombre: string }[] | { nombre: string } | null; tipo_evento: "entrenamiento" | "partido" };
    return (clases ?? []).map((clase: ClaseRaw) => {
        const ins = inscMap.get(clase.id);
        const cupo = cupos[clase.id];
        return {
            id: clase.id,
            titulo: clase.titulo,
            descripcion: clase.descripcion,
            fecha_hora: clase.fecha_hora,
            sede: (Array.isArray(clase.sede) ? (clase.sede[0] ?? null) : clase.sede) as { nombre: string } | null,
            inscripcionId: ins?.id ?? null,
            asistencia: ins?.asistencia ?? null,
            tipo_evento: clase.tipo_evento,
            cupo_maximo: cupo?.cupo_maximo ?? null,
            inscritos: cupo?.inscritos ?? 0,
        };
    });
}
