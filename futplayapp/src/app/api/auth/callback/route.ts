import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Route handler para callbacks de autenticación OAuth (Google).
 * Recibe el código de autorización desde Google, lo intercambia por una sesión
 * y redirige al usuario a la página de perfil.
 * 
 * Flujo:
 * 1. Google redirige aquí con ?code=...
 * 2. Se intercambia el código por una sesión de Supabase
 * 3. Se guardan las cookies de sesión
 * 4. Se redirige a /perfil
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/perfil";

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
