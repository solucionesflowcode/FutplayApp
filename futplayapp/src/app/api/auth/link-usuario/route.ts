import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** POST /api/auth/link-usuario
 *  Header: Authorization: Bearer <access_token de la sesión recién creada>
 *
 *  Vincula la fila de `usuario` con el usuario autenticado, buscándola por
 *  email con service role:
 *  - Si existe con otro id: actualiza el id al de auth.users.
 *  - Si no existe: crea una entrada nueva (rol jugador).
 *  Usa service role (no cookies) para evitar problemas de propagación de sesión
 *  con signInWithIdToken en cuentas Google Workspace.
 *
 *  El id y el email salen SIEMPRE del token verificado, nunca del body: antes
 *  la ruta no tenía autenticación y tomaba ambos del body, así que cualquiera
 *  podía reasignar filas de `usuario` con la service role.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!accessToken) {
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

  const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const id = user.id;
  const email = user.email;
  const nombreToken = (user.user_metadata?.full_name as string | undefined) || undefined;

  // 1. Intentar encontrar usuario por email
  const { data: existing } = await adminClient
    .from("usuario")
    .select("id, nombre, rol, email")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.id === id) {
      return NextResponse.json({ usuario: { id: existing.id, nombre: existing.nombre, rol: existing.rol } });
    }

    // Actualizar el id al valor actual de auth.users
    const { data: updated, error: updateError } = await adminClient
      .from("usuario")
      .update({ id })
      .eq("email", email)
      .select("id, nombre, rol")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ usuario: updated });
  }

  // 2. No existe por email — crear entrada nueva
  const nombre = nombreToken || email.split("@")[0] || "Usuario";
  const { data: created, error: createError } = await adminClient
    .from("usuario")
    .insert({ id, nombre, email, rol: "jugador" })
    .select("id, nombre, rol")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ usuario: created });
}
