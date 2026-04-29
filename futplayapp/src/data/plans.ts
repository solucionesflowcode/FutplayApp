import { createClient } from "@/utils/supabase/client";

export type Plan = {
    id: string;
    nombre: string;
    tokens_mensuales: number;
    precio: number;
};

export async function getPlanes(): Promise<Plan[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("plan")
        .select("*")
        .order("precio", { ascending: true });

    if (error) {
        console.error("Error fetching planes:", error.message);
        return [];
    }

    return data as Plan[];
}

export async function getPlanesLimit(limit: number): Promise<Plan[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("plan")
        .select("*")
        .order("precio", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error fetching planes:", error.message);
        return [];
    }

    return data as Plan[];
}

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
