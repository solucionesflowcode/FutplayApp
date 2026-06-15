import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";

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

  // Actual payments from boleta
  const { data: boletas, error: boletasError } = await adminClient
    .from("boleta")
    .select("total, created_at")
    .eq("estado", "pagado")
    .order("created_at", { ascending: true });

  if (boletasError) {
    return NextResponse.json({ error: boletasError.message }, { status: 500 });
  }

  // Group by month
  const monthlyMap = new Map<string, { ingresos: number; transacciones: number }>();

  for (const b of boletas || []) {
    const mes = b.created_at?.slice(0, 7);
    if (!mes) continue;
    const prev = monthlyMap.get(mes) || { ingresos: 0, transacciones: 0 };
    monthlyMap.set(mes, {
      ingresos: prev.ingresos + (b.total || 0),
      transacciones: prev.transacciones + 1,
    });
  }

  const result = Array.from(monthlyMap.entries())
    .map(([mes, data]) => ({ mes, ...data }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  return NextResponse.json(result);
}
