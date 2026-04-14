import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseSchema = Record<string, never>;

let client: SupabaseClient<SupabaseSchema> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<SupabaseSchema> {
    if (client) {
        return client
    }


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Falta NEXT_PIBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY"
        );
    }

    client = createBrowserClient<SupabaseSchema>(supabaseUrl, supabaseAnonKey)
    return client;
}