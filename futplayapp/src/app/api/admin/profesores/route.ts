import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: usuario } = await supabase.from("usuario").select("rol").eq("id", user.id).single();
  return usuario?.rol === "administrador" ? user : null;
}

export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "profesores";

  try {
    const admin = getAdminClient();

    if (tipo === "dropdown") {
      const { data } = await admin
        .from("usuario")
        .select("id, nombre")
        .eq("rol", "profesor")
        .order("nombre");
      return NextResponse.json(data || []);
    }

    const { data: profesores, error } = await admin
      .from("usuario")
      .select("id, nombre, email, telefono, especialidad, foto_url, created_at")
      .eq("rol", "profesor")
      .order("nombre");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const profesorIds = (profesores || []).map((p) => p.id);

    const [{ data: clases }, { data: capsulas }] = await Promise.all([
      admin.from("clase").select("id, titulo, profesor_id").in("profesor_id", profesorIds),
      admin.from("capsula").select("id, titulo, profesor_id").in("profesor_id", profesorIds),
    ]);

    const clasesPorProfesor = new Map<string, { id: string; titulo: string }[]>();
    (clases || []).forEach((c) => {
      if (c.profesor_id) {
        const list = clasesPorProfesor.get(c.profesor_id) || [];
        list.push({ id: c.id, titulo: c.titulo });
        clasesPorProfesor.set(c.profesor_id, list);
      }
    });

    const capsulasPorProfesor = new Map<string, { id: string; titulo: string }[]>();
    (capsulas || []).forEach((c) => {
      if (c.profesor_id) {
        const list = capsulasPorProfesor.get(c.profesor_id) || [];
        list.push({ id: c.id, titulo: c.titulo });
        capsulasPorProfesor.set(c.profesor_id, list);
      }
    });

    return NextResponse.json((profesores || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email || "",
      telefono: p.telefono || "",
      especialidad: p.especialidad || "",
      foto_url: p.foto_url || "",
      created_at: p.created_at,
      total_clases: clasesPorProfesor.get(p.id)?.length || 0,
      clases: clasesPorProfesor.get(p.id) || [],
      total_capsulas: capsulasPorProfesor.get(p.id)?.length || 0,
      capsulas: capsulasPorProfesor.get(p.id) || [],
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const body = await request.json();

    if (!body.email || !body.nombre) {
      return NextResponse.json({ error: "Faltan campos: email, nombre" }, { status: 400 });
    }

    const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: body.email,
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

    const { error: usuarioError } = await admin.from("usuario").insert({
      id: userId,
      nombre: body.nombre,
      email: body.email,
      rol: "profesor",
      telefono: body.telefono || null,
      especialidad: body.especialidad || null,
      foto_url: body.foto_url || null,
    });

    if (usuarioError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Error al crear profesor: ${usuarioError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: userId,
      nombre: body.nombre,
      email: body.email,
      tempPassword,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: any = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.telefono !== undefined) updateData.telefono = body.telefono;
    if (body.especialidad !== undefined) updateData.especialidad = body.especialidad;
    if (body.foto_url !== undefined) updateData.foto_url = body.foto_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { error } = await admin.from("usuario").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const [{ count: claseCount }, { count: capsulaCount }] = await Promise.all([
      admin.from("clase").select("*", { count: "exact", head: true }).eq("profesor_id", id),
      admin.from("capsula").select("*", { count: "exact", head: true }).eq("profesor_id", id),
    ]);

    const total = (claseCount || 0) + (capsulaCount || 0);
    if (total > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: el profesor tiene ${claseCount || 0} clase(s) y ${capsulaCount || 0} cápsula(s) asociadas. Desasigna primero.`,
          clases_asociadas: claseCount || 0,
          capsulas_asociadas: capsulaCount || 0,
        },
        { status: 409 }
      );
    }

    await admin.auth.admin.deleteUser(id);

    const { error } = await admin.from("usuario").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
