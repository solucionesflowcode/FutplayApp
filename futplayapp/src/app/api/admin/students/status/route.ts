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
  const { userId, status } = body;

  if (!userId || !status) {
    return NextResponse.json(
      { error: "Faltan campos requeridos: userId, status" },
      { status: 400 }
    );
  }

  if (!["Activo", "Inactivo", "Vencido"].includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
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

  const { data: membresias } = await adminClient
    .from("membresia")
    .select("*")
    .eq("usuario_id", userId);

  const sorted = (membresias || []).sort(
    (a, b) =>
      (b.tokens_totales - b.tokens_usados) -
      (a.tokens_totales - a.tokens_usados)
  );
  const current = sorted.length > 0 ? sorted[0] : null;

  if (status === "Activo") {
    if (current) {
      const { error } = await adminClient
        .from("membresia")
        .update({ tokens_usados: 0 })
        .eq("id", current.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { data: planes } = await adminClient
        .from("plan")
        .select("*")
        .order("precio", { ascending: true })
        .limit(1);

      const plan = planes?.[0];
      if (!plan) {
        return NextResponse.json(
          { error: "No hay planes disponibles para asignar" },
          { status: 400 }
        );
      }

      const now = new Date();
      const mes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { error } = await adminClient.from("membresia").insert({
        usuario_id: userId,
        plan_id: plan.id,
        tokens_totales: plan.tokens_mensuales,
        tokens_usados: 0,
        estado: true,
        mes,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else if (status === "Vencido") {
    if (current) {
      const { error } = await adminClient
        .from("membresia")
        .update({ tokens_usados: current.tokens_totales })
        .eq("id", current.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else if (status === "Inactivo") {
    if (sorted.length > 0) {
      const { error } = await adminClient
        .from("membresia")
        .delete()
        .eq("usuario_id", userId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true, status });
}
