import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const filePath = searchParams.get("filePath");
    const nombre = searchParams.get("nombre");

    const admin = getAdminClient();

    let storageFilePath: string;
    let fileName: string;

    if (id) {
      const { data: doc, error } = await admin
        .from("documento")
        .select("nombre, url_archivo")
        .eq("id", id)
        .single();

      if (error || !doc) {
        return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
      }

      // url_archivo puede ser filePath o URL completa (backward compat)
      storageFilePath = doc.url_archivo.startsWith("http")
        ? doc.url_archivo.split("/").pop() || doc.url_archivo
        : doc.url_archivo;
      fileName = doc.nombre;
    } else if (filePath) {
      storageFilePath = filePath;
      fileName = nombre || "documento.pdf";
    } else {
      return NextResponse.json({ error: "id o filePath requerido" }, { status: 400 });
    }

    const { data: fileData, error: downloadError } = await admin.storage
      .from("modulos_documentos")
      .download(storageFilePath);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Error al descargar archivo" }, { status: 500 });
    }

    const bytes = await fileData.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": bytes.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
