import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({
        getAll: () => [],
        set: vi.fn(),
    })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

import { POST } from "@/app/api/flow/cancel-recurrence/route";

describe("POST /api/flow/cancel-recurrence", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "user-1" });
    });

    it("retorna 401 si no hay usuario autenticado", async () => {
        __setAuthUser(null);

        const res = await POST();

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe("No autenticado");
    });

    it("retorna 200 con mensaje si no hay suscripción activa", async () => {
        __setTableData("recurrencia", null);

        const res = await POST();

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("No tienes una suscripción activa");
    });

    it("cancela la suscripción activa exitosamente", async () => {
        __setTableData("recurrencia", { id: "rec-1", activa: true });

        const res = await POST();

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.message).toBe("Suscripción cancelada");
    });
});
