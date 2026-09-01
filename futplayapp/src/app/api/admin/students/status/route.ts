import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { ahoraChile } from "@/lib/fechas";
import { traducirError } from "@/lib/errores";

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) {
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

  const adminClient = await getAdminClient();

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
        return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
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

      const fecha_inicio = ahoraChile().toISOString();
      const diasVigencia = plan.dias_vigencia ?? 30;
      const fecha_vencimiento = new Date(new Date(fecha_inicio).getTime() + diasVigencia * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await adminClient.from("membresia").insert({
        usuario_id: userId,
        plan_id: plan.id,
        tokens_totales: plan.tokens_mensuales,
        tokens_usados: 0,
        estado: true,
        fecha_inicio,
        fecha_vencimiento,
      });

      if (error) {
        return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
      }
    }
  } else if (status === "Vencido") {
    if (current) {
      const { error } = await adminClient
        .from("membresia")
        .update({ tokens_usados: current.tokens_totales, estado: false })
        .eq("id", current.id);

      if (error) {
        return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
      }
    }
  } else if (status === "Inactivo") {
    if (sorted.length > 0) {
      const { error } = await adminClient
        .from("membresia")
        .delete()
        .eq("usuario_id", userId);

      if (error) {
        return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true, status });
}
