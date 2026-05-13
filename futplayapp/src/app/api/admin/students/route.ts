import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuario")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!usuario || usuario.rol !== "administrador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { email, nombre, rol, rut, telefono, plan_id } = body;

  if (!email || !nombre || !rol) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: email, nombre, rol" },
      { status: 400 }
    );
  }

  if (!["jugador", "profesor"].includes(rol)) {
    return NextResponse.json(
      { error: "Rol inválido. Debe ser jugador o profesor" },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local" },
      { status: 500 }
    );
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );

  const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: `Error al crear usuario de auth: ${authError?.message}` },
      { status: 500 }
    );
  }

  const userId = authData.user.id;

  const { error: usuarioError } = await adminClient
    .from("usuario")
    .insert({
      id: userId,
      nombre,
      email,
      rol,
      rut: rut || null,
      telefono: telefono || null,
    });

  if (usuarioError) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: `Error al crear usuario: ${usuarioError.message}` },
      { status: 500 }
    );
  }

  let membresia = null;
  if (plan_id) {
    const { data: plan } = await adminClient
      .from("plan")
      .select("id, tokens_mensuales")
      .eq("id", plan_id)
      .single();

    if (plan) {
      const now = new Date();
      const mes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: memData, error: memError } = await adminClient
        .from("membresia")
        .insert({
          usuario_id: userId,
          plan_id: plan.id,
          tokens_totales: plan.tokens_mensuales,
          tokens_usados: 0,
          estado: true,
          mes,
        })
        .select()
        .single();

      if (!memError) {
        membresia = memData;
      }
    }
  }

  return NextResponse.json({
    user: {
      id: userId,
      email,
      nombre,
      rol,
      rut,
      telefono,
    },
    membresia,
    tempPassword,
  });
}
