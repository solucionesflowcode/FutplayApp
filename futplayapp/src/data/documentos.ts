import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export type Documento = {
    id: string;
    capsula_id: string;
    nombre: string;
    url_archivo: string;
    created_at: string;
};

export async function getDocumentosByCapsulaId(capsulaId: string): Promise<Documento[]> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from("documento")
        .select("*")
        .eq("capsula_id", capsulaId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching documentos:", error.message);
        return [];
    }

    return data ?? [];
}
