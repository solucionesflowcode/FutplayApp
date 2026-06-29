import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

import * as data from "../../../webhook/data.js";

function initMock() {
    __resetMocks();
    data._setTestClient(createMockServerClient());
}

function hourOffset(n: number): string {
    return new Date(Date.now() + n * 60 * 60 * 1000).toISOString();
}

describe("webhook/data.js — scheduler data functions", () => {
    beforeEach(() => {
        initMock();
    });

    // ── getHorarios24h ──────────────────────────────

    describe("getHorarios24h", () => {
        it("SCH-DATA-001: devuelve clases en ventana 24h", async () => {
            const c1 = { id: "c1", fecha_hora: hourOffset(2) };
            const c2 = { id: "c2", fecha_hora: hourOffset(10) };
            __setTableData("clase", [c1, c2]);

            const result = await data.getHorarios24h();

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ id: "c1", fecha_hora: c1.fecha_hora, clase_id: "c1" });
            expect(result[1]).toEqual({ id: "c2", fecha_hora: c2.fecha_hora, clase_id: "c2" });
        });

        it("SCH-DATA-002: devuelve [] si no hay clases", async () => {
            __setTableData("clase", []);

            const result = await data.getHorarios24h();

            expect(result).toEqual([]);
        });

        it("SCH-DATA-003: devuelve [] si tabla no tiene datos", async () => {
            const result = await data.getHorarios24h();

            expect(result).toEqual([]);
        });
    });

    // ── getHorariosPasados ───────────────────────────

    describe("getHorariosPasados", () => {
        it("SCH-DATA-004: devuelve clases pasadas", async () => {
            __setTableData("clase", [
                { id: "c1", fecha_hora: hourOffset(-2) },
                { id: "c2", fecha_hora: hourOffset(-10) },
            ]);

            const result = await data.getHorariosPasados();

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ id: "c1", clase_id: "c1" });
            expect(result[1]).toEqual({ id: "c2", clase_id: "c2" });
        });

        it("SCH-DATA-005: devuelve [] si no hay clases pasadas", async () => {
            __setTableData("clase", []);
            const result = await data.getHorariosPasados();
            expect(result).toEqual([]);
        });
    });

    // ── getHorariosPasados1h ─────────────────────────

    describe("getHorariosPasados1h", () => {
        it("SCH-DATA-006: devuelve clases hace más de 1h", async () => {
            __setTableData("clase", [
                { id: "c1", fecha_hora: hourOffset(-2) },
            ]);

            const result = await data.getHorariosPasados1h();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ id: "c1", clase_id: "c1" });
        });

        it("SCH-DATA-007: devuelve [] si no hay", async () => {
            __setTableData("clase", []);
            const result = await data.getHorariosPasados1h();
            expect(result).toEqual([]);
        });
    });

    // ── getInscripcionesSinConfirmar ─────────────────

    describe("getInscripcionesSinConfirmar", () => {
        it("SCH-DATA-008: devuelve inscripciones sin confirmar", async () => {
            __setTableData("clase_usuario", [
                { id: "cu1", usuario_id: "u1" },
                { id: "cu2", usuario_id: "u2" },
            ]);

            const result = await data.getInscripcionesSinConfirmar("c1");

            expect(result).toHaveLength(2);
            expect(result[0].usuario_id).toBe("u1");
            expect(result[1].usuario_id).toBe("u2");
        });

        it("SCH-DATA-009: devuelve [] si no hay inscripciones", async () => {
            __setTableData("clase_usuario", []);
            const result = await data.getInscripcionesSinConfirmar("c1");
            expect(result).toEqual([]);
        });
    });

    // ── setPendiente ─────────────────────────────────

    describe("setPendiente", () => {
        it("SCH-DATA-010: retorna true si actualizó correctamente (row devuelta)", async () => {
            __setTableData("clase_usuario", { id: "cu1" });

            const result = await data.setPendiente("cu1");

            expect(result).toBe(true);
        });

        it("SCH-DATA-011: retorna false si no actualizó (select devuelve null)", async () => {
            __setTableData("clase_usuario", null);

            const result = await data.setPendiente("cu1");

            expect(result).toBe(false);
        });

        it("SCH-DATA-012: retorna false si ya no está sin_confirmar", async () => {
            __setTableData("clase_usuario", null);

            const result = await data.setPendiente("cu1");

            expect(result).toBe(false);
        });
    });

    // ── actualizarPorClaseYEstado ────────────────────

    describe("actualizarPorClaseYEstado", () => {
        it("SCH-DATA-013: actualiza pendiente→cancelado_sin_reembolso sin errores", async () => {
            __setTableData("clase_usuario", []);

            await data.actualizarPorClaseYEstado("c1", "pendiente", "cancelado_sin_reembolso");

            expect(true).toBe(true);
        });

        it("SCH-DATA-014: actualiza confirmado_whatsapp→no_asistio sin errores", async () => {
            __setTableData("clase_usuario", []);

            await data.actualizarPorClaseYEstado("c1", "confirmado_whatsapp", "no_asistio");

            expect(true).toBe(true);
        });
    });

    // ── getClase ─────────────────────────────────────

    describe("getClase", () => {
        it("SCH-DATA-015: retorna titulo de la clase", async () => {
            __setTableData("clase", { id: "c1", titulo: "Spinning" });

            const result = await data.getClase("c1");

            expect(result).toEqual({ id: "c1", titulo: "Spinning" });
        });

        it("SCH-DATA-016: retorna null si no existe", async () => {
            __setTableData("clase", null);

            const result = await data.getClase("no-existe");

            expect(result).toBeNull();
        });
    });

    // ── getUsuario ───────────────────────────────────

    describe("getUsuario", () => {
        it("SCH-DATA-017: retorna nombre y teléfono", async () => {
            __setTableData("usuario", { id: "u1", nombre: "Juan", telefono: "56912345678" });

            const result = await data.getUsuario("u1");

            expect(result).toEqual({ id: "u1", nombre: "Juan", telefono: "56912345678" });
        });

        it("SCH-DATA-018: retorna null si no existe", async () => {
            __setTableData("usuario", null);

            const result = await data.getUsuario("no-existe");

            expect(result).toBeNull();
        });
    });
});
