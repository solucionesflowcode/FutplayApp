import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { membresiaActiva } from "@/lib/fechas";

describe("membresiaActiva", () => {
    const VENCIMIENTO = "2026-01-31T00:00:00.000Z";

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it("retorna true si la membresía está vigente", () => {
        vi.setSystemTime(new Date("2026-01-15"));
        expect(membresiaActiva(VENCIMIENTO)).toBe(true);
    });

    it("retorna false si la membresía venció hace 1 día", () => {
        vi.setSystemTime(new Date("2026-02-01"));
        expect(membresiaActiva(VENCIMIENTO)).toBe(false);
    });

    it("retorna true si la membresía vence hoy exactamente", () => {
        vi.setSystemTime(new Date("2026-01-31"));
        expect(membresiaActiva(VENCIMIENTO)).toBe(true);
    });

    it("retorna false si la membresía venció ayer exactamente", () => {
        vi.setSystemTime(new Date("2026-02-04"));
        expect(membresiaActiva(VENCIMIENTO)).toBe(false);
    });

    it("retorna true justo antes del vencimiento", () => {
        vi.setSystemTime(new Date("2026-01-30T23:59:59.999Z"));
        expect(membresiaActiva(VENCIMIENTO)).toBe(true);
    });

    it("retorna false justo después del vencimiento", () => {
        vi.setSystemTime(new Date("2026-01-31T03:00:01.000Z"));
        expect(membresiaActiva(VENCIMIENTO)).toBe(false);
    });
});
