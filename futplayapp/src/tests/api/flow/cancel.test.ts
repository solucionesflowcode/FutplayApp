import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

// ── Env vars ────────────────────────────────────────

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

// ── Module mocks ────────────────────────────────────

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({
        getAll: () => [],
        set: vi.fn(),
    })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

// ── SUT ─────────────────────────────────────────────

import { POST } from "@/app/api/flow/cancel/route";

// ── Helpers ─────────────────────────────────────────

function makeRequest(body: object): Request {
    return new Request("http://localhost:3000/api/flow/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const USER_ID = "user-123";
const BOLETA_ID = "boleta-123";

// ── Tests ───────────────────────────────────────────

describe("POST /api/flow/cancel", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: USER_ID });
    });

    it("retorna 400 si falta boletaId", async () => {
        const res = await POST(makeRequest({}));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("boletaId requerido");
    });

    it("retorna 404 si la boleta no existe", async () => {
        __setTableData("boleta", null, { message: "No rows" });

        const res = await POST(makeRequest({ boletaId: BOLETA_ID }));

        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe("Boleta no encontrada");
    });

    it("retorna 403 si la boleta no pertenece al usuario", async () => {
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", usuario_id: "other-user" });

        const res = await POST(makeRequest({ boletaId: BOLETA_ID }));

        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toBe("No autorizado");
    });

    it("retorna 200 con estado anulado si la boleta estaba pendiente", async () => {
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", usuario_id: USER_ID });

        const res = await POST(makeRequest({ boletaId: BOLETA_ID }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("anulado");
    });

    it("no modifica boleta ya pagada", async () => {
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", usuario_id: USER_ID });

        const res = await POST(makeRequest({ boletaId: BOLETA_ID }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
        expect(json.message).toContain("No requiere cancelación");
    });

    it("no modifica boleta ya anulada", async () => {
        __setTableData("boleta", { id: BOLETA_ID, estado: "anulado", usuario_id: USER_ID });

        const res = await POST(makeRequest({ boletaId: BOLETA_ID }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("anulado");
        expect(json.message).toContain("No requiere cancelación");
    });
});
