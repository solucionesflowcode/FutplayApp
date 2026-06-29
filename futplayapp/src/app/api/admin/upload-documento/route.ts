import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Solo se permiten archivos PDF" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El PDF no debe superar 10MB" }, { status: 400 });
    }

    const adminClient = await getAdminClient();

    const ext = file.name.split(".").pop() || "pdf";
    const fileName = `documento_${user.id}_${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: bucketError } = await adminClient.storage.getBucket("modulos_documentos");
    if (bucketError) {
      const { error: createError } = await adminClient.storage.createBucket("modulos_documentos", { public: true });
      if (createError) {
        return NextResponse.json({ error: `Error al crear bucket: ${createError.message}` }, { status: 500 });
      }
    }

    const { error: uploadError } = await adminClient.storage.from("modulos_documentos").upload(fileName, bytes, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: `Error al subir documento: ${uploadError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      filePath: fileName,
      nombre: file.name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
