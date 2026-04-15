import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseSchema = Record<string, never>;

// Variable global para almacenar el cliente y reutilizarlo (Singleton)
let client: SupabaseClient<SupabaseSchema> | null = null;

/**
 * Obtiene el cliente de Supabase para el lado del navegador (Client Components).
 * Utiliza un patrón Singleton: si el cliente ya existe, lo retorna; 
 * si no, crea una nueva instancia utilizando las variables de entorno.
 * * @throws {Error} Si las variables de entorno de Supabase no están definidas.
 * @returns {SupabaseClient<SupabaseSchema>} La instancia del cliente de Supabase.
 */
export function getSupabaseBrowserClient(): SupabaseClient<SupabaseSchema> {
    // Si ya existe una instancia del cliente, la reutilizamos
    if (client) {
        return client;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }

    // Creamos y guardamos el cliente para futuros usos
    client = createBrowserClient<SupabaseSchema>(supabaseUrl, supabaseAnonKey);
    return client;
}