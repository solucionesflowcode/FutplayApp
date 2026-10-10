import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

const captured = vi.hoisted(() => ({ inserts: [] as unknown[], updates: [] as unknown[] }));

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => {
        const client = createMockServerClient();
        const from = client.from;
        client.from = vi.fn((table: string) => {
            const chain = from(table);
            const insert = chain.insert;
            const update = chain.update;
            chain.insert = vi.fn((p: unknown) => { captured.inserts.push(p); return insert(p); });
            chain.update = vi.fn((p: unknown) => { captured.updates.push(p); return update(p); });
            return chain;
        });
        return client;
    }),
}));

import { POST } from "@/app/api/auth/link-usuario/route";

const AUTH_USER = { id: "auth-real", email: "alumno@test.cl", user_metadata: { full_name: "Alumno Real" } };

function link(opts: { token?: string; body?: object } = {}): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    return POST(new Request("http://localhost:3000/api/auth/link-usuario", {
        method: "POST",
        headers,
        body: JSON.stringify(opts.body ?? {}),
    }));
}

describe("POST /api/auth/link-usuario", () => {
    beforeEach(() => {
        __resetMocks();
        captured.inserts.length = 0;
        captured.updates.length = 0;
    });

    it("LINK-001: 401 sin Authorization (antes no tenía autenticación)", async () => {
        const res = await link({ body: { email: "victima@test.cl", id: "atacante" } });

        expect(res.status).toBe(401);
        expect(captured.inserts).toHaveLength(0);
        expect(captured.updates).toHaveLength(0);
    });

    it("LINK-002: 401 si el token no corresponde a un usuario válido", async () => {
        __setAuthUser(null);

        const res = await link({ token: "token-invalido" });

        expect(res.status).toBe(401);
    });

    it("LINK-003: usa id y email del token, ignorando los del body", async () => {
        __setAuthUser(AUTH_USER);
        __setTableData("usuario", null);

        const res = await link({ token: "tok", body: { email: "victima@test.cl", id: "id-atacante", nombre: "X" } });

        expect(res.status).toBe(200);
        expect(captured.inserts[0]).toEqual({ id: "auth-real", nombre: "Alumno Real", email: "alumno@test.cl", rol: "jugador" });
    });

    it("LINK-004: si la fila existe con otro id, la reasigna al id del token", async () => {
        __setAuthUser(AUTH_USER);
        __setTableData("usuario", { id: "id-viejo", nombre: "Alumno", rol: "jugador", email: "alumno@test.cl" });

        await link({ token: "tok", body: { id: "id-atacante" } });

        expect(captured.updates).toEqual([{ id: "auth-real" }]);
    });

    it("LINK-005: si la fila ya tiene el id correcto no escribe nada", async () => {
        __setAuthUser(AUTH_USER);
        __setTableData("usuario", { id: "auth-real", nombre: "Alumno", rol: "jugador", email: "alumno@test.cl" });

        const res = await link({ token: "tok" });

        expect((await res.json()).usuario).toEqual({ id: "auth-real", nombre: "Alumno", rol: "jugador" });
        expect(captured.inserts).toHaveLength(0);
        expect(captured.updates).toHaveLength(0);
    });
});
