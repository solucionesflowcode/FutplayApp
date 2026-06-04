import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}


export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "modulos";

  try {
    const admin = getAdminClient();

    if (tipo === "categorias") {
      const { data } = await admin.from("categoria").select("*").order("nombre");
      return NextResponse.json(data || []);
    }

    const { data: modulos, error } = await admin
      .from("modulo")
      .select("id, nombre, descripcion, categoria_id")
      .order("nombre");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const categoriaIds = [...new Set((modulos || []).map((m) => m.categoria_id).filter(Boolean))];

    const { data: categorias } = categoriaIds.length > 0
      ? await admin.from("categoria").select("id, nombre").in("id", categoriaIds)
      : { data: [] };

    const catMap = new Map((categorias || []).map((c) => [c.id, c.nombre]));

    const { data: capsulas } = await admin
      .from("capsula")
      .select("modulo_id");

    const capsulasPorModulo = new Map<string, number>();
    (capsulas || []).forEach((c) => {
      if (c.modulo_id) {
        capsulasPorModulo.set(c.modulo_id, (capsulasPorModulo.get(c.modulo_id) || 0) + 1);
      }
    });

    return NextResponse.json((modulos || []).map((m) => ({
      ...m,
      categoria_nombre: catMap.get(m.categoria_id) || "—",
      total_capsulas: capsulasPorModulo.get(m.id) || 0,
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

    if (!body.nombre) {
      return NextResponse.json({ error: "El nombre del módulo es obligatorio" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("modulo")
      .insert({
        nombre: body.nombre,
        descripcion: body.descripcion || "",
        categoria_id: body.categoria_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
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
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion;
    if (body.categoria_id !== undefined) updateData.categoria_id = body.categoria_id;

    const { error } = await admin.from("modulo").update(updateData).eq("id", body.id);
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

    const { count } = await admin
      .from("capsula")
      .select("*", { count: "exact", head: true })
      .eq("modulo_id", id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: el módulo tiene ${count} cápsula${count > 1 ? "s" : ""} asociada${count > 1 ? "s" : ""}` },
        { status: 409 }
      );
    }

    const { error } = await admin.from("modulo").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
