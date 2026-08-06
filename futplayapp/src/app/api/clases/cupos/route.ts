import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type CupoRow = {
    clase_id: string;
    cupo_maximo: number | null;
    inscritos: number;
};

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
    );

    const { data: clases } = await admin.from("clase").select("id, cupo_maximo");
    const { data: inscripciones } = await admin
        .from("clase_usuario")
        .select("clase_id")
        .not("asistencia", "in", "('cancelado','cancelado_sin_reembolso')");

    const inscritosPorClase = new Map<string, number>();
    for (const ins of (inscripciones ?? [])) {
        inscritosPorClase.set(ins.clase_id, (inscritosPorClase.get(ins.clase_id) ?? 0) + 1);
    }

    const cupos: CupoRow[] = (clases ?? []).map((clase: { id: string; cupo_maximo: number | null }) => ({
        clase_id: clase.id,
        cupo_maximo: clase.cupo_maximo,
        inscritos: inscritosPorClase.get(clase.id) ?? 0,
    }));

    return NextResponse.json(cupos);
}
