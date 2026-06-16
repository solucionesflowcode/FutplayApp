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

import { GET } from "@/app/api/admin/membresias/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("GET /api/admin/membresias", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    it("API-ADM-MEMBRESIAS-GET-001: retorna lista de membresías", async () => {
        __setTableData("membresia", [
            { id: "mc1", usuario_id: "u1", plan_id: "p1", tokens_totales: 100, tokens_usados: 10, mes: "2026-01-01" },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/membresias"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
    });

    it("API-ADM-MEMBRESIAS-GET-002: retorna 401 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/membresias"));

        expect(res.status).toBe(401);
    });

    it("API-ADM-MEMBRESIAS-GET-003: retorna 403 si no es admin/profesor", async () => {
        __setTableData("usuario", { id: "user-1", rol: "jugador" });
        __setAuthUser({ id: "user-1", email: "user@test.cl" });

        const res = await GET(makeRequest("http://localhost:3000/api/admin/membresias"));

        expect(res.status).toBe(403);
    });
});
