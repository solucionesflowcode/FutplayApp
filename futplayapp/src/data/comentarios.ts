import { createClient } from "@/utils/supabase/client";

export type Comentario = {
    id: string;
    capsula_id: string;
    usuario_id: string;
    contenido: string;
    created_at: string;
    usuario?: { nombre: string };
};

export async function getComentariosByCapsulaId(capsulaId: string): Promise<Comentario[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comentario")
        .select("*, usuario!inner(nombre)")
        .eq("capsula_id", capsulaId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching comentarios:", error.message);
        return [];
    }

    return data ?? [];
}

export async function createComentario(
    capsulaId: string,
    usuarioId: string,
    contenido: string,
): Promise<Comentario | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("comentario")
        .insert({
            capsula_id: capsulaId,
            usuario_id: usuarioId,
            contenido,
        })
        .select("*, usuario!inner(nombre)")
        .single();

    if (error) {
        console.error("Error creating comentario:", error.message);
        return null;
    }

    return data;
}
