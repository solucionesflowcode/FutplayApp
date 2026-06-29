import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

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

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => createMockServerClient()),
}));

import { GET, POST, PUT, DELETE } from "@/app/api/admin/planes/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

function jsonResponse(res: Response): Promise<any> {
    return res.json().catch(() => null);
}

describe("GET /api/admin/planes", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    it("API-ADM-PLANES-GET-001: retorna lista de planes", async () => {
        __setTableData("plan", [
            { id: "p1", nombre: "básico", tokens_mensuales: 10, precio: 15000 },
            { id: "p2", nombre: "pro", tokens_mensuales: 25, precio: 25000 },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/planes"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveLength(2);
        expect(json[0].nombre).toBe("básico");
    });

    it("API-ADM-PLANES-GET-002: retorna 403 si no hay usuario autenticado", async () => {
        __setAuthUser(null);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/planes"));

        expect(res.status).toBe(403);
    });

    it("API-ADM-PLANES-GET-003: retorna 403 si el usuario no es administrador", async () => {
        __setTableData("usuario", { id: "user-1", rol: "jugador" });
        __setAuthUser({ id: "user-1", email: "user@test.cl" });

        const res = await GET(makeRequest("http://localhost:3000/api/admin/planes"));

        expect(res.status).toBe(403);
    });

    it("API-ADM-PLANES-GET-004: retorna 500 si hay error de base de datos", async () => {
        __setTableData("plan", null, { message: "DB error" });

        const res = await GET(makeRequest("http://localhost:3000/api/admin/planes"));

        expect(res.status).toBe(500);
    });

    it("API-ADM-PLANES-GET-005: retorna array vacío si no hay planes", async () => {
        __setTableData("plan", []);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/planes"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual([]);
    });
});

describe("POST /api/admin/planes", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    it("API-ADM-PLANES-POST-001: crea un plan exitosamente", async () => {
        __setTableData("plan", []);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Nuevo Plan", precio: 20000, tokens_mensuales: 15 }),
        }));

        expect(res.status).toBe(200);
        const json = await jsonResponse(res);
        expect(json.success).toBe(true);
    });

    it("API-ADM-PLANES-POST-002: retorna 400 si falta nombre", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ precio: 20000 }),
        }));

        expect(res.status).toBe(400);
        const json = await jsonResponse(res);
        expect(json.error).toContain("nombre");
    });

    it("API-ADM-PLANES-POST-003: retorna 400 si falta precio", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Nuevo Plan" }),
        }));

        expect(res.status).toBe(400);
        const json = await jsonResponse(res);
        expect(json.error).toContain("precio");
    });

    it("API-ADM-PLANES-POST-004: retorna 403 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Plan", precio: 20000 }),
        }));

        expect(res.status).toBe(403);
    });

    it("API-ADM-PLANES-POST-005: usa tokens_mensuales=1 por defecto si no se envía", async () => {
        __setTableData("plan", []);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Plan", precio: 20000 }),
        }));

        expect(res.status).toBe(200);
    });

    it("API-ADM-PLANES-POST-006: retorna 403 si no es administrador", async () => {
        __setTableData("usuario", { id: "user-1", rol: "jugador" });
        __setAuthUser({ id: "user-1", email: "user@test.cl" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Plan", precio: 20000 }),
        }));

        expect(res.status).toBe(403);
    });
});

describe("PUT /api/admin/planes", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    it("API-ADM-PLANES-PUT-001: actualiza un plan exitosamente", async () => {
        __setTableData("plan", [{ id: "p1" }]);

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "p1", nombre: "Actualizado", precio: 30000 }),
        }));

        expect(res.status).toBe(200);
        const json = await jsonResponse(res);
        expect(json.success).toBe(true);
    });

    it("API-ADM-PLANES-PUT-002: retorna 400 si falta id", async () => {
        const res = await PUT(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: "Plan" }),
        }));

        expect(res.status).toBe(400);
        const json = await jsonResponse(res);
        expect(json.error).toContain("id");
    });

    it("API-ADM-PLANES-PUT-003: retorna 403 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "p1", nombre: "Plan" }),
        }));

        expect(res.status).toBe(403);
    });

    it("API-ADM-PLANES-PUT-004: actualiza solo los campos enviados", async () => {
        __setTableData("plan", [{ id: "p1" }]);

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "p1", nombre: "Solo nombre" }),
        }));

        expect(res.status).toBe(200);
    });

    it("API-ADM-PLANES-PUT-005: retorna 403 si no es administrador", async () => {
        __setTableData("usuario", { id: "user-1", rol: "jugador" });
        __setAuthUser({ id: "user-1", email: "user@test.cl" });

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/planes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "p1", nombre: "Plan" }),
        }));

        expect(res.status).toBe(403);
    });
});

describe("DELETE /api/admin/planes", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    it("API-ADM-PLANES-DEL-001: elimina un plan exitosamente", async () => {
        __setTableData("plan", [{ id: "p1" }]);

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/planes?id=p1"));

        expect(res.status).toBe(200);
        const json = await jsonResponse(res);
        expect(json.success).toBe(true);
    });

    it("API-ADM-PLANES-DEL-002: retorna 400 si falta id", async () => {
        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/planes"));

        expect(res.status).toBe(400);
        const json = await jsonResponse(res);
        expect(json.error).toContain("id");
    });

    it("API-ADM-PLANES-DEL-003: retorna 403 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/planes?id=p1"));

        expect(res.status).toBe(403);
    });

    it("API-ADM-PLANES-DEL-004: retorna 403 si no es administrador", async () => {
        __setTableData("usuario", { id: "user-1", rol: "jugador" });
        __setAuthUser({ id: "user-1", email: "user@test.cl" });

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/planes?id=p1"));

        expect(res.status).toBe(403);
    });
});
