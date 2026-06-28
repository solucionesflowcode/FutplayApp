import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

    const horas = (new Date(fechaHora).getTime() - Date.now()) / (1000 * 60 * 60);

    if (horas < 0) {
        return NextResponse.json({ success: false, message: "La clase ya ha pasado." });
    }

    if (horas >= 3) {
        const { error: updateError } = await admin
            .from("clase_usuario")
            .update({ asistencia: "cancelado" })
            .eq("id", inscripcionId);

        if (updateError) {
            console.error("Error cancelando clase:", updateError.message);
            return NextResponse.json({ success: false, message: "Error al cancelar la clase." });
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

    const { error: updateError } = await admin
        .from("clase_usuario")
        .update({ asistencia: "cancelado_sin_reembolso" })
        .eq("id", inscripcionId);

    if (updateError) {
        console.error("Error cancelando clase:", updateError.message);
        return NextResponse.json({ success: false, message: "Error al cancelar la clase." });
    }

    return NextResponse.json({ success: true, message: "Clase cancelada. Como faltan menos de 3h, no se devuelve el token." });
}
