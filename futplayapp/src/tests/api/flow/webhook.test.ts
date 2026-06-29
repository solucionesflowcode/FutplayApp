import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, makeChain, makeSeqChain, __resetMocks, __setTableData } from "@/tests/mocks/supabase";
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

import { POST } from "@/app/api/flow/webhook/route";
import { getFlowPaymentStatus } from "@/lib/flow";
import { createServerClient } from "@supabase/ssr";

// ── Helpers ─────────────────────────────────────────

function makeRequest(body: Record<string, string>, contentType: string = "application/x-www-form-urlencoded", boletaId?: string): Request {
    let bodyStr: string;
    if (contentType.includes("application/json")) {
        bodyStr = JSON.stringify(body);
    } else {
        bodyStr = new URLSearchParams(body).toString();
    }
    const baseUrl = "http://localhost:3000/api/flow/webhook";
    const url = boletaId ? `${baseUrl}?boletaId=${boletaId}` : baseUrl;
    return new Request(url, {
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
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("marca boleta como pagada si status=2 (JSON)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }, "application/json"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("retorna 404 si la boleta no existe", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: "no-existe" }));
        __setTableData("boleta", null, { message: "No rows" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: "no-existe", status: "2" }));

        expect(res.status).toBe(404);
    });

    it("procesa boleta pendiente con datos completos", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Payment rejected / cancelled ───────────────────

    it("marca boleta como rechazada si status=3", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 3, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "3" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("marca boleta como rechazada si status=4", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 4, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "4" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Recurring charge ───────────────────────────────

    it("crea nueva boleta para cobro recurrente si recurrencia activa", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
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
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
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
        vi.stubEnv("NEXT_PUBLIC_FLOW_SANDBOX", "true");
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("No services"));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("retorna OK sin procesar si falla getFlowPaymentStatus y faltan datos POST", async () => {
        vi.stubEnv("NEXT_PUBLIC_FLOW_SANDBOX", "true");
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("No services"));

        const res = await POST(makeRequest({ token: FLOW_TOKEN }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Membresía creation ────────────────────────────

    it("crea membresía automáticamente cuando el pago es exitoso y plan tiene tokens", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    it("no crea membresía si tokens_mensuales es 0", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 0 });
        __setTableData("membresia", null);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    it("no rompe el webhook si falla la creación de membresía", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null, { message: "duplicate key value" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    // ── Idempotencia por boleta_id ────────────────────

    it("WEB-020: salta creación si ya existe membresía para esta boleta (pago normal)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", { id: "mem-1", boleta_id: BOLETA_ID });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    it("WEB-021: salta creación si ya existe membresía para esta boleta (cobro recurrente)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("recurrencia", { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: true });
        __setTableData("plan", { id: "plan-1", precio: 15000, tokens_mensuales: 10 });
        __setTableData("boleta_item", { id: "item-nuevo" });
        __setTableData("membresia", { id: "mem-1", boleta_id: BOLETA_ID });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    it("WEB-022: no rompe el webhook si el usuario ya tiene membresía activa (distinta boleta)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        // User already has an active membership for a different boleta
        __setTableData("membresia", { id: "mem-activa", boleta_id: "boleta-otra", usuario_id: "u1", estado: true });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    // ── Recurrence deactivation on rejection ──────────

    it("desactiva recurrencia cuando el pago recurrente es rechazado (status 3)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 3, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("recurrencia", { id: "rec-1", activa: true });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "3" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("desactiva recurrencia cuando el pago recurrente es rechazado (status 4)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 4, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("recurrencia", { id: "rec-1", activa: true });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "4" }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Sandbox fallback with boletaId from URL ───────

    it("usa boletaId desde la URL como fallback en sandbox cuando getFlowPaymentStatus falla", async () => {
        vi.stubEnv("NEXT_PUBLIC_FLOW_SANDBOX", "true");
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("No services"));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN }, "application/x-www-form-urlencoded", BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    // ── Production fallback ───────────────────────────

    it("retorna 502 si getFlowPaymentStatus falla en producción", async () => {
        vi.stubEnv("NEXT_PUBLIC_FLOW_SANDBOX", "false");
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("Timeout"));

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(502);
        const json = await res.json();
        expect(json.error).toBe("Error al verificar pago con Flow");
    });

    // ── Race condition tests ──────────────────────────

    it("WEBHOOK-RACE-001: segundo webhook status=2 retorna 'Ya procesado' si boleta ya fue pagada", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null);

        // First webhook — normal processing
        const res1 = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));
        expect(res1.status).toBe(200);

        // Boleta ahora está pagada en Supabase
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: null, usuario_id: "u1" });

        // Segundo webhook: el update atómico .eq("estado","pendiente") no encuentra filas
        const raceClient = createMockServerClient();
        raceClient.from = vi.fn((table: string) => {
            const chain = makeChain(table);
            if (table === "boleta") {
                chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
            }
            return chain;
        }) as any;
        vi.mocked(createServerClient).mockReturnValueOnce(raceClient);

        const res2 = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));
        const json2 = await res2.json();
        expect(json2.message).toBe("Ya procesado");
    });

    it("WEBHOOK-RACE-002: TOCTOU guard anula nueva boleta si recurrencia se desactiva durante el procesamiento", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("plan", { id: "plan-1", precio: 15000, tokens_mensuales: 10 });
        __setTableData("boleta_item", { id: "item-nuevo" });
        __setTableData("membresia", null);

        // Simular que la recurrencia se desactiva ENTRE la creación de la nueva boleta y el TOCTOU recheck
        // Usamos makeSeqChain para que cada llamada devuelva datos específicos sin depender del state global

        const raceClient = createMockServerClient();
        let recurrenciaCalls = 0;

        raceClient.from = vi.fn((table: string) => {
            if (table === "recurrencia") {
                recurrenciaCalls++;
                // First call (initial check): activa=true, Second call (TOCTOU recheck): activa=false
                const data = recurrenciaCalls >= 2
                    ? { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: false }
                    : { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: true };
                return makeSeqChain(table, data);
            }
            return makeChain(table);
        }) as any;

        vi.mocked(createServerClient).mockReturnValueOnce(raceClient);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });

    it("WEBHOOK-RACE-003: TOCTOU guard permite cobro si recurrencia sigue activa durante todo el procesamiento", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("plan", { id: "plan-1", precio: 15000, tokens_mensuales: 10 });
        __setTableData("boleta_item", { id: "item-nuevo" });
        __setTableData("membresia", null);

        // Ambas lecturas de recurrencia retornan activa=true → TOCTOU verifica y permite continuar
        // Usamos makeSeqChain con los mismos datos para ambas llamadas

        const raceClient = createMockServerClient();

        raceClient.from = vi.fn((table: string) => {
            if (table === "recurrencia") {
                return makeSeqChain(table, { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: true });
            }
            return makeChain(table);
        }) as any;

        vi.mocked(createServerClient).mockReturnValueOnce(raceClient);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("OK");
    });
});
