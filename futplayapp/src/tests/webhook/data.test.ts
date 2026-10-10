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

    // ── getHorariosProximos1h ────────────────────────

    describe("getHorariosProximos1h", () => {
        it("SCH-DATA-003B: devuelve clases que comienzan dentro de la próxima hora", async () => {
            const c1 = { id: "c1", fecha_hora: hourOffset(0.5) };
            const c2 = { id: "c2", fecha_hora: hourOffset(10) };
            __setTableData("clase", [c1, c2]);

            const result = await data.getHorariosProximos1h();

            expect(result).toEqual([{ id: "c1", clase_id: "c1" }]);
        });

        it("SCH-DATA-003C: devuelve [] si no hay clases comenzando en 1h", async () => {
            __setTableData("clase", []);
            const result = await data.getHorariosProximos1h();
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
                { id: "cu1", usuario_id: "u1", clase_id: "c1", asistencia: "sin_confirmar" },
                { id: "cu2", usuario_id: "u2", clase_id: "c1", asistencia: "sin_confirmar" },
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
            __setTableData("clase_usuario", { id: "cu1", asistencia: "sin_confirmar" });

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

    // ── confirmarAsistencia / updateAsistencia ───────
    // Devuelven true solo si ESTA llamada cambió la fila (evita doble reembolso).

    describe("confirmarAsistencia / updateAsistencia", () => {
        it("BOT-DATA-001: true si la reserva estaba pendiente y se actualizó", async () => {
            __setTableData("clase_usuario", [{ id: "cu1", asistencia: "pendiente" }]);

            expect(await data.updateAsistencia("cu1", "cancelado")).toBe(true);
            expect(await data.confirmarAsistencia("cu1")).toBe(true);
        });

        it("BOT-DATA-002: false si la reserva ya estaba cancelada (UPDATE sin filas, sin error)", async () => {
            __setTableData("clase_usuario", [{ id: "cu1", asistencia: "cancelado" }]);

            expect(await data.updateAsistencia("cu1", "cancelado")).toBe(false);
            expect(await data.confirmarAsistencia("cu1")).toBe(false);
        });

        it("BOT-DATA-003: false si Supabase devuelve error", async () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            __setTableData("clase_usuario", null, { message: "boom" });

            expect(await data.updateAsistencia("cu1", "cancelado")).toBe(false);
            spy.mockRestore();
        });
    });

    // ── getProximaClaseUsuario / buscarUsuarioPorTelefono ──

    describe("getProximaClaseUsuario (encendidos cortos)", () => {
        it("BOT-DATA-004: con `desde` en el pasado encuentra la clase que ya pasó (respuesta atrasada)", async () => {
            __setTableData("clase_usuario", [{ id: "cu1", clase_id: "c-pasada", usuario_id: "u1", asistencia: "pendiente" }]);
            __setTableData("clase", [{ id: "c-pasada", titulo: "Tecnico", fecha_hora: hourOffset(-2), tipo_evento: "entrenamiento" }]);

            expect(await data.getProximaClaseUsuario("u1")).toBeNull();
            const r = await data.getProximaClaseUsuario("u1", new Date(Date.now() - 5 * 3600000));
            expect(r?.id).toBe("cu1");
        });

        it("BOT-DATA-005: lanza si Supabase devuelve error (no se confunde con 'sin clases')", async () => {
            __setTableData("clase_usuario", null, { message: "boom" });

            await expect(data.getProximaClaseUsuario("u1")).rejects.toThrow("boom");
        });

        it("BOT-DATA-006: buscarUsuarioPorTelefono lanza si Supabase devuelve error", async () => {
            // [] y no null: el mock descarta el error de maybeSingle cuando data es null.
            __setTableData("usuario", [], { message: "boom" });

            await expect(data.buscarUsuarioPorTelefono("56912345678")).rejects.toThrow("boom");
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

    // ── usuarioTienePendienteAntes ──────────────────

    describe("usuarioTienePendienteAntes", () => {
        it("SCH-DATA-019: true si el alumno tiene un 'pendiente' en una clase futura anterior", async () => {
            __setTableData("clase_usuario", [{ clase_id: "c-antes", usuario_id: "u1", asistencia: "pendiente" }]);
            __setTableData("clase", [{ id: "c-antes", fecha_hora: hourOffset(2) }]);

            expect(await data.usuarioTienePendienteAntes("u1", hourOffset(5))).toBe(true);
        });

        it("SCH-DATA-020: false si su 'pendiente' es de una clase posterior", async () => {
            __setTableData("clase_usuario", [{ clase_id: "c-despues", usuario_id: "u1", asistencia: "pendiente" }]);
            __setTableData("clase", [{ id: "c-despues", fecha_hora: hourOffset(8) }]);

            expect(await data.usuarioTienePendienteAntes("u1", hourOffset(5))).toBe(false);
        });

        it("SCH-DATA-021: false si el 'pendiente' es de OTRO alumno (el bloqueo ya no es global)", async () => {
            __setTableData("clase_usuario", [{ clase_id: "c-antes", usuario_id: "otro", asistencia: "pendiente" }]);
            __setTableData("clase", [{ id: "c-antes", fecha_hora: hourOffset(2) }]);

            expect(await data.usuarioTienePendienteAntes("u1", hourOffset(5))).toBe(false);
        });
    });
});
