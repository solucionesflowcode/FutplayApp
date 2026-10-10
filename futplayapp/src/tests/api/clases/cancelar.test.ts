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
const HORA = 3600000;

function cancelar(body: object): Promise<Response> {
    return POST(new Request("http://localhost:3000/api/clases/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
}

/** Inscripción del usuario + clase con su fecha REAL en la BD. */
function prepararClase(tipo_evento: string, fecha_hora: string, asistencia: string | null = "sin_confirmar") {
    __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", usuario_id: USER_ID, asistencia });
    __setTableData("clase", { id: "c1", tipo_evento, fecha_hora });
}

const enHoras = (h: number) => new Date(Date.now() + h * HORA).toISOString();

describe("POST /api/clases/cancelar", () => {
    beforeEach(() => {
        __resetMocks();
        __setAuthUser({ id: USER_ID, email: "test@test.cl" });
    });

    it("API-CLASES-CAN-001: retorna 401 si no está autenticado", async () => {
        __setAuthUser(null);

        const res = await cancelar({ inscripcionId: "cu1" });

        expect(res.status).toBe(401);
        expect((await res.json()).error).toBe("No autenticado");
    });

    it("API-CLASES-CAN-002: retorna 400 si falta inscripcionId", async () => {
        const res = await cancelar({});

        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe("Faltan parámetros");
    });

    it("API-CLASES-CAN-003: retorna 500 si falta SUPABASE_SERVICE_ROLE_KEY", async () => {
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

        const res = await cancelar({ inscripcionId: "cu1" });

        expect(res.status).toBe(500);
        expect((await res.json()).error).toBe("Falta SUPABASE_SERVICE_ROLE_KEY");

        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    });

    it("API-CLASES-CAN-004: retorna success false si la clase ya pasó", async () => {
        prepararClase("entrenamiento", enHoras(-1));

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(false);
        expect(json.message).toBe("La clase ya ha pasado.");
    });

    it("API-CLASES-CAN-005: cancela con >= 3h de antelación y devuelve token (entrenamiento)", async () => {
        prepararClase("entrenamiento", enHoras(4));

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(true);
        expect(json.message).toBe("Clase cancelada. Te devolvimos el token.");
    });

    it("API-CLASES-CAN-006: cancela con >= 3h de antelación (partido, no devuelve token)", async () => {
        prepararClase("partido", enHoras(4));

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(true);
        expect(json.message).toBe("Partido cancelado.");
    });

    it("API-CLASES-CAN-008: cancela con < 3h de antelación (sin reembolso)", async () => {
        prepararClase("entrenamiento", enHoras(1.5));

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(true);
        expect(json.message).toContain("no se devuelve el token");
    });

    it("API-CLASES-CAN-009: cancela partido con < 3h de antelación", async () => {
        prepararClase("partido", enHoras(1.5));

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(true);
        expect(json.message).toBe("Partido cancelado.");
    });

    it("API-CLASES-CAN-009B: no permite cancelar con menos de 1h", async () => {
        prepararClase("entrenamiento", enHoras(0.5));

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(false);
        expect(json.message).toContain("menos de 1 hora");
    });

    it.each(["cancelado", "cancelado_sin_reembolso", "asistio", "no_asistio", "presente", "ausente"])(
        "API-CLASES-CAN-010: rechaza cancelar si el estado es %s",
        async (estado) => {
            prepararClase("entrenamiento", enHoras(4), estado);

            const json = await (await cancelar({ inscripcionId: "cu1" })).json();

            expect(json.success).toBe(false);
            expect(json.message).toBe("Esta inscripción ya no puede cancelarse.");
        },
    );

    it("API-CLASES-CAN-013: retorna 404 si la inscripción no existe", async () => {
        __setTableData("clase_usuario", null);

        const res = await cancelar({ inscripcionId: "inexistente" });

        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe("Inscripción no encontrada");
    });

    it("API-CLASES-CAN-013B: retorna 404 si la inscripción pertenece a otro usuario", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", usuario_id: "otro-user" });

        const res = await cancelar({ inscripcionId: "cu1" });

        expect(res.status).toBe(404);
        expect((await res.json()).error).toBe("Inscripción no encontrada");
    });

    it("API-CLASES-CAN-013C: retorna 404 si la clase no existe", async () => {
        __setTableData("clase_usuario", { id: "cu1", clase_id: "c1", usuario_id: USER_ID, asistencia: "sin_confirmar" });
        __setTableData("clase", null);

        const res = await cancelar({ inscripcionId: "cu1" });

        expect(res.status).toBe(404);
    });

    it("API-CLASES-CAN-018: interpreta la fecha naive de la BD como hora de Chile (>= 3h, devuelve token)", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-01T11:00:00Z"));
        // 13:00 Chile (invierno, UTC-4) = 17:00Z. Faltan 6 h.
        prepararClase("entrenamiento", "2026-07-01T13:00:00");

        const json = await (await cancelar({ inscripcionId: "cu1" })).json();

        expect(json.success).toBe(true);
        expect(json.message).toContain("Te devolvimos el token");
        vi.useRealTimers();
    });

    // ── Fraude: el cliente ya no decide la fecha ──

    it("API-CLASES-CAN-FRAUDE-001: ignora una fechaHora futura falsa del body si la clase ya pasó", async () => {
        prepararClase("entrenamiento", enHoras(-2));

        const json = await (await cancelar({ inscripcionId: "cu1", fechaHora: enHoras(48) })).json();

        expect(json.success).toBe(false);
        expect(json.message).toBe("La clase ya ha pasado.");
    });

    it("API-CLASES-CAN-FRAUDE-002: ignora una fechaHora falsa del body y no devuelve token si faltan < 3h", async () => {
        prepararClase("entrenamiento", enHoras(2));

        const json = await (await cancelar({ inscripcionId: "cu1", fechaHora: enHoras(48) })).json();

        expect(json.success).toBe(true);
        expect(json.message).toContain("no se devuelve el token");
    });
});
