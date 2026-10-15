import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { PLANES_CON_LINK, type TipoPlanLink } from "@/lib/planes-link";

export const dynamic = "force-dynamic";

const TIPOS_PLAN = ["normal", "familiar", "kids", "liga"] as const;
type TipoPlan = (typeof TIPOS_PLAN)[number];

// Antes el tipo no se podía elegir desde el panel (los planes familiar y kids
// se crearon por SQL) y "tokens > 0" impedía guardar un plan Liga, que es un
// pago único sin tokens.
function validarTipoYTokens(tipo: unknown, tokens: unknown): string | null {
  if (!TIPOS_PLAN.includes(tipo as TipoPlan)) {
    return `tipo_plan inválido: debe ser ${TIPOS_PLAN.join(", ")}`;
  }
  const n = Number(tokens);
  if (!Number.isInteger(n) || n < 0) return "tokens_mensuales debe ser un entero mayor o igual a 0";
  if (tipo !== "liga" && n < 1) return "El plan debe tener al menos 1 token (solo el plan Liga no tiene tokens)";
  return null;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
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
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.nombre || !body.precio) {
      return NextResponse.json({ error: "Faltan campos: nombre, precio" }, { status: 400 });
    }

    if (body.dias !== undefined && (!Number.isInteger(Number(body.dias)) || Number(body.dias) <= 0)) {
      return NextResponse.json({ error: "dias debe ser un entero positivo" }, { status: 400 });
    }

    const tipo_plan: TipoPlan = body.tipo_plan ?? "normal";
    const tokens_mensuales = tipo_plan === "liga" ? 0 : (body.tokens_mensuales ?? 1);
    const errorTipo = validarTipoYTokens(tipo_plan, tokens_mensuales);
    if (errorTipo) return NextResponse.json({ error: errorTipo }, { status: 400 });

    const { error } = await admin.from("plan").insert({
      nombre: body.nombre,
      precio: body.precio,
      tokens_mensuales,
      tipo_plan,
      dias: body.dias !== undefined ? Number(body.dias) : 30,
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
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: any = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.precio !== undefined) updateData.precio = body.precio;
    if (body.tokens_mensuales !== undefined || body.tipo_plan !== undefined) {
      // El tipo o los tokens que no vengan se toman del plan actual.
      const { data: actual } = await admin.from("plan").select("tipo_plan, tokens_mensuales").eq("id", body.id).maybeSingle();
      if (!actual) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
      const tipo = body.tipo_plan ?? actual.tipo_plan ?? "normal";
      const tokens = tipo === "liga" ? 0 : (body.tokens_mensuales ?? actual.tokens_mensuales);
      const errorTipo = validarTipoYTokens(tipo, tokens);
      if (errorTipo) return NextResponse.json({ error: errorTipo }, { status: 400 });
      updateData.tipo_plan = tipo;
      updateData.tokens_mensuales = tokens;
    }
    if (body.dias !== undefined) {
      if (!Number.isInteger(Number(body.dias)) || Number(body.dias) <= 0) {
        return NextResponse.json({ error: "dias debe ser un entero positivo" }, { status: 400 });
      }
      updateData.dias = Number(body.dias);
    }
    // Desactivar/reactivar: los planes no se eliminan (las membresías y boletas los referencian).
    if (body.activo !== undefined) {
      if (typeof body.activo !== "boolean") return NextResponse.json({ error: "activo debe ser true o false" }, { status: 400 });
      updateData.activo = body.activo;
    }
    // Ocultar/mostrar en el catálogo. Familiar y Liga siempre están ocultos.
    if (body.oculto !== undefined) {
      if (typeof body.oculto !== "boolean") return NextResponse.json({ error: "oculto debe ser true o false" }, { status: 400 });
      const { data: actual } = await admin.from("plan").select("tipo_plan").eq("id", body.id).maybeSingle();
      if (!actual) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
      const tipo = (updateData.tipo_plan ?? actual.tipo_plan) as TipoPlanLink;
      if (PLANES_CON_LINK.includes(tipo)) {
        return NextResponse.json({ error: "Los planes familiares y liga siempre están ocultos: se compran solo con su link." }, { status: 400 });
      }
      updateData.oculto = body.oculto;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const { error } = await admin.from("plan").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Los planes no se eliminan, solo se desactivan (PUT { activo: false }): sus
// membresías, compras y links quedan intactos y el plan deja de venderse.
export async function DELETE() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  return NextResponse.json(
    { error: "Los planes no se eliminan: desactívalo para que deje de venderse." },
    { status: 405, headers: { Allow: "GET, POST, PUT" } }
  );
}
