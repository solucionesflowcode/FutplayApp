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

import { GET as GET_LIGAS, POST as POST_LIGA } from "@/app/api/admin/ligas/route";
import { POST as POST_JUGADOR } from "@/app/api/admin/ligas/jugadores/route";
import { POST as POST_PARTIDO, PUT as PUT_PARTIDO, DELETE as DELETE_PARTIDO } from "@/app/api/admin/ligas/partidos/route";
import { POST as POST_PLAYOFFS } from "@/app/api/admin/ligas/playoffs/route";
import { DELETE as DELETE_EQUIPO } from "@/app/api/admin/ligas/equipos/route";

const URL_BASE = "http://localhost:3000/api/admin/ligas";
const json = (method: string, body: unknown) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const EQ_A = "11111111-1111-1111-1111-111111111111";
const EQ_B = "22222222-2222-2222-2222-222222222222";
const EQ_OTRA = "33333333-3333-3333-3333-333333333333";

function comoAdmin(otrosUsuarios: object[] = []) {
    __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
    __setTableData("usuario", [{ id: "admin-1", rol: "administrador" }, ...otrosUsuarios]);
}

function partido(extra: object) {
    return {
        id: "p1", liga_id: "l1", fase: "regular", jornada: 1, llave: null, local_id: EQ_A, visita_id: EQ_B,
        fecha_hora: null, cancha: null, goles_local: null, goles_visita: null, penales_local: null, penales_visita: null,
        estado: "programado", ...extra,
    };
}

beforeEach(() => {
    __resetMocks();
    __setTableData("liga", [{ id: "l1", nombre: "Serie A", estado: "en_curso" }]);
    __setTableData("liga_equipo", [
        { id: EQ_A, liga_id: "l1", nombre: "Alfa" },
        { id: EQ_B, liga_id: "l1", nombre: "Beta" },
        { id: EQ_OTRA, liga_id: "l2", nombre: "Otra liga" },
    ]);
});

describe("ligas: acceso y validación", () => {
    it("API-ADM-LIGAS-001: 403 si no es administrador", async () => {
        __setAuthUser({ id: "u1" });
        __setTableData("usuario", [{ id: "u1", rol: "jugador" }]);
        const res = await GET_LIGAS(new Request(URL_BASE));
        expect(res.status).toBe(403);
    });

    it("API-ADM-LIGAS-002: crear liga sin nombre → 400", async () => {
        comoAdmin();
        const res = await POST_LIGA(new Request(URL_BASE, json("POST", { nombre: "  " })));
        expect(res.status).toBe(400);
    });

    it("API-ADM-LIGAS-003: listado con conteo de equipos y partidos jugados", async () => {
        comoAdmin();
        __setTableData("liga_partido", [partido({ estado: "jugado", goles_local: 1, goles_visita: 0 }), partido({ id: "p2" })]);
        const res = await GET_LIGAS(new Request(URL_BASE));
        const body = await res.json();
        expect(body[0]).toMatchObject({ id: "l1", total_equipos: 2, total_partidos: 2, partidos_jugados: 1 });
    });
});

describe("ligas: jugadores", () => {
    it("API-ADM-LIGAS-JUG-001: el equipo debe ser de la misma liga", async () => {
        comoAdmin([{ id: "j1", rol: "jugador" }]);
        const res = await POST_JUGADOR(new Request(`${URL_BASE}/jugadores`, json("POST", { liga_id: "l1", equipo_id: EQ_OTRA, usuario_id: "j1" })));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/no pertenece/);
    });

    it("API-ADM-LIGAS-JUG-002: solo usuarios con rol jugador", async () => {
        comoAdmin([{ id: "prof", rol: "profesor" }]);
        const res = await POST_JUGADOR(new Request(`${URL_BASE}/jugadores`, json("POST", { liga_id: "l1", equipo_id: EQ_A, usuario_id: "prof" })));
        expect(res.status).toBe(400);
    });

    it("API-ADM-LIGAS-JUG-003: un jugador ya inscrito en la liga → 409", async () => {
        comoAdmin([{ id: "j1", rol: "jugador" }]);
        __setTableData("liga_jugador", null, { message: 'duplicate key value violates unique constraint "liga_jugador_liga_id_usuario_id_key"' });
        const res = await POST_JUGADOR(new Request(`${URL_BASE}/jugadores`, json("POST", { liga_id: "l1", equipo_id: EQ_A, usuario_id: "j1" })));
        expect(res.status).toBe(409);
    });

    it("API-ADM-LIGAS-JUG-004: número de camiseta fuera de rango → 400", async () => {
        comoAdmin([{ id: "j1", rol: "jugador" }]);
        const res = await POST_JUGADOR(new Request(`${URL_BASE}/jugadores`, json("POST", { liga_id: "l1", equipo_id: EQ_A, usuario_id: "j1", numero: 150 })));
        expect(res.status).toBe(400);
    });
});

describe("ligas: partidos", () => {
    it("API-ADM-LIGAS-PAR-001: un equipo no juega contra sí mismo", async () => {
        comoAdmin();
        const res = await POST_PARTIDO(new Request(`${URL_BASE}/partidos`, json("POST", { liga_id: "l1", jornada: 1, local_id: EQ_A, visita_id: EQ_A })));
        expect(res.status).toBe(400);
    });

    it("API-ADM-LIGAS-PAR-002: rechaza equipos de otra liga", async () => {
        comoAdmin();
        const res = await POST_PARTIDO(new Request(`${URL_BASE}/partidos`, json("POST", { liga_id: "l1", jornada: 1, local_id: EQ_A, visita_id: EQ_OTRA })));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/pertenecer a esta liga/);
    });

    it("API-ADM-LIGAS-PAR-003: un empate en playoffs exige penales con ganador", async () => {
        comoAdmin();
        __setTableData("liga_partido", [partido({ fase: "final", jornada: null, llave: 1 })]);
        const sinPenales = await PUT_PARTIDO(new Request(`${URL_BASE}/partidos`, json("PUT", { id: "p1", estado: "jugado", goles_local: 1, goles_visita: 1 })));
        expect(sinPenales.status).toBe(400);
        const conPenales = await PUT_PARTIDO(new Request(`${URL_BASE}/partidos`, json("PUT", { id: "p1", estado: "jugado", goles_local: 1, goles_visita: 1, penales_local: 4, penales_visita: 3 })));
        expect(conPenales.status).toBe(200);
    });

    it("API-ADM-LIGAS-PAR-004: no se corrige un resultado ya usado en la ronda siguiente", async () => {
        comoAdmin();
        __setTableData("liga_partido", [
            partido({ fase: "semifinal", jornada: null, llave: 1 }),
            partido({ id: "f1", fase: "final", jornada: null, llave: 1 }),
        ]);
        const res = await PUT_PARTIDO(new Request(`${URL_BASE}/partidos`, json("PUT", { id: "p1", estado: "jugado", goles_local: 2, goles_visita: 0 })));
        expect(res.status).toBe(409);
    });

    it("API-ADM-LIGAS-PAR-005: los partidos de playoffs no se borran uno a uno", async () => {
        comoAdmin();
        __setTableData("liga_partido", [partido({ fase: "semifinal" })]);
        const res = await DELETE_PARTIDO(new Request(`${URL_BASE}/partidos?id=p1`, { method: "DELETE" }));
        expect(res.status).toBe(400);
    });
});

describe("ligas: equipos y playoffs", () => {
    it("API-ADM-LIGAS-EQ-001: un equipo con partidos no se borra", async () => {
        comoAdmin();
        __setTableData("liga_partido", [partido({})]);
        const res = await DELETE_EQUIPO(new Request(`${URL_BASE}/equipos?id=${EQ_A}`, { method: "DELETE" }));
        expect(res.status).toBe(409);
    });

    it("API-ADM-LIGAS-EQ-002: id con formato inválido → 400 (va dentro del filtro .or)", async () => {
        comoAdmin();
        const res = await DELETE_EQUIPO(new Request(`${URL_BASE}/equipos?id=${encodeURIComponent("x,local_id.neq.null")}`, { method: "DELETE" }));
        expect(res.status).toBe(400);
    });

    it("API-ADM-LIGAS-PO-001: no se generan dos veces", async () => {
        comoAdmin();
        __setTableData("liga_partido", [partido({ fase: "semifinal", llave: 1 })]);
        const res = await POST_PLAYOFFS(new Request(`${URL_BASE}/playoffs`, json("POST", { liga_id: "l1", accion: "generar", clasificados: 4 })));
        expect(res.status).toBe(409);
    });

    it("API-ADM-LIGAS-PO-002: más clasificados que equipos → 400", async () => {
        comoAdmin();
        __setTableData("liga_partido", []);
        const res = await POST_PLAYOFFS(new Request(`${URL_BASE}/playoffs`, json("POST", { liga_id: "l1", accion: "generar", clasificados: 4 })));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/al menos 4/);
    });

    it("API-ADM-LIGAS-PO-003: clasificados inválidos → 400", async () => {
        comoAdmin();
        const res = await POST_PLAYOFFS(new Request(`${URL_BASE}/playoffs`, json("POST", { liga_id: "l1", accion: "generar", clasificados: 3 })));
        expect(res.status).toBe(400);
    });
});
