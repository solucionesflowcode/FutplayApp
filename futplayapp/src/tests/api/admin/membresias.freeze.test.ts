import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";
import { ahoraChile } from "@/lib/fechas";

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

import { POST } from "@/app/api/admin/membresias/freeze/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

const DAY = 24 * 60 * 60 * 1000;

function buildMembership(overrides: Record<string, unknown> = {}) {
    const now = ahoraChile();
    return {
        id: "m1",
        usuario_id: "u1",
        plan_id: "p1",
        estado: true,
        congelada: false,
        fecha_inicio: new Date(now.getTime() - 10 * DAY).toISOString(),
        fecha_vencimiento: new Date(now.getTime() + 15 * DAY).toISOString(),
        fecha_congelamiento: null,
        ...overrides,
    };
}

describe("POST /api/admin/membresias/freeze", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    it("FRZ-001: devuelve 403 si no hay usuario autenticado", async () => {
        __setAuthUser(null);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(403);
    });

    it("FRZ-002: devuelve 403 si no es administrador", async () => {
        __setTableData("usuario", { id: "user-1", rol: "jugador" });
        __setAuthUser({ id: "user-1", email: "user@test.cl" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(403);
    });

    it("FRZ-003: devuelve 400 si falta membreciaId", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "congelar" }),
        }));

        expect(res.status).toBe(400);
    });

    it("FRZ-004: devuelve 400 si accion no es congelar/reactivar", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "pausar" }),
        }));

        expect(res.status).toBe(400);
    });

    it("FRZ-005: congelar una membresía activa vigente retorna ok", async () => {
        __setTableData("membresia", [buildMembership()]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.congelada).toBe(true);
    });

    it("FRZ-006: congelar una membresía ya congelada retorna 400", async () => {
        const now = ahoraChile();
        __setTableData("membresia", [buildMembership({
            congelada: true,
            fecha_congelamiento: new Date(now.getTime() - 2 * DAY).toISOString(),
        })]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("ya está congelada");
    });

    it("FRZ-007: congelar una membresía inactiva retorna 400", async () => {
        __setTableData("membresia", [buildMembership({ estado: false })]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("activa");
    });

    it("FRZ-008: congelar una membresía vencida retorna 400", async () => {
        const now = ahoraChile();
        __setTableData("membresia", [buildMembership({
            fecha_vencimiento: new Date(now.getTime() - 5 * DAY).toISOString(),
        })]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("vigencia");
    });

    it("FRZ-009: congelar una membresía inexistente retorna 404", async () => {
        __setTableData("membresia", []);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "no-existe", accion: "congelar" }),
        }));

        expect(res.status).toBe(404);
    });

    it("FRZ-010: reactivar mueve fecha_vencimiento por la duración del congelamiento", async () => {
        const now = ahoraChile();
        const fechaCongelamiento = new Date(now.getTime() - 5 * DAY);
        const vencimientoBase = new Date(now.getTime() + 15 * DAY);
        __setTableData("membresia", [buildMembership({
            congelada: true,
            fecha_congelamiento: fechaCongelamiento.toISOString(),
            fecha_vencimiento: vencimientoBase.toISOString(),
        })]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "reactivar" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.congelada).toBe(false);

        const actualShift = new Date(json.fecha_vencimiento).getTime() - vencimientoBase.getTime();
        const esperadoShift = 5 * DAY;
        expect(Math.abs(actualShift - esperadoShift)).toBeLessThan(5000);
        expect(new Date(json.fecha_vencimiento).getTime()).toBeGreaterThan(now.getTime());
    });

    it("FRZ-011: reactivar una membresía no congelada retorna 400", async () => {
        __setTableData("membresia", [buildMembership()]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "reactivar" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("no está congelada");
    });

    it("FRZ-012: reactivar sin fecha_congelamiento retorna 400", async () => {
        __setTableData("membresia", [buildMembership({
            congelada: true,
            fecha_congelamiento: null,
        })]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "reactivar" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("fecha de congelamiento");
    });
});