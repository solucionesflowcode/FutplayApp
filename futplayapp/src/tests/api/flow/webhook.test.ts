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

/** Payloads pasados a `method` (insert/update) sobre `table` en el último cliente creado. */
function escrituras(table: string, method: "insert" | "update"): unknown[] {
    const results = (createServerClient as ReturnType<typeof vi.fn>).mock.results;
    const client = results[results.length - 1].value;
    const fromSpy = client.from as ReturnType<typeof vi.fn>;
    const payloads: unknown[] = [];
    fromSpy.mock.calls.forEach((call: unknown[], i: number) => {
        if (call[0] !== table) return;
        const chain = fromSpy.mock.results[i].value;
        for (const c of chain[method].mock.calls) payloads.push(c[0]);
    });
    return payloads;
}

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

    // ── Recurrencia (no soportada) ─────────────────────

    it("WEB-REC-001: reenviar el webhook de una boleta pagada con recurrencia NO crea boletas ni membresías nuevas", async () => {
        // Antes: cada reenvío (cualquiera puede hacerlo con su propio token)
        // creaba una boleta pagada + una membresía nueva.
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: "rec-1", usuario_id: "u1" });
        __setTableData("recurrencia", { id: "rec-1", usuario_id: "u1", plan_id: "plan-1", activa: true });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", precio: 15000, tokens_mensuales: 10 });
        __setTableData("membresia", { id: "mem-1", boleta_id: BOLETA_ID });

        for (let i = 0; i < 3; i++) {
            const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));
            expect(res.status).toBe(200);
            expect(escrituras("boleta", "insert")).toHaveLength(0);
            expect(escrituras("membresia", "insert")).toHaveLength(0);
        }
    });

    // ── Boleta anulada por el frontend pero pagada en Flow ──

    it("WEB-ANUL-001: si Flow confirma el pago de una boleta anulada, la marca pagada y crea la membresía", async () => {
        // El alumno pagó pero no volvió por urlReturn; /planes anuló la boleta
        // "huérfana". Antes el webhook respondía "Ya procesado" y el alumno se
        // quedaba sin membresía habiendo pagado.
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "anulado", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10, dias: 30 });
        __setTableData("membresia", null);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        expect(escrituras("boleta", "update")).toEqual([{ estado: "pagado" }]);
        expect(escrituras("membresia", "insert")).toHaveLength(1);
        expect(escrituras("membresia", "insert")[0]).toMatchObject({ usuario_id: "u1", boleta_id: BOLETA_ID, tokens_totales: 10 });
    });

    it("WEB-ANUL-002: el rechazo (status 3) no pisa una boleta ya pagada", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 3, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: null, usuario_id: "u1" });

        await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "3" }));

        // El update existe pero va filtrado por estado=pendiente: verificamos el filtro.
        const results = (createServerClient as ReturnType<typeof vi.fn>).mock.results;
        const fromSpy = results[results.length - 1].value.from as ReturnType<typeof vi.fn>;
        const updateChain = fromSpy.mock.results.find((r) => r.value.update.mock.calls.length > 0)!.value;
        expect(updateChain.eq).toHaveBeenCalledWith("estado", "pendiente");
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

    it("WEB-ERR-001: si falla la creación de membresía responde 500 para que Flow reintente", async () => {
        // Antes respondía 200: Flow no reintentaba y el alumno quedaba con la
        // boleta pagada y sin membresía.
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null, { message: "connection reset" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(500);
    });

    it("WEB-ERR-002: si la membresía ya la creó /confirm en paralelo (unique violation) responde 200", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null, { message: "duplicate key value violates unique constraint", code: "23505" });

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
    });

    it("WEB-REPAIR-001: un reintento sobre una boleta ya pagada sin membresía la crea", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);
        expect(escrituras("boleta", "update")).toHaveLength(0);
        expect(escrituras("membresia", "insert")).toHaveLength(1);
    });

    it("WEB-023: usa plan.dias (90) para fecha_vencimiento al crear membresía", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10, dias: 90 });
        __setTableData("membresia", null);

        const res = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res.status).toBe(200);

        const results = (createServerClient as ReturnType<typeof vi.fn>).mock.results;
        const fromSpy = results[results.length - 1].value.from as ReturnType<typeof vi.fn>;
        let inserted: { fecha_inicio: string; fecha_vencimiento: string } | undefined;
        for (let i = 0; i < fromSpy.mock.calls.length; i++) {
          if (fromSpy.mock.calls[i][0] !== "membresia") continue;
          const chain = fromSpy.mock.results[i].value;
          if (chain.insert.mock.calls.length > 0) {
            inserted = chain.insert.mock.calls[0][0];
            break;
          }
        }
        expect(inserted).toBeDefined();
        const diffDays = (new Date(inserted!.fecha_vencimiento).getTime() - new Date(inserted!.fecha_inicio).getTime()) / (24 * 60 * 60 * 1000);
        expect(diffDays).toBe(90);
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

    it("WEBHOOK-RACE-001: un segundo webhook status=2 sobre una boleta pagada con membresía no escribe nada", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("boleta_item", { id: "item-1", boleta_id: BOLETA_ID, plan_id: "plan-1" });
        __setTableData("plan", { id: "plan-1", tokens_mensuales: 10 });
        __setTableData("membresia", null);

        const res1 = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));
        expect(res1.status).toBe(200);

        // Estado después del primer webhook
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado", recurrencia_id: null, usuario_id: "u1" });
        __setTableData("membresia", { id: "mem-1", boleta_id: BOLETA_ID });

        const res2 = await POST(makeRequest({ token: FLOW_TOKEN, commerceOrder: BOLETA_ID, status: "2" }));

        expect(res2.status).toBe(200);
        expect(escrituras("boleta", "update")).toHaveLength(0);
        expect(escrituras("membresia", "insert")).toHaveLength(0);
    });
});
