import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

export async function verifyAdmin(): Promise<User | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede fallar en Server Components o route handlers
            // que no soportan escritura de cookies directa.
            // El proxy es el encargado de refrescar las cookies.
          }
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: usuario } = await supabase
    .from("usuario")
    .select("rol")
    .eq("id", user.id)
    .single();
  return usuario?.rol === "administrador" ? user : null;
}
