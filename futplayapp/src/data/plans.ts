import { createClient } from "@/utils/supabase/client";
import type { Student } from "@/components/admin/StudentsTable";
import { getAdminMembresias } from "@/data/membresia";

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
