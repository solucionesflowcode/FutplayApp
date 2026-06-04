import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";
import { mockPaymentStatus } from "@/tests/helpers/flow";

// ── Env vars ────────────────────────────────────────

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

// ── Module mocks ────────────────────────────────────

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

vi.mock("@/lib/flow", () => ({
    getFlowPaymentStatus: vi.fn(),
}));

// ── SUT ─────────────────────────────────────────────

import { GET } from "@/app/api/flow/confirm/route";
import { getFlowPaymentStatus } from "@/lib/flow";

// ── Helpers ─────────────────────────────────────────

function makeRequest(token?: string, boletaId?: string): Request {
    const params = new URLSearchParams();
    if (token !== undefined) params.set("token", token);
    if (boletaId !== undefined) params.set("boletaId", boletaId);
    return new Request(`http://localhost:3000/api/flow/confirm?${params}`, { method: "GET" });
}

const BOLETA_ID = "boleta-123";
const FLOW_TOKEN = "flow-token-abc";

// ── Tests ───────────────────────────────────────────

describe("GET /api/flow/confirm", () => {
    beforeEach(() => {
        __resetMocks();
        vi.mocked(getFlowPaymentStatus).mockReset();
    });

    it("retorna 400 si falta token o boletaId", async () => {
        const res1 = await GET(makeRequest(undefined, "b-1"));
        expect(res1.status).toBe(400);
        const json1 = await res1.json();
        expect(json1.error).toContain("token");

        const res2 = await GET(makeRequest("t-1", undefined));
        expect(res2.status).toBe(400);
        const json2 = await res2.json();
        expect(json2.error).toContain("boletaId");
    });

    it("retorna 404 si la boleta no existe", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2 }));
        __setTableData("boleta", null, { message: "No rows" });

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe("Boleta no encontrada");
    });

    it("retorna estado pagado si Flow aprueba y boleta estaba pendiente", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2 }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
    });

    it("retorna estado rechazado si Flow no aprueba (status !== 2)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 1 }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("rechazado");
    });

    it("retorna pendiente si getFlowPaymentStatus lanza error (sandbox fallback)", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("Sandbox error"));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pendiente");
    });

    it("retorna 'Ya procesado' si la boleta ya estaba pagada", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2 }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado" });

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
        expect(json.message).toBe("Ya procesado");
    });
});
