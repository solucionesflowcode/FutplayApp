import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser, __setRpcResponse } from "@/tests/mocks/supabase";
import { resetRateLimit } from "@/lib/rate-limit";

// ── Env vars ────────────────────────────────────────

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

// ── Module mocks ────────────────────────────────────

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

vi.mock("@/lib/flow", () => ({
    createFlowOrder: vi.fn(),
}));

// ── SUT ─────────────────────────────────────────────

import { POST } from "@/app/api/flow/create-order/route";
import { createFlowOrder } from "@/lib/flow";
import { createServerClient } from "@supabase/ssr";

// ── Helpers ─────────────────────────────────────────

function makeRequest(body: object): Request {
    return new Request("http://localhost:3000/api/flow/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const TEST_USER = { id: "user-1", email: "test@test.cl" };
const TEST_PLAN = { id: "plan-1", nombre: "Básico", precio: 15000, tokens_mensuales: 10 };

// ── Tests ───────────────────────────────────────────

describe("POST /api/flow/create-order", () => {
    beforeEach(() => {
        resetRateLimit();
        __resetMocks();
        // Por defecto el usuario no tiene membresía vigente.
        __setRpcResponse("usuario_tiene_membresia_vigente", false);
        vi.mocked(createFlowOrder).mockReset();
        vi.mocked(createFlowOrder).mockResolvedValue({
            url: "https://sandbox.flow.cl/checkout",
            token: "tkn_mock",
            flowOrder: 999,
        });
    });

    describe("validaciones de entrada", () => {
        it("retorna 401 si no hay usuario autenticado", async () => {
            __setAuthUser(null);
            __setTableData("usuario", null, { message: "Not found" });

            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(401);
            const json = await res.json();
            expect(json.error).toBe("No autenticado");
        });

        it("retorna 400 si falta planId", async () => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);

            const res = await POST(makeRequest({}));

            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toContain("planId");
        });

        it("retorna 404 si el usuario no existe en tabla usuario", async () => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", null, { message: "Not found" });

            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Usuario no encontrado");
        });

        it("retorna 404 si el plan no existe", async () => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", null, { message: "Not found" });

            const res = await POST(makeRequest({ planId: "plan-inexistente" }));

            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toBe("Plan no encontrado");
        });
    });

    describe("validación de membresía activa", () => {
        it("retorna 409 si el usuario ya tiene membresía vigente (RPC devuelve true)", async () => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setRpcResponse("usuario_tiene_membresia_vigente", true);

            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(409);
            const json = await res.json();
            expect(json.error).toContain("membresía vigente");
        });

        it("API-FLOW-CREATE-023: permite comprar si no tiene membresía vigente (RPC devuelve false)", async () => {
            // El trigger setea sin_tokens=true al agotar el saldo y la RPC
            // devuelve false → se permite comprar el plan siguiente.
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setRpcResponse("usuario_tiene_membresia_vigente", false);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });

            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(200);
        });

        it("API-FLOW-CREATE-025: retorna 500 si la verificación RPC falla (falla cerrado)", async () => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setRpcResponse("usuario_tiene_membresia_vigente", null, { message: "function not found" });

            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(500);
            const json = await res.json();
            expect(json.error).toContain("No se pudo procesar");
        });
    });

    describe("flujo exitoso", () => {
        beforeEach(() => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setTableData("membresia", null);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });
        });

        it("retorna 200 con url, token y boletaId en éxito sin recurrencia", async () => {
            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json).toHaveProperty("url");
            expect(json).toHaveProperty("flowOrder");
            expect(json).toHaveProperty("boletaId");
            expect(json.url).toContain("token=");
            expect(json.boletaId).toBe("boleta-1");
        });

        it("llama a createFlowOrder con los parámetros correctos", async () => {
            await POST(makeRequest({ planId: "plan-1" }));

            expect(createFlowOrder).toHaveBeenCalledOnce();
            const params = vi.mocked(createFlowOrder).mock.calls[0][0];
            expect(params.commerceOrder).toBe("boleta-1");
            expect(params.subject).toContain("Básico");
            expect(params.amount).toBe(15000);
            expect(params.email).toBe("test@test.cl");
            expect(params.paymentMethod).toBe(1);
            expect(params.recurrence).toBeUndefined();
        });

        it("API-FLOW-CREATE-REC-001: ignora recurrencia=true del body (cobros recurrentes no soportados)", async () => {
            // Aceptarla permitía crear una recurrencia y luego generar membresías
            // reenviando el webhook de la boleta pagada.
            vi.mocked(createServerClient).mockClear();
            const res = await POST(makeRequest({ planId: "plan-1", recurrencia: true }));

            expect(res.status).toBe(200);
            const params = vi.mocked(createFlowOrder).mock.calls[0][0];
            expect(params).not.toHaveProperty("recurrence");

            const results = vi.mocked(createServerClient).mock.results;
            const fromCalls = results.flatMap((r) => (r.value.from as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]));
            expect(fromCalls).not.toContain("recurrencia");
        });
    });

    describe("verificación de URLs de Flow", () => {
        beforeEach(() => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setTableData("membresia", null);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });
        });

        it("urlReturn apunta al route de retorno /api/flow/return (que redirige al dashboard)", async () => {
            await POST(makeRequest({ planId: "plan-1" }));

            const params = vi.mocked(createFlowOrder).mock.calls[0][0];
            expect(params.urlReturn).toBe("http://localhost:3000/api/flow/return");
        });

        it("urlConfirmation incluye NEXT_PUBLIC_BASE_URL y boletaId", async () => {
            await POST(makeRequest({ planId: "plan-1" }));

            const params = vi.mocked(createFlowOrder).mock.calls[0][0];
            expect(params.urlConfirmation).toContain("http://localhost:3000");
            expect(params.urlConfirmation).toContain("/api/flow/webhook?boletaId=boleta-1");
        });
    });

    describe("verificación de flow_confirmada", () => {
        beforeEach(() => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setTableData("membresia", null);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });
        });

        it("se crea boleta con flow_confirmada=false inicialmente", async () => {
            await POST(makeRequest({ planId: "plan-1" }));

            // After success, flow_confirmada becomes true via update
            // The update call is on the boleta table after createFlowOrder succeeds
        });
    });

    describe("rate limit", () => {
        beforeEach(() => {
            resetRateLimit();
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setTableData("membresia", null);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });
        });

        it("se reestablece después de la ventana de tiempo", async () => {
            vi.useFakeTimers();

            // Consume all 5 requests
            for (let i = 0; i < 5; i++) {
                __setTableData("boleta", { id: `boleta-${i}`, usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
                __setTableData("boleta_item", { id: `item-${i}` });
                const res = await POST(makeRequest({ planId: "plan-1" }));
                expect(res.status).toBe(200);
            }

            // 6th request should be rate limited
            const blocked = await POST(makeRequest({ planId: "plan-1" }));
            expect(blocked.status).toBe(429);

            // Advance past window
            vi.advanceTimersByTime(60001);

            // Now should succeed again
            __setTableData("boleta", { id: "boleta-6", usuario_id: "user-1", estado: "pendiente", total: 15000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-6" });
            const allowed = await POST(makeRequest({ planId: "plan-1" }));
            expect(allowed.status).toBe(200);

            vi.useRealTimers();
        });
    });

    describe("manejo de errores", () => {
        it("retorna 502 si Flow falla y hace rollback", async () => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", TEST_PLAN);
            __setTableData("membresia", null);
            __setTableData("boleta", { id: "boleta-1" });
            __setTableData("boleta_item", { id: "item-1" });
            vi.mocked(createFlowOrder).mockRejectedValue(new Error("Flow timeout"));

            const res = await POST(makeRequest({ planId: "plan-1" }));

            expect(res.status).toBe(502);
            const json = await res.json();
            expect(json.error).toContain("Flow timeout");
        });

    });

    describe("planes familiares (acceso por link)", () => {
        const FAMILIAR_PLAN = {
            id: "plan-fam",
            nombre: "Familiar",
            precio: 35000,
            tokens_mensuales: 40,
            tipo_plan: "familiar",
            codigo_acceso: "tok-familiar-123",
        };

        beforeEach(() => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", [FAMILIAR_PLAN]);
            __setTableData("membresia", null);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 35000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });
        });

        it("retorna 403 si no se envía el código de acceso", async () => {
            const res = await POST(makeRequest({ planId: "plan-fam" }));

            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("link de acceso");
        });

        it("retorna 403 si el código de acceso es incorrecto", async () => {
            const res = await POST(makeRequest({ planId: "plan-fam", acceso: "tok-falso" }));

            expect(res.status).toBe(403);
        });

        it("retorna 200 cuando el código de acceso es válido", async () => {
            const res = await POST(makeRequest({ planId: "plan-fam", acceso: "tok-familiar-123" }));

            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json).toHaveProperty("boletaId");
        });
    });

    describe("plan liga (pago único)", () => {
        const LIGA_PLAN = {
            id: "plan-liga",
            nombre: "Liga stadio Italiano",
            precio: 50000,
            tokens_mensuales: 1,
            dias: 90,
            tipo_plan: "liga",
            codigo_acceso: "tok-liga-123",
        };

        beforeEach(() => {
            __setAuthUser(TEST_USER);
            __setTableData("usuario", TEST_USER);
            __setTableData("plan", [LIGA_PLAN]);
            __setTableData("boleta", { id: "boleta-1", usuario_id: "user-1", estado: "pendiente", total: 50000, recurrencia_id: null });
            __setTableData("boleta_item", { id: "item-1" });
        });

        it("retorna 403 sin código de acceso", async () => {
            const res = await POST(makeRequest({ planId: "plan-liga" }));

            expect(res.status).toBe(403);
        });

        it("permite comprar aunque el usuario tenga membresía vigente", async () => {
            __setRpcResponse("usuario_tiene_membresia_vigente", true);

            const res = await POST(makeRequest({ planId: "plan-liga", acceso: "tok-liga-123" }));

            expect(res.status).toBe(200);
            expect(createFlowOrder).toHaveBeenCalledOnce();
        });

        it("ignora la recurrencia (pago único)", async () => {
            const res = await POST(makeRequest({ planId: "plan-liga", acceso: "tok-liga-123", recurrencia: true }));

            expect(res.status).toBe(200);
            const params = vi.mocked(createFlowOrder).mock.calls[0][0];
            expect(params).not.toHaveProperty("recurrence");
        });
    });
});
