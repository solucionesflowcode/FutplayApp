import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { verifyAdmin } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no puede superar 2MB" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll() { return []; }, setAll() {} } }
    );

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `admin_${user.id}_${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    // Ensure bucket exists
    const { data: buckets } = await adminClient.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === "avatars");
    if (!bucketExists) {
      await adminClient.storage.createBucket("avatars", {
        public: true,
      });
    }

    const { error: uploadError } = await adminClient.storage
      .from("avatars")
      .upload(fileName, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrl } = adminClient.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = publicUrl.publicUrl;

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { user_metadata: { avatar_url: avatarUrl } }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatar_url: avatarUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
