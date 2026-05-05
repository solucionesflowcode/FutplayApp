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
