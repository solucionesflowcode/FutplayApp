import { createClient } from "@/utils/supabase/client";

type PlanRow = {
    id: string;
    nombre: string;
    tokens_mensuales: number;
    precio: number;
};

type MembresiaRow = {
    id: string;
    usuario_id: string;
    plan_id: string;
    tokens_totales: number;
    tokens_usados: number;
    mes: string;
};

export type MembresiaConPlan = {
    membresia_id: string;
    usuario_id: string;
    plan_id: string;
    plan_nombre: string;
    tokens_mensuales: number;
    precio: number;
    tokens_totales: number;
    tokens_usados: number;
    tokens_restantes: number;
    mes: string;
};

export async function userHasMembresia(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("membresia")
        .select("id")
        .eq("usuario_id", userId);

    if (error) {
        console.error("Error fetching membresia:", error.message);
        return false;
    }

    return (data?.length ?? 0) > 0;
}

async function getPlanById(planId: string): Promise<PlanRow | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("plan")
        .select("*")
        .eq("id", planId)
        .single();

    if (error) {
        console.error("Error fetching plan:", error.message);
        return null;
    }

    return data as PlanRow;
}

function buildMembresiaConPlan(m: MembresiaRow, plan: PlanRow | null): MembresiaConPlan {
    const restantes = m.tokens_totales - m.tokens_usados;
    return {
        membresia_id: m.id,
        usuario_id: m.usuario_id,
        plan_id: m.plan_id,
        plan_nombre: plan?.nombre || "Sin plan",
        tokens_mensuales: plan?.tokens_mensuales || 0,
        precio: plan?.precio || 0,
        tokens_totales: m.tokens_totales,
        tokens_usados: m.tokens_usados,
        tokens_restantes: restantes,
        mes: m.mes,
    };
}

export async function getMembresiaByUser(userId: string): Promise<MembresiaConPlan | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("membresia")
        .select("*")
        .eq("usuario_id", userId)
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Error fetching membresia:", error.message);
        return null;
    }

    if (!data) return null;

    const plan = await getPlanById(data.plan_id);
    return buildMembresiaConPlan(data as MembresiaRow, plan);
}

export async function getAllMembresiasConPlan(): Promise<MembresiaConPlan[]> {
    const supabase = createClient();

    const { data: membresias, error } = await supabase
        .from("membresia")
        .select("*")
        .order("usuario_id");

    if (error) {
        console.error("Error fetching all membresias:", error.message);
        return [];
    }

    if (membresias.length === 0) {
        return [];
    }

    const planIds = [...new Set((membresias || []).map((m) => m.plan_id))];

    const { data: planes } = await supabase
        .from("plan")
        .select("*")
        .in("id", planIds);

    const planesMap = new Map((planes || []).map((p) => [p.id, p as PlanRow]));

    const resultMap = new Map<string, MembresiaConPlan>();

    for (const item of membresias || []) {
        const m = item as MembresiaRow;
        const existing = resultMap.get(m.usuario_id);
        const restantes = m.tokens_totales - m.tokens_usados;

        if (!existing || restantes > existing.tokens_restantes) {
            const plan = planesMap.get(m.plan_id) || null;
            resultMap.set(m.usuario_id, buildMembresiaConPlan(m, plan));
        }
    }

    return Array.from(resultMap.values());
}

export async function getAdminMembresias(): Promise<MembresiaConPlan[]> {
    try {
        const res = await fetch("/api/admin/membresias");
        if (!res.ok) {
            const body = await res.json();
            console.error("Error fetching admin membresias:", body.error);
            return [];
        }
        return await res.json();
    } catch (err) {
        console.error("Error calling admin membresias API:", err);
        return [];
    }
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
