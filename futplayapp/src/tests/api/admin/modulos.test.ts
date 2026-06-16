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

import { GET, POST, PUT, DELETE } from "@/app/api/admin/modulos/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("GET /api/admin/modulos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-MODULOS-GET-001: retorna lista de módulos", async () => {
        __setTableData("modulo", [
            { id: "m1", titulo: "Módulo 1", descripcion: "Desc 1" },
            { id: "m2", titulo: "Módulo 2", descripcion: "Desc 2" },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/modulos"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
        expect(json).toHaveLength(2);
    });
});

describe("POST /api/admin/modulos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-MODULOS-POST-001: crea módulo exitosamente", async () => {
        __setTableData("modulo", { id: "m-new", titulo: "Nuevo Módulo" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/modulos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Nuevo Módulo", descripcion: "Desc" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.id).toBe("m-new");
    });

    it("API-ADM-MODULOS-POST-002: retorna 400 si falta título", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/modulos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descripcion: "Sin título" }),
        }));

        expect(res.status).toBe(400);
    });
});

describe("PUT /api/admin/modulos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-MODULOS-PUT-001: actualiza módulo exitosamente", async () => {
        __setTableData("modulo", { id: "m1" });

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/modulos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "m1", titulo: "Actualizado" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });

    it("API-ADM-MODULOS-PUT-002: retorna 400 si falta id", async () => {
        const res = await PUT(makeRequest("http://localhost:3000/api/admin/modulos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "No id" }),
        }));

        expect(res.status).toBe(400);
    });
});

describe("DELETE /api/admin/modulos", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-MODULOS-DEL-001: elimina módulo exitosamente", async () => {
        __setTableData("modulo", { id: "m1" });

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/modulos?id=m1"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });

    it("API-ADM-MODULOS-DEL-002: retorna 400 si falta id", async () => {
        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/modulos"));

        expect(res.status).toBe(400);
    });
});
