import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { sincronizarEmailAuth } from "@/lib/auth-email";
import { telefonoParaGuardar } from "@/lib/telefono";

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

/** Clases y cápsulas asignadas: con alguna, no se le puede quitar el rol ni borrar la cuenta. */
async function asignaciones(admin: AdminClient, id: string) {
  const [{ count: clases }, { count: capsulas }] = await Promise.all([
    admin.from("clase").select("*", { count: "exact", head: true }).eq("profesor_id", id),
    admin.from("capsula").select("*", { count: "exact", head: true }).eq("profesor_id", id),
  ]);
  return { clases: clases || 0, capsulas: capsulas || 0 };
}

function respuestaAsignado(accion: string, a: { clases: number; capsulas: number }) {
  return NextResponse.json(
    {
      error: `No se puede ${accion}: el profesor tiene ${a.clases} clase(s) y ${a.capsulas} cápsula(s) asociadas. Desasigna primero.`,
      clases_asociadas: a.clases,
      capsulas_asociadas: a.capsulas,
    },
    { status: 409 }
  );
}

export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "profesores";

  try {
    const admin = await getAdminClient();

    if (tipo === "dropdown") {
      const { data } = await admin
        .from("usuario")
        .select("id, nombre")
        .eq("rol", "profesor")
        .order("nombre");
      return NextResponse.json(data || []);
    }

    if (tipo === "buscar") {
      const email = searchParams.get("email");
      if (!email || email.length < 3) {
        return NextResponse.json({ error: "Ingresa al menos 3 caracteres" }, { status: 400 });
      }
      const { data } = await admin
        .from("usuario")
        .select("id, nombre, email, rol")
        .ilike("email", `%${email}%`)
        .limit(10);
      const filtered = (data || []).filter(
        (u) => u.rol !== "profesor" && u.rol !== "administrador"
      );
      return NextResponse.json(filtered);
    }

    const { data: profesores, error } = await admin
      .from("usuario")
      .select("id, nombre, email, telefono, foto_url, created_at")
      .eq("rol", "profesor")
      .order("nombre");

    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    const profesorIds = (profesores || []).map((p) => p.id);

    const [{ data: clases }, { data: capsulas }] = await Promise.all([
      admin.from("clase").select("id, titulo, profesor_id").in("profesor_id", profesorIds),
      admin.from("capsula").select("id, titulo, profesor_id").in("profesor_id", profesorIds),
    ]);

    const clasesPorProfesor = new Map<string, { id: string; titulo: string }[]>();
    (clases || []).forEach((c) => {
      if (c.profesor_id) {
        const list = clasesPorProfesor.get(c.profesor_id) || [];
        list.push({ id: c.id, titulo: c.titulo });
        clasesPorProfesor.set(c.profesor_id, list);
      }
    });

    const capsulasPorProfesor = new Map<string, { id: string; titulo: string }[]>();
    (capsulas || []).forEach((c) => {
      if (c.profesor_id) {
        const list = capsulasPorProfesor.get(c.profesor_id) || [];
        list.push({ id: c.id, titulo: c.titulo });
        capsulasPorProfesor.set(c.profesor_id, list);
      }
    });

    return NextResponse.json((profesores || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email || "",
      telefono: p.telefono || "",
      foto_url: p.foto_url || "",
      created_at: p.created_at,
      total_clases: clasesPorProfesor.get(p.id)?.length || 0,
      clases: clasesPorProfesor.get(p.id) || [],
      total_capsulas: capsulasPorProfesor.get(p.id)?.length || 0,
      capsulas: capsulasPorProfesor.get(p.id) || [],
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.email || !body.nombre) {
      return NextResponse.json({ error: "Faltan campos: email, nombre" }, { status: 400 });
    }

    body.email = body.email.toLowerCase().trim();

    // Verificar si el email ya existe (en usuario o en auth.users)
    const { data: existing } = await admin
      .from("usuario")
      .select("id, email")
      .eq("email", body.email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario registrado con este email en el sistema" },
        { status: 409 }
      );
    }

    // Un email ya registrado en auth.users lo rechaza createUser (abajo). Antes
    // se revisaba con listUsers(), que solo trae la primera página de usuarios.
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      if (authError?.code === "email_exists" || /already (been )?registered/i.test(authError?.message ?? "")) {
        return NextResponse.json(
          { error: "Este email ya está registrado en el sistema de autenticación. Usa otro email o elimina el usuario huérfano desde Supabase Auth." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: traducirError(authError?.message) },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    const usuarioData = {
      nombre: body.nombre,
      email: body.email,
      rol: "profesor" as const,
      telefono: body.telefono || null,
      foto_url: body.foto_url || null,
    };

    // Verificar si ya existe una fila (trigger de Supabase la crea automáticamente)
    const { data: existingRow } = await admin
      .from("usuario")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    let usuarioError;
    if (existingRow) {
      ({ error: usuarioError } = await admin
        .from("usuario")
        .update(usuarioData)
        .eq("id", userId));
    } else {
      ({ error: usuarioError } = await admin
        .from("usuario")
        .insert({ id: userId, ...usuarioData }));
    }

    if (usuarioError) {
      // Intentar limpiar el auth user huérfano
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Error al limpiar auth user huérfano:", deleteError.message);
      }
      return NextResponse.json(
        { error: traducirError(usuarioError.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: userId,
      nombre: body.nombre,
      email: body.email,
      tempPassword,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const admin = await getAdminClient();
    const body = await request.json();

    if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.email !== undefined) updateData.email = String(body.email).toLowerCase().trim();
    if (body.telefono !== undefined) {
      // PRO-02: mismo formato que los alumnos; vacío o null borra el teléfono.
      const telefono = telefonoParaGuardar(body.telefono);
      if (telefono && typeof telefono === "object") return NextResponse.json({ error: telefono.error }, { status: 400 });
      updateData.telefono = telefono;
    }
    // null o "" quita la foto (antes no se podía).
    if (body.foto_url !== undefined) updateData.foto_url = body.foto_url || null;
    if (body.rol !== undefined) {
      if (body.rol !== "profesor" && body.rol !== "jugador") {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
      const { data: currentUser } = await admin
        .from("usuario")
        .select("rol")
        .eq("id", body.id)
        .single();
      if (!currentUser) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      if (body.rol === "profesor" && currentUser.rol !== "jugador") {
        return NextResponse.json(
          { error: "Solo se puede cambiar a profesor desde el rol jugador" },
          { status: 400 }
        );
      }
      // PRO-01: quitar el rol (vuelve a jugador y conserva su cuenta), en vez de borrarla.
      if (body.rol === "jugador") {
        if (currentUser.rol !== "profesor") {
          return NextResponse.json({ error: "El usuario no es profesor" }, { status: 400 });
        }
        const a = await asignaciones(admin, body.id);
        if (a.clases + a.capsulas > 0) return respuestaAsignado("quitar el rol", a);
      }
      updateData.rol = body.rol;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const emailError = await sincronizarEmailAuth(admin, body.id, updateData.email as string | undefined);
    if (emailError) return NextResponse.json({ error: traducirError(emailError) }, { status: 500 });

    const { error } = await admin.from("usuario").update(updateData).eq("id", body.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
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

    // Esta ruta solo elimina profesores: antes borraba cualquier usuario
    // (alumnos o admins) con el id recibido.
    const { data: objetivo } = await admin.from("usuario").select("rol").eq("id", id).maybeSingle();
    if (!objetivo) return NextResponse.json({ error: "Profesor no encontrado" }, { status: 404 });
    if (objetivo.rol !== "profesor") {
      return NextResponse.json({ error: "El usuario no es profesor" }, { status: 400 });
    }

    const a = await asignaciones(admin, id);
    if (a.clases + a.capsulas > 0) return respuestaAsignado("eliminar", a);

    const { error: authError } = await admin.auth.admin.deleteUser(id);
    if (authError && authError.status !== 404) {
      return NextResponse.json({ error: traducirError(authError.message) }, { status: 500 });
    }

    const { error } = await admin.from("usuario").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: traducirError(message) }, { status: 500 });
  }
}
