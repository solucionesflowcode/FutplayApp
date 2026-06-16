import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { calcularVencimiento, membresiaActiva } from "@/lib/fechas";

describe("calcularVencimiento", () => {
    it("suma 30 días a una fecha", () => {
        const result = calcularVencimiento("2026-01-01");
        expect(result.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    });

    it("cruza frontera de mes", () => {
        const result = calcularVencimiento("2026-01-15");
        expect(result.toISOString()).toBe("2026-02-14T00:00:00.000Z");
    });

    it("cruza frontera de año", () => {
        const result = calcularVencimiento("2026-12-15");
        expect(result.toISOString()).toBe("2027-01-14T00:00:00.000Z");
    });

    it("maneja año bisiesto", () => {
        const result = calcularVencimiento("2024-02-01");
        expect(result.toISOString()).toBe("2024-03-02T00:00:00.000Z");
    });

    it("maneja febrero no bisiesto", () => {
        const result = calcularVencimiento("2025-02-01");
        expect(result.toISOString()).toBe("2025-03-03T00:00:00.000Z");
    });

    it("maneja 31 de enero", () => {
        const result = calcularVencimiento("2026-01-31");
        // 30 days later: March 2 (Feb has 28 days in 2026)
        expect(result.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    });
});

describe("membresiaActiva", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it("retorna true si la membresía está vigente", () => {
        vi.setSystemTime(new Date("2026-01-15"));
        expect(membresiaActiva("2026-01-01")).toBe(true);
    });

    it("retorna false si la membresía venció hace 1 día", () => {
        vi.setSystemTime(new Date("2026-02-01"));
        expect(membresiaActiva("2026-01-01")).toBe(false);
    });

    it("retorna true si la membresía vence hoy exactamente", () => {
        vi.setSystemTime(new Date("2026-01-31"));
        expect(membresiaActiva("2026-01-01")).toBe(true);
    });

    it("retorna false si la membresía venció ayer exactamente", () => {
        vi.setSystemTime(new Date("2026-02-04"));
        expect(membresiaActiva("2026-01-01")).toBe(false);
    });

    it("retorna true justo antes del vencimiento", () => {
        vi.setSystemTime(new Date("2026-01-30T23:59:59.999Z"));
        expect(membresiaActiva("2026-01-01")).toBe(true);
    });

    it("retorna false justo después del vencimiento", () => {
        vi.setSystemTime(new Date("2026-01-31T00:00:01.000Z"));
        expect(membresiaActiva("2026-01-01")).toBe(false);
    });
});
