import { createClient } from "@/utils/supabase/client";

export async function userHasMembresia(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("membresia")
        .select("*")
        .eq("usuario_id", userId);

    if (error) {
        console.error("Error fetching membresia:", error.message);
        return false;
    }

    return data.length > 0;
}

export async function createMembresia(
    userId: string,
    planId: string,
    tokensMensuales: number
): Promise<boolean> {
    const supabase = createClient();

    const now = new Date();
    const mes = now.toISOString().split("T")[0];

    const { error } = await supabase
        .from("membresia")
        .insert({
            usuario_id: userId,
            plan_id: planId,
            mes,
            tokens_totales: tokensMensuales,
            tokens_usados: 0,
        });

    if (error) {
        console.error("Error creating membresia:", error.message);
        return false;
    }

    return true;
}

export async function devolverToken(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data: membresia } = await supabase
        .from("membresia")
        .select("id, tokens_usados")
        .eq("usuario_id", userId)
        .gt("tokens_usados", 0)
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!membresia) return false;

    const { error } = await supabase
        .from("membresia")
        .update({ tokens_usados: membresia.tokens_usados - 1 })
        .eq("id", membresia.id);

    return !error;
}
