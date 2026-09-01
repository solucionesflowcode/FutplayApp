import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { traducirError } from "@/lib/errores";

/** POST /api/auth/link-usuario
 *  Busca al usuario en la tabla `usuario` por su email usando service role.
 *  Recibe { email, id, nombre } desde el callback (ya autenticado).
 *  - Si encuentra el email: actualiza el id al valor actual de auth.users.
 *  - Si no lo encuentra: crea una entrada nueva.
 *  Usa service role directamente (no cookies) para evitar problemas de
 *  propagación de sesión con signInWithIdToken en cuentas Google Workspace.
 */
export async function POST(req: Request) {
  const { email, id, nombre: nombreBody } = await req.json();
  if (!email || !id) {
    return NextResponse.json({ error: "email e id requeridos" }, { status: 400 });
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
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    // Si el id ya coincide, devolver tal cual
    if (existing.id === id) {
      return NextResponse.json({ usuario: { id: existing.id, nombre: existing.nombre, rol: existing.rol } });
    }

    // Actualizar el id al nuevo valor de auth.users
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
  const nombre = nombreBody || email.split("@")[0] || "Usuario";
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
