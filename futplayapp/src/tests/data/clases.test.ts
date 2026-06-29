import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { getProximaClase } from "@/data/clases";

const USER_ID = "user-test-001";

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

describe("getProximaClase", () => {
    it("DATA-CLASES-GPC-001: retorna la próxima clase del usuario", async () => {
        const futureFecha = new Date(Date.now() + 86400000).toISOString();
        __setTableData("clase_usuario", [
            {
                clase: {
                    titulo: "Entrenamiento Mañana",
                    descripcion: "Entrenamiento matutino",
                    fecha_hora: futureFecha,
                    tipo_evento: "entrenamiento",
                    sede: { nombre: "Sede Centro" },
                },
            },
        ]);

        const result = await getProximaClase(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0].titulo).toBe("Entrenamiento Mañana");
        expect(result[0].sede).toBe("Sede Centro");
        expect(result[0].tipo_evento).toBe("entrenamiento");
    });

    it("DATA-CLASES-GPC-002: retorna la próxima clase tipo partido", async () => {
        const futureFecha = new Date(Date.now() + 172800000).toISOString();
        __setTableData("clase_usuario", [
            {
                clase: {
                    titulo: null,
                    descripcion: "Partido del finde",
                    fecha_hora: futureFecha,
                    tipo_evento: "partido",
                    sede: { nombre: "Sede Norte" },
                },
            },
        ]);

        const result = await getProximaClase(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0].titulo).toBe("Partido");
        expect(result[0].tipo_evento).toBe("partido");
    });

    it("DATA-CLASES-GPC-003: retorna array vacío si no hay clases futuras", async () => {
        __setTableData("clase_usuario", []);

        const result = await getProximaClase(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it("DATA-CLASES-GPC-004: retorna array vacío si hay error", async () => {
        __setTableData("clase_usuario", null, { message: "Error fetching" });

        const result = await getProximaClase(USER_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });

    it("DATA-CLASES-GPC-005: retorna solo la clase más próxima", async () => {
        const tomorrow = new Date(Date.now() + 86400000).toISOString();
        const nextWeek = new Date(Date.now() + 604800000).toISOString();

        __setTableData("clase_usuario", [
            {
                clase: {
                    titulo: "Clase Lejana",
                    descripcion: "En una semana",
                    fecha_hora: nextWeek,
                    tipo_evento: "entrenamiento",
                    sede: { nombre: "Sede Centro" },
                },
            },
            {
                clase: {
                    titulo: "Clase Cercana",
                    descripcion: "Mañana",
                    fecha_hora: tomorrow,
                    tipo_evento: "entrenamiento",
                    sede: { nombre: "Sede Norte" },
                },
            },
        ]);

        const result = await getProximaClase(USER_ID);

        expect(result.length).toBe(1);
        expect(result[0].titulo).toBe("Clase Cercana");
    });

    it("DATA-CLASES-GPC-006: maneja sede null", async () => {
        const futureFecha = new Date(Date.now() + 86400000).toISOString();
        __setTableData("clase_usuario", [
            {
                clase: {
                    titulo: "Clase sin sede",
                    descripcion: "Sin sede asignada",
                    fecha_hora: futureFecha,
                    tipo_evento: "entrenamiento",
                    sede: null,
                },
            },
        ]);

        const result = await getProximaClase(USER_ID);

        expect(result.length).toBe(1);
        expect(result[0].sede).toBe("");
    });

    it("DATA-CLASES-GPC-007: debug mock direct call", async () => {
        const futureFecha = new Date(Date.now() + 86400000).toISOString();
        __setTableData("clase_usuario", [
            {
                clase: {
                    titulo: "Debug Test",
                    descripcion: "Debugging",
                    fecha_hora: futureFecha,
                    tipo_evento: "entrenamiento",
                    sede: { nombre: "Sede Debug" },
                },
            },
        ]);

        const supabase = createClient();
        const rawResult = await supabase
            .from("clase_usuario")
            .select("*")
            .eq("usuario_id", USER_ID);

        expect(rawResult.error).toBeNull();
        expect(rawResult.data).toBeDefined();
        expect(Array.isArray(rawResult.data)).toBe(true);
        expect(rawResult.data!.length).toBe(1);
        expect(rawResult.data![0]).toHaveProperty("clase");
        expect(rawResult.data![0].clase).toHaveProperty("tipo_evento");
        expect(rawResult.data![0].clase.tipo_evento).toBe("entrenamiento");
    });
});
