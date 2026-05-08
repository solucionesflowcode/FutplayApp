/**
 * Servicio de integración con Bunny Stream.
 *
 * Único punto de contacto con la API de Bunny.net para el manejo
 * de videos (cápsulas). Este archivo NO debe importar nada de
 * Supabase ni de la base de datos del proyecto.
 *
 * Todas las funciones son server-side: el API Key de Bunny nunca
 * se expone al navegador.
 *
 * Endpoints usados de la API de Bunny Stream:
 *   POST   /library/{id}/videos           → createVideo
 *   PUT    /library/{id}/videos/{videoId}  → uploadVideo
 *   GET    /library/{id}/videos/{videoId}  → getVideo
 *   GET    /library/{id}/videos            → listVideos
 *   DELETE /library/{id}/videos/{videoId}  → deleteVideo
 *
 * Documentación: https://docs.bunny.net/api-reference/stream
 */

const BUNNY_API_BASE = "https://video.bunnycdn.com";

function getConfig() {
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;
    if (!libraryId || !apiKey) {
        throw new Error("Missing BUNNY_LIBRARY_ID or BUNNY_API_KEY env vars");
    }
    return { libraryId: Number(libraryId), apiKey };
}

function headers(apiKey: string) {
    return {
        AccessKey: apiKey,
        Accept: "application/json",
    };
}

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

/** Video tal como lo devuelve la API de Bunny Stream. */
export type BunnyVideo = {
    videoLibraryId: number;
    guid: string;
    title: string;
    dateUploaded: string;
    views: number;
    isPublic: boolean;
    length: number;
    status: number;
    framerate: number;
    width: number;
    height: number;
    availableResolutions: string | null;
    thumbnailCount: number;
    encodeProgress: number;
    storageSize: number;
    hasMP4Fallback: boolean;
    collectionId: string | null;
    thumbnailFileName: string | null;
    averageWatchTime: number;
    totalWatchTime: number;
    category: string | null;
};

type VideoStatus =
    | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Mapa legible del estado de un video en Bunny Stream.
 * 0=Creado, 4=Finalizado, 5=Error, etc.
 */
export const VideoStatusLabel: Record<VideoStatus, string> = {
    0: "Creado",
    1: "Subido",
    2: "Procesando",
    3: "Transcodificando",
    4: "Finalizado",
    5: "Error",
    6: "Error de subida",
    7: "Segmentando",
    8: "Listo",
};

type PaginatedVideos = {
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
    items: BunnyVideo[];
};

// ──────────────────────────────────────────────
// API
// ──────────────────────────────────────────────

/**
 * Crea un video en Bunny Stream (solo metadatos).
 *
 * Paso 1 del flujo de subida: reserva un "slot" en la library
 * y devuelve el objeto con el `guid` (videoId) necesario para
 * el paso 2 (uploadVideo).
 *
 * @param title - Título del video (visible en el dashboard de Bunny).
 * @returns Objeto del video creado con su `guid` único.
 */
export async function createVideo(title: string): Promise<BunnyVideo> {
    const { libraryId, apiKey } = getConfig();

    const res = await fetch(
        `${BUNNY_API_BASE}/library/${libraryId}/videos`,
        {
            method: "POST",
            headers: {
                ...headers(apiKey),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title }),
        }
    );

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Bunny createVideo failed: ${res.status} ${error}`);
    }

    return res.json();
}

/**
 * Sube el archivo binario del video a Bunny Stream.
 *
 * Paso 2 del flujo de subida. Debe llamarse DESPUÉS de createVideo,
 * usando el `guid` que devolvió ese paso.
 *
 * Solo debe usarse desde el servidor (API Routes de Next.js).
 * El API Key de Bunny nunca se envía al cliente.
 *
 * @param videoId   - GUID del video retornado por createVideo.
 * @param fileBuffer - Contenido binario del archivo de video (ArrayBuffer o Blob).
 * @returns Objeto con `success`, `message` y `statusCode`.
 */
export async function uploadVideo(
    videoId: string,
    fileBuffer: ArrayBuffer | Blob
): Promise<{ success: boolean; message: string; statusCode: number }> {
    const { libraryId, apiKey } = getConfig();

    const res = await fetch(
        `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
        {
            method: "PUT",
            headers: {
                AccessKey: apiKey,
                Accept: "application/json",
            },
            body: fileBuffer,
        }
    );

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Bunny uploadVideo failed: ${res.status} ${error}`);
    }

    return res.json();
}

/**
 * Obtiene los metadatos y estado actual de un video desde Bunny Stream.
 *
 * Útil para consultar el progreso de transcodificación (status === 4 → listo).
 *
 * @param videoId - GUID del video.
 * @returns Objeto completo del video con estado, duración, resoluciones, etc.
 */
export async function getVideo(videoId: string): Promise<BunnyVideo> {
    const { libraryId, apiKey } = getConfig();

    const res = await fetch(
        `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
        { headers: headers(apiKey) }
    );

    if (!res.ok) {
        throw new Error(`Bunny getVideo failed: ${res.status}`);
    }

    return res.json();
}

/**
 * Lista los videos de la library con paginación y filtros opcionales.
 *
 * @param params.page        - Número de página (default: 1).
 * @param params.itemsPerPage - Items por página (default: 100).
 * @param params.search       - Búsqueda por título.
 * @param params.collection   - Filtrar por ID de colección.
 * @param params.orderBy      - Campo de ordenamiento (default: "date").
 * @returns Lista paginada de videos.
 */
export async function listVideos(params?: {
    page?: number;
    itemsPerPage?: number;
    search?: string;
    collection?: string;
    orderBy?: string;
}): Promise<PaginatedVideos> {
    const { libraryId, apiKey } = getConfig();

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.itemsPerPage) searchParams.set("itemsPerPage", String(params.itemsPerPage));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.collection) searchParams.set("collection", params.collection);
    if (params?.orderBy) searchParams.set("orderBy", params.orderBy);

    const url = `${BUNNY_API_BASE}/library/${libraryId}/videos${
        searchParams.toString() ? `?${searchParams}` : ""
    }`;

    const res = await fetch(url, { headers: headers(apiKey) });

    if (!res.ok) {
        throw new Error(`Bunny listVideos failed: ${res.status}`);
    }

    return res.json();
}

/**
 * Elimina un video de Bunny Stream permanentemente.
 *
 * También libera el almacenamiento asociado.
 *
 * @param videoId - GUID del video a eliminar.
 */
export async function deleteVideo(videoId: string): Promise<void> {
    const { libraryId, apiKey } = getConfig();

    const res = await fetch(
        `${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`,
        { method: "DELETE", headers: headers(apiKey) }
    );

    if (!res.ok) {
        throw new Error(`Bunny deleteVideo failed: ${res.status}`);
    }
}

// ──────────────────────────────────────────────
// URLs públicas (solo requieren libraryId)
// ──────────────────────────────────────────────

/**
 * Genera la URL de embedding para el reproductor de Bunny Stream.
 *
 * Usar en un <iframe> para reproducir el video:
 *
 *   <iframe src={getEmbedUrl(videoId)} ... />
 *
 * @param videoId - GUID del video.
 * @returns URL completa tipo https://player.mediadelivery.net/embed/{libraryId}/{videoId}
 */
export function getEmbedUrl(videoId: string): string {
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    if (!libraryId) throw new Error("Missing BUNNY_LIBRARY_ID");
    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}`;
}
