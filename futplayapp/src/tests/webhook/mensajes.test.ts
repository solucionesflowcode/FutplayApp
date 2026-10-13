import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { crearEstado, manejarMensaje, ponerseAlDia, decidirPuestaAlDia, listarChatsSeguros, VENTANA_MAX_MS, VENTANA_INICIAL_MS, MAX_INTENTOS_PUESTA_AL_DIA } from "../../../webhook/mensajes";

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

    it("MSG-EST-003: nunca mira más de 7 días atrás aunque el bot haya estado apagado más tiempo", () => {
        const ruta = path.join(dir, "e.json");
        crearEstado(ruta, () => AHORA).marcarRevisado(AHORA - 300 * H);

        expect(VENTANA_MAX_MS).toBe(7 * 24 * H);
        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA - VENTANA_MAX_MS);
    });

    it("MSG-EST-003b: PC apagado un fin de semana largo (63 h) → igual lee los mensajes del viernes", () => {
        const ruta = path.join(dir, "e.json");
        crearEstado(ruta, () => AHORA).marcarRevisado(AHORA - 63 * H);

        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA - 63 * H);
    });

    it("MSG-EST-006: con piso, el marcado de cada minuto no deja atrás el mensaje que falló (sobrevive reinicios)", () => {
        const ruta = path.join(dir, "e.json");
        const e = crearEstado(ruta, () => AHORA);
        e.marcarRevisado(AHORA - 5 * H);
        e.fijarPiso(AHORA - 3 * H);
        e.marcarRevisado(AHORA); // el cron de server.js

        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA - 3 * H);

        // Una puesta al día sin fallos borra el piso y la marca vuelve a avanzar.
        const e2 = crearEstado(ruta, () => AHORA);
        e2.fijarPiso(null);
        e2.marcarRevisado(AHORA);
        expect(crearEstado(ruta, () => AHORA).desde()).toBe(AHORA);
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

        expect(db.getProximaClaseUsuario).toHaveBeenCalledWith("u1", new Date(seg(enviadoEn) * 1000), { soloPendiente: true });
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

    it("MSG-005b: cuentas @lid toman el teléfono real del mapeo lid → teléfono de WhatsApp", async () => {
        const db = dbConClase(5, Date.now());
        const msg = mensaje({
            from: "244426874081447@lid",
            client: { getContactLidAndPhone: vi.fn().mockResolvedValue([{ lid: "244426874081447@lid", pn: "56979046977@c.us" }]) },
            // contact.number devuelve el propio id @lid: no sirve como teléfono.
            getContact: vi.fn().mockResolvedValue({ number: "244426874081447", id: { user: "244426874081447", server: "lid" } }),
        });

        await manejarMensaje(msg, deps(db));

        expect(db.buscarUsuarioPorTelefono).toHaveBeenCalledWith("56979046977");
    });

    it("MSG-005c: si el contacto @lid solo devuelve su id, no se usa como teléfono", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const db = dbConClase(5, Date.now());
        const msg = mensaje({
            from: "244426874081447@lid",
            client: { getContactLidAndPhone: vi.fn().mockResolvedValue([{ lid: "244426874081447@lid" }]) },
            getContact: vi.fn().mockResolvedValue({ number: "244426874081447", id: { user: "244426874081447", server: "lid" } }),
        });

        expect(await manejarMensaje(msg, deps(db))).toBe(false);
        expect(db.buscarUsuarioPorTelefono).not.toHaveBeenCalled();
    });

    it("MSG-002b: sin id._serialized (forma actual de whatsapp-web.js) igual se marca y no se repite", async () => {
        const db = dbConClase(5, Date.now());
        const d = deps(db);
        const id = { fromMe: false, remote: "244426874081447@lid", id: "3ABD87B55F3750155DAC" };
        const msg = () => mensaje({
            id,
            from: "244426874081447@lid",
            client: { getContactLidAndPhone: vi.fn().mockResolvedValue([{ pn: "56979046977@c.us" }]) },
        });

        expect(await manejarMensaje(msg(), d)).toBe(true);
        expect(await manejarMensaje(msg(), d)).toBe(false);
        expect(db.confirmarAsistencia).toHaveBeenCalledTimes(1);
        expect(d.estado.yaProcesado("false_244426874081447@lid_3ABD87B55F3750155DAC")).toBe(true);
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

        const res = await ponerseAlDia(wa, { desdeMs: DESDE, manejar });

        expect(atendidos).toEqual(["b-1", "a-2"]);
        expect(res).toEqual({ atendidos: 2, fallidos: 0, primerFallidoMs: null });
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

        // Se cuenta como fallido desde el inicio: no se sabe qué mensajes tenía.
        expect(await ponerseAlDia(wa, { desdeMs: DESDE, manejar })).toEqual({ atendidos: 1, fallidos: 1, primerFallidoMs: DESDE + 1 });
    });

    it("MSG-SYNC-005: un mensaje que falla al procesarse no frena a los siguientes", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const wa = {
            getChats: vi.fn().mockResolvedValue([chat("569111@c.us", [{ id: "m1", ts: AHORA - 2 * H }, { id: "m2", ts: AHORA - H }])]),
        };
        const manejar = vi.fn().mockRejectedValueOnce(new Error("BD caída")).mockResolvedValue(true);

        expect(await ponerseAlDia(wa, { desdeMs: DESDE, manejar })).toEqual({
            atendidos: 1, fallidos: 1, primerFallidoMs: seg(AHORA - 2 * H) * 1000,
        });
        expect(manejar).toHaveBeenCalledTimes(2);
    });
});

// ─── decidirPuestaAlDia + reintentos (lo que hace server.js) ────────────

describe("puesta al día con la BD caída", () => {
    const DESDE = AHORA - 10 * H;

    it("MSG-PAD-001: sin fallos → al día, marca hasta la conexión y borra el piso", () => {
        expect(decidirPuestaAlDia({ fallidos: 0, primerFallidoMs: null }, 1, AHORA))
            .toEqual({ alDia: true, revisadoHasta: AHORA, piso: null });
    });

    it("MSG-PAD-002: con fallos → NO al día (el scheduler espera) mientras queden intentos", () => {
        for (let i = 1; i < MAX_INTENTOS_PUESTA_AL_DIA; i++) {
            expect(decidirPuestaAlDia({ fallidos: 1, primerFallidoMs: AHORA - H }, i, AHORA)).toEqual({ alDia: false });
        }
    });

    it("MSG-PAD-003: tras el último intento sigue (no bloquea el bot) con piso antes del mensaje fallido", () => {
        expect(decidirPuestaAlDia({ fallidos: 1, primerFallidoMs: AHORA - H }, MAX_INTENTOS_PUESTA_AL_DIA, AHORA))
            .toEqual({ alDia: true, revisadoHasta: AHORA, piso: AHORA - H - 1 });
    });

    // Repite el ciclo de server.js: ponerseAlDia → decidir → (reintentar | marcar).
    async function cicloServer(wa: unknown, estado: ReturnType<typeof crearEstado>, manejar: (m: never) => Promise<boolean>, intento: number) {
        const res = await ponerseAlDia(wa, { desdeMs: estado.desde(), manejar });
        const d = decidirPuestaAlDia(res, intento, AHORA);
        if (d.alDia) { estado.fijarPiso(d.piso); estado.marcarRevisado(d.revisadoHasta); }
        return d.alDia;
    }

    it("MSG-PAD-004: el '1' que falló por la BD se aplica en el reintento y recién ahí corre el scheduler", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const estado = crearEstado(path.join(dir, "e.json"), () => AHORA);
        estado.marcarRevisado(DESDE);
        const wa = { getChats: vi.fn().mockResolvedValue([chat("569111@c.us", [{ id: "uno", ts: AHORA - 2 * H }, { id: "dos", ts: AHORA - H }])]) };
        let bdCaida = true;
        const aplicados: string[] = [];
        const manejar = async (m: { id: { _serialized: string } }) => {
            const id = m.id._serialized;
            if (estado.yaProcesado(id)) return false;
            if (bdCaida && id === "uno") throw new Error("fetch failed");
            aplicados.push(id);
            estado.marcarProcesado(id);
            return true;
        };

        expect(await cicloServer(wa, estado, manejar as never, 1)).toBe(false); // scheduler no corre
        expect(estado.desde()).toBe(DESDE); // la marca no avanzó
        bdCaida = false;
        expect(await cicloServer(wa, estado, manejar as never, 2)).toBe(true);

        expect(aplicados).toEqual(["dos", "uno"]); // "dos" no se repite
    });

    it("MSG-PAD-005: si la BD sigue caída tras todos los intentos, el próximo encendido relee el mensaje", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const ruta = path.join(dir, "e.json");
        const estado = crearEstado(ruta, () => AHORA);
        estado.marcarRevisado(DESDE);
        const wa = { getChats: vi.fn().mockResolvedValue([chat("569111@c.us", [{ id: "uno", ts: AHORA - 2 * H }])]) };
        const falla = async () => { throw new Error("fetch failed"); };

        let alDia = false;
        for (let i = 1; !alDia; i++) alDia = await cicloServer(wa, estado, falla as never, i);
        estado.marcarRevisado(AHORA); // cron de server.js mientras está al día

        const siguienteEncendido = crearEstado(ruta, () => AHORA + 5 * H);
        expect(siguienteEncendido.desde()).toBeLessThan(seg(AHORA - 2 * H) * 1000);
    });

    it("MSG-SYNC-006: si no puede listar los chats, lanza (server.js reintenta y el scheduler no cancela)", async () => {
        const wa = { getChats: vi.fn().mockRejectedValue(new Error("página no lista")) };

        await expect(ponerseAlDia(wa, { desdeMs: DESDE, manejar: vi.fn() })).rejects.toThrow("página no lista");
    });
});

// ─── listarChatsSeguros ─────────────────────────────────────────────────

describe("listarChatsSeguros", () => {
    const DESDE = AHORA - 10 * H;

    // Simula la página: evaluate corre la función contra una colección Chat falsa.
    function cliente(modelos: { id: string; t: number }[]) {
        const Chat = { getModelsArray: () => modelos.map((m) => ({ id: { _serialized: m.id }, t: m.t })) };
        return {
            pupPage: {
                evaluate: vi.fn(async (fn: (a: number) => unknown, arg: number) => {
                    const g = globalThis as unknown as { window?: unknown };
                    const antes = g.window;
                    g.window = { require: () => ({ Chat }) };
                    try { return fn(arg); } finally { g.window = antes; }
                }),
            },
            // getChatModel falla con los chats @lid: no debe usarse.
            getChats: vi.fn().mockRejectedValue(new Error("r")),
            getChatById: vi.fn().mockRejectedValue(new Error("r")),
        };
    }
    const crearChat = (_wa: unknown, id: string, t: number) => ({ id: { _serialized: id }, timestamp: t, isGroup: false });

    it("MSG-SYNC-007: no serializa chats (getChats/getChatById fallan con @lid) y devuelve los recientes", async () => {
        const wa = cliente([{ id: "244426874081447@lid", t: seg(AHORA - H) }, { id: "569222@c.us", t: seg(AHORA - 2 * H) }]);

        const chats = await listarChatsSeguros(wa, DESDE, crearChat);

        expect(chats).toEqual([
            { id: { _serialized: "244426874081447@lid" }, timestamp: seg(AHORA - H), isGroup: false },
            { id: { _serialized: "569222@c.us" }, timestamp: seg(AHORA - 2 * H), isGroup: false },
        ]);
        expect(wa.getChats).not.toHaveBeenCalled();
        expect(wa.getChatById).not.toHaveBeenCalled();
    });

    it("MSG-SYNC-008: solo chats privados con actividad desde la última revisión", async () => {
        const wa = cliente([
            { id: "569111@c.us", t: seg(AHORA - H) },
            { id: "569333@c.us", t: seg(DESDE - H) },
            { id: "123@g.us", t: seg(AHORA - H) },
            { id: "status@broadcast", t: seg(AHORA - H) },
            { id: "999@lid", t: seg(AHORA - H) },
        ]);

        const chats = await listarChatsSeguros(wa, DESDE, crearChat);

        expect(chats.map((c: { id: { _serialized: string } }) => c.id._serialized)).toEqual(["569111@c.us", "999@lid"]);
    });

    it("MSG-SYNC-009: el chat liviano real usa fetchMessages de whatsapp-web.js sobre la página", async () => {
        const evaluate = vi.fn()
            .mockResolvedValueOnce([{ id: "244426874081447@lid", t: seg(AHORA - H) }])
            .mockResolvedValueOnce([]);
        const wa = { pupPage: { evaluate } };

        const [c] = await listarChatsSeguros(wa, DESDE);
        await c.fetchMessages({ limit: 30, fromMe: false });

        // Segunda llamada = fetchMessages, con el id del chat (sin getChatModel).
        expect(evaluate).toHaveBeenCalledTimes(2);
        expect(evaluate.mock.calls[1][1]).toBe("244426874081447@lid");
    });
});
