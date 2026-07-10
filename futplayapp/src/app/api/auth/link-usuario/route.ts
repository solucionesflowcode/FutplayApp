import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/** POST /api/auth/link-usuario
 *  Busca al usuario autenticado en la tabla `usuario` por su email
 *  (en lugar de por id). Si lo encuentra, actualiza el id al valor actual
 *  de auth.users y retorna los datos del usuario.
 *  Si no lo encuentra, crea una entrada nueva.
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  );

  // 1. Intentar encontrar usuario por email
  const { data: existing } = await adminClient
    .from("usuario")
    .select("id, nombre, rol, email")
    .eq("email", user.email)
    .maybeSingle();

  if (existing) {
    // Si el id ya coincide, devolver tal cual
    if (existing.id === user.id) {
      return NextResponse.json({ usuario: { id: existing.id, nombre: existing.nombre, rol: existing.rol } });
    }

    // Actualizar el id al nuevo valor de auth.users
    const { data: updated, error: updateError } = await adminClient
      .from("usuario")
      .update({ id: user.id })
      .eq("email", user.email)
      .select("id, nombre, rol")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ usuario: updated });
  }

  // 2. No existe por email — crear entrada nueva
  const nombre = user.user_metadata?.full_name || user.email.split("@")[0] || "Usuario";
  const { data: created, error: createError } = await adminClient
    .from("usuario")
    .insert({
      id: user.id,
      nombre,
      email: user.email,
      rol: "jugador",
    })
    .select("id, nombre, rol")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ usuario: created });
}
