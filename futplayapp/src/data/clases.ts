import { createClient } from "@/utils/supabase/client";

export async function getProximaClase(userId: string): Promise<Array<{
    titulo: string;
    descripcion: string;
    fecha_hora: string;
    sede: string;
}>> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("clase_usuario")
        .select(`
            horario!inner (
                fecha_hora,
                clase!inner (
                    titulo,
                    descripcion,
                    sede!inner (nombre)
                )
            )
        `)
        .eq("usuario_id", userId)
        .in("asistencia", ["sin_confirmar", "pendiente", "confirmado_whatsapp"])
        .gte("horario.fecha_hora", new Date().toISOString())
        .order("horario.fecha_hora", { ascending: true })
        .limit(1);

    if (error || !data?.length) return [];

    const h = data[0].horario;
    return [{
        titulo: h.clase.titulo,
        descripcion: h.clase.descripcion,
        fecha_hora: h.fecha_hora,
        sede: h.clase.sede.nombre,
    }];
}
