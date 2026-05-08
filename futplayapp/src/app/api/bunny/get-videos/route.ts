import { NextResponse } from "next/server";
import { listVideos } from "@/lib/bunny";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    try {
        const params = {
            page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
            itemsPerPage: searchParams.get("itemsPerPage")
                ? Number(searchParams.get("itemsPerPage"))
                : undefined,
            search: searchParams.get("search") || undefined,
            collection: searchParams.get("collection") || undefined,
            orderBy: searchParams.get("orderBy") || undefined,
        };

        const result = await listVideos(params);
        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
