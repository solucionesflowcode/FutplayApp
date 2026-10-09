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

// Payloads enviados a .insert()/.update() por el cliente admin
const captured = vi.hoisted(() => ({ inserts: [] as any[], updates: [] as any[] }));

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => {
        const client = createMockServerClient();
        const from = client.from;
        client.from = vi.fn((table: string) => {
            const chain = from(table);
            const insert = chain.insert;
            const update = chain.update;
            chain.insert = vi.fn((payload: any) => { captured.inserts.push(payload); return insert(payload); });
            chain.update = vi.fn((payload: any) => { captured.updates.push(payload); return update(payload); });
            return chain;
        });
        return client;
    }),
}));

import { POST, PUT } from "@/app/api/admin/membresias/gestion/route";

const URL_GESTION = "http://localhost:3000/api/admin/membresias/gestion";

function makeRequest(method: "POST" | "PUT", body: object): Request {
    return new Request(URL_GESTION, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("/api/admin/membresias/gestion", () => {
    beforeEach(() => {
        __resetMocks();
        captured.inserts.length = 0;
        captured.updates.length = 0;
        __setAuthUser({ id: "admin-1", email: "admin@test.cl" });
        __setTableData("usuario", { id: "admin-1", rol: "administrador" });
    });

    describe("PUT — recálculo de flags al editar tokens", () => {
        it("GEST-001: al dejar tokens_usados = tokens_totales cierra la membresía (sin_tokens=true, estado=false)", async () => {
            __setTableData("membresia", { id: "m1", tokens_usados: 3, tokens_totales: 12, sin_tokens: false });

            const res = await PUT(makeRequest("PUT", { id: "m1", tokens_usados: 12 }));

            expect(res.status).toBe(200);
            expect(captured.updates[0]).toMatchObject({ tokens_usados: 12, sin_tokens: true, estado: false });
        });

        it("GEST-002: agotar tokens prevalece aunque el admin envíe estado=true", async () => {
            __setTableData("membresia", { id: "m1", tokens_usados: 0, tokens_totales: 4, sin_tokens: false });

            const res = await PUT(makeRequest("PUT", { id: "m1", tokens_usados: 4, estado: true }));

            expect(res.status).toBe(200);
            expect(captured.updates[0]).toMatchObject({ sin_tokens: true, estado: false });
        });

        it("GEST-003: bajar tokens_totales por debajo de los usados también la cierra", async () => {
            __setTableData("membresia", { id: "m1", tokens_usados: 4, tokens_totales: 8, sin_tokens: false });

            await PUT(makeRequest("PUT", { id: "m1", tokens_totales: 4 }));

            expect(captured.updates[0]).toMatchObject({ tokens_totales: 4, sin_tokens: true, estado: false });
        });

        it("GEST-004: devolver tokens a una membresía agotada la reactiva", async () => {
            __setTableData("membresia", { id: "m1", tokens_usados: 4, tokens_totales: 4, sin_tokens: true });

            await PUT(makeRequest("PUT", { id: "m1", tokens_usados: 2 }));

            expect(captured.updates[0]).toMatchObject({ tokens_usados: 2, sin_tokens: false, estado: true });
        });

        it("GEST-005: con tokens disponibles en una membresía no agotada no toca estado", async () => {
            __setTableData("membresia", { id: "m1", tokens_usados: 1, tokens_totales: 4, sin_tokens: false });

            await PUT(makeRequest("PUT", { id: "m1", tokens_usados: 2 }));

            expect(captured.updates[0]).toEqual({ tokens_usados: 2 });
        });

        it("GEST-006: si no se tocan los tokens no consulta la membresía ni recalcula", async () => {
            const res = await PUT(makeRequest("PUT", { id: "m1", fecha_vencimiento: "2026-12-31T00:00:00.000Z" }));

            expect(res.status).toBe(200);
            expect(captured.updates[0]).toEqual({ fecha_vencimiento: "2026-12-31T00:00:00.000Z" });
        });

        it("GEST-007: 404 si la membresía a editar no existe", async () => {
            __setTableData("membresia", null, { message: "No rows found", code: "PGRST116" });

            const res = await PUT(makeRequest("PUT", { id: "no-existe", tokens_usados: 1 }));

            expect(res.status).toBe(404);
            expect(captured.updates).toHaveLength(0);
        });

        it("GEST-008: 403 si no es administrador", async () => {
            __setTableData("usuario", { id: "user-1", rol: "jugador" });

            const res = await PUT(makeRequest("PUT", { id: "m1", tokens_usados: 1 }));

            expect(res.status).toBe(403);
        });
    });

    describe("POST — creación manual", () => {
        const BASE = {
            usuario_id: "u1",
            plan_id: "p1",
            fecha_inicio: "2026-10-01T00:00:00.000Z",
            fecha_vencimiento: "2026-10-31T00:00:00.000Z",
        };

        it("GEST-009: una membresía nueva con tokens disponibles queda activa", async () => {
            const res = await POST(makeRequest("POST", { ...BASE, tokens_totales: 4, tokens_usados: 0 }));

            expect(res.status).toBe(200);
            expect(captured.inserts[0]).toMatchObject({ estado: true, sin_tokens: false });
        });

        it("GEST-010: una membresía creada ya agotada queda cerrada", async () => {
            const res = await POST(makeRequest("POST", { ...BASE, tokens_totales: 4, tokens_usados: 4 }));

            expect(res.status).toBe(200);
            expect(captured.inserts[0]).toMatchObject({ estado: false, sin_tokens: true });
        });
    });
});
