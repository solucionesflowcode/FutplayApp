import { describe, it, expect } from "vitest";
import { aplanarDetallePartido, calcularGoleadores, errorGoles, resumenGoles } from "@/lib/liga-goles";
import { calcularTabla, type LigaPartido } from "@/lib/liga-tabla";
import { generarPrimeraRonda, generarSiguienteRonda, ganador, rondaActual } from "@/lib/liga-playoffs";

const equipos = ["A", "B", "C", "D", "E", "F", "G", "H"].map((n) => ({ id: n.toLowerCase(), nombre: n }));

let seq = 0;
function partido(local: string, visita: string, gl: number | null, gv: number | null, extra: Partial<LigaPartido> = {}): LigaPartido {
    return {
        id: `p${++seq}`, liga_id: "l1", fase: "regular", jornada: 1, llave: null,
        local_id: local, visita_id: visita, fecha_hora: null, cancha: null,
        goles_local: gl, goles_visita: gv, penales_local: null, penales_visita: null,
        estado: gl == null ? "programado" : "jugado", ...extra,
    };
}

describe("tabla de posiciones", () => {
    it("LIGA-TABLA-001: suma 3 por victoria, 1 por empate y cuenta goles", () => {
        const t = calcularTabla(equipos.slice(0, 3), [partido("a", "b", 2, 0), partido("b", "c", 1, 1), partido("c", "a", 0, 3)]);
        expect(t.map((f) => f.equipo.id)).toEqual(["a", "b", "c"]); // B y C con 1 pt: B tiene mejor DG (-2 vs -3)
        expect(t[0]).toMatchObject({ pj: 2, pg: 2, pe: 0, pp: 0, gf: 5, gc: 0, dg: 5, pts: 6 });
        expect(t[2]).toMatchObject({ pj: 2, pe: 1, pp: 1, gf: 1, gc: 4, dg: -3, pts: 1 });
    });

    it("LIGA-TABLA-002: solo cuentan los partidos regulares jugados", () => {
        const t = calcularTabla(equipos.slice(0, 2), [
            partido("a", "b", null, null),
            partido("a", "b", 5, 0, { estado: "suspendido" }),
            partido("a", "b", 4, 0, { fase: "final" }),
        ]);
        expect(t.every((f) => f.pj === 0 && f.pts === 0)).toBe(true);
    });

    it("LIGA-TABLA-003: desempata por diferencia de gol, goles a favor y nombre", () => {
        const t = calcularTabla(equipos.slice(0, 4), [
            partido("a", "c", 1, 0), // A: 3 pts, DG +1, GF 1
            partido("b", "d", 3, 2), // B: 3 pts, DG +1, GF 3
        ]);
        expect(t.map((f) => f.equipo.id)).toEqual(["b", "a", "d", "c"]); // C y D con DG -1: D hizo más goles
        const empatados = calcularTabla([{ id: "z", nombre: "Zeta" }, { id: "y", nombre: "Alfa" }], []);
        expect(empatados.map((f) => f.equipo.nombre)).toEqual(["Alfa", "Zeta"]);
    });
});

describe("playoffs", () => {
    const tabla = calcularTabla(equipos, []); // orden alfabético: a..h

    it("LIGA-PO-001: 8 clasificados → cuartos 1v8, 4v5, 2v7, 3v6", () => {
        const r = generarPrimeraRonda(tabla, 8);
        expect(r.map((c) => [c.fase, c.local_id, c.visita_id])).toEqual([
            ["cuartos", "a", "h"], ["cuartos", "d", "e"], ["cuartos", "b", "g"], ["cuartos", "c", "f"],
        ]);
    });

    it("LIGA-PO-002: 4 → semifinales y 2 → final directa", () => {
        expect(generarPrimeraRonda(tabla, 4).map((c) => [c.fase, c.local_id, c.visita_id])).toEqual([["semifinal", "a", "d"], ["semifinal", "b", "c"]]);
        expect(generarPrimeraRonda(tabla, 2)).toEqual([{ fase: "final", llave: 1, local_id: "a", visita_id: "b" }]);
    });

    it("LIGA-PO-003: rechaza más clasificados que equipos", () => {
        expect(() => generarPrimeraRonda(tabla.slice(0, 3), 4)).toThrow(/al menos 4/);
    });

    it("LIGA-PO-004: el empate se define por penales; sin penales no hay ganador", () => {
        const p = partido("a", "b", 1, 1, { fase: "semifinal" });
        expect(ganador(p)).toBeNull();
        expect(ganador({ ...p, penales_local: 3, penales_visita: 4 })).toBe("b");
        expect(ganador(partido("a", "b", 2, 1, { fase: "semifinal" }))).toBe("a");
        expect(ganador(partido("a", "b", null, null, { fase: "semifinal" }))).toBeNull();
    });

    it("LIGA-PO-005: la siguiente ronda cruza ganadores en orden de llave", () => {
        const semis = [
            partido("b", "c", 0, 2, { fase: "semifinal", llave: 2 }),
            partido("a", "d", 1, 1, { fase: "semifinal", llave: 1, penales_local: 5, penales_visita: 4 }),
        ];
        expect(generarSiguienteRonda(semis)).toEqual([{ fase: "final", llave: 1, local_id: "a", visita_id: "c" }]);
    });

    it("LIGA-PO-006: no avanza con resultados pendientes ni después de la final", () => {
        expect(() => generarSiguienteRonda([partido("a", "b", null, null, { fase: "semifinal", llave: 1 }), partido("c", "d", 1, 0, { fase: "semifinal", llave: 2 })])).toThrow(/Faltan resultados/);
        expect(() => generarSiguienteRonda([partido("a", "b", 1, 0, { fase: "final", llave: 1 })])).toThrow(/final/);
    });

    it("LIGA-PO-007: ronda actual es la más avanzada existente", () => {
        expect(rondaActual([{ fase: "regular" }])).toBeNull();
        expect(rondaActual([{ fase: "cuartos" }, { fase: "semifinal" }])).toBe("semifinal");
    });
});

describe("goles del partido", () => {
    const ctx = { local_id: "a", visita_id: "b", goles_local: 2, goles_visita: 1, equipoDeJugador: new Map([["ja", "a"], ["jb", "b"]]) };

    it("acepta autores, autogoles y goles sin autor registrado", () => {
        expect(errorGoles([{ equipo_id: "a", jugador_id: "ja" }, { equipo_id: "b", autogol: true }], ctx)).toBeNull();
        expect(errorGoles([], ctx)).toBeNull();
    });

    it("rechaza un autor de otro equipo, un autogol con autor y más autores que goles", () => {
        expect(errorGoles([{ equipo_id: "a", jugador_id: "jb" }], ctx)).toMatch(/autor/);
        expect(errorGoles([{ equipo_id: "a", jugador_id: "ja", autogol: true }], ctx)).toMatch(/autogol/);
        expect(errorGoles([{ equipo_id: "b", jugador_id: "jb" }, { equipo_id: "b", jugador_id: "jb" }], ctx)).toMatch(/más autores/);
    });

    it("agrupa los goles de un mismo jugador y separa por equipo", () => {
        const goles = [
            { equipo_id: "a", jugador_id: "ja", autogol: false, nombre: "Juan" },
            { equipo_id: "a", jugador_id: "ja", autogol: false, nombre: "Juan" },
            { equipo_id: "a", jugador_id: null, autogol: true, nombre: null },
            { equipo_id: "b", jugador_id: "jb", autogol: false, nombre: "Pedro" },
            { equipo_id: "b", jugador_id: null, autogol: false, nombre: null },
        ];
        expect(resumenGoles(goles, "a")).toEqual(["Juan ×2", "Autogol"]);
        expect(resumenGoles(goles, "b")).toEqual(["Pedro"]);
    });

    it("suma los goles de toda la liga y quienes empatan comparten posición", () => {
        const gol = (equipo_id: string, jugador_id: string, nombre: string) => ({ equipo_id, jugador_id, autogol: false, nombre });
        const resultado = calcularGoleadores([
            { estado: "jugado", goles: [gol("a", "ja", "Juan"), gol("b", "jb", "Pedro")] },
            { estado: "jugado", goles: [gol("a", "ja", "Juan"), gol("c", "jc", "Ana")] },
        ]);
        expect(resultado.map((g) => [g.posicion, g.nombre, g.goles])).toEqual([[1, "Juan", 2], [2, "Ana", 1], [2, "Pedro", 1]]);
        expect(resultado[0].equipo_id).toBe("a");
    });

    it("no cuenta autogoles, goles sin autor ni partidos que no se jugaron", () => {
        expect(calcularGoleadores([
            { estado: "jugado", goles: [{ equipo_id: "a", jugador_id: null, autogol: true, nombre: null }, { equipo_id: "a", jugador_id: null, autogol: false, nombre: null }] },
            { estado: "suspendido", goles: [{ equipo_id: "a", jugador_id: "ja", autogol: false, nombre: "Juan" }] },
            { estado: "jugado" },
        ])).toEqual([]);
    });

    it("aplana los datos embebidos sin dejar los objetos anidados", () => {
        const fila = aplanarDetallePartido({
            id: "p",
            goles: [{ equipo_id: "a", jugador_id: "ja", autogol: false, jugador: { usuario: { nombre: "Juan" } } }],
            mvp: { usuario: { nombre: "Pedro" } },
        });
        expect(fila).toEqual({ id: "p", goles: [{ equipo_id: "a", jugador_id: "ja", autogol: false, nombre: "Juan" }], jugador_partido_nombre: "Pedro" });
    });
});
