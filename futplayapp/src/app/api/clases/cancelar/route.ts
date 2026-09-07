import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseClaseFechaHora } from "@/lib/fechas";

export async function POST(request: Request) {
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

    const { inscripcionId, fechaHora } = await request.json();
    if (!inscripcionId || !fechaHora) {
        return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Use service_role key to bypass RLS for UPDATE and RPC
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
    );

    // Fetch inscription and check current state.
    // El servicio usa service_role (bypasa RLS), así que validamos SIEMPRE que
    // la inscripción pertenezca al usuario autenticado: si no, es "no encontrada".
    const { data: claseInfo } = await admin
        .from("clase_usuario")
        .select("clase_id, asistencia")
        .eq("id", inscripcionId)
        .eq("usuario_id", user.id)
        .maybeSingle();

    if (!claseInfo) {
        return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }

    const estadosTerminales = new Set(["cancelado", "cancelado_sin_reembolso", "presente", "ausente", "asistio", "no_asistio"]);
    if (estadosTerminales.has(claseInfo.asistencia)) {
        return NextResponse.json({ success: false, message: "Esta inscripción ya no puede cancelarse." });
    }

    let esPartido = false;
    if (claseInfo?.clase_id) {
        const { data: clase } = await admin
            .from("clase")
            .select("tipo_evento")
            .eq("id", claseInfo.clase_id)
            .maybeSingle();
        esPartido = clase?.tipo_evento === "partido";
    }

    const horas = (parseClaseFechaHora(fechaHora).getTime() - Date.now()) / (1000 * 60 * 60);

    // No se puede cancelar si la clase ya pasó
    if (horas < 0) {
        return NextResponse.json({ success: false, message: "La clase ya ha pasado." });
    }

    // No se puede cancelar si faltan menos de 1 hora (confirmación se cierra 1 hora antes)
    if (horas < 1) {
        return NextResponse.json({ success: false, message: "La confirmación/cancelación se cerró. Faltan menos de 1 hora para la clase." });
    }

    // Cancelación con 3+ horas: devuelve token
    if (horas >= 3) {
        const { error: updateError } = await admin
            .from("clase_usuario")
            .update({ asistencia: "cancelado" })
            .eq("id", inscripcionId);

        if (updateError) {
            console.error("Error cancelando clase:", updateError.message);
            return NextResponse.json({ success: false, message: "Error al cancelar la clase." });
        }

        // Partidos no descuentan token, así que no se devuelve
        if (esPartido) {
            return NextResponse.json({ success: true, message: "Partido cancelado." });
        }

        const { data: tokenOk, error: rpcError } = await admin.rpc("devolver_token", {
            p_usuario_id: user.id,
        });

        if (rpcError) {
            console.error("devolver_token RPC error:", rpcError.message);
            return NextResponse.json({ success: true, message: "Clase cancelada. No se pudo devolver el token." });
        }

        if (tokenOk) {
            return NextResponse.json({ success: true, message: "Clase cancelada. Te devolvimos el token." });
        }
        return NextResponse.json({ success: true, message: "Clase cancelada. No se pudo devolver el token." });
    }

    // Cancelación con menos de 3 horas (pero más de 1): no devuelve token
    const { error: updateError } = await admin
        .from("clase_usuario")
        .update({ asistencia: "cancelado_sin_reembolso" })
        .eq("id", inscripcionId);

    if (updateError) {
        console.error("Error cancelando clase:", updateError.message);
        return NextResponse.json({ success: false, message: "Error al cancelar la clase." });
    }

    return NextResponse.json({ success: true, message: esPartido ? "Partido cancelado." : "Clase cancelada. Como faltan menos de 3h, no se devuelve el token." });
}
