import { createClient } from "@/utils/supabase/client";
import { ahoraChile, membresiaActiva } from "@/lib/fechas";

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
    boleta_id?: string;
    tokens_totales: number;
    tokens_usados: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    estado: boolean;
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
    fecha_inicio: string;
    fecha_vencimiento: string;
};

export async function userHasMembresia(userId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("membresia")
        .select("id")
        .eq("usuario_id", userId)
        .eq("estado", true);

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
        fecha_inicio: m.fecha_inicio,
        fecha_vencimiento: m.fecha_vencimiento,
    };
}

export async function getMembresiaByUser(userId: string): Promise<MembresiaConPlan | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("membresia")
        .select("*")
        .eq("usuario_id", userId)

        .order("fecha_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Error fetching membresia:", error.message);
        return null;
    }

    if (!data) return null;

    const membresia = data as MembresiaRow;

    if (membresia.estado && !membresiaActiva(membresia.fecha_vencimiento)) {
        await supabase
            .from("membresia")
            .update({ estado: false })
            .eq("id", membresia.id);
        membresia.estado = false;
    }

    const plan = await getPlanById(membresia.plan_id);
    return buildMembresiaConPlan(membresia, plan);
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
    tokensMensuales: number,
    boletaId?: string,
    diasVigencia = 30
): Promise<boolean> {
    const supabase = createClient();

    const fecha_inicio = ahoraChile().toISOString();
    const fecha_vencimiento = new Date(new Date(fecha_inicio).getTime() + diasVigencia * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
        .from("membresia")
        .insert({
            usuario_id: userId,
            plan_id: planId,
            boleta_id: boletaId,
            fecha_inicio,
            fecha_vencimiento,
            tokens_totales: tokensMensuales,
            tokens_usados: 0,
            estado: true,
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

        .order("fecha_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!membresia || membresia.tokens_usados <= 0) return false;

    const { error } = await supabase
        .from("membresia")
        .update({ tokens_usados: membresia.tokens_usados - 1 })
        .eq("id", membresia.id);

    return !error;
}

export type MembresiaGestion = {
    id: string;
    usuario_id: string;
    usuario_nombre: string;
    plan_id: string;
    plan_nombre: string;
    boleta_id: string | null;
    tokens_totales: number;
    tokens_usados: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    estado: boolean;
    created_at: string | null;
};

export type MembresiaGestionInput = {
    usuario_id: string;
    plan_id: string;
    boleta_id?: string | null;
    tokens_totales?: number;
    tokens_usados?: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    estado?: boolean;
};

export async function getMembresiasGestion(): Promise<MembresiaGestion[]> {
    const res = await fetch("/api/admin/membresias/gestion");
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error de conexión" }));
        console.error("Error fetching membresias gestion:", body.error);
        return [];
    }
    return await res.json();
}

export async function createMembresiaGestion(data: MembresiaGestionInput): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/admin/membresias/gestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error de conexión" }));
        return { success: false, error: body.error };
    }
    return { success: true };
}

export async function updateMembresiaGestion(data: { id: string } & Partial<MembresiaGestionInput>): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/admin/membresias/gestion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error de conexión" }));
        return { success: false, error: body.error };
    }
    return { success: true };
}

export async function deleteMembresiaGestion(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/admin/membresias/gestion?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error de conexión" }));
        return { success: false, error: body.error };
    }
    return { success: true };
}
