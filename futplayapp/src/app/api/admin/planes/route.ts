import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";

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
    const admin = await getAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // membresia, boleta_item y recurrencia apuntan a plan sin cascada: la BD
    // rechaza el borrado de un plan en uso. Antes la pantalla lo quitaba igual
    // de la lista y volvía a aparecer al recargar.
    const [membresias, boletas, recurrencias] = await Promise.all(
      ["membresia", "boleta_item", "recurrencia"].map((tabla) =>
        admin.from(tabla).select("*", { count: "exact", head: true }).eq("plan_id", id)
      )
    );
    const nMembresias = membresias.count ?? 0;
    const nBoletas = boletas.count ?? 0;
    if (nMembresias + nBoletas + (recurrencias.count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: el plan tiene ${nMembresias} membresía(s) y ${nBoletas} compra(s) asociadas.`,
          membresias: nMembresias,
          boletas: nBoletas,
        },
        { status: 409 }
      );
    }

    const { error } = await admin.from("plan").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
