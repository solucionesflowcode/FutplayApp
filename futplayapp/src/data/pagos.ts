import { createClient } from "@/utils/supabase/client";

export type PagosBoletaItem = {
    id: string;
    plan_id: string | null;
    plan_nombre: string | null;
    cantidad: number;
    precio: number;
    total: number;
};

export type PagosBoleta = {
    id: string;
    usuario_id: string;
    estado: string;
    total: number;
    created_at: string;
    transaccion_id: string | null;
    items: PagosBoletaItem[];
};

export type PagosMembresia = {
    id: string;
    usuario_id: string;
    plan_id: string;
    plan_nombre: string;
    tokens_totales: number;
    tokens_usados: number;
    tokens_restantes: number;
    mes: string;
    created_at: string;
    precio: number;
    tokens_mensuales: number;
};

export async function getMisBoletas(userId: string): Promise<PagosBoleta[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("boleta")
        .select("*, boleta_item(*, plan(nombre))")
        .eq("usuario_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching boletas:", error.message);
        return [];
    }

    return (data || []).map((b) => ({
        id: b.id,
        usuario_id: b.usuario_id,
        estado: b.estado,
        total: b.total,
        created_at: b.created_at,
        transaccion_id: b.transaccion_id,
        items: (b.boleta_item || []).map((item) => ({
            id: item.id,
            plan_id: item.plan_id,
            plan_nombre: item.plan?.nombre || null,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.total,
        })),
    }));
}

export async function getMiMembresia(userId: string): Promise<PagosMembresia | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("membresia")
        .select("*, plan(nombre, tokens_mensuales, precio)")
        .eq("usuario_id", userId)
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    return {
        id: data.id,
        usuario_id: data.usuario_id,
        plan_id: data.plan_id,
        plan_nombre: data.plan?.nombre || "Sin plan",
        tokens_totales: data.tokens_totales,
        tokens_usados: data.tokens_usados,
        tokens_restantes: data.tokens_totales - data.tokens_usados,
        mes: data.mes,
        created_at: data.created_at,
        precio: data.plan?.precio || 0,
        tokens_mensuales: data.plan?.tokens_mensuales || 0,
    };
}
