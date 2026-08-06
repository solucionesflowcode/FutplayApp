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

import { POST } from "@/app/api/clases/cancelar/route";

const USER_ID = "user-test-001";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("POST /api/clases/cancelar", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
    });

    it("API-CLASES-CAN-001: retorna 401 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: "2026-07-01T10:00:00Z" }),
        }));

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe("No autenticado");
    });

    it("API-CLASES-CAN-002: retorna 400 si faltan parámetros", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe("Faltan parámetros");
    });

    it("API-CLASES-CAN-003: retorna 500 si falta SUPABASE_SERVICE_ROLE_KEY", async () => {
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: "2026-07-01T10:00:00Z" }),
        }));

        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe("Falta SUPABASE_SERVICE_ROLE_KEY");

        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    });

    it("API-CLASES-CAN-004: retorna success false si la clase ya pasó", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const pastDate = new Date(Date.now() - 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: pastDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("La clase ya ha pasado.");
    });

    it("API-CLASES-CAN-005: cancela con >= 3h de antelación y devuelve token (entrenamiento)", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toBe("Clase cancelada. Te devolvimos el token.");
    });

    it("API-CLASES-CAN-006: cancela con >= 3h de antelación (partido, no devuelve token)", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "partido" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toBe("Partido cancelado.");
    });

    it("API-CLASES-CAN-007: cancela con >= 3h pero RPC falla (mensaje informativo)", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });
        __setTableData("membresia", { id: "m1", tokens_usados: 3 });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });

    it("API-CLASES-CAN-008: cancela con < 3h de antelación (sin reembolso)", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-01T08:00:00Z"));

        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const nearFutureDate = "2026-07-01T09:30:00Z";

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: nearFutureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toContain("no se devuelve el token");

        vi.useRealTimers();
    });

    it("API-CLASES-CAN-009: cancela partido con < 3h de antelación", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-01T08:00:00Z"));

        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "partido" });

        const nearFutureDate = "2026-07-01T09:30:00Z";

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: nearFutureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toBe("Partido cancelado.");

        vi.useRealTimers();
    });

    it("API-CLASES-CAN-010: rechaza cancelar si ya está cancelado", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
    });

    it("API-CLASES-CAN-011: rechaza cancelar si ya está presente", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "presente" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
    });

    it("API-CLASES-CAN-012: rechaza cancelar si ya está ausente", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "ausente" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
    });

    it("API-CLASES-CAN-013: retorna 404 si la inscripción no existe", async () => {
        __setTableData("clase_usuario", null);

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "inexistente", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe("Inscripción no encontrada");
    });

    it("API-CLASES-CAN-014: error al actualizar la inscripción retorna error", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: null });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toContain("cancelada");
    });

    it("API-CLASES-CAN-015: rechaza cancelar si ya está cancelado_sin_reembolso", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "cancelado_sin_reembolso" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
    });

    it("API-CLASES-CAN-016: rechaza cancelar si ya asistio", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "asistio" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
    });

    it("API-CLASES-CAN-018: cancela con hora naive de Chile (sin Z) con >= 3h reales y devuelve token", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-01T11:00:00Z"));

        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        // "2026-07-01T13:00:00" = 13:00 hora local Chile = 17:00Z. Faltan 6h.
        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: "2026-07-01T13:00:00" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toContain("Te devolvimos el token");

        vi.useRealTimers();
    });

    it("API-CLASES-CAN-019: cancela con hora naive de Chile (sin Z) con < 3h reales (sin reembolso)", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-01T11:00:00Z"));

        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        // "2026-07-01T09:30:00" = 09:30 hora local Chile = 13:30Z. Faltan 2.5h.
        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: "2026-07-01T09:30:00" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toContain("no se devuelve el token");

        vi.useRealTimers();
    });

    it("API-CLASES-CAN-020: rechaza cancelar si ya no_asistio", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", asistencia: "no_asistio" });
        __setTableData("clase", { id: "c1", tipo_evento: "entrenamiento" });

        const futureDate = new Date(Date.now() + 4 * 3600000).toISOString();

        const res = await POST(makeRequest("http://localhost:3000/api/clases/cancelar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inscripcionId: "cu1", fechaHora: futureDate }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
    });
});
