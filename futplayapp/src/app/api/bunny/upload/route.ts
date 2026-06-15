import { NextResponse } from "next/server";
import { uploadVideo } from "@/lib/bunny";
import { verifyAdmin } from "@/utils/supabase/admin";

export async function PUT(request: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return NextResponse.json(
            { error: "videoId es requerido como query param" },
            { status: 400 }
        );
    }

    try {
        const buffer = await request.arrayBuffer();
        const result = await uploadVideo(videoId, buffer);

        if (!result.success) {
            return NextResponse.json(
                { error: result.message },
                { status: 500 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
