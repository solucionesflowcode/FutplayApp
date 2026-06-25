import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
    beforeEach(() => {
        resetRateLimit();
        vi.useFakeTimers();
    });

    it("permite la primera solicitud", () => {
        const result = rateLimit("user-1", 5, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it("reduce remaining en cada llamada", () => {
        rateLimit("user-1", 5, 60000);
        const r2 = rateLimit("user-1", 5, 60000);
        expect(r2.allowed).toBe(true);
        expect(r2.remaining).toBe(3);

        const r3 = rateLimit("user-1", 5, 60000);
        expect(r3.allowed).toBe(true);
        expect(r3.remaining).toBe(2);
    });

    it("bloquea cuando se excede el límite", () => {
        for (let i = 0; i < 5; i++) {
            rateLimit("user-1", 5, 60000);
        }
        const result = rateLimit("user-1", 5, 60000);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("reinicia la ventana después del tiempo configurado", () => {
        for (let i = 0; i < 5; i++) {
            rateLimit("user-1", 5, 60000);
        }
        const blocked = rateLimit("user-1", 5, 60000);
        expect(blocked.allowed).toBe(false);

        vi.advanceTimersByTime(60001);

        const afterWindow = rateLimit("user-1", 5, 60000);
        expect(afterWindow.allowed).toBe(true);
        expect(afterWindow.remaining).toBe(4);
    });

    it("usa keys distintas para diferentes usuarios", () => {
        for (let i = 0; i < 5; i++) {
            rateLimit("user-1", 5, 60000);
        }
        const blocked = rateLimit("user-1", 5, 60000);
        expect(blocked.allowed).toBe(false);

        const other = rateLimit("user-2", 5, 60000);
        expect(other.allowed).toBe(true);
        expect(other.remaining).toBe(4);
    });

    it("respeta límites distintos por key", () => {
        rateLimit("user-1", 2, 60000);
        const r2 = rateLimit("user-1", 2, 60000);
        expect(r2.allowed).toBe(true);
        expect(r2.remaining).toBe(0);

        const blocked = rateLimit("user-1", 2, 60000);
        expect(blocked.allowed).toBe(false);

        const other = rateLimit("user-2", 10, 60000);
        expect(other.allowed).toBe(true);
        expect(other.remaining).toBe(9);
    });

    it("remaining nunca es negativo", () => {
        for (let i = 0; i < 10; i++) {
            rateLimit("user-1", 3, 60000);
        }
        const result = rateLimit("user-1", 3, 60000);
        expect(result.remaining).toBe(0);
    });
});
