import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { ahoraChile } from "@/lib/fechas";
import { traducirError } from "@/lib/errores";


export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

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

  const adminClient = await getAdminClient();

  const tempPassword = crypto.randomUUID().slice(0, 10) + "Aa1!";

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: traducirError(authError?.message) },
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
      { error: traducirError(usuarioError.message) },
      { status: 500 }
    );
  }

  let membresia = null;
  if (plan_id) {
    const { data: plan } = await adminClient
      .from("plan")
      .select("id, tokens_mensuales, dias_vigencia")
      .eq("id", plan_id)
      .single();

    if (plan) {
      const fecha_inicio = ahoraChile().toISOString();
      const diasVigencia = plan.dias_vigencia ?? 30;
      const fecha_vencimiento = new Date(new Date(fecha_inicio).getTime() + diasVigencia * 24 * 60 * 60 * 1000).toISOString();

      const { data: memData, error: memError } = await adminClient
        .from("membresia")
        .insert({
          usuario_id: userId,
          plan_id: plan.id,
          tokens_totales: plan.tokens_mensuales,
          tokens_usados: 0,
          estado: true,
          fecha_inicio,
          fecha_vencimiento,
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

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.rut !== undefined) updateData.rut = body.rut;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { error } = await admin.from("usuario").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // 1) Eliminar registros en tablas hijas
    await admin.from("membresia").delete().eq("usuario_id", id);
    await admin.from("boleta").delete().eq("usuario_id", id);
    await admin.from("clase_usuario").delete().eq("usuario_id", id);
    await admin.from("ficha_medica").delete().eq("usuario_id", id);
    await admin.from("horario").delete().eq("usuario_id", id);

    // 2) Eliminar de usuario
    const { error: usuarioError } = await admin.from("usuario").delete().eq("id", id);
    if (usuarioError) return NextResponse.json({ error: traducirError(usuarioError.message) }, { status: 500 });

    // 3) Eliminar de auth.users
    await admin.auth.admin.deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
