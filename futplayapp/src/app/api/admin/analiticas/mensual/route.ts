import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { tieneBoleta } from "@/lib/analiticas";
import { filtroSede } from "@/lib/sedes";

type MesEntry = { ingresos: number; membresias: number; transacciones: number };

export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // ?sede=<id> o ?sede=sin: solo usuarios con esa sede principal (o sin sede).
  const sede = new URL(request.url).searchParams.get("sede");

  const adminClient = await getAdminClient();

  // Fetch both sources in parallel
  const [membresiasRes, boletasRes, usuariosRes] = await Promise.all([
    adminClient.from("membresia").select("usuario_id, fecha_inicio, plan_id, boleta_id, numero_boleta").order("fecha_inicio", { ascending: true }),
    adminClient.from("boleta").select("usuario_id, total, created_at").eq("estado", "pagado").order("created_at", { ascending: true }),
    sede ? adminClient.from("usuario").select("id, sede_id") : Promise.resolve({ data: [] as { id: string; sede_id: string | null }[] }),
  ]);

  const deLaSede = filtroSede(sede, usuariosRes.data || []);
  // Solo cuentan las membresías con boleta (Flow o N° de boleta externa).
  const membresias = (membresiasRes.data || []).filter((m) => tieneBoleta(m) && deLaSede(m.usuario_id));
  const boletas = (boletasRes.data || []).filter((b) => deLaSede(b.usuario_id));

  // --- Membresias: group by month with plan prices ---
  const membershipMap = new Map<string, MesEntry>();

  if (!membresiasRes.error) {
    const planIds = [...new Set(membresias.map((m) => m.plan_id).filter(Boolean))];

    const { data: planes } = planIds.length > 0
      ? await adminClient.from("plan").select("id, precio").in("id", planIds)
      : { data: [] };

    const precioMap = new Map((planes || []).map((p) => [p.id, p.precio || 0]));

    for (const m of membresias) {
      const mes = m.fecha_inicio?.slice(0, 7);
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
    for (const b of boletas) {
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
