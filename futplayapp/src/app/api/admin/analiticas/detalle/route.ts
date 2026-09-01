import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";

export async function GET(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes");

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ error: "Parámetro 'mes' requerido (YYYY-MM)" }, { status: 400 });
  }

  const adminClient = await getAdminClient();

  const { data: membresias, error } = await adminClient
    .from("membresia")
    .select("id, usuario_id, plan_id, fecha_inicio")
    .gte("fecha_inicio", `${mes}-01T00:00:00.000Z`)
    .lt("fecha_inicio", new Date(new Date(`${mes}-01T00:00:00.000Z`).getTime() + 32 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7) + "-01T00:00:00.000Z")
    .order("fecha_inicio", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!membresias || membresias.length === 0) {
    return NextResponse.json({
      mes,
      totalIngresos: 0,
      membresiasCount: 0,
      planes: [],
      detalle: [],
    });
  }

  // Get plans
  const planIds = [...new Set(membresias.map((m) => m.plan_id).filter(Boolean))];
  const { data: planes } = planIds.length > 0
    ? await adminClient.from("plan").select("id, nombre, precio").in("id", planIds)
    : { data: [] };
  const planesMap = new Map((planes || []).map((p) => [p.id, p]));

  // Get user names
  const userIds = [...new Set(membresias.map((m) => m.usuario_id).filter(Boolean))];
  const { data: usuarios } = userIds.length > 0
    ? await adminClient.from("usuario").select("id, nombre").in("id", userIds)
    : { data: [] };
  const usuariosMap = new Map((usuarios || []).map((u) => [u.id, u.nombre]));

  // Build response
  const planCount = new Map<string, { id: string; nombre: string; precio: number; count: number }>();
  const detalle: { usuario_nombre: string; plan_nombre: string; precio: number }[] = [];

  for (const m of membresias) {
    const plan = planesMap.get(m.plan_id);
    const planNombre = plan?.nombre || "Sin plan";
    const precio = plan?.precio || 0;
    const usuarioNombre = usuariosMap.get(m.usuario_id) || "Desconocido";

    detalle.push({ usuario_nombre: usuarioNombre, plan_nombre: planNombre, precio });

    const prev = planCount.get(m.plan_id) || { id: m.plan_id, nombre: planNombre, precio, count: 0 };
    planCount.set(m.plan_id, { ...prev, count: prev.count + 1 });
  }

  const totalIngresos = detalle.reduce((sum, d) => sum + d.precio, 0);

  return NextResponse.json({
    mes,
    totalIngresos,
    membresiasCount: membresias.length,
    planes: Array.from(planCount.values()).map((p) => ({
      ...p,
      subtotal: p.precio * p.count,
    })),
    detalle,
  });
}
