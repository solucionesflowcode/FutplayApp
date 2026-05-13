import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export type Rol = "jugador" | "profesor" | "administrador";

export interface Usuario {
    id: string;
    nombre: string;
    rol: Rol;
    email?: string;
}

export async function getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    const supabase = createClient();
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error: error?.message ?? null };
    } catch {
        return { user: null, error: "Error inesperado al obtener usuario" };
    }
}

export async function getUsuario(userId: string): Promise<Usuario | null> {
    const supabase = createClient();
    try {
        const { data, error } = await supabase
            .from("usuario")
            .select("id, nombre, rol")
            .eq("id", userId)
            .single();

        if (error) {
            console.error("Error al obtener usuario:", error.message);
            return null;
        }

        return data as Usuario;
    } catch {
        console.error("Error inesperado al obtener usuario");
        return null;
    }
}

export async function signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
    const supabase = createClient();
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/api/auth/callback`,
            },
        });
        return { error: error?.message ?? null };
    } catch {
        return { error: "Error al iniciar sesión con Google" };
    }
}

export async function buscarUsuarioPorTelefono(
    telefono: string
): Promise<{ id: string; nombre: string; rol: Rol } | null> {
    const supabase = createClient();

    const { data } = await supabase
        .from("usuario")
        .select("id, nombre, rol")
        .or(`telefono.eq.${telefono},telefono.eq.+${telefono}`)
        .maybeSingle();

    return data as { id: string; nombre: string; rol: Rol } | null;
}

export function onAuthStateChange(
    callback: (user: User | null) => void
): { unsubscribe: () => void } {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        callback(session?.user ?? null);
    });

    return { unsubscribe: () => subscription.unsubscribe() };
}
