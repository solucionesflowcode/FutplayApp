import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { FASES_PLAYOFF, type LigaFase } from "@/lib/liga-tabla";

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

const ESTADOS = ["programado", "jugado", "suspendido"];

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

/** Goles o penales: vacío → null; negativo o no entero → "invalido". */
function marcador(valor: unknown): number | null | "invalido" {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : "invalido";
}

async function equiposDeLiga(admin: AdminClient, ligaId: string, ids: string[]) {
  const { data } = await admin.from("liga_equipo").select("id").eq("liga_id", ligaId).in("id", ids);
  return (data || []).length === new Set(ids).size;
}

// Partidos de la fase regular. Los de playoffs los crea /api/admin/ligas/playoffs.
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.liga_id || !body.local_id || !body.visita_id) {
      return NextResponse.json({ error: "Faltan campos: liga_id, local_id, visita_id" }, { status: 400 });
    }
    if (body.local_id === body.visita_id) return NextResponse.json({ error: "Un equipo no puede jugar contra sí mismo" }, { status: 400 });
    const jornada = Number(body.jornada);
    if (!Number.isInteger(jornada) || jornada < 1) return NextResponse.json({ error: "La fecha (jornada) debe ser un número mayor a 0" }, { status: 400 });

    const admin = await getAdminClient();
    if (!(await equiposDeLiga(admin, body.liga_id, [body.local_id, body.visita_id]))) {
      return NextResponse.json({ error: "Los equipos deben pertenecer a esta liga" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("liga_partido")
      .insert({
        liga_id: body.liga_id,
        fase: "regular",
        jornada,
        local_id: body.local_id,
        visita_id: body.visita_id,
        fecha_hora: body.fecha_hora || null,
        cancha: typeof body.cancha === "string" && body.cancha.trim() ? body.cancha.trim() : null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return error500(err);
  }
}

// Edita datos del partido y/o carga el resultado.
export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { data: actual } = await admin.from("liga_partido").select("*").eq("id", body.id).maybeSingle();
    if (!actual) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    const esPlayoff = FASES_PLAYOFF.includes(actual.fase as LigaFase);

    const datos: Record<string, unknown> = {};
    if (body.fecha_hora !== undefined) datos.fecha_hora = body.fecha_hora || null;
    if (body.cancha !== undefined) datos.cancha = typeof body.cancha === "string" && body.cancha.trim() ? body.cancha.trim() : null;

    // Equipos y jornada solo en la fase regular: en playoffs los define el cuadro.
    if (!esPlayoff) {
      if (body.jornada !== undefined) {
        const jornada = Number(body.jornada);
        if (!Number.isInteger(jornada) || jornada < 1) return NextResponse.json({ error: "La fecha (jornada) debe ser un número mayor a 0" }, { status: 400 });
        datos.jornada = jornada;
      }
      const local = body.local_id ?? actual.local_id;
      const visita = body.visita_id ?? actual.visita_id;
      if (body.local_id !== undefined || body.visita_id !== undefined) {
        if (local === visita) return NextResponse.json({ error: "Un equipo no puede jugar contra sí mismo" }, { status: 400 });
        if (!(await equiposDeLiga(admin, actual.liga_id, [local, visita]))) {
          return NextResponse.json({ error: "Los equipos deben pertenecer a esta liga" }, { status: 400 });
        }
        datos.local_id = local;
        datos.visita_id = visita;
      }
    }

    const tocaResultado = ["estado", "goles_local", "goles_visita", "penales_local", "penales_visita"].some((k) => body[k] !== undefined);
    if (tocaResultado) {
      const estado = body.estado ?? actual.estado;
      if (!ESTADOS.includes(estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

      // Un resultado de playoffs ya usado para armar la ronda siguiente no se cambia.
      if (esPlayoff) {
        const siguiente = actual.fase === "cuartos" ? "semifinal" : actual.fase === "semifinal" ? "final" : null;
        if (siguiente) {
          const { count } = await admin
            .from("liga_partido")
            .select("*", { count: "exact", head: true })
            .eq("liga_id", actual.liga_id)
            .eq("fase", siguiente);
          if (count) {
            return NextResponse.json(
              { error: "La ronda siguiente ya está generada. Reinicia los playoffs para corregir este resultado." },
              { status: 409 }
            );
          }
        }
      }

      if (estado !== "jugado") {
        // Programado o suspendido: sin marcador.
        Object.assign(datos, { estado, goles_local: null, goles_visita: null, penales_local: null, penales_visita: null });
      } else {
        const gl = marcador(body.goles_local ?? actual.goles_local);
        const gv = marcador(body.goles_visita ?? actual.goles_visita);
        if (gl === "invalido" || gv === "invalido" || gl === null || gv === null) {
          return NextResponse.json({ error: "Ingresa los goles de ambos equipos (0 a 99)" }, { status: 400 });
        }
        let pl: number | null = null;
        let pv: number | null = null;
        if (esPlayoff && gl === gv) {
          const a = marcador(body.penales_local);
          const b = marcador(body.penales_visita);
          if (a === "invalido" || b === "invalido" || a === null || b === null || a === b) {
            return NextResponse.json({ error: "En playoffs un empate se define por penales: ingresa un marcador de penales con ganador" }, { status: 400 });
          }
          pl = a;
          pv = b;
        }
        Object.assign(datos, { estado, goles_local: gl, goles_visita: gv, penales_local: pl, penales_visita: pv });
      }
    }

    if (Object.keys(datos).length === 0) return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });

    const { error } = await admin.from("liga_partido").update(datos).eq("id", body.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}

// Solo partidos de la fase regular; los de playoffs se borran al reiniciar el cuadro.
export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const admin = await getAdminClient();
    const { data: actual } = await admin.from("liga_partido").select("fase").eq("id", id).maybeSingle();
    if (!actual) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    if (actual.fase !== "regular") {
      return NextResponse.json({ error: "Los partidos de playoffs se eliminan reiniciando los playoffs" }, { status: 400 });
    }

    const { error } = await admin.from("liga_partido").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}
