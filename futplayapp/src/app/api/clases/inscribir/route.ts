import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function consumirToken(supabase: any, userId: string): Promise<boolean> {
    const { data: membresia } = await supabase
        .from("membresia")
        .select("id, tokens_usados")
        .eq("usuario_id", userId)
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!membresia) return false;

    const { error } = await supabase
        .from("membresia")
        .update({ tokens_usados: membresia.tokens_usados + 1 })
        .eq("id", membresia.id);

    return !error;
}

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

    const { claseId } = await request.json();
    if (!claseId) {
        return NextResponse.json({ error: "claseId es requerido" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
    );

    // Check if user already has a cancelled record for this class (re-inscription)
    const { data: existing } = await supabase
        .from("clase_usuario")
        .select("id, asistencia")
        .eq("usuario_id", user.id)
        .eq("clase_id", claseId)
        .maybeSingle();

    if (existing && (existing.asistencia === "cancelado" || existing.asistencia === "cancelado_sin_reembolso")) {
        // Re-inscription: validate membresía manually (trigger won't fire on UPDATE)
        const now = new Date();
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        const { data: membresia } = await supabase
            .from("membresia")
            .select("tokens_totales, tokens_usados")
            .eq("usuario_id", user.id)
            .gte("mes", startOfMonth)
            .order("mes", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!membresia) {
            return NextResponse.json({ error: "No tienes membresía activa este mes" }, { status: 400 });
        }

        const tokensDisponibles = membresia.tokens_totales - membresia.tokens_usados;
        if (tokensDisponibles <= 0) {
            return NextResponse.json({ error: "No tienes tokens disponibles" }, { status: 400 });
        }

        const { error: updateError } = await admin
            .from("clase_usuario")
            .update({ asistencia: "sin_confirmar" })
            .eq("id", existing.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        await consumirToken(admin, user.id);

        return NextResponse.json({ inscripcionId: existing.id });
    }

    // First-time inscription: INSERT (trigger validates + deducts token)
    const { data, error } = await supabase
        .from("clase_usuario")
        .insert({ usuario_id: user.id, clase_id: claseId })
        .select("id")
        .single();

    if (error) {
        if (error.code === "23505") {
            return NextResponse.json({ error: "Ya estás inscrito en esta clase" }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inscripcionId: data.id });
}
