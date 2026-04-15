import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Función auxiliar para obtener y validar las variables de entorno de Supabase.
 * * @throws {Error} Si las variables de entorno no están configuradas.
 * @returns {{ supabaseUrl: string, supabaseAnonKey: string }} Las credenciales de Supabase.
 */
function getEnvironmentVariables() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }
    return { supabaseUrl, supabaseAnonKey };
}

/**
 * Crea un cliente de Supabase para ser utilizado en el lado del servidor de Next.js
 * (Server Components, Server Actions o Route Handlers).
 * * Configura automáticamente el manejo de cookies para mantener la sesión del usuario,
 * permitiendo a Supabase leer (getAll) y escribir (setAll) las cookies de autenticación.
 * * @returns {Promise<SupabaseClient>} Cliente de Supabase configurado para el servidor.
 */
export async function createSupabaseServerClient() {
    const { supabaseUrl, supabaseAnonKey } = getEnvironmentVariables();
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            // Le dice a Supabase cómo leer las cookies actuales
            getAll() {
                return cookieStore.getAll();
            },
            // Le dice a Supabase cómo guardar nuevas cookies (ej. al iniciar sesión)
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch (error) {
                    // Este error puede ocurrir si intentas configurar cookies desde 
                    // un Server Component en lugar de un Server Action o Route Handler.
                    console.log(error);
                }
            }
        }
    });
}