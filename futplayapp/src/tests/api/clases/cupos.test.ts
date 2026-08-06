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
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => createMockServerClient()),
}));

import { GET } from "@/app/api/clases/cupos/route";

describe("GET /api/clases/cupos", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: "user-test-001", email: "test@test.cl" });
    });

    it("API-CLASES-CUP-001: retorna 401 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await GET();
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe("No autenticado");
    });

    it("API-CLASES-CUP-002: retorna 500 si falta SUPABASE_SERVICE_ROLE_KEY", async () => {
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

        const res = await GET();
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe("Falta SUPABASE_SERVICE_ROLE_KEY");

        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    });

    it("API-CLASES-CUP-003: devuelve cupo_maximo e inscritos 0 cuando no hay inscripciones", async () => {
        __setTableData("clase", [
            { id: "c1", cupo_maximo: 16 },
            { id: "c2", cupo_maximo: null },
        ]);
        __setTableData("clase_usuario", []);

        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual([
            { clase_id: "c1", cupo_maximo: 16, inscritos: 0 },
            { clase_id: "c2", cupo_maximo: null, inscritos: 0 },
        ]);
    });

    it("API-CLASES-CUP-004: cuenta inscritos excluyendo cancelados", async () => {
        __setTableData("clase", [{ id: "c1", cupo_maximo: 16 }]);
        __setTableData("clase_usuario", [
            { id: "cu1", clase_id: "c1", asistencia: "pendiente" },
            { id: "cu2", clase_id: "c1", asistencia: "sin_confirmar" },
            { id: "cu3", clase_id: "c1", asistencia: "cancelado" },
            { id: "cu4", clase_id: "c1", asistencia: "cancelado_sin_reembolso" },
            { id: "cu5", clase_id: "c1", asistencia: "presente" },
        ]);

        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual([
            { clase_id: "c1", cupo_maximo: 16, inscritos: 3 },
        ]);
    });
});
