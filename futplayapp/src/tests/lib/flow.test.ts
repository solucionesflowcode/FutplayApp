import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

// ── Mock env vars before module loads ──────────────

const TEST_API_KEY = "TEST_API_KEY_12345";
const TEST_SECRET_KEY = "TEST_SECRET_KEY_12345";

vi.stubEnv("FLOW_API_KEY", TEST_API_KEY);
vi.stubEnv("FLOW_SECRET_KEY", TEST_SECRET_KEY);
vi.stubEnv("NEXT_PUBLIC_FLOW_SANDBOX", "true");

// ── Module under test ──────────────────────────────

import { createFlowOrder, getFlowPaymentStatus } from "@/lib/flow";

// ── Helpers ────────────────────────────────────────

function mockFetch(response: object, status = 200) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(response), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
    );
}

const MINIMAL_PARAMS = {
    commerceOrder: "ord-001",
    subject: "Test Plan",
    amount: 19990,
    email: "user@test.cl",
    urlConfirmation: "https://example.com/api/flow/webhook",
    urlReturn: "http://localhost:3000/pagos?token={token}",
};

// ── Tests ──────────────────────────────────────────

describe("createFlowOrder", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("llama a Flow sandbox /payment/create con method POST y content-type correcto", async () => {
        const fetchSpy = mockFetch({ url: "https://flow.cl/checkout", token: "tkn_abc", flowOrder: 42 });

        await createFlowOrder(MINIMAL_PARAMS);

        expect(fetchSpy).toHaveBeenCalledOnce();
        const [url, opts] = fetchSpy.mock.calls[0];
        expect(url).toBe("https://sandbox.flow.cl/api/payment/create");
        expect(opts?.method).toBe("POST");
        expect(opts?.headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded" });
    });

    it("incluye apiKey, commerceOrder, amount, email y firma s en el body", async () => {
        const fetchSpy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder(MINIMAL_PARAMS);

        const body = fetchSpy.mock.calls[0][1]?.body as string;
        expect(body).toContain(`apiKey=${TEST_API_KEY}`);
        expect(body).toContain("commerceOrder=ord-001");
        expect(body).toContain("amount=19990");
        expect(body).toContain("email=user%40test.cl");
        expect(body).toContain("s=");
    });

    it("codifica espacios como + (no %20)", async () => {
        const fetchSpy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder({
            ...MINIMAL_PARAMS,
            subject: "Plan Básico",
        });

        const body = fetchSpy.mock.calls[0][1]?.body as string;
        expect(body).not.toContain("%20");
        expect(body).toContain("subject=Plan+B%C3%A1sico");
    });

    it("no escapa brackets [] en keys del body", async () => {
        // Verificar que toUrlEncoded preserva [] literales
        // La única key con [] potencial sería si pasáramos recurrence[period],
        // pero enviamos recurrence como flat param (period=30)
        // Confirmamos que el encoding general no escapa []
        const fetchSpy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder(MINIMAL_PARAMS);

        const body = fetchSpy.mock.calls[0][1]?.body as string;
        // Si hubiera %5B o %5D, sería un bug
        expect(body).not.toContain("%5B");
        expect(body).not.toContain("%5D");
    });

    it("incluye recurrence como flat param cuando se especifica", async () => {
        const fetchSpy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder({
            ...MINIMAL_PARAMS,
            recurrence: { period: 30 },
        });

        const body = fetchSpy.mock.calls[0][1]?.body as string;
        expect(body).toContain("recurrence=30");
    });

    it("no incluye recurrence si no se especifica", async () => {
        const fetchSpy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder(MINIMAL_PARAMS);

        const body = fetchSpy.mock.calls[0][1]?.body as string;
        expect(body).not.toContain("recurrence");
    });

    it("incluye paymentMethod y timeout si se pasan", async () => {
        const fetchSpy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder({
            ...MINIMAL_PARAMS,
            paymentMethod: 9,
            timeout: 600,
        });

        const body = fetchSpy.mock.calls[0][1]?.body as string;
        expect(body).toContain("paymentMethod=9");
        expect(body).toContain("timeout=600");
    });

    it("retorna url, token y flowOrder desde la respuesta", async () => {
        mockFetch({ url: "https://checkout.flow.cl", token: "tkn_xyz", flowOrder: 999 });

        const result = await createFlowOrder(MINIMAL_PARAMS);

        expect(result).toEqual({
            url: "https://checkout.flow.cl",
            token: "tkn_xyz",
            flowOrder: 999,
        });
    });

    it("lanza error si Flow responde con HTTP error", async () => {
        mockFetch({ code: 101, message: "Invalid signature" }, 400);

        await expect(createFlowOrder(MINIMAL_PARAMS)).rejects.toThrow(
            "Flow createOrder failed: 400",
        );
    });

});

describe("getFlowPaymentStatus", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("llama a Flow sandbox /payment/getStatus con token y apiKey", async () => {
        const fetchSpy = mockFetch({
            flowOrder: 42, commerceOrder: "ord-001", requestDate: new Date().toISOString(),
            status: 2, subject: "Test", amount: 19990, currency: "CLP",
            email: "user@test.cl", paymentMethod: "VISA",
        });

        await getFlowPaymentStatus("tkn_test_123");

        expect(fetchSpy).toHaveBeenCalledOnce();
        const [url, opts] = fetchSpy.mock.calls[0];
        expect(url).toBe("https://sandbox.flow.cl/api/payment/getStatus");
        expect(opts?.method).toBe("POST");
        const body = opts?.body as string;
        expect(body).toContain("apiKey=");
        expect(body).toContain("token=tkn_test_123");
        expect(body).toContain("s=");
    });

    it("retorna el estado del pago", async () => {
        mockFetch({
            flowOrder: 42, commerceOrder: "ord-001", requestDate: "2026-06-01T12:00:00.000Z",
            status: 2, subject: "Test", amount: 19990, currency: "CLP",
            email: "user@test.cl", paymentMethod: "VISA",
        });

        const result = await getFlowPaymentStatus("tkn_test_123");

        expect(result.status).toBe(2);
        expect(result.flowOrder).toBe(42);
        expect(result.commerceOrder).toBe("ord-001");
    });

    it("lanza error si Flow responde con HTTP error", async () => {
        mockFetch({ code: 105, message: "No services available" }, 500);

        await expect(getFlowPaymentStatus("tkn_bad")).rejects.toThrow(
            "Flow getStatus failed: 500",
        );
    });
});

describe("generateSignature (internal - verificado a través de fetch)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("la firma s tiene formato hexadecimal de 64 caracteres", async () => {
        const spy = mockFetch({ url: "", token: "", flowOrder: 1 });

        await createFlowOrder(MINIMAL_PARAMS);

        const body = spy.mock.calls[0][1]?.body as string;
        const sMatch = body.match(/s=([a-f0-9]+)/);
        expect(sMatch).not.toBeNull();
        expect(sMatch![1]).toHaveLength(64);
    });
});
