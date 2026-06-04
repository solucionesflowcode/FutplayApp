import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import {
    userHasFichaMedica,
    createFichaMedica,
    calculateIMC,
    getIMCStatus,
} from "@/data/fichaMedica";

const USER_ID = "user-test-001";

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

// ── calculateIMC ──────────────────────────────────

describe("calculateIMC", () => {
    it("calcula IMC correctamente (70kg, 175cm)", () => {
        expect(calculateIMC(70, 175)).toBe(22.9);
    });

    it("returns 0 para valores extremos", () => {
        expect(calculateIMC(0, 175)).toBe(0);
    });

    it("redondea a 1 decimal (imc exacto 22.9)", () => {
        expect(calculateIMC(70, 175)).toBe(22.9);
    });
});

// ── getIMCStatus ──────────────────────────────────

describe("getIMCStatus", () => {
    it("retorna Bajo peso para IMC < 18.5", () => {
        expect(getIMCStatus(16)).toEqual({ label: "Bajo peso", color: "text-blue-500" });
    });

    it("retorna Normal para IMC entre 18.5 y 24.9", () => {
        expect(getIMCStatus(18.5)).toEqual({ label: "Normal", color: "text-green-500" });
        expect(getIMCStatus(22)).toEqual({ label: "Normal", color: "text-green-500" });
        expect(getIMCStatus(24.9)).toEqual({ label: "Normal", color: "text-green-500" });
    });

    it("retorna Sobrepeso para IMC entre 25 y 29.9", () => {
        expect(getIMCStatus(25)).toEqual({ label: "Sobrepeso", color: "text-yellow-500" });
        expect(getIMCStatus(27.5)).toEqual({ label: "Sobrepeso", color: "text-yellow-500" });
    });

    it("retorna Obesidad para IMC >= 30", () => {
        expect(getIMCStatus(30)).toEqual({ label: "Obesidad", color: "text-red-500" });
        expect(getIMCStatus(35)).toEqual({ label: "Obesidad", color: "text-red-500" });
    });
});

// ── userHasFichaMedica ────────────────────────────

describe("userHasFichaMedica", () => {
    it("retorna true cuando existe ficha médica", async () => {
        __setTableData("ficha_medica", { usuario_id: USER_ID });

        const result = await userHasFichaMedica(USER_ID);

        expect(result).toBe(true);
    });

    it("retorna false cuando no existe ficha médica", async () => {
        __setTableData("ficha_medica", null, { message: "No rows" });

        const result = await userHasFichaMedica(USER_ID);

        expect(result).toBe(false);
    });

    it("retorna false cuando hay error en la consulta", async () => {
        __setTableData("ficha_medica", null, { message: "Connection error" });

        const result = await userHasFichaMedica(USER_ID);

        expect(result).toBe(false);
    });
});

// ── createFichaMedica ─────────────────────────────

describe("createFichaMedica", () => {
    const FICHA_DATA = {
        edad: 25,
        peso_kg: 70,
        estatura_cm: 175,
        imc: 22.9,
        grupo_sanguineo: "O+",
        enfermedades: "Ninguna",
        alergias: "Ninguna",
        medicamentos: "Ninguno",
        observaciones: "",
    };

    it("retorna true cuando la inserción es exitosa", async () => {
        __setTableData("ficha_medica", { usuario_id: USER_ID, ...FICHA_DATA });

        const result = await createFichaMedica(USER_ID, FICHA_DATA);

        expect(result).toBe(true);
    });

    it("retorna false cuando hay error en la inserción", async () => {
        __setTableData("ficha_medica", null, { message: "Insert failed" });

        const result = await createFichaMedica(USER_ID, FICHA_DATA);

        expect(result).toBe(false);
    });
});
