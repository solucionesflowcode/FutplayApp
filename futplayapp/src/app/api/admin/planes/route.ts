import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("plan")
      .select("*")
      .order("precio", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
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

    if (!body.nombre || !body.precio) {
      return NextResponse.json({ error: "Faltan campos: nombre, precio" }, { status: 400 });
    }

    const { error } = await admin.from("plan").insert({
      nombre: body.nombre,
      precio: body.precio,
      tokens_mensuales: body.tokens_mensuales || 1,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
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
    if (body.precio !== undefined) updateData.precio = body.precio;
    if (body.tokens_mensuales !== undefined) updateData.tokens_mensuales = body.tokens_mensuales;

    const { error } = await admin.from("plan").update(updateData).eq("id", body.id);
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

    const { error } = await admin.from("plan").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
