import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
<<<<<<< HEAD
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";
=======
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
import { mockPaymentStatus } from "@/tests/helpers/flow";

// ── Env vars ────────────────────────────────────────

const BOLETA_ID = "boleta-123";

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
<<<<<<< HEAD
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

// ── Module mocks ────────────────────────────────────

<<<<<<< HEAD
vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({
        getAll: () => [],
        set: vi.fn(),
    })),
}));

=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
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

<<<<<<< HEAD
const USER_ID = "user-123";
=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
const FLOW_TOKEN = "flow-token-abc";

// ── Tests ───────────────────────────────────────────

describe("GET /api/flow/confirm", () => {
    beforeEach(() => {
        __resetMocks();
<<<<<<< HEAD
        __setAuthUser({ id: USER_ID });
=======
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa
        vi.mocked(getFlowPaymentStatus).mockReset();
    });

    it("retorna 400 si falta boletaId", async () => {
        const res = await GET(makeRequest("t-1", undefined));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("boletaId");
    });

    it("retorna 404 si la boleta no existe", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        __setTableData("boleta", null, { message: "No rows" });

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe("Boleta no encontrada");
    });

    it("retorna estado pagado si Flow aprueba y boleta estaba pendiente", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
    });

    it("retorna estado rechazado si Flow no aprueba (status !== 2)", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 1, commerceOrder: BOLETA_ID }));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("rechazado");
    });

    it("retorna 403 si commerceOrder no coincide con boletaId", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: "otra-boleta" }));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toBe("Boleta no coincide con el pago");
    });

    it("retorna pendiente si getFlowPaymentStatus lanza error (sandbox fallback)", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("Sandbox error"));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pendiente");
    });

    it("retorna pagado si la boleta ya estaba pagada en Supabase", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("Token inválido"));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pagado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
    });

    it("retorna pagado cuando token es literal {token} pero boleta ya está pagada", async () => {
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pagado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest("{token}", BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
    });

    it("devuelve pendiente cuando token es literal {token} y boleta no está pagada", async () => {
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest("{token}", BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pendiente");
    });

    // ── Verificación de UPDATE ─────────────────────────

    it("llama a getFlowPaymentStatus con token real", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(getFlowPaymentStatus).toHaveBeenCalledWith(FLOW_TOKEN);
    });

    it("actualiza boleta a pagado cuando Flow confirma y boleta estaba pendiente", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pendiente" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pendiente" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
    });

    it("retorna pagado sin llamar a Flow si token es ´{token}´ y boleta ya está pagada", async () => {
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pagado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest("{token}", BOLETA_ID));

        expect(res.status).toBe(200);
        expect(getFlowPaymentStatus).not.toHaveBeenCalled();
    });

    it("CONFIRM-024: retorna estado rechazado si boleta está rechazada en Supabase (sin token real)", async () => {
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "rechazado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "rechazado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest("{token}", BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("rechazado");
        expect(json.message).toBeUndefined();
    });

    it("CONFIRM-025: retorna estado anulado si boleta está anulada en Supabase (sin token real)", async () => {
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "anulado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "anulado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest("{token}", BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("anulado");
        expect(json.message).toBeUndefined();
    });

    it("CONFIRM-026: retorna estado rechazado en fallback tras error de Flow API si boleta está rechazada", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("Network error"));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "rechazado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "rechazado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("rechazado");
    });

    it("CONFIRM-027: retorna estado anulado en fallback tras error de Flow API si boleta está anulada", async () => {
        vi.mocked(getFlowPaymentStatus).mockRejectedValue(new Error("Network error"));
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "anulado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "anulado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("anulado");
    });

    it("CONFIRM-023: atomic guard previene doble escritura si boleta ya fue pagada por concurrencia", async () => {
        vi.mocked(getFlowPaymentStatus).mockResolvedValue(mockPaymentStatus({ status: 2, commerceOrder: BOLETA_ID }));
        // Simula que otro request ya pagó la boleta: .eq("estado", "pendiente") falla
<<<<<<< HEAD
        __setTableData("boleta", { id: BOLETA_ID, usuario_id: USER_ID, estado: "pagado" });
=======
        __setTableData("boleta", { id: BOLETA_ID, estado: "pagado" });
>>>>>>> 61a82e698708ca4c7464ca76fac04ddfda4078aa

        const res = await GET(makeRequest(FLOW_TOKEN, BOLETA_ID));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.estado).toBe("pagado");
    });
});
