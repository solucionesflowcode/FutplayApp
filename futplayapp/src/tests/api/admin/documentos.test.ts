import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

vi.mock("@/utils/supabase/admin", () => ({
    verifyAdmin: vi.fn(() => Promise.resolve({ id: "admin-1", email: "admin@test.cl" })),
}));

import { GET, POST, DELETE } from "@/app/api/admin/documentos/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("GET /api/admin/documentos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("retorna 400 si falta capsula_id", async () => {
        const res = await GET(makeRequest("http://localhost:3000/api/admin/documentos"));

        expect(res.status).toBe(400);
    });

    it("retorna documentos por capsula_id", async () => {
        __setTableData("documento", [
            { id: "d1", capsula_id: "c1", nombre: "doc.pdf", url_archivo: "https://test.com/doc.pdf", created_at: "2026-01-01" },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/documentos?capsula_id=c1"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveLength(1);
        expect(json[0].nombre).toBe("doc.pdf");
    });
});

describe("POST /api/admin/documentos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("retorna 400 si faltan campos requeridos", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/documentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ capsula_id: "c1" }),
        }));

        expect(res.status).toBe(400);
    });

    it("crea documento exitosamente", async () => {
        __setTableData("documento", { id: "d-new", capsula_id: "c1", nombre: "nuevo.pdf", url_archivo: "https://test.com/nuevo.pdf" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/documentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ capsula_id: "c1", nombre: "nuevo.pdf", url_archivo: "https://test.com/nuevo.pdf" }),
        }));

        expect(res.status).toBe(200);
        expect((await res.json()).id).toBe("d-new");
    });
});

describe("DELETE /api/admin/documentos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("retorna 400 si falta id", async () => {
        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/documentos"));

        expect(res.status).toBe(400);
    });

    it("elimina documento exitosamente", async () => {
        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/documentos?id=d1"));

        expect(res.status).toBe(200);
        expect((await res.json()).success).toBe(true);
    });
});
