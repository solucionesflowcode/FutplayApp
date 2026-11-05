import { describe, it, expect } from "vitest";
import { esFechaIso, fechaHoraChileAIso, fechaHoraChileDesdeIso, fechaIsoDesdeTexto, fechaTextoDesdeIso } from "@/lib/fechas";

describe("fecha dd/mm/aaaa", () => {
    it("convierte de dd/mm/aaaa a ISO y de vuelta", () => {
        expect(fechaIsoDesdeTexto("24/12/2026")).toBe("2026-12-24");
        expect(fechaTextoDesdeIso("2026-12-24")).toBe("24/12/2026");
    });

    it("el primer número es el día, no el mes", () => {
        expect(fechaIsoDesdeTexto("05/11/2026")).toBe("2026-11-05");
        expect(fechaIsoDesdeTexto("12/13/2026")).toBeNull();
    });

    it("rechaza fechas incompletas o que no existen", () => {
        expect(fechaIsoDesdeTexto("24/12")).toBeNull();
        expect(fechaIsoDesdeTexto("31/02/2026")).toBeNull();
        expect(esFechaIso("24/12")).toBe(false);
        expect(esFechaIso("2026-12-24")).toBe(true);
    });
});

describe("fechaHoraChileAIso", () => {
    it("FECH-001: convierte fecha+hora en zona Chile (invierno UTC-4) a ISO absoluto", () => {
        const iso = fechaHoraChileAIso("2026-07-10", "12:00");
        expect(iso.endsWith("Z")).toBe(true);
        const d = new Date(iso);
        const chile = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const parts: any = {};
        chile.formatToParts(d).forEach((p: any) => (parts[p.type] = p.value));
        expect(parts.year).toBe("2026");
        expect(parts.month).toBe("07");
        expect(parts.day).toBe("10");
        expect(parts.hour).toBe("12");
        expect(parts.minute).toBe("00");
    });

    it("FECH-002: convierte fecha+hora en zona Chile (verano UTC-3) a ISO absoluto", () => {
        const iso = fechaHoraChileAIso("2026-01-15", "18:30");
        expect(iso.endsWith("Z")).toBe(true);
        const d = new Date(iso);
        const chile = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const parts: any = {};
        chile.formatToParts(d).forEach((p: any) => (parts[p.type] = p.value));
        expect(parts.year).toBe("2026");
        expect(parts.month).toBe("01");
        expect(parts.day).toBe("15");
        expect(parts.hour).toBe("18");
        expect(parts.minute).toBe("30");
    });
});

describe("fechaHoraChileDesdeIso", () => {
    it("FECH-003: round-trip fecha+hora Chile (invierno UTC-4) desde ISO", () => {
        const iso = fechaHoraChileAIso("2026-07-10", "12:00");
        expect(fechaHoraChileDesdeIso(iso)).toEqual({ fecha: "2026-07-10", hora: "12:00" });
    });

    it("FECH-004: round-trip fecha+hora Chile (verano UTC-3) desde ISO", () => {
        const iso = fechaHoraChileAIso("2026-01-15", "18:30");
        expect(fechaHoraChileDesdeIso(iso)).toEqual({ fecha: "2026-01-15", hora: "18:30" });
    });

    it("FECH-005: convierte ISO en UTC a hora local Chile", () => {
        const result = fechaHoraChileDesdeIso("2026-07-10T16:00:00.000Z");
        expect(result?.fecha).toBe("2026-07-10");
        expect(result?.hora).toBe("12:00");
    });

    it("FECH-006: retorna null para ISO inválido", () => {
        expect(fechaHoraChileDesdeIso("no-es-fecha")).toBeNull();
    });
});
