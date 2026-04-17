import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Crea un cliente de Supabase para uso en el navegador.
 * Utiliza createBrowserClient de @supabase/ssr para manejar
 * cookies y sesiones correctamente en Next.js.
 * 
 * @returns {SupabaseClient} Cliente de Supabase configurado
 * 
 * @example
 * // En un componente de cliente
 * import { createClient } from "@/utils/supabase/client";
 * const supabase = createClient();
 * 
 * // Luego puedes usar los métodos de Supabase
 * const { data } = await supabase.from("usuario").select("*");
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
