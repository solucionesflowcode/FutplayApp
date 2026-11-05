import { NextResponse } from "next/server";
import { verifyAdmin, getAdminClient } from "@/utils/supabase/admin";

const BUCKET = "ligas";

// Sube el logo de un equipo; devuelve la URL pública (se guarda con PUT de equipos).
export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG o WebP" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar 2MB" }, { status: 400 });
    }

    const adminClient = await getAdminClient();

    const ext = file.name.split(".").pop() || "png";
    const fileName = `logo_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: bucketError } = await adminClient.storage.getBucket(BUCKET);
    if (bucketError) {
      const { error: createError } = await adminClient.storage.createBucket(BUCKET, { public: true });
      if (createError) {
        return NextResponse.json({ error: `Error al crear bucket: ${createError.message}` }, { status: 500 });
      }
    }

    const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(fileName, bytes, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: `Error al subir el logo: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = adminClient.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
