import { describe, it, expect } from "vitest";
import { membresiasActuales, tokensRestantes } from "@/lib/membresia-actual";

const AHORA = new Date("2026-10-16T12:00:00Z");
const base = { usuario_id: "u1", estado: true, congelada: false, sin_tokens: false, tokens_totales: 4, tokens_usados: 1, fecha_inicio: "2026-10-01T00:00:00Z", fecha_vencimiento: "2026-10-31T00:00:00Z" };
const vencida = (id: string, inicio: string) => ({ ...base, id, estado: false, fecha_inicio: inicio, fecha_vencimiento: "2026-09-30T00:00:00Z" });

describe("membresía actual de cada alumno", () => {
    it("MEM-ACT-001: la vigente le gana a las anteriores, sea cual sea el orden", () => {
        const lista = [vencida("a", "2026-08-01T00:00:00Z"), { ...base, id: "vig" }, vencida("b", "2026-09-01T00:00:00Z")];
        for (const orden of [lista, [...lista].reverse()]) {
            expect(membresiasActuales(orden, AHORA).get("u1")?.id).toBe("vig");
        }
    });

    it("MEM-ACT-002: sin vigente, la congelada le gana a la vencida", () => {
        const congelada = { ...base, id: "cong", congelada: true, fecha_inicio: "2026-08-01T00:00:00Z" };
        expect(membresiasActuales([vencida("v", "2026-09-01T00:00:00Z"), congelada], AHORA).get("u1")?.id).toBe("cong");
    });

    it("MEM-ACT-003: sin vigente ni congelada, la más reciente (antes era la primera fila)", () => {
        const lista = [vencida("agosto", "2026-08-01T00:00:00Z"), vencida("septiembre", "2026-09-01T00:00:00Z")];
        for (const orden of [lista, [...lista].reverse()]) {
            expect(membresiasActuales(orden, AHORA).get("u1")?.id).toBe("septiembre");
        }
    });

    it("MEM-ACT-004: una por alumno y tokens restantes en 0 si no está vigente", () => {
        const actuales = membresiasActuales([{ ...base, id: "x" }, { ...base, id: "y", usuario_id: "u2" }], AHORA);
        expect(actuales.size).toBe(2);
        expect(tokensRestantes({ ...base }, AHORA)).toBe(3);
        expect(tokensRestantes(vencida("v", "2026-09-01T00:00:00Z"), AHORA)).toBe(0);
    });
});
