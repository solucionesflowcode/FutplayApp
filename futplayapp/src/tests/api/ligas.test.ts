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

import { GET } from "@/app/api/ligas/route";

describe("GET /api/ligas (Mi liga)", () => {
    beforeEach(() => {
        __resetMocks();
        __setTableData("liga", [
            { id: "l1", nombre: "Serie A", estado: "en_curso", created_at: "2026-10-01" },
            { id: "l2", nombre: "Serie B", estado: "en_curso", created_at: "2026-10-02" },
            { id: "l3", nombre: "Borrador", estado: "borrador", created_at: "2026-10-03" },
        ]);
        __setTableData("liga_equipo", [{ id: "e1", liga_id: "l1", nombre: "Alfa" }, { id: "e2", liga_id: "l1", nombre: "Beta" }]);
        __setTableData("liga_jugador", [
            { liga_id: "l1", equipo_id: "e1", usuario_id: "yo", numero: 9, usuario: { nombre: "Yo", foto_url: null, posicion: "delantero_centro", email: "yo@x.cl", rut: "1-9", telefono: "+569" } },
            { liga_id: "l1", equipo_id: "e2", usuario_id: "otro", numero: 1, usuario: { nombre: "Otro", foto_url: null, posicion: null, email: "otro@x.cl", rut: "2-7", telefono: "+568" } },
        ]);
        __setTableData("liga_partido", [
            { id: "p1", liga_id: "l1", fase: "regular", jornada: 1, local_id: "e1", visita_id: "e2", goles_local: 2, goles_visita: 1, estado: "jugado" },
        ]);
    });

    it("API-LIGAS-001: 401 sin sesión", async () => {
        const res = await GET(new Request("http://localhost:3000/api/ligas"));
        expect(res.status).toBe(401);
    });

    it("API-LIGAS-002: elige la liga del jugador, oculta borradores y calcula la tabla", async () => {
        __setAuthUser({ id: "yo" });
        const body = await (await GET(new Request("http://localhost:3000/api/ligas"))).json();
        expect(body.ligas.map((l: { id: string }) => l.id)).not.toContain("l3");
        expect(body.detalle.liga.id).toBe("l1");
        expect(body.detalle.miEquipoId).toBe("e1");
        expect(body.detalle.tabla[0]).toMatchObject({ equipo: { id: "e1" }, pts: 3 });
    });

    it("API-LIGAS-003: no expone email, RUT ni teléfono de los jugadores", async () => {
        __setAuthUser({ id: "yo" });
        const body = await (await GET(new Request("http://localhost:3000/api/ligas?id=l1"))).json();
        const texto = JSON.stringify(body.detalle.jugadores);
        expect(texto).not.toMatch(/@x\.cl|1-9|\+569/);
        expect(body.detalle.jugadores[0]).toEqual({ equipo_id: "e1", numero: 9, nombre: "Yo", foto_url: null, posicion: "delantero_centro" });
    });

    it("API-LIGAS-004: una liga en borrador no se puede pedir por id", async () => {
        __setAuthUser({ id: "yo" });
        const res = await GET(new Request("http://localhost:3000/api/ligas?id=l3"));
        expect(res.status).toBe(404);
    });
});
