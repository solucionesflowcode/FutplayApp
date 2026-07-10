import { NextResponse } from "next/server";
import { getVideo, getThumbnailUrl } from "@/lib/bunny";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return NextResponse.json({ error: "Falta el parámetro videoId" }, { status: 400 });
    }

    try {
        const video = await getVideo(videoId);
        const thumbnailUrl = getThumbnailUrl(videoId);
        return NextResponse.json({
            thumbnailUrl,
            status: video.status,
            title: video.title,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error interno";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
