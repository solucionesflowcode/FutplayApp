import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { tieneBoleta } from "@/lib/analiticas";
import { filtroSede } from "@/lib/sedes";
import { mesChile } from "@/lib/fechas";

type MesEntry = { ingresos: number; membresias: number; transacciones: number };

export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // ?sede=<id> o ?sede=sin: solo usuarios con esa sede principal (o sin sede).
  const sede = new URL(request.url).searchParams.get("sede");

  const adminClient = await getAdminClient();

  // Solo membresías: una boleta pagada sin membresía (p. ej. pagos de prueba
  // en Flow) no cuenta. Antes se sumaban las boletas de los meses sin
  // membresías, y con el filtro por sede esas pruebas aparecían como ingresos.
  const [membresiasRes, usuariosRes] = await Promise.all([
    adminClient.from("membresia").select("usuario_id, fecha_inicio, plan_id, boleta_id, numero_boleta").order("fecha_inicio", { ascending: true }),
    sede ? adminClient.from("usuario").select("id, sede_id") : Promise.resolve({ data: [] as { id: string; sede_id: string | null }[] }),
  ]);

  // La pantalla muestra "No se pudieron cargar los ingresos" en vez de $0.
  if (membresiasRes.error) return NextResponse.json({ error: membresiasRes.error.message }, { status: 500 });

  const deLaSede = filtroSede(sede, usuariosRes.data || []);
  // Solo cuentan las membresías con boleta (Flow o N° de boleta externa).
  const membresias = (membresiasRes.data || []).filter((m) => tieneBoleta(m) && deLaSede(m.usuario_id));

  // --- Membresias: group by month with plan prices ---
  const membershipMap = new Map<string, MesEntry>();

  const planIds = [...new Set(membresias.map((m) => m.plan_id).filter(Boolean))];

  const { data: planes } = planIds.length > 0
    ? await adminClient.from("plan").select("id, precio").in("id", planIds)
    : { data: [] };

  const precioMap = new Map((planes || []).map((p) => [p.id, p.precio || 0]));

  for (const m of membresias) {
    const mes = m.fecha_inicio ? mesChile(m.fecha_inicio) : null;
    if (!mes) continue;
    const prev = membershipMap.get(mes) || { ingresos: 0, membresias: 0, transacciones: 0 };
    membershipMap.set(mes, {
      ingresos: prev.ingresos + (precioMap.get(m.plan_id) || 0),
      membresias: prev.membresias + 1,
      transacciones: prev.transacciones + 1,
    });
  }

  const result = Array.from(membershipMap.entries())
    .map(([mes, data]) => ({ mes, ...data }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  return NextResponse.json(result);
}
