import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { membresiaActiva, esSemanaActual } from "@/lib/fechas";

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

describe("esSemanaActual", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    // "Ahora" = martes 25 ago 2026 12:00 Chile (16:00 UTC, invierno UTC-4)
    // Lunes de esta semana = 24 ago, Domingo = 30 ago
    beforeEach(() => {
        vi.setSystemTime(new Date("2026-08-25T16:00:00Z"));
    });

    it("retorna true para un martes (mismo día que ahora)", () => {
        expect(esSemanaActual("2026-08-25T12:00:00")).toBe(true);
    });

    it("retorna true para un lunes de la misma semana", () => {
        expect(esSemanaActual("2026-08-24T10:00:00")).toBe(true);
    });

    it("retorna true para un domingo de la misma semana", () => {
        expect(esSemanaActual("2026-08-30T20:00:00")).toBe(true);
    });

    it("retorna true en lunes 00:00 (inicio de semana)", () => {
        expect(esSemanaActual("2026-08-24T00:00:00")).toBe(true);
    });

    it("retorna true en domingo 23:59:59 (fin de semana)", () => {
        expect(esSemanaActual("2026-08-30T23:59:59")).toBe(true);
    });

    it("retorna false para un lunes de la semana siguiente", () => {
        expect(esSemanaActual("2026-08-31T10:00:00")).toBe(false);
    });

    it("retorna false para un domingo de la semana anterior", () => {
        expect(esSemanaActual("2026-08-23T15:00:00")).toBe(false);
    });

    it("retorna false para un martes de la semana siguiente", () => {
        expect(esSemanaActual("2026-09-01T17:00:00")).toBe(false);
    });

    it("retorna false justo después del domingo 23:59:59", () => {
        expect(esSemanaActual("2026-08-31T00:00:01")).toBe(false);
    });

    it("retorna true para clase exactamente ahora", () => {
        expect(esSemanaActual("2026-08-25T12:00:00")).toBe(true);
    });

    it("retorna false una semana exacta después", () => {
        expect(esSemanaActual("2026-09-01T12:00:00")).toBe(false);
    });

    it("retorna false una semana exacta antes", () => {
        expect(esSemanaActual("2026-08-18T12:00:00")).toBe(false);
    });
});
