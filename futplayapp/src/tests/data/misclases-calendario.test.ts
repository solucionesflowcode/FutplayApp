import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { getAllClasesConInscripcion } from "@/data/misclases-calendario";

const USER_ID = "user-test-001";

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

describe("getAllClasesConInscripcion", () => {
    it("DATA-CAL-001: retorna clases con inscripción del usuario", async () => {
        __setTableData("clase", [
            {
                id: "c1",
                titulo: "Entrenamiento",
                descripcion: "Clase normal",
                fecha_hora: "2026-07-01T10:00:00Z",
                tipo_evento: "entrenamiento",
                sede: { nombre: "Sede Centro" },
            },
            {
                id: "c2",
                titulo: "Partido",
                descripcion: "Partido amistoso",
                fecha_hora: "2026-07-02T14:00:00Z",
                tipo_evento: "partido",
                sede: { nombre: "Sede Norte" },
            },
        ]);
        __setTableData("clase_usuario", [
            { id: "cu1", asistencia: "sin_confirmar", clase_id: "c1", usuario_id: "user-test-001" },
        ]);

        const result = await getAllClasesConInscripcion(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);

        const inscrita = result.find((c) => c.id === "c1");
        expect(inscrita).toBeDefined();
        expect(inscrita!.inscripcionId).toBe("cu1");
        expect(inscrita!.asistencia).toBe("sin_confirmar");

        const noInscrita = result.find((c) => c.id === "c2");
        expect(noInscrita).toBeDefined();
        expect(noInscrita!.inscripcionId).toBeNull();
        expect(noInscrita!.asistencia).toBeNull();
    });

    it("DATA-CAL-002: retorna array vacío si no hay clases", async () => {
        __setTableData("clase", []);
        __setTableData("clase_usuario", []);

        const result = await getAllClasesConInscripcion(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it("DATA-CAL-003: retorna array vacío si hay error en clases", async () => {
        __setTableData("clase", null, { message: "Error" });

        const result = await getAllClasesConInscripcion(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it("DATA-CAL-004: maneja tipos de asistencia variados", async () => {
        __setTableData("clase", [
            { id: "c1", titulo: "Clase 1", descripcion: null, fecha_hora: "2026-07-01T10:00:00Z", tipo_evento: "entrenamiento", sede: null },
            { id: "c2", titulo: "Clase 2", descripcion: null, fecha_hora: "2026-07-02T10:00:00Z", tipo_evento: "entrenamiento", sede: null },
            { id: "c3", titulo: "Clase 3", descripcion: null, fecha_hora: "2026-07-03T10:00:00Z", tipo_evento: "entrenamiento", sede: null },
        ]);
        __setTableData("clase_usuario", [
            { id: "cu1", asistencia: "asistio", clase_id: "c1", usuario_id: "user-test-001" },
            { id: "cu2", asistencia: "cancelado", clase_id: "c2", usuario_id: "user-test-001" },
        ]);

        const result = await getAllClasesConInscripcion(USER_ID);

        expect(result.find((c) => c.id === "c1")!.asistencia).toBe("asistio");
        expect(result.find((c) => c.id === "c1")!.inscripcionId).toBe("cu1");
        expect(result.find((c) => c.id === "c2")!.asistencia).toBe("cancelado");
        expect(result.find((c) => c.id === "c2")!.inscripcionId).toBe("cu2");
        expect(result.find((c) => c.id === "c3")!.inscripcionId).toBeNull();
    });
});
