import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { crearEstado, manejarMensaje, ponerseAlDia, VENTANA_MAX_MS, VENTANA_INICIAL_MS } from "../../../webhook/mensajes";

const H = 3600000;
const AHORA = new Date("2026-10-12T12:00:00Z").getTime();
const seg = (ms: number) => Math.floor(ms / 1000);

let dir: string;
beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-estado-"));
});
afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
});

// ─── crearEstado ────────────────────────────────────────────────────────

describe("crearEstado", () => {
    it("MSG-EST-001: primer arranque sin archivo → revisa las últimas 24 h", () => {
        const e = crearEstado(path.join(dir, "e.json"), () => AHORA);
        expect(e.desde()).toBe(AHORA - VENTANA_INICIAL_MS);
    });

    it("MSG-EST-002: retoma desde la última revisión guardada (sobrevive reinicios)", () => {
        const ruta = path.join(dir, "e.json");
        crearEstado(ruta, () => AHORA).marcarRevisado(AHORA - 5 * H);

        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA - 5 * H);
    });

    it("MSG-EST-003: nunca mira más de 48 h atrás aunque el bot haya estado apagado más tiempo", () => {
        const ruta = path.join(dir, "e.json");
        crearEstado(ruta, () => AHORA).marcarRevisado(AHORA - 100 * H);

        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA - VENTANA_MAX_MS);
    });

    it("MSG-EST-004: los ids procesados se recuerdan entre reinicios", () => {
        const ruta = path.join(dir, "e.json");
        crearEstado(ruta).marcarProcesado("msg-1");

        const e = crearEstado(ruta);
        expect(e.yaProcesado("msg-1")).toBe(true);
        expect(e.yaProcesado("msg-2")).toBe(false);
    });

    it("MSG-EST-005: un archivo corrupto no tumba el bot (arranca como primer arranque)", () => {
        const ruta = path.join(dir, "e.json");
        fs.writeFileSync(ruta, "{ esto no es json");
        vi.spyOn(console, "error").mockImplementation(() => {});

        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA - VENTANA_INICIAL_MS);
    });
});

// ─── manejarMensaje ─────────────────────────────────────────────────────

function dbConClase(horasDesdeMensaje: number, enviadoEnMs: number) {
    return {
        buscarUsuarioPorTelefono: vi.fn().mockResolvedValue({ id: "u1", nombre: "Ana" }),
        getProximaClaseUsuario: vi.fn().mockResolvedValue({
            id: "insc-1",
            clase: { titulo: "Tecnico", tipo_evento: "entrenamiento" },
            horario: { fecha_hora: new Date(enviadoEnMs + horasDesdeMensaje * H).toISOString() },
        }),
        getProximaClaseUsuarioActioned: vi.fn().mockResolvedValue(null),
        confirmarAsistencia: vi.fn().mockResolvedValue(true),
        updateAsistencia: vi.fn().mockResolvedValue(true),
        devolverToken: vi.fn().mockResolvedValue(true),
    };
}

function mensaje(over: Record<string, unknown> = {}) {
    return {
        id: { _serialized: "msg-1" },
        from: "56912345678@c.us",
        fromMe: false,
        body: "1",
        timestamp: seg(Date.now()),
        reply: vi.fn().mockResolvedValue(undefined),
        getContact: vi.fn(),
        ...over,
    };
}

describe("manejarMensaje", () => {
    const deps = (db: unknown, estado = crearEstado(path.join(dir, "e.json"))) => ({ db, estado, recargarPagina: vi.fn() });

    it("MSG-001: responde, aplica la respuesta y marca el id como procesado", async () => {
        const db = dbConClase(5, Date.now());
        const d = deps(db);
        const msg = mensaje();

        expect(await manejarMensaje(msg, d)).toBe(true);

        expect(db.confirmarAsistencia).toHaveBeenCalledWith("insc-1");
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("Asistencia confirmada"));
        expect(d.estado.yaProcesado("msg-1")).toBe(true);
    });

    it("MSG-002: el mismo mensaje no se procesa dos veces (en vivo + al ponerse al día)", async () => {
        const db = dbConClase(5, Date.now());
        const d = deps(db);

        await manejarMensaje(mensaje(), d);
        expect(await manejarMensaje(mensaje(), d)).toBe(false);

        expect(db.confirmarAsistencia).toHaveBeenCalledTimes(1);
    });

    it("MSG-003: usa la hora REAL del mensaje para la regla de las 3 h", async () => {
        // Mandó '2' 5 h antes de la clase; se procesa 4 h después (falta 1 h).
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(AHORA);
        const enviadoEn = AHORA - 4 * H;
        const db = dbConClase(5, enviadoEn);

        await manejarMensaje(mensaje({ body: "2", timestamp: seg(enviadoEn) }), { ...deps(db), atrasado: true });

        expect(db.getProximaClaseUsuario).toHaveBeenCalledWith("u1", new Date(seg(enviadoEn) * 1000));
        expect(db.updateAsistencia).toHaveBeenCalledWith("insc-1", "cancelado");
        expect(db.devolverToken).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("MSG-004: ignora mensajes propios, de grupos, de difusión y de canales", async () => {
        const db = dbConClase(5, Date.now());
        for (const over of [{ fromMe: true }, { from: "123@g.us" }, { from: "status@broadcast" }, { from: "1@newsletter" }]) {
            expect(await manejarMensaje(mensaje(over), deps(db))).toBe(false);
        }
        expect(db.buscarUsuarioPorTelefono).not.toHaveBeenCalled();
    });

    it("MSG-005: cuentas @lid toman el teléfono del contacto", async () => {
        const db = dbConClase(5, Date.now());
        const msg = mensaje({
            from: "123456789012345@lid",
            getContact: vi.fn().mockResolvedValue({ number: "56912345678", id: { user: "123456789012345", server: "lid" } }),
        });

        await manejarMensaje(msg, deps(db));

        expect(db.buscarUsuarioPorTelefono).toHaveBeenCalledWith("56912345678");
    });

    it("MSG-006: si la BD falla NO se marca como procesado (se reintenta al próximo encendido)", async () => {
        const db = dbConClase(5, Date.now());
        db.buscarUsuarioPorTelefono.mockRejectedValue(new Error("BD caída"));
        const d = deps(db);

        await expect(manejarMensaje(mensaje(), d)).rejects.toThrow("BD caída");
        expect(d.estado.yaProcesado("msg-1")).toBe(false);
    });

    it("MSG-007: si falla el envío de la respuesta, el cambio ya quedó y no se repite", async () => {
        const db = dbConClase(5, Date.now());
        const d = deps(db);
        const msg = mensaje({ reply: vi.fn().mockRejectedValue(new Error("sin red")) });

        await expect(manejarMensaje(msg, d)).rejects.toThrow("sin red");
        expect(d.estado.yaProcesado("msg-1")).toBe(true);
        expect(await manejarMensaje(msg, d)).toBe(false);
        expect(db.confirmarAsistencia).toHaveBeenCalledTimes(1);
    });

    it("MSG-008: reintenta la respuesta tras 'detached Frame'", async () => {
        const db = dbConClase(5, Date.now());
        const d = deps(db);
        const msg = mensaje({
            reply: vi.fn().mockRejectedValueOnce(new Error("Attempted to use detached Frame")).mockResolvedValue(undefined),
        });
        vi.spyOn(console, "log").mockImplementation(() => {});

        await manejarMensaje(msg, d);

        expect(d.recargarPagina).toHaveBeenCalledTimes(1);
        expect(msg.reply).toHaveBeenCalledTimes(2);
    });
});

// ─── ponerseAlDia ───────────────────────────────────────────────────────

function chat(id: string, mensajes: { id: string; ts: number; fromMe?: boolean }[], over: Record<string, unknown> = {}) {
    const ultimo = Math.max(0, ...mensajes.map((m) => m.ts));
    return {
        id: { _serialized: id },
        isGroup: false,
        timestamp: seg(ultimo),
        fetchMessages: vi.fn().mockResolvedValue(
            mensajes.map((m) => ({ id: { _serialized: m.id }, from: id, fromMe: !!m.fromMe, timestamp: seg(m.ts), body: "1" })),
        ),
        ...over,
    };
}

describe("ponerseAlDia", () => {
    const DESDE = AHORA - 10 * H;

    it("MSG-SYNC-001: atiende solo los mensajes recibidos después de la última revisión, en orden cronológico", async () => {
        const wa = {
            getChats: vi.fn().mockResolvedValue([
                chat("569111@c.us", [{ id: "a-viejo", ts: DESDE - H }, { id: "a-2", ts: AHORA - 2 * H }]),
                chat("569222@c.us", [{ id: "b-1", ts: AHORA - 5 * H }]),
            ]),
        };
        const atendidos: string[] = [];
        const manejar = vi.fn(async (m: { id: { _serialized: string } }) => { atendidos.push(m.id._serialized); return true; });

        const n = await ponerseAlDia(wa, { desdeMs: DESDE, manejar });

        expect(atendidos).toEqual(["b-1", "a-2"]);
        expect(n).toBe(2);
    });

    it("MSG-SYNC-002: no pide el historial de chats sin actividad nueva ni de grupos", async () => {
        const viejo = chat("569111@c.us", [{ id: "x", ts: DESDE - H }]);
        const grupo = chat("123@g.us", [{ id: "g", ts: AHORA - H }], { isGroup: true });
        const wa = { getChats: vi.fn().mockResolvedValue([viejo, grupo]) };

        await ponerseAlDia(wa, { desdeMs: DESDE, manejar: vi.fn() });

        expect(viejo.fetchMessages).not.toHaveBeenCalled();
        expect(grupo.fetchMessages).not.toHaveBeenCalled();
    });

    it("MSG-SYNC-003: pide solo mensajes recibidos (fromMe: false) y descarta los propios", async () => {
        const c = chat("569111@c.us", [{ id: "mio", ts: AHORA - H, fromMe: true }, { id: "suyo", ts: AHORA - H }]);
        const wa = { getChats: vi.fn().mockResolvedValue([c]) };
        const manejar = vi.fn().mockResolvedValue(true);

        await ponerseAlDia(wa, { desdeMs: DESDE, manejar });

        expect(c.fetchMessages).toHaveBeenCalledWith(expect.objectContaining({ fromMe: false }));
        expect(manejar).toHaveBeenCalledTimes(1);
    });

    it("MSG-SYNC-004: un chat que falla al leerse no frena a los demás", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const roto = chat("569111@c.us", [{ id: "x", ts: AHORA - H }], { fetchMessages: vi.fn().mockRejectedValue(new Error("boom")) });
        const sano = chat("569222@c.us", [{ id: "ok", ts: AHORA - H }]);
        const wa = { getChats: vi.fn().mockResolvedValue([roto, sano]) };
        const manejar = vi.fn().mockResolvedValue(true);

        expect(await ponerseAlDia(wa, { desdeMs: DESDE, manejar })).toBe(1);
    });

    it("MSG-SYNC-005: un mensaje que falla al procesarse no frena a los siguientes", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const wa = {
            getChats: vi.fn().mockResolvedValue([chat("569111@c.us", [{ id: "m1", ts: AHORA - 2 * H }, { id: "m2", ts: AHORA - H }])]),
        };
        const manejar = vi.fn().mockRejectedValueOnce(new Error("BD caída")).mockResolvedValue(true);

        expect(await ponerseAlDia(wa, { desdeMs: DESDE, manejar })).toBe(1);
        expect(manejar).toHaveBeenCalledTimes(2);
    });

    it("MSG-SYNC-006: si no puede listar los chats, lanza (server.js reintenta y el scheduler no cancela)", async () => {
        const wa = { getChats: vi.fn().mockRejectedValue(new Error("página no lista")) };

        await expect(ponerseAlDia(wa, { desdeMs: DESDE, manejar: vi.fn() })).rejects.toThrow("página no lista");
    });
});
