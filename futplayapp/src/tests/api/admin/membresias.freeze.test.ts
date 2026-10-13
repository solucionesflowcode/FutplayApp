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

import { POST } from "@/app/api/admin/membresias/freeze/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

const DAY = 24 * 60 * 60 * 1000;

function buildMembership(overrides: Record<string, unknown> = {}) {
    const now = new Date();
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
        const now = new Date();
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
        const now = new Date();
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
        const now = new Date();
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

    // ── Reservas futuras al congelar ────────────────────────────

    /** Cliente admin (createClient de supabase-js) creado por la última llamada. */
    async function clienteAdmin() {
        const { createClient } = await import("@supabase/supabase-js");
        const results = vi.mocked(createClient).mock.results;
        return results[results.length - 1].value as ReturnType<typeof createMockServerClient>;
    }

    const enDias = (d: number) => new Date(Date.now() + d * DAY).toISOString();

    it("FRZ-013: congelar cancela las reservas futuras abiertas y devuelve un token por clase (no por partido)", async () => {
        __setTableData("membresia", [buildMembership()]);
        __setTableData("clase_usuario", [
            { id: "r-clase", usuario_id: "u1", asistencia: "pendiente", clase: { fecha_hora: enDias(2), tipo_evento: "entrenamiento" } },
            { id: "r-partido", usuario_id: "u1", asistencia: "sin_confirmar", clase: { fecha_hora: enDias(3), tipo_evento: "partido" } },
            { id: "r-pasada", usuario_id: "u1", asistencia: "pendiente", clase: { fecha_hora: enDias(-1), tipo_evento: "entrenamiento" } },
            { id: "r-cancelada", usuario_id: "u1", asistencia: "cancelado", clase: { fecha_hora: enDias(4), tipo_evento: "entrenamiento" } },
        ]);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.reservasCanceladas).toBe(2); // la clase y el partido futuros
        const admin = await clienteAdmin();
        const devoluciones = admin.rpc.mock.calls.filter((c: unknown[]) => c[0] === "devolver_token");
        expect(devoluciones).toHaveLength(1); // el partido no devuelve token
    });

    it("FRZ-014: sin reservas futuras, congela sin devolver tokens", async () => {
        __setTableData("membresia", [buildMembership()]);
        __setTableData("clase_usuario", []);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));

        expect((await res.json()).reservasCanceladas).toBe(0);
        expect((await clienteAdmin()).rpc).not.toHaveBeenCalled();
    });

    // ── Doble clic ──────────────────────────────────────────────

    /** Simula que otro pedido cambió la membresía justo antes del update. */
    async function conCambioAntesDelUpdate(fila: Record<string, unknown>) {
        const { createClient } = await import("@supabase/supabase-js");
        vi.mocked(createClient).mockImplementation((() => {
            const c = createMockServerClient();
            const from = c.from;
            c.from = vi.fn((tabla: string) => {
                const chain = from(tabla);
                if (tabla === "membresia") {
                    const update = chain.update;
                    chain.update = vi.fn((...a: unknown[]) => {
                        __setTableData("membresia", [fila]);
                        return update(...a);
                    });
                }
                return chain;
            });
            return c;
        }) as never);
        return () => vi.mocked(createClient).mockImplementation((() => createMockServerClient()) as never);
    }

    it("FRZ-015: doble clic en Reactivar no corre el vencimiento dos veces", async () => {
        const congeladaHace5 = buildMembership({ congelada: true, fecha_congelamiento: enDias(-5) });
        __setTableData("membresia", [congeladaHace5]);
        // El primer pedido ya la reactivó cuando llega el update del segundo.
        const restaurar = await conCambioAntesDelUpdate({ ...congeladaHace5, congelada: false, fecha_congelamiento: null });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "reactivar" }),
        }));
        restaurar();

        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain("no está congelada");
    });

    it("FRZ-016: doble clic en Congelar no pisa la fecha de congelamiento", async () => {
        const activa = buildMembership();
        __setTableData("membresia", [activa]);
        __setTableData("clase_usuario", []);
        const restaurar = await conCambioAntesDelUpdate({ ...activa, congelada: true, fecha_congelamiento: enDias(0) });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/membresias/freeze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membreciaId: "m1", accion: "congelar" }),
        }));
        restaurar();

        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain("ya está congelada");
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