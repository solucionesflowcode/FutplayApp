import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: usuario, error } = await supabase
    .from("usuario")
    .select("id, nombre, email, rol, rut, telefono")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(usuario);
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const updateData: Record<string, string> = {};

  if (body.nombre !== undefined) {
    if (typeof body.nombre !== "string" || body.nombre.trim().length < 2) {
      return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
    }
    updateData.nombre = body.nombre.trim();
  }

  if (body.rut !== undefined) {
    const rut = body.rut.trim();
    if (rut !== "" && !/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(rut)) {
      return NextResponse.json({ error: "Formato de RUT inválido. Use XX.XXX.XXX-X" }, { status: 400 });
    }
    updateData.rut = rut;
  }

  if (body.telefono !== undefined) {
    const tel = body.telefono.trim();
    if (tel !== "" && !/^(\+56\s?)?9\d{8}$/.test(tel.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Formato de teléfono inválido. Use +56 9 XXXX XXXX" }, { status: 400 });
    }
    updateData.telefono = tel;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const { error } = await supabase
    .from("usuario")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
