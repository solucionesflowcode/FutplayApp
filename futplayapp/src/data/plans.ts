import { createClient } from "@/utils/supabase/client";
import type { Student } from "@/components/admin/StudentsTable";
import { getAdminMembresias } from "@/data/membresia";

export type Plan = {
    id: string;
    nombre: string;
    precio: number;
    tokens_mensuales: number;
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
    tokens_mensuales: number;
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

export async function deletePlanAdmin(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/admin/planes?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json();
        return { success: false, error: body.error };
    }
    return { success: true };
}

type UsuarioRow = {
    id: string;
    nombre: string;
    rol: "jugador" | "profesor" | "administrador";
    rut: string | null;
    telefono: string | null;
};

function mapRol(rol: string): string {
    switch (rol) {
        case "jugador": return "Alumno";
        case "profesor": return "Profesor";
        case "administrador": return "Admin";
        default: return rol;
    }
}

function getStatus(membresia: { tokens_totales: number; tokens_usados: number } | undefined): string {
    if (!membresia) return "Inactivo";
    return membresia.tokens_totales > membresia.tokens_usados ? "Activo" : "Vencido";
}

export async function getUsers(): Promise<Student[]> {
    const supabase = createClient();

    const [usuariosResult, membresias] = await Promise.all([
        supabase.from("usuario").select("id, nombre, rol, rut, telefono").order("nombre"),
        getAdminMembresias(),
    ]);

    const { data: usuarios, error } = usuariosResult;

    if (error) {
        console.error("Error fetching users:", error.message);
        return [];
    }

    const membresiasByUser = new Map(membresias.map((m) => [m.usuario_id, m]));

    return ((usuarios as UsuarioRow[]) || []).map((user) => {
        const m = membresiasByUser.get(user.id);

        return {
            id: user.id,
            name: user.nombre,
            role: mapRol(user.rol),
            rut: user.rut || "",
            phone: user.telefono || "",
            plan: m?.plan_nombre || "Sin plan",
            tokens: m?.tokens_restantes || 0,
            status: getStatus(m),
        };
    });
}
