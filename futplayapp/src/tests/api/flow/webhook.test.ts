import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

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

import { POST } from "@/app/api/flow/webhook/route";
import { getFlowPaymentStatus } from "@/lib/flow";

// ── Helpers ─────────────────────────────────────────

function makeRequest(body: Record<string, string>, contentType: string = "application/x-www-form-urlencoded"): Request {
    let bodyStr: string;
    if (contentType.includes("application/json")) {
        bodyStr = JSON.stringify(body);
    } else {
        bodyStr = new URLSearchParams(body).toString();
    }
    return new Request("http://localhost:3000/api/flow/webhook", {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: bodyStr,
    });
}

const BOLETA_ID = "boleta-123";
const FLOW_TOKEN = "flow-token-abc";

// ── Tests ───────────────────────────────────────────

describe("POST /api/flow/webhook", () => {
    beforeEach(() => {
        __resetMocks();
        vi.mocked(getFlowPaymentStatus).mockReset();
    });

    // ── Input validation ──────────────────────────────

    it("retorna 400 si falta token", async () => {
        const res = await POST(makeRequest({ commerceOrder: BOLETA_ID, status: "2" }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Token requerido");
    });

    it("retorna 400 si content-type no es soportado", async () => {
        const res = await POST(makeRequest({ token: FLOW_TOKEN }, "text/plain"));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Unsupported content-type");
    });

    // ── Payment approved (status 2) ────────────────────

    it("marca boleta como pagada si status=2 (form-urlencoded)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 2, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("marca boleta como pagada si status=2 (JSON)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 2, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }, "application/json"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("retorna 404 si la boleta no existe", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 2, commerceOrder: "no-existe" });
        __setTableData("boleta", null, { message: "No rows" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: "no-existe", status: "2" }));

        expect(res.status).toBe(404);
    });

    it("retorna 'Ya procesado' si boleta ya está pagada sin recurrencia", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 2, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("Ya procesado");
    });

    // ── Payment rejected / cancelled ───────────────────

    it("marca boleta como rechazada si status=3", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 3, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "3" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("marca boleta como rechazada si status=4", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 4, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "4" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Recurring charge ───────────────────────────────

    it("crea nueva boleta para cobro recurrente si recurrencia activa", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 2, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("recurrencia", { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: true });
        __setTableData("plan", { id: "plan-1", precio: 15000 });
        __setTableData("boleta_item", { id: "item-nuevo" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("no crea nueva boleta si recurrencia no está activa", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue({ status: 2, commerceOrder: BOLETA_ID });
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("recurrencia", { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: false });
        __setTableData("plan", { id: "plan-1", precio: 15000 });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Fallback when getFlowPaymentStatus fails ──────

    it("usa datos del POST body como fallback si getFlowPaymentStatus falla", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("No services"));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("retorna OK sin procesar si falla getFlowPaymentStatus y faltan datos POST", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("No services"));

        const res = await POST(makeRequest({ token: FLOW_TOKEN }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });
});
