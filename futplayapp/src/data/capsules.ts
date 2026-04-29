import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export type Capsula = {
    id: string;
    titulo: string;
    imagen: string;
    coach: string;
    categoria: string;
    duracion: string;
};

export async function getCapsulas(): Promise<Capsula[]> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: capsulas, error: capsulasError } = await supabase
        .from("capsula")
        .select("id, titulo, imagen, creado, duracion, modulo_id")
        .order("order_index");

    if (capsulasError) {
        console.error("Error fetching capsulas:", capsulasError.message);
        return [];
    }

    const moduloIds = capsulas
        .map((c: any) => c.modulo_id)
        .filter(Boolean);

    const { data: modulos, error: modulosError } = moduloIds.length > 0
        ? await supabase
            .from("modulo")
            .select("id, categoria_id")
            .in("id", moduloIds)
        : { data: [], error: null };

    if (modulosError) {
        console.error("Error fetching modulos:", modulosError.message);
    }

    const categoriaIds = modulos
        ?.map((m: any) => m.categoria_id)
        .filter(Boolean) ?? [];

    const { data: categorias, error: categoriasError } = categoriaIds.length > 0
        ? await supabase
            .from("categoria")
            .select("id, nombre")
            .in("id", categoriaIds)
        : { data: [], error: null };

    if (categoriasError) {
        console.error("Error fetching categorias:", categoriasError.message);
    }

    const moduloMap = new Map<string, string>();
    for (const mod of modulos ?? []) {
        const cat = categorias?.find((c: any) => c.id === mod.categoria_id);
        moduloMap.set(mod.id, cat?.nombre ?? "");
    }

    return capsulas.map((item: any) => ({
        id: item.id,
        titulo: item.titulo,
        imagen: item.imagen || "",
        coach: item.creado || "",
        categoria: item.modulo_id ? moduloMap.get(item.modulo_id) ?? "" : "",
        duracion: formatDuration(item.duracion),
    }));
}

function formatDuration(interval: string | null): string {
    if (!interval) return "0 min";
    const match = interval.match(/(\d+):(\d+):(\d+)/);
    if (!match) return "0 min";
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
}
