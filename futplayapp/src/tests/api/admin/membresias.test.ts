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
            { id: "mc1", usuario_id: "u1", plan_id: "p1", tokens_totales: 100, tokens_usados: 10, fecha_inicio: "2026-01-01T00:00:00.000Z", fecha_vencimiento: "2026-01-31T00:00:00.000Z" },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/membresias"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
    });

    it("API-ADM-MEMBRESIAS-GET-004: con una vencida y una congelada, muestra la congelada (sea cual sea el orden)", async () => {
        const vencida = { id: "vieja", usuario_id: "u1", plan_id: "p1", tokens_totales: 4, tokens_usados: 4, estado: false, congelada: false, fecha_inicio: "2026-08-10T00:00:00.000Z", fecha_vencimiento: "2026-09-09T00:00:00.000Z" };
        const congelada = { id: "actual", usuario_id: "u1", plan_id: "p1", tokens_totales: 4, tokens_usados: 2, estado: true, congelada: true, fecha_inicio: "2026-09-24T00:00:00.000Z", fecha_vencimiento: "2099-10-27T00:00:00.000Z" };

        for (const orden of [[vencida, congelada], [congelada, vencida]]) {
            __setTableData("membresia", orden);
            const json = await (await GET(makeRequest("http://localhost:3000/api/admin/membresias"))).json();
            expect(json).toHaveLength(1);
            expect(json[0].membresia_id).toBe("actual");
            expect(json[0].congelada).toBe(true);
            expect(json[0].tokens_restantes).toBe(0);
        }
    });

    it("API-ADM-MEMBRESIAS-GET-005: una activa con tokens le gana a la congelada", async () => {
        __setTableData("membresia", [
            { id: "congelada", usuario_id: "u1", plan_id: "p1", tokens_totales: 4, tokens_usados: 0, estado: true, congelada: true, fecha_inicio: "2026-09-01T00:00:00.000Z", fecha_vencimiento: "2099-01-01T00:00:00.000Z" },
            { id: "activa", usuario_id: "u1", plan_id: "p1", tokens_totales: 4, tokens_usados: 3, estado: true, congelada: false, fecha_inicio: "2026-10-01T00:00:00.000Z", fecha_vencimiento: "2099-01-01T00:00:00.000Z" },
        ]);

        const json = await (await GET(makeRequest("http://localhost:3000/api/admin/membresias"))).json();

        expect(json[0].membresia_id).toBe("activa");
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

describe("GET /api/admin/membresias?conBoleta=1 (analíticas)", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", [
            { id: "admin-1", rol: "administrador", sede_id: null },
            { id: "u1", rol: "jugador", sede_id: "s1" },
        ]);
    });

    const base = { plan_id: "p1", tokens_totales: 4, estado: true, congelada: false, fecha_inicio: "2026-10-01T00:00:00.000Z", fecha_vencimiento: "2099-01-01T00:00:00.000Z" };

    it("API-ADM-MEMBRESIAS-BOL-001: descarta las sin boleta ANTES de elegir una por alumno, y trae la sede", async () => {
        __setTableData("membresia", [
            // Regalada desde el panel, con más tokens: sin el filtro ganaría.
            { ...base, id: "regalada", usuario_id: "u1", tokens_usados: 0, boleta_id: null, numero_boleta: null },
            { ...base, id: "pagada", usuario_id: "u1", tokens_usados: 3, boleta_id: null, numero_boleta: "1234" },
        ]);

        const conBoleta = await (await GET(makeRequest("http://localhost:3000/api/admin/membresias?conBoleta=1"))).json();
        expect(conBoleta).toHaveLength(1);
        expect(conBoleta[0].membresia_id).toBe("pagada");
        expect(conBoleta[0].sede_id).toBe("s1");

        // Sin el parámetro (Gestión de usuarios) no cambia: gana la de más tokens.
        const todas = await (await GET(makeRequest("http://localhost:3000/api/admin/membresias"))).json();
        expect(todas[0].membresia_id).toBe("regalada");
    });
});
