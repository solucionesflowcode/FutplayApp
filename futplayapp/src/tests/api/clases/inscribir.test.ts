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

import { POST } from "@/app/api/clases/inscribir/route";

const USER_ID = "user-test-001";
const CLASE_BASE = { id: "c1", cupo_maximo: 15, tipo_evento: "entrenamiento" };
const CLASE_PARTIDO = { id: "c1", cupo_maximo: 15, tipo_evento: "partido" };

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("POST /api/clases/inscribir", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
    });

    it("API-CLASES-INS-001: retorna 401 si no está autenticado", async () => {
        __setAuthUser(null);
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", []);

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe("No autenticado");
    });

    it("API-CLASES-INS-002: retorna 400 si falta claseId", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("claseId es requerido");
    });

    it("API-CLASES-INS-003: retorna 404 si clase no existe", async () => {
        __setTableData("clase", null);

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "nonexistent" }),
        }));

        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe("Clase no encontrada");
    });

    it("API-CLASES-INS-004: retorna 500 si falta SUPABASE_SERVICE_ROLE_KEY", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", []);
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe("Falta SUPABASE_SERVICE_ROLE_KEY");

        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    });

    it("API-CLASES-INS-005: retorna 400 si la clase está llena", async () => {
        __setTableData("clase", { id: "c1", cupo_maximo: 2, tipo_evento: "entrenamiento" });
        __setTableData("clase_usuario", [{ id: "cu1" }, { id: "cu2" }, { id: "cu3" }]);

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Clase llena");
    });

    it("API-CLASES-INS-006: inscribe a partido correctamente (no requiere token)", async () => {
        __setTableData("clase", CLASE_PARTIDO);
        __setTableData("clase_usuario", { id: "new-ins-1" });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveProperty("inscripcionId");
    });

    it("API-CLASES-INS-007: inscribe a entrenamiento correctamente primera vez", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", { id: "new-ins-2" });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveProperty("inscripcionId");
    });

    it("API-CLASES-INS-008: retorna 409 si ya está inscrito (error 23505)", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", null, { code: "23505", message: "duplicate key" });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.error).toBe("Ya estás inscrito en esta clase");
    });

    it("API-CLASES-INS-009: retorna 400 si hay error en inserción", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", null, { message: "Some error", code: "12345" });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(400);
    });

    it("API-CLASES-INS-010: re-inscripción a partido cancelado exitosa", async () => {
        __setTableData("clase", CLASE_PARTIDO);
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado" });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.inscripcionId).toBe("cu1");
    });

    it("API-CLASES-INS-011: re-inscripción a partido cancelado_sin_reembolso exitosa", async () => {
        __setTableData("clase", CLASE_PARTIDO);
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado_sin_reembolso" });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.inscripcionId).toBe("cu1");
    });

    it("API-CLASES-INS-012: re-inscripción a entrenamiento con membresía válida", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado" });
        __setTableData("membresia", { id: "m1", tokens_totales: 10, tokens_usados: 3 });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.inscripcionId).toBe("cu1");
    });

    it("API-CLASES-INS-013: re-inscripción a entrenamiento sin membresía activa", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado" });
        __setTableData("membresia", null);

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("No tienes membresía activa este mes");
    });

    it("API-CLASES-INS-014: re-inscripción a entrenamiento sin tokens disponibles", async () => {
        __setTableData("clase", CLASE_BASE);
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado" });
        __setTableData("membresia", { id: "m1", tokens_totales: 5, tokens_usados: 5 });

        const res = await POST(makeRequest("http://localhost:3000/api/clases/inscribir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claseId: "c1" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("No tienes tokens disponibles");
    });
});
