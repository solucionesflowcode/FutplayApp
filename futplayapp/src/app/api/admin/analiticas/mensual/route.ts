import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";

type MesEntry = { ingresos: number; membresias: number; transacciones: number };

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );

  // Fetch both sources in parallel
  const [membresiasRes, boletasRes] = await Promise.all([
    adminClient.from("membresia").select("mes, plan_id").order("mes", { ascending: true }),
    adminClient.from("boleta").select("total, created_at").eq("estado", "pagado").order("created_at", { ascending: true }),
  ]);

  // --- Membresias: group by month with plan prices ---
  const membershipMap = new Map<string, MesEntry>();

  if (!membresiasRes.error) {
    const planIds = [...new Set((membresiasRes.data || []).map((m) => m.plan_id).filter(Boolean))];

    const { data: planes } = planIds.length > 0
      ? await adminClient.from("plan").select("id, precio").in("id", planIds)
      : { data: [] };

    const precioMap = new Map((planes || []).map((p) => [p.id, p.precio || 0]));

    for (const m of membresiasRes.data || []) {
      const mes = m.mes?.slice(0, 7);
      if (!mes) continue;
      const prev = membershipMap.get(mes) || { ingresos: 0, membresias: 0, transacciones: 0 };
      membershipMap.set(mes, {
        ingresos: prev.ingresos + (precioMap.get(m.plan_id) || 0),
        membresias: prev.membresias + 1,
        transacciones: prev.transacciones + 1,
      });
    }
  }

  // --- Boletas: add months not covered by membresias ---
  if (!boletasRes.error) {
    for (const b of boletasRes.data || []) {
      const mes = b.created_at?.slice(0, 7);
      if (!mes) continue;
      if (membershipMap.has(mes)) continue; // already covered by membresia
      const prev = membershipMap.get(mes) || { ingresos: 0, membresias: 0, transacciones: 0 };
      membershipMap.set(mes, {
        ingresos: prev.ingresos + (b.total || 0),
        membresias: prev.membresias,
        transacciones: prev.transacciones + 1,
      });
    }
  }

  const result = Array.from(membershipMap.entries())
    .map(([mes, data]) => ({ mes, ...data }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  return NextResponse.json(result);
}
