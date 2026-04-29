import { createClient } from "@/utils/supabase/client";

export async function getProximaClase(userId: string): Promise<Array<{
    titulo: string;
    descripcion: string;
    fecha_hora: string;
    sede: string;
}>> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_proxima_clase", {
        p_usuario_id: userId,
    });

    if (error) {
        console.error("Error fetching proxima clase:", error.message);
        return [];
    }

    return (data ?? []) as Array<{
        titulo: string;
        descripcion: string;
        fecha_hora: string;
        sede: string;
    }>;
}
