import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";
import { traducirError } from "@/lib/errores";
import { BUCKET_FOTOS, errorPie, esImagenPermitida, esUuid, limpiarPie, MAX_BYTES_FOTO, MAX_BYTES_MINIATURA } from "@/lib/liga-fotos";
import { borrarArchivosFotos, COLUMNAS_FOTO, fotoVista, listarFotos } from "@/lib/liga-fotos-servidor";

type AdminClient = Awaited<ReturnType<typeof getAdminClient>>;

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_DIMENSION = 10000;

function error500(err: unknown) {
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ error: traducirError(message) }, { status: 500 });
}

async function partidoEsDeLiga(admin: AdminClient, partidoId: unknown, ligaId: string): Promise<boolean> {
  if (!esUuid(partidoId)) return false;
  const { data } = await admin.from("liga_partido").select("id").eq("id", partidoId).eq("liga_id", ligaId).maybeSingle();
  return !!data;
}

async function archivoValido(archivo: FormDataEntryValue | null, maxBytes: number): Promise<Uint8Array | string> {
  if (!(archivo instanceof File)) return "Falta la foto o su miniatura";
  if (archivo.size > maxBytes) return "La foto pesa demasiado";
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  return esImagenPermitida(archivo.type, bytes) ? bytes : "Formato no permitido. Usa JPG o WebP";
}

// GET /api/admin/ligas/fotos?liga_id=&cursor= → una página de fotos de la liga (incluye borradores).
export async function GET(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const params = new URL(request.url).searchParams;
    const ligaId = params.get("liga_id");
    if (!esUuid(ligaId)) return NextResponse.json({ error: "Liga no válida" }, { status: 400 });

    const admin = await getAdminClient();
    return NextResponse.json(await listarFotos(admin, { ligaId, usuarioId: user.id, cursor: params.get("cursor") }));
  } catch (err) {
    return error500(err);
  }
}

// POST /api/admin/ligas/fotos (multipart) → sube una foto ya reducida en el navegador.
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const form = await request.formData();
    const ligaId = form.get("liga_id");
    if (!esUuid(ligaId)) return NextResponse.json({ error: "Liga no válida" }, { status: 400 });

    const foto = form.get("foto");
    const miniatura = form.get("miniatura");
    const bytesFoto = await archivoValido(foto, MAX_BYTES_FOTO);
    if (typeof bytesFoto === "string") return NextResponse.json({ error: bytesFoto }, { status: 400 });
    const bytesMiniatura = await archivoValido(miniatura, MAX_BYTES_MINIATURA);
    if (typeof bytesMiniatura === "string") return NextResponse.json({ error: bytesMiniatura }, { status: 400 });

    const ancho = Number(form.get("ancho"));
    const alto = Number(form.get("alto"));
    const dimensionValida = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_DIMENSION;
    if (!dimensionValida(ancho) || !dimensionValida(alto)) {
      return NextResponse.json({ error: "Las dimensiones de la foto no son válidas" }, { status: 400 });
    }

    const pie = form.get("pie");
    const mensajePie = errorPie(pie);
    if (mensajePie) return NextResponse.json({ error: mensajePie }, { status: 400 });

    const admin = await getAdminClient();
    const { data: liga } = await admin.from("liga").select("id").eq("id", ligaId).maybeSingle();
    if (!liga) return NextResponse.json({ error: "La liga no existe" }, { status: 404 });

    const partidoId = form.get("partido_id") || null;
    if (partidoId && !(await partidoEsDeLiga(admin, partidoId, ligaId))) {
      return NextResponse.json({ error: "El partido no es de esta liga" }, { status: 400 });
    }

    const nombre = crypto.randomUUID();
    const tipoFoto = (foto as File).type;
    const tipoMiniatura = (miniatura as File).type;
    // La carpeta sale de un uuid ya validado y el nombre es aleatorio: no se usa nada que escriba el usuario.
    const ruta = `${ligaId}/${nombre}.${EXTENSION[tipoFoto]}`;
    const rutaMiniatura = `${ligaId}/${nombre}_min.${EXTENSION[tipoMiniatura]}`;
    const opciones = { upsert: false, cacheControl: "31536000" };

    const storage = admin.storage.from(BUCKET_FOTOS);
    const { error: errorFoto } = await storage.upload(ruta, bytesFoto, { ...opciones, contentType: tipoFoto });
    if (errorFoto) return NextResponse.json({ error: traducirError(errorFoto.message) }, { status: 500 });

    const { error: errorMiniatura } = await storage.upload(rutaMiniatura, bytesMiniatura, { ...opciones, contentType: tipoMiniatura });
    if (errorMiniatura) {
      await borrarArchivosFotos(admin, [ruta]);
      return NextResponse.json({ error: traducirError(errorMiniatura.message) }, { status: 500 });
    }

    const { data, error } = await admin
      .from("liga_foto")
      .insert({ liga_id: ligaId, partido_id: partidoId, ruta, ruta_miniatura: rutaMiniatura, ancho, alto, pie: limpiarPie(pie), subida_por: user.id })
      .select(COLUMNAS_FOTO)
      .single();
    if (error || !data) {
      await borrarArchivosFotos(admin, [ruta, rutaMiniatura]);
      return NextResponse.json({ error: traducirError(error?.message) }, { status: 500 });
    }

    return NextResponse.json(fotoVista(admin, data));
  } catch (err) {
    return error500(err);
  }
}

// PUT /api/admin/ligas/fotos { id, pie?, partido_id? } → edita el pie o el partido (null = foto general).
export async function PUT(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await request.json();
    if (!esUuid(body.id)) return NextResponse.json({ error: "Foto no válida" }, { status: 400 });

    const mensajePie = errorPie(body.pie);
    if (mensajePie) return NextResponse.json({ error: mensajePie }, { status: 400 });

    const admin = await getAdminClient();
    const { data: foto } = await admin.from("liga_foto").select("id, liga_id").eq("id", body.id).maybeSingle();
    if (!foto) return NextResponse.json({ error: "La foto no existe" }, { status: 404 });

    const cambios: Record<string, unknown> = {};
    if (body.pie !== undefined) cambios.pie = limpiarPie(body.pie);
    if (body.partido_id !== undefined) {
      if (body.partido_id !== null && !(await partidoEsDeLiga(admin, body.partido_id, foto.liga_id))) {
        return NextResponse.json({ error: "El partido no es de esta liga" }, { status: 400 });
      }
      cambios.partido_id = body.partido_id;
    }
    if (Object.keys(cambios).length === 0) return NextResponse.json({ success: true });

    const { error } = await admin.from("liga_foto").update(cambios).eq("id", body.id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return error500(err);
  }
}

// DELETE /api/admin/ligas/fotos?id= → borra la fila y sus dos archivos.
export async function DELETE(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!esUuid(id)) return NextResponse.json({ error: "Foto no válida" }, { status: 400 });

    const admin = await getAdminClient();
    const { data: foto } = await admin.from("liga_foto").select("ruta, ruta_miniatura").eq("id", id).maybeSingle();
    if (!foto) return NextResponse.json({ error: "La foto no existe" }, { status: 404 });

    const { error } = await admin.from("liga_foto").delete().eq("id", id);
    if (error) return NextResponse.json({ error: traducirError(error.message) }, { status: 500 });

    const aviso = await borrarArchivosFotos(admin, [foto.ruta, foto.ruta_miniatura]);
    return NextResponse.json({ success: true, aviso });
  } catch (err) {
    return error500(err);
  }
}
