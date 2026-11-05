import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { calcularTabla, type LigaEquipoBase, type LigaPartido } from "@/lib/liga-tabla";

// GET /api/ligas[?id=<liga>] → vista de "Mi liga" (solo lectura, cualquier usuario con sesión).
// Las ligas en borrador no se muestran. Sin id, se elige la liga en curso donde
// el usuario juega; si no juega en ninguna, la primera en curso.
// Se usa service role porque los nombres y fotos de otros jugadores no son
// legibles por RLS; por eso solo se devuelven campos públicos (nunca email, RUT ni teléfono).
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() { } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const admin = await getAdminClient();
    const [{ data: ligas, error }, { data: misInscripciones }] = await Promise.all([
      admin.from("liga").select("id, nombre, temporada, estado, clasificados_playoff, created_at").neq("estado", "borrador").order("created_at", { ascending: false }),
      admin.from("liga_jugador").select("liga_id, equipo_id").eq("usuario_id", user.id),
    ]);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    const miEquipoPorLiga = new Map((misInscripciones || []).map((i) => [i.liga_id, i.equipo_id]));
    const lista = (ligas || []).map((l) => ({ ...l, inscrito: miEquipoPorLiga.has(l.id) }));

    const pedida = new URL(request.url).searchParams.get("id");
    const elegida =
      lista.find((l) => l.id === pedida) ??
      (pedida ? undefined : lista.find((l) => l.inscrito && l.estado === "en_curso") ?? lista.find((l) => l.estado === "en_curso") ?? lista[0]);

    if (pedida && !elegida) return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
    if (!elegida) return NextResponse.json({ ligas: lista, detalle: null });

    const [{ data: equipos }, { data: jugadores }, { data: partidos }] = await Promise.all([
      admin.from("liga_equipo").select("id, nombre, logo_url, sede:sede_id (nombre)").eq("liga_id", elegida.id).order("nombre"),
      admin.from("liga_jugador").select("equipo_id, numero, usuario:usuario_id (nombre, foto_url, posicion)").eq("liga_id", elegida.id),
      admin.from("liga_partido").select("id, liga_id, fase, jornada, llave, local_id, visita_id, fecha_hora, cancha, goles_local, goles_visita, penales_local, penales_visita, estado").eq("liga_id", elegida.id).order("jornada").order("fecha_hora"),
    ]);

    const plantel = (jugadores || []).map((j) => {
      const u = (j.usuario ?? {}) as { nombre?: string; foto_url?: string | null; posicion?: string | null };
      return { equipo_id: j.equipo_id, numero: j.numero, nombre: u.nombre ?? "Jugador", foto_url: u.foto_url ?? null, posicion: u.posicion ?? null };
    });

    return NextResponse.json({
      ligas: lista,
      detalle: {
        liga: elegida,
        equipos: equipos || [],
        jugadores: plantel,
        partidos: partidos || [],
        tabla: calcularTabla((equipos || []) as unknown as LigaEquipoBase[], (partidos || []) as LigaPartido[]),
        miEquipoId: miEquipoPorLiga.get(elegida.id) ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
