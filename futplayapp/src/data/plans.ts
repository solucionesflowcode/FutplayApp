import { createClient } from "@/utils/supabase/client";
import { PLAN_COLUMNAS_PUBLICAS } from "@/lib/plan-columnas";
import type { Student } from "@/components/admin/StudentsTable";
import { getAdminMembresias } from "@/data/membresia";
import { PLANES_CON_LINK } from "@/lib/planes-link";

export { PLANES_CON_LINK, requiereLink } from "@/lib/planes-link";

export type Plan = {
    id: string;
    nombre: string;
    precio: number;
    tokens_mensuales: number;
    dias: number;
    dias_vigencia?: number;
    tipo_plan?: TipoPlan;
    codigo_acceso?: string | null;
    // false = desactivado por el admin: no se vende (los planes no se eliminan).
    activo?: boolean;
    // true = oculto por el admin: no sale en el catálogo, solo se compra con su link.
    oculto?: boolean;
};

export type TipoPlan = "normal" | "familiar" | "kids" | "liga";

// tipo_plan NULL cuenta como plan normal (NOT IN descartaría los NULL).
const FILTRO_CATALOGO = `tipo_plan.is.null,tipo_plan.not.in.(${PLANES_CON_LINK.join(",")})`;

export async function getPlanes(): Promise<Plan[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("plan")
        .select(PLAN_COLUMNAS_PUBLICAS)
        .or(FILTRO_CATALOGO)
        // Planes desactivados por el admin no se venden (los planes no se eliminan).
        .eq("activo", true)
        // Ocultos por el admin: solo se compran con su link.
        .eq("oculto", false)
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
        .select(PLAN_COLUMNAS_PUBLICAS)
        .or(FILTRO_CATALOGO)
        // Planes desactivados por el admin no se venden (los planes no se eliminan).
        .eq("activo", true)
        .eq("oculto", false)
        .order("precio", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error fetching planes:", error.message);
        return [];
    }

    return data as Plan[];
}

export async function getPlanesAdmin(): Promise<{ planes: Plan[]; error?: string }> {
    const res = await fetch("/api/admin/planes");
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Error de conexión" }));
        return { planes: [], error: body.error || `Error ${res.status}` };
    }
    return { planes: await res.json() };
}

export async function createPlanAdmin(data: {
    nombre: string;
    precio: number;
    tokens_mensuales?: number;
    dias?: number;
    tipo_plan?: TipoPlan;
}): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/admin/planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json();
        return { success: false, error: body.error };
    }
    return { success: true };
}

export async function updatePlanAdmin(data: {
    id: string;
    nombre?: string;
    precio?: number;
    tokens_mensuales?: number;
    dias?: number;
    tipo_plan?: TipoPlan;
}): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/admin/planes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json();
        return { success: false, error: body.error };
    }
    return { success: true };
}

/**
 * Desactiva (o reactiva) un plan: deja de aparecer en el catálogo y no se puede
 * comprar, pero sus membresías y compras quedan intactas. Los planes no se eliminan.
 */
export async function setPlanActivo(id: string, activo: boolean): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/admin/planes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activo }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || "No se pudo cambiar el estado del plan" };
    }
    return { success: true };
}

/**
 * Oculta (o vuelve a mostrar) un plan en el catálogo: oculto solo se compra con
 * su link de acceso, como los familiares. Las membresías vigentes no cambian.
 */
export async function setPlanOculto(id: string, oculto: boolean): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/admin/planes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, oculto }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || "No se pudo cambiar la visibilidad del plan" };
    }
    return { success: true };
}

type UsuarioRow = {
    id: string;
    nombre: string;
    rol: "jugador" | "profesor" | "administrador";
    rut: string | null;
    telefono: string | null;
    email: string | null;
    sede_id?: string | null;
    sede?: { nombre: string } | { nombre: string }[] | null;
};

function mapRol(rol: string): string {
    switch (rol) {
        case "jugador": return "Alumno";
        case "profesor": return "Profesor";
        case "administrador": return "Admin";
        default: return rol;
    }
}

// tokens_restantes ya viene en 0 si la membresía está vencida, agotada o
// congelada. Antes se miraban los tokens crudos y un alumno congelado figuraba
// "Activo" con 0 tokens.
export function getStatus(membresia: { tokens_restantes: number; congelada?: boolean } | undefined): string {
    if (!membresia) return "Inactivo";
    if (membresia.congelada) return "Congelado";
    return membresia.tokens_restantes > 0 ? "Activo" : "Vencido";
}

export async function getUsers(): Promise<Student[]> {
    const supabase = createClient();

    const [usuariosResult, membresias] = await Promise.all([
        supabase.from("usuario").select("id, nombre, rol, rut, telefono, email, sede_id, sede:sede_id(nombre)").order("nombre"),
        getAdminMembresias(),
    ]);

    const { data: usuarios, error } = usuariosResult;

    if (error) {
        console.error("Error fetching users:", error.message);
        throw new Error("No se pudieron cargar los usuarios");
    }

    const membresiasByUser = new Map(membresias.map((m) => [m.usuario_id, m]));

    return ((usuarios as UsuarioRow[]) || []).map((user) => {
        const m = membresiasByUser.get(user.id);
        const sede = Array.isArray(user.sede) ? user.sede[0] : user.sede;

        return {
            id: user.id,
            name: user.nombre,
            role: mapRol(user.rol),
            rut: user.rut || "",
            phone: user.telefono || "",
            email: user.email || "",
            plan: m?.plan_nombre || "Sin plan",
            tokens: m?.tokens_restantes || 0,
            status: getStatus(m),
            sedeId: user.sede_id ?? null,
            sede: sede?.nombre ?? null,
        };
    });
}
