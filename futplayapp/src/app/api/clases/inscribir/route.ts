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

    const { claseId } = await request.json();
    if (!claseId) {
        return NextResponse.json({ error: "claseId es requerido" }, { status: 400 });
    }

    const { data: existing } = await supabase
        .from("clase_usuario")
        .select("id")
        .eq("clase_id", claseId)
        .eq("usuario_id", user.id)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: "Ya estás inscrito en esta clase" }, { status: 409 });
    }

    const { data, error } = await supabase
        .from("clase_usuario")
        .insert({ usuario_id: user.id, clase_id: claseId })
        .select("id")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ inscripcionId: data.id });
}
