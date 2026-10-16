import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { traducirError } from "@/lib/errores";
import { tieneBoleta } from "@/lib/analiticas";
import { membresiasActuales, tokensRestantes } from "@/lib/membresia-actual";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // ?conBoleta=1 (analíticas): solo las membresías con boleta.
  const conBoleta = params.get("conBoleta") === "1";
  const todas = params.get("todas") === "1";
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

  if (!usuario || (usuario.rol !== "administrador" && usuario.rol !== "profesor")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Cópiala desde Supabase Dashboard → Settings → API → service_role key" },
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

  const { data: membresias, error } = await adminClient
    .from("membresia")
    .select("*")
    .order("usuario_id");

  if (error) {
    return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
  }

  const lista = conBoleta ? (membresias || []).filter(tieneBoleta) : membresias || [];
  const planIds = [...new Set(lista.map((m) => m.plan_id))];
  const usuarioIds = [...new Set(lista.map((m) => m.usuario_id))];

  const [{ data: planes }, { data: usuarios }] = await Promise.all([
    adminClient.from("plan").select("*").in("id", planIds),
    // Sede principal del alumno: las analíticas filtran por sede.
    adminClient.from("usuario").select("id, sede_id").in("id", usuarioIds),
  ]);

  const planesMap = new Map((planes || []).map((p) => [p.id, p]));
  const sedesMap = new Map((usuarios || []).map((u) => [u.id, u.sede_id as string | null]));

  type MembresiaRow = {
    membresia_id: string;
    usuario_id: string;
    plan_id: string;
    plan_nombre: string;
    tokens_mensuales: number;
    precio: number;
    dias?: number | null;
    tokens_totales: number;
    tokens_usados: number;
    tokens_restantes: number;
    fecha_inicio: string;
    fecha_vencimiento: string;
    estado: boolean;
    congelada: boolean;
    sin_tokens: boolean;
    sede_id: string | null;
  };
  const ahora = new Date();
  const fila = (m: (typeof lista)[number]): MembresiaRow => {
    const plan = planesMap.get(m.plan_id);
    return {
      membresia_id: m.id,
      usuario_id: m.usuario_id,
      plan_id: m.plan_id,
      plan_nombre: plan?.nombre || "Sin plan",
      tokens_mensuales: plan?.tokens_mensuales || 0,
      precio: plan?.precio || 0,
      dias: plan?.dias,
      tokens_totales: m.tokens_totales,
      tokens_usados: m.tokens_usados,
      // 0 si la membresía está vencida, congelada o sin tokens.
      tokens_restantes: tokensRestantes(m, ahora),
      fecha_inicio: m.fecha_inicio,
      fecha_vencimiento: m.fecha_vencimiento,
      estado: m.estado === true,
      congelada: m.congelada === true,
      sin_tokens: m.sin_tokens === true,
      sede_id: sedesMap.get(m.usuario_id) ?? null,
    };
  };

  // ?todas=1 (analíticas): todas las filas; las ventas cuentan cada membresía
  // y la pantalla elige la actual de cada alumno con la misma regla.
  if (todas) return NextResponse.json(lista.map(fila));

  // Una por alumno: la actual (regla única en src/lib/membresia-actual.ts).
  return NextResponse.json(Array.from(membresiasActuales(lista, ahora).values()).map(fila));
}
