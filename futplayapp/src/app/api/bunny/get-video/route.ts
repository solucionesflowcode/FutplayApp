import { NextResponse } from "next/server";
import { getVideo } from "@/lib/bunny";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return NextResponse.json(
            { error: "videoId es requerido como query param" },
            { status: 400 }
        );
    }

    try {
        const video = await getVideo(videoId);
        return NextResponse.json(video);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
