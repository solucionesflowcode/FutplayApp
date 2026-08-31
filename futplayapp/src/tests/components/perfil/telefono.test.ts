import { describe, it, expect } from "vitest";
import { normalizeTelefono } from "@/components/perfil/ProfileForm";

describe("normalizeTelefono", () => {
    it("mantiene el prefijo +569 cuando el usuario escribe un dígito", () => {
        expect(normalizeTelefono("+5699")).toBe("+5699");
    });

    it("no repite el 9: escribir 9 no acumula nueves", () => {
        expect(normalizeTelefono("9")).toBe("+569");
        expect(normalizeTelefono("99")).toBe("+5699");
        expect(normalizeTelefono("999")).toBe("+56999");
    });

    it("combina prefijo + dígitos sin duplicar el 9 del prefijo", () => {
        expect(normalizeTelefono("+56912345678")).toBe("+56912345678");
    });

    it("normaliza formatos con espacios y +56", () => {
        expect(normalizeTelefono("+56 9 1234 5678")).toBe("+56912345678");
        expect(normalizeTelefono("56912345678")).toBe("+56912345678");
    });

    it("normaliza el número pegado sin prefijo (8 dígitos)", () => {
        expect(normalizeTelefono("912345678")).toBe("+56912345678");
        expect(normalizeTelefono("12345678")).toBe("+56912345678");
    });

    it("limita a 8 dígitos después del prefijo", () => {
        expect(normalizeTelefono("123456789")).toBe("+56912345678");
    });

    it("vuelve al prefijo si no hay dígitos", () => {
        expect(normalizeTelefono("")).toBe("+569");
        expect(normalizeTelefono("abc")).toBe("+569");
    });
});