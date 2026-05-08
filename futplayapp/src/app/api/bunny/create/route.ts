import { NextResponse } from "next/server";
import { createVideo } from "@/lib/bunny";

export async function POST(request: Request) {
    const { title } = await request.json();

    if (!title || typeof title !== "string") {
        return NextResponse.json(
            { error: "El título es requerido" },
            { status: 400 }
        );
    }

    try {
        const video = await createVideo(title);

        return NextResponse.json({
            videoId: video.guid,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
