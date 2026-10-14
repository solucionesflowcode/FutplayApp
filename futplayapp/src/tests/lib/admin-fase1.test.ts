import { describe, it, expect } from "vitest";
import { acotarPagina, paginasVisibles } from "@/lib/paginacion";
import { telefonoParaGuardar } from "@/lib/telefono";
import { claseEnFiltroFechas, errorFechaClase, hoyChile } from "@/lib/fechas";

// Fase 1 del plan de UI/UX del admin (docs/PLAN_UI_UX_ADMIN.md).

describe("paginación (USR-01, USR-02)", () => {
    it("ADM-PAG-001: se puede llegar a cualquier página, no solo a la 1, 2 y 3", () => {
        expect(paginasVisibles(6, 19)).toEqual([1, "…", 5, 6, 7, "…", 19]);
        expect(paginasVisibles(19, 19)).toEqual([1, "…", 18, 19]);
        expect(paginasVisibles(1, 4)).toEqual([1, 2, "…", 4]);
    });

    it("ADM-PAG-002: pocas páginas, sin saltos", () => {
        expect(paginasVisibles(2, 3)).toEqual([1, 2, 3]);
        expect(paginasVisibles(1, 1)).toEqual([1]);
        expect(paginasVisibles(1, 0)).toEqual([1]);
    });

    it("ADM-PAG-003: una búsqueda con menos resultados no deja una página fuera de rango", () => {
        // Antes: página 5 con 3 resultados → tabla vacía y "Mostrando 17 a 3 de 3".
        expect(acotarPagina(5, 1)).toBe(1);
        expect(acotarPagina(5, 0)).toBe(1);
        expect(acotarPagina(0, 3)).toBe(1);
        expect(acotarPagina(2, 3)).toBe(2);
    });
});

describe("telefonoParaGuardar (USR-03, USR-04)", () => {
    it("ADM-TEL-001: normaliza a +569XXXXXXXX (el formato que busca el bot)", () => {
        for (const entrada of ["+56 9 7904 6977", "56979046977", "979046977", "7904 6977", "+569-7904-6977"]) {
            expect(telefonoParaGuardar(entrada)).toBe("+56979046977");
        }
    });

    it("ADM-TEL-002: vacío borra el teléfono (null), en vez de dejarlo como estaba", () => {
        expect(telefonoParaGuardar("")).toBeNull();
        expect(telefonoParaGuardar("   ")).toBeNull();
        expect(telefonoParaGuardar(null)).toBeNull();
        expect(telefonoParaGuardar(undefined)).toBeNull();
    });

    it("ADM-TEL-003: un número incompleto es un error, no se guarda a medias", () => {
        expect(telefonoParaGuardar("1234")).toEqual({ error: expect.stringContaining("8 dígitos") });
    });
});

describe("fechas de clases en hora de Chile (CLA-01, CLA-02, CLA-03)", () => {
    // 14/10 20:00 en Chile (UTC-3) = 14/10 23:00 UTC.
    const CLASE_14_20H = "2026-10-14T23:00:00Z";

    it("ADM-FEC-001: 'hasta 14/10' incluye una clase del 14/10 a las 20:00", () => {
        // Antes: new Date("2026-10-14") = 13/10 21:00 en Chile → la excluía.
        expect(claseEnFiltroFechas(CLASE_14_20H, { hasta: "2026-10-14" })).toBe(true);
        expect(claseEnFiltroFechas(CLASE_14_20H, { hasta: "2026-10-13" })).toBe(false);
    });

    it("ADM-FEC-002: 'desde 15/10' excluye la clase del 14/10 a las 22:30 (que en UTC ya es 15/10)", () => {
        const clase22_30 = "2026-10-15T01:30:00Z";
        expect(claseEnFiltroFechas(clase22_30, { desde: "2026-10-15" })).toBe(false);
        expect(claseEnFiltroFechas(clase22_30, { desde: "2026-10-14", hasta: "2026-10-14" })).toBe(true);
    });

    it("ADM-FEC-003: el filtro de día de la semana usa el día en Chile", () => {
        // 14/10/2026 es miércoles (3); en UTC la de las 22:30 ya sería jueves.
        expect(claseEnFiltroFechas("2026-10-15T01:30:00Z", { dias: [3] })).toBe(true);
        expect(claseEnFiltroFechas("2026-10-15T01:30:00Z", { dias: [4] })).toBe(false);
    });

    it("ADM-FEC-004: una clase sin horario solo aparece si no hay filtro de fechas", () => {
        expect(claseEnFiltroFechas(null, {})).toBe(true);
        expect(claseEnFiltroFechas(null, { desde: "2026-10-01" })).toBe(false);
    });

    it("ADM-FEC-005: se puede editar una clase pasada sin cambiarle la fecha", () => {
        const ahora = new Date("2026-10-20T12:00:00Z");
        const pasada = { fecha: "2026-10-14", hora: "20:00", fecha_original: "2026-10-14", hora_original: "20:00" };
        expect(errorFechaClase(false, pasada, ahora)).toBeNull();
        // Pero moverla a otra fecha pasada, o crearla en el pasado, no.
        expect(errorFechaClase(false, { ...pasada, hora: "19:00" }, ahora)).toContain("pasada");
        expect(errorFechaClase(true, pasada, ahora)).toContain("pasada");
    });

    it("ADM-FEC-006: hoy a las 22:00 en Chile se puede crear una clase para hoy", () => {
        // 22:00 en Chile = 01:00 UTC del día siguiente.
        const ahora = new Date("2026-10-15T01:00:00Z");
        expect(hoyChile(ahora)).toBe("2026-10-14");
        expect(errorFechaClase(true, { fecha: "2026-10-14", hora: "23:00" }, ahora)).toBeNull();
    });
});
