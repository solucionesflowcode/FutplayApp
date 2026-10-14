import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

// Fase 3 del plan de UI/UX del admin: cápsulas (CAP-04, CAP-05).

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

const ref = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof import("@/tests/mocks/supabase").createMockServerClient> }));
const bunny = vi.hoisted(() => ({ deleteVideo: vi.fn() }));

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@/utils/supabase/admin", () => ({
    verifyAdmin: vi.fn(() => Promise.resolve({ id: "admin-1", email: "admin@test.cl" })),
    getAdminClient: vi.fn(() => Promise.resolve(ref.client)),
}));

vi.mock("@/lib/bunny", () => ({ deleteVideo: bunny.deleteVideo }));

vi.mock("@/lib/capsula-destacada", () => ({ getCapsulaDestacadaId: vi.fn(() => Promise.resolve(null)) }));

import { PUT, DELETE } from "@/app/api/admin/capsulas/route";
import { DELETE as DELETE_DOC } from "@/app/api/admin/documentos/route";

const URL_CAP = "http://localhost:3000/api/admin/capsulas";

function req(url: string, method: string, body?: object): Request {
    return new Request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function escrituras(table: string, method: "update" | "delete"): unknown[] {
    const fromSpy = ref.client.from as ReturnType<typeof vi.fn>;
    const payloads: unknown[] = [];
    fromSpy.mock.calls.forEach((call: unknown[], i: number) => {
        if (call[0] !== table) return;
        for (const c of fromSpy.mock.results[i].value[method].mock.calls) payloads.push(c[0] ?? true);
    });
    return payloads;
}

/** Rutas pasadas a storage.from(bucket).remove(). */
function archivosBorrados(): unknown[] {
    const storageFrom = ref.client.storage.from as ReturnType<typeof vi.fn>;
    return storageFrom.mock.results.flatMap((r) => r.value.remove.mock.calls.map((c: unknown[]) => c[0]));
}

beforeEach(() => {
    __resetMocks();
    ref.client = createMockServerClient();
    bunny.deleteVideo.mockReset();
    bunny.deleteVideo.mockResolvedValue(undefined);
});

describe("PUT /api/admin/capsulas — campos opcionales (CAP-04)", () => {
    it("ADM-CAP-001: los opcionales vacíos o null se guardan como null", async () => {
        const res = await PUT(req(URL_CAP, "PUT", {
            id: "k1", descripcion: "", duracion: null, modulo_id: "", profesor_id: null, creado: "  ", imagen: "",
        }));

        expect(res.status).toBe(200);
        expect(escrituras("capsula", "update")).toEqual([{
            descripcion: null, duracion: null, modulo_id: null, profesor_id: null, creado: null, imagen: null,
        }]);
    });

    it("ADM-CAP-002: el orden 0 se guarda (antes se perdía) y el título vacío se rechaza", async () => {
        const orden = await PUT(req(URL_CAP, "PUT", { id: "k1", order_index: 0 }));
        const sinTitulo = await PUT(req(URL_CAP, "PUT", { id: "k1", titulo: " " }));
        const vacio = await PUT(req(URL_CAP, "PUT", { id: "k1" }));

        expect(orden.status).toBe(200);
        expect(sinTitulo.status).toBe(400);
        expect(vacio.status).toBe(400);
        expect(escrituras("capsula", "update")).toEqual([{ order_index: 0 }]);
    });
});

describe("DELETE /api/admin/capsulas — limpia video y PDF (CAP-05)", () => {
    it("ADM-CAP-003: borra la cápsula, su PDF del storage y su video de Bunny", async () => {
        __setTableData("capsula", [{ id: "k1", bunny_video_id: "vid-1" }]);
        __setTableData("documento", [
            { id: "d1", capsula_id: "k1", url_archivo: "documento_a.pdf" },
            { id: "d2", capsula_id: "k1", url_archivo: "https://x.supabase.co/storage/v1/object/public/modulos_documentos/documento_b.pdf" },
        ]);

        const res = await DELETE(req(`${URL_CAP}?id=k1`, "DELETE"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.avisos).toEqual([]);
        expect(escrituras("capsula", "delete")).toHaveLength(1);
        expect(archivosBorrados()).toEqual([["documento_a.pdf", "documento_b.pdf"]]);
        expect(bunny.deleteVideo).toHaveBeenCalledWith("vid-1");
    });

    it("ADM-CAP-004: si Bunny falla, la cápsula igual se borra y se devuelve un aviso", async () => {
        __setTableData("capsula", [{ id: "k1", bunny_video_id: "vid-1" }]);
        bunny.deleteVideo.mockRejectedValue(new Error("Bunny deleteVideo failed: 500"));

        const res = await DELETE(req(`${URL_CAP}?id=k1`, "DELETE"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.avisos).toEqual([expect.stringContaining("Bunny")]);
    });

    it("ADM-CAP-005: un 404 de Bunny (video ya borrado) no genera aviso", async () => {
        __setTableData("capsula", [{ id: "k1", bunny_video_id: "vid-1" }]);
        bunny.deleteVideo.mockRejectedValue(new Error("Bunny deleteVideo failed: 404"));

        const body = await (await DELETE(req(`${URL_CAP}?id=k1`, "DELETE"))).json();

        expect(body.avisos).toEqual([]);
    });

    it("ADM-CAP-005B: si otra cápsula usa el mismo video, no se borra de Bunny", async () => {
        __setTableData("capsula", [{ id: "k1", bunny_video_id: "vid-1" }, { id: "k2", bunny_video_id: "vid-1" }]);

        const res = await DELETE(req(`${URL_CAP}?id=k1`, "DELETE"));

        expect(res.status).toBe(200);
        expect(bunny.deleteVideo).not.toHaveBeenCalled();
    });

    it("ADM-CAP-006: cápsula inexistente responde 404 sin tocar Bunny", async () => {
        const res = await DELETE(req(`${URL_CAP}?id=nada`, "DELETE"));

        expect(res.status).toBe(404);
        expect(bunny.deleteVideo).not.toHaveBeenCalled();
    });
});

describe("DELETE /api/admin/documentos — borra también el archivo (CAP-05)", () => {
    it("ADM-DOC-001: quita la fila y el PDF del storage", async () => {
        __setTableData("documento", [{ id: "d1", capsula_id: "k1", url_archivo: "documento_a.pdf" }]);

        const res = await DELETE_DOC(req("http://localhost:3000/api/admin/documentos?id=d1", "DELETE"));

        expect(res.status).toBe(200);
        expect(escrituras("documento", "delete")).toHaveLength(1);
        expect(archivosBorrados()).toEqual([["documento_a.pdf"]]);
    });
});
