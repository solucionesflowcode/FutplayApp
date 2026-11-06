import { describe, it, expect } from "vitest";
import {
    dimensionesEscaladas, errorComentario, errorPie, esImagenPermitida, esUuid, etiquetaPartido,
    filtroDesdeParams, idsPartidosDeFiltro, limpiarPie, paramsDeFiltro, urlDescarga, MAX_COMENTARIO, MAX_PIE,
} from "@/lib/liga-fotos";

const EQ_A = "11111111-1111-1111-1111-111111111111";
const EQ_B = "22222222-2222-2222-2222-222222222222";
const EQ_C = "33333333-3333-3333-3333-333333333333";

const partidos = [
    { id: "p1", fase: "regular" as const, jornada: 1, local_id: EQ_A, visita_id: EQ_B },
    { id: "p2", fase: "regular" as const, jornada: 2, local_id: EQ_B, visita_id: EQ_C },
    { id: "p3", fase: "final" as const, jornada: null, local_id: EQ_A, visita_id: EQ_C },
];

describe("filtros de fotos", () => {
    it("sin filtro de partido devuelve null: no se limita por partido", () => {
        expect(idsPartidosDeFiltro(partidos, {})).toBeNull();
        expect(idsPartidosDeFiltro(partidos, { generales: true })).toBeNull();
    });

    it("filtra por jornada, fase, equipo (local o visita) y los combina", () => {
        expect(idsPartidosDeFiltro(partidos, { jornada: 2 })).toEqual(["p2"]);
        expect(idsPartidosDeFiltro(partidos, { fase: "final" })).toEqual(["p3"]);
        expect(idsPartidosDeFiltro(partidos, { equipo_id: EQ_C })).toEqual(["p2", "p3"]);
        expect(idsPartidosDeFiltro(partidos, { equipo_id: EQ_A, jornada: 2 })).toEqual([]);
    });

    it("lee los parámetros e ignora los inválidos", () => {
        expect(filtroDesdeParams(new URLSearchParams(`jornada=3&equipo_id=${EQ_A}&fase=final`))).toEqual({ jornada: 3, equipo_id: EQ_A, fase: "final" });
        expect(filtroDesdeParams(new URLSearchParams("jornada=abc&equipo_id=x&fase=otra&partido_id=1"))).toEqual({});
    });

    it("el filtro vuelve igual después de pasar por la URL", () => {
        const filtro = { jornada: 2, equipo_id: EQ_B, partido_id: EQ_C };
        expect(filtroDesdeParams(paramsDeFiltro(filtro))).toEqual(filtro);
        expect(filtroDesdeParams(paramsDeFiltro({ generales: true }))).toEqual({ generales: true });
    });
});

describe("validaciones de fotos", () => {
    it("pie: opcional, con largo máximo sin contar espacios de los extremos", () => {
        expect(errorPie(null)).toBeNull();
        expect(errorPie("  " + "a".repeat(MAX_PIE) + "  ")).toBeNull();
        expect(errorPie("a".repeat(MAX_PIE + 1))).toMatch(/superar/);
        expect(errorPie(5)).toMatch(/válido/);
        expect(limpiarPie("  Final  ")).toBe("Final");
        expect(limpiarPie("   ")).toBeNull();
    });

    it("comentario: obligatorio y con largo máximo", () => {
        expect(errorComentario("   ")).toMatch(/Escribe/);
        expect(errorComentario(undefined)).toMatch(/Escribe/);
        expect(errorComentario("a".repeat(MAX_COMENTARIO))).toBeNull();
        expect(errorComentario("a".repeat(MAX_COMENTARIO + 1))).toMatch(/superar/);
    });

    it("revisa los primeros bytes, no solo el tipo declarado", () => {
        const webp = new TextEncoder().encode("RIFF0000WEBP");
        expect(esImagenPermitida("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
        expect(esImagenPermitida("image/webp", webp)).toBe(true);
        expect(esImagenPermitida("image/jpeg", new TextEncoder().encode("<html></html>"))).toBe(false);
        expect(esImagenPermitida("image/webp", new TextEncoder().encode("RIFF0000WAVE"))).toBe(false);
        expect(esImagenPermitida("image/svg+xml", new TextEncoder().encode("<svg>"))).toBe(false);
    });

    it("esUuid rechaza textos que podrían salir de la carpeta del bucket", () => {
        expect(esUuid(EQ_A)).toBe(true);
        expect(esUuid("../otra-liga")).toBe(false);
        expect(esUuid(null)).toBe(false);
    });
});

describe("dimensiones y etiquetas", () => {
    it("reduce manteniendo la proporción y nunca agranda", () => {
        expect(dimensionesEscaladas(4000, 3000, 2000)).toEqual({ ancho: 2000, alto: 1500 });
        expect(dimensionesEscaladas(3000, 4000, 2000)).toEqual({ ancho: 1500, alto: 2000 });
        expect(dimensionesEscaladas(800, 600, 2000)).toEqual({ ancho: 800, alto: 600 });
    });

    it("el enlace de descarga conserva la extensión y pone un nombre legible", () => {
        expect(urlDescarga({ id: "abcdef12-0000", url: "https://cdn.test/liga/x.jpg" })).toBe("https://cdn.test/liga/x.jpg?download=foto-campeonato-abcdef12.jpg");
    });

    it("describe el partido por jornada o por fase", () => {
        const equipos = [{ id: EQ_A, nombre: "Alfa" }, { id: EQ_B, nombre: "Beta" }, { id: EQ_C, nombre: "Gama" }];
        expect(etiquetaPartido(partidos[0], equipos)).toBe("Jornada 1 · Alfa vs Beta");
        expect(etiquetaPartido(partidos[2], equipos)).toBe("Final · Alfa vs Gama");
    });
});
