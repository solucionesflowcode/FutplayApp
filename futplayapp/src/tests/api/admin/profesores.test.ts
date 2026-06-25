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

import { GET, POST, PUT, DELETE } from "@/app/api/admin/profesores/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("GET /api/admin/profesores", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-PROFESORES-GET-001: retorna lista de profesores con joins", async () => {
        __setTableData("usuario", [
            { id: "p1", nombre: "Profe 1", email: "p1@test.cl" },
            { id: "p2", nombre: "Profe 2", email: "p2@test.cl" },
        ]);
        __setTableData("profesor", [
            { id: "p1", telefono: "123", especialidad: "Fútbol" },
            { id: "p2", telefono: "456", especialidad: "Basket" },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/profesores"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBeGreaterThanOrEqual(2);
    });
});

describe("POST /api/admin/profesores", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-PROFESORES-POST-001: retorna 400 si falta email", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/profesores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Nuevo Profe" }),
        }));

        expect(res.status).toBe(400);
    });

    it("API-ADM-PROFESORES-POST-002: crea profesor exitosamente", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/profesores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Nuevo Profe", email: "nuevo@profe.cl", telefono: "999", especialidad: "Yoga" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.id).toBeDefined();
        expect(json.email).toBe("nuevo@profe.cl");
    });

    it("API-ADM-PROFESORES-POST-003: retorna 409 si el usuario ya existe como profesor", async () => {
        __setTableData("usuario", [{ id: "p1", email: "existente@profe.cl" }]);
        __setTableData("profesor", [{ id: "p1" }]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/profesores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Existente", email: "existente@profe.cl" }),
        }));

        expect(res.status).toBe(409);
    });
});

describe("PUT /api/admin/profesores", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-PROFESORES-PUT-001: actualiza profesor exitosamente", async () => {
        __setTableData("profesor", [{ id: "p1", telefono: "123", especialidad: "Fútbol" }]);

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/profesores", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "p1", telefono: "999", especialidad: "Tennis" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });

    it("API-ADM-PROFESORES-PUT-002: retorna 400 si falta id", async () => {
        const res = await PUT(makeRequest("http://localhost:3000/api/admin/profesores", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefono: "111" }),
        }));

        expect(res.status).toBe(400);
    });
});

describe("DELETE /api/admin/profesores", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-PROFESORES-DEL-001: elimina profesor y su usuario", async () => {
        __setTableData("profesor", [{ id: "p1" }]);

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/profesores?id=p1"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });

    it("API-ADM-PROFESORES-DEL-002: retorna 400 si falta id", async () => {
        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/profesores"));

        expect(res.status).toBe(400);
    });

    it("API-ADM-PROFESORES-DEL-003: retorna 404 si profesor no existe", async () => {
        __setTableData("profesor", null);

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/profesores?id=inexistente"));

        expect(res.status).toBe(200);
    });
});
