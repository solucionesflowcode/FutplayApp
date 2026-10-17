import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { createMockServerClient, __resetMocks, __setAuthUser, __setTableData } from "@/tests/mocks/supabase";

// Posición de juego en "Mi Perfil" (docs/migrations/2026-10-usuario-posicion.sql).

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

const ref = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof import("@/tests/mocks/supabase").createMockServerClient> }));

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => ref.client),
}));

import { GET, PUT } from "@/app/api/perfil/route";

function put(body: object): Request {
    return new Request("http://localhost:3000/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

function updates(): unknown[] {
    const fromSpy = ref.client.from as ReturnType<typeof vi.fn>;
    const payloads: unknown[] = [];
    fromSpy.mock.calls.forEach((call: unknown[], i: number) => {
        if (call[0] !== "usuario") return;
        for (const c of fromSpy.mock.results[i].value.update.mock.calls) payloads.push(c[0]);
    });
    return payloads;
}

beforeEach(() => {
    __resetMocks();
    __setAuthUser({ id: "u1", email: "ana@test.cl" });
    __setTableData("usuario", [{ id: "u1", nombre: "Ana", email: "ana@test.cl", rol: "jugador", rut: null, telefono: null, posicion: "arquero" }]);
    ref.client = createMockServerClient();
});

describe("/api/perfil — posición", () => {
    it("PER-POS-001: GET devuelve la posición", async () => {
        const json = await (await GET()).json();
        expect(json.posicion).toBe("arquero");
    });

    it("PER-POS-002: PUT guarda una posición válida", async () => {
        const res = await PUT(put({ posicion: "volante_creativo" }));
        expect(res.status).toBe(200);
        expect(updates()).toEqual([{ posicion: "volante_creativo" }]);
    });

    it("PER-POS-003: PUT con null o vacío la borra", async () => {
        await PUT(put({ posicion: "" }));
        expect(updates()).toEqual([{ posicion: null }]);
    });

    it("PER-POS-004: PUT rechaza una posición fuera del enum", async () => {
        const res = await PUT(put({ posicion: "enganche" }));
        expect(res.status).toBe(400);
        expect(updates()).toEqual([]);
    });

    it("PER-POS-005: RUT y teléfono vacíos (null) ya no rompen el guardado", async () => {
        const res = await PUT(put({ nombre: "Ana", rut: null, telefono: null, posicion: "arquero" }));
        expect(res.status).toBe(200);
        expect(updates()).toEqual([{ nombre: "Ana", rut: null, telefono: null, posicion: "arquero" }]);
    });
});
