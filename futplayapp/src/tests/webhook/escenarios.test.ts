import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { crearScheduler } from "../../../webhook/scheduler";
import { procesarMensajeWhatsApp } from "../../../webhook/handlers";

// Escenarios de punta a punta del bot: scheduler + respuestas reales sobre una
// BD en memoria que replica la semántica de webhook/data.js (mismos filtros de
// estado y ventanas de tiempo). El reloj se avanza con vi.setSystemTime.

const H = 3600000;
const T0 = new Date("2026-10-12T12:00:00Z").getTime();

type Insc = { id: string; usuario_id: string; clase_id: string; asistencia: string };
type Clase = { id: string; titulo: string; fecha_hora: string; tipo_evento: string };
type Usuario = { id: string; nombre: string; telefono: string | null };

// Cede el turno para que dos mensajes procesados a la vez se intercalen como
// en producción (whatsapp-web.js no serializa los eventos 'message').
const tick = () => new Promise((r) => setTimeout(r, 0));

function crearBd() {
    const clases: Clase[] = [];
    const inscripciones: Insc[] = [];
    const usuarios: Usuario[] = [];
    let tokensDevueltos = 0;

    const ahora = () => Date.now();
    const ms = (c: Clase) => new Date(c.fecha_hora).getTime();
    const horario = (c: Clase) => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id });

    function proxima(usuarioId: string, estados: string[] | null, desde: number) {
        const propias = inscripciones.filter((i) => i.usuario_id === usuarioId && (!estados || estados.includes(i.asistencia)));
        const clase = clases
            .filter((c) => propias.some((i) => i.clase_id === c.id) && ms(c) >= desde)
            .sort((a, b) => ms(a) - ms(b))[0];
        if (!clase) return null;
        const insc = propias.find((i) => i.clase_id === clase.id)!;
        return { insc, clase };
    }

    const db = {
        async buscarUsuarioPorTelefono(telefono: string) {
            await tick();
            const raw = telefono.replace(/\D/g, "");
            return usuarios.find((u) => u.telefono === raw || u.telefono === "+" + raw) ?? null;
        },
        // `desde` = hora del mensaje, igual que data.js
        async getProximaClaseUsuario(usuarioId: string, desde: Date = new Date()) {
            await tick();
            const p = proxima(usuarioId, ["sin_confirmar", "pendiente"], desde.getTime());
            if (!p) return null;
            return { id: p.insc.id, clase: { titulo: p.clase.titulo, tipo_evento: p.clase.tipo_evento }, horario: { fecha_hora: p.clase.fecha_hora } };
        },
        async getProximaClaseUsuarioActioned(usuarioId: string, desde: Date = new Date()) {
            await tick();
            const p = proxima(usuarioId, null, desde.getTime());
            if (!p) return null;
            return { id: p.insc.id, clase: { titulo: p.clase.titulo }, horario: { fecha_hora: p.clase.fecha_hora }, asistencia: p.insc.asistencia };
        },
        // Igual que data.js: el UPDATE solo aplica a sin_confirmar/pendiente y
        // devuelve true únicamente si esta llamada cambió la fila.
        async confirmarAsistencia(id: string) {
            await tick();
            const i = inscripciones.find((x) => x.id === id && ["sin_confirmar", "pendiente"].includes(x.asistencia));
            if (i) i.asistencia = "confirmado_whatsapp";
            return !!i;
        },
        async updateAsistencia(id: string, estado: string) {
            await tick();
            const i = inscripciones.find((x) => x.id === id && ["sin_confirmar", "pendiente"].includes(x.asistencia));
            if (i) i.asistencia = estado;
            return !!i;
        },
        async devolverToken() {
            await tick();
            tokensDevueltos++;
            return true;
        },
        async getHorarios24h() {
            return clases.filter((c) => ms(c) >= ahora() && ms(c) <= ahora() + 24 * H).map(horario);
        },
        async getHorariosProximos1h() {
            return clases.filter((c) => ms(c) >= ahora() && ms(c) <= ahora() + H).map(horario);
        },
        async getHorariosPasados() {
            return clases.filter((c) => ms(c) >= ahora() - 48 * H && ms(c) < ahora()).map(horario);
        },
        async getHorariosPasados1h() {
            return clases.filter((c) => ms(c) >= ahora() - 48 * H && ms(c) <= ahora() - H).map(horario);
        },
        async getInscripcionesSinConfirmar(claseId: string) {
            return inscripciones.filter((i) => i.clase_id === claseId && i.asistencia === "sin_confirmar");
        },
        async setPendiente(id: string) {
            const i = inscripciones.find((x) => x.id === id && x.asistencia === "sin_confirmar");
            if (i) i.asistencia = "pendiente";
            return !!i;
        },
        async actualizarPorClaseYEstado(claseId: string, desde: string, hacia: string) {
            for (const i of inscripciones) if (i.clase_id === claseId && i.asistencia === desde) i.asistencia = hacia;
        },
        async getClase(claseId: string) {
            const c = clases.find((x) => x.id === claseId);
            return c ? { titulo: c.titulo } : null;
        },
        async getUsuario(usuarioId: string) {
            const u = usuarios.find((x) => x.id === usuarioId);
            return u ? { nombre: u.nombre, telefono: u.telefono } : null;
        },
        async usuarioTienePendienteAntes(usuarioId: string, fechaHora: string) {
            const limite = new Date(fechaHora).getTime();
            return inscripciones.some((i) => {
                const c = clases.find((x) => x.id === i.clase_id)!;
                return i.usuario_id === usuarioId && i.asistencia === "pendiente" && ms(c) >= ahora() && ms(c) < limite;
            });
        },
    };

    return {
        db,
        clases,
        inscripciones,
        usuarios,
        tokens: () => tokensDevueltos,
        estado: (id: string) => inscripciones.find((i) => i.id === id)!.asistencia,
    };
}

function montar() {
    const bd = crearBd();
    const enviados: { chatId: string; texto: string }[] = [];
    const tickScheduler = crearScheduler({
        db: bd.db,
        enviar: async (chatId: string, texto: string) => { enviados.push({ chatId, texto }); },
        estaListo: () => true,
        recordatoriosEnviados: new Set<string>(),
        guardarRecordatorios: () => {},
        esperaEntreEnviosMs: 0,
    });
    const responder = (telefono: string, texto: string) => procesarMensajeWhatsApp(telefono, texto, bd.db);

    // Bot apagado: los alumnos escriben y nadie procesa. Al encender, primero se
    // atienden esos mensajes con su hora real (como hace server.js con
    // ponerseAlDia) y recién después corre el scheduler.
    const bandeja: { telefono: string; texto: string; enviadoEn: Date }[] = [];
    const escribirConBotApagado = (telefono: string, texto: string) =>
        bandeja.push({ telefono, texto, enviadoEn: new Date() });
    async function encenderBot() {
        const respuestas: (string | null)[] = [];
        for (const m of bandeja.splice(0)) {
            respuestas.push(await procesarMensajeWhatsApp(m.telefono, m.texto, bd.db, { enviadoEn: m.enviadoEn, atrasado: true }));
        }
        await tickScheduler();
        return respuestas;
    }
    return { bd, enviados, tickScheduler, responder, escribirConBotApagado, encenderBot };
}

const enHoras = (h: number) => new Date(Date.now() + h * H).toISOString();
const avanzar = (h: number) => vi.setSystemTime(Date.now() + h * H);

describe("bot de WhatsApp — escenarios de punta a punta", () => {
    let consola: ReturnType<typeof vi.spyOn>[];

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(T0);
        consola = [vi.spyOn(console, "log").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {})];
    });

    afterEach(() => {
        vi.useRealTimers();
        consola.forEach((s) => s.mockRestore());
    });

    function alumnoConClase(m: ReturnType<typeof montar>, horas: number, extra: Partial<Clase> = {}, telefono: string | null = "+56912345678") {
        m.bd.usuarios.push({ id: "u1", nombre: "Ana", telefono });
        m.bd.clases.push({ id: "c1", titulo: "Tecnico", fecha_hora: enHoras(horas), tipo_evento: "entrenamiento", ...extra });
        m.bd.inscripciones.push({ id: "i1", usuario_id: "u1", clase_id: "c1", asistencia: "sin_confirmar" });
    }

    it("E2E-001: recordatorio → '1' → confirmado; 1 h después de la clase → no_asistio", async () => {
        const m = montar();
        alumnoConClase(m, 20);

        await m.tickScheduler();
        expect(m.enviados).toHaveLength(1);
        expect(m.enviados[0].chatId).toBe("56912345678@c.us");
        expect(m.bd.estado("i1")).toBe("pendiente");

        expect(await m.responder("56912345678", "Sí")).toContain("Asistencia confirmada");
        expect(m.bd.estado("i1")).toBe("confirmado_whatsapp");

        avanzar(20.5); // la clase empezó hace 30 min: todavía no se marca
        await m.tickScheduler();
        expect(m.bd.estado("i1")).toBe("confirmado_whatsapp");

        avanzar(1);
        await m.tickScheduler();
        expect(m.bd.estado("i1")).toBe("no_asistio");
    });

    it("E2E-002: recordatorio sin respuesta → 1 h antes queda cancelado_sin_reembolso, sin devolver token", async () => {
        const m = montar();
        alumnoConClase(m, 20);

        await m.tickScheduler();
        avanzar(18.5); // faltan 1,5 h: todavía no
        await m.tickScheduler();
        expect(m.bd.estado("i1")).toBe("pendiente");

        avanzar(0.6); // faltan 54 min
        await m.tickScheduler();
        expect(m.bd.estado("i1")).toBe("cancelado_sin_reembolso");
        expect(m.bd.tokens()).toBe(0);
    });

    it("E2E-003: '2' con ≥ 3 h → cancelado y se devuelve exactamente 1 token", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();

        expect(await m.responder("56912345678", "no")).toBe("❌ Clase cancelada. Te devolvimos el token.");
        expect(m.bd.estado("i1")).toBe("cancelado");
        expect(m.bd.tokens()).toBe(1);
    });

    it("E2E-004: '2' con < 3 h → cancelado_sin_reembolso, sin token", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();
        avanzar(8);

        expect(await m.responder("56912345678", "2")).toContain("no se devuelve el token");
        expect(m.bd.estado("i1")).toBe("cancelado_sin_reembolso");
        expect(m.bd.tokens()).toBe(0);
    });

    it("E2E-005: cancelar un partido nunca devuelve token", async () => {
        const m = montar();
        alumnoConClase(m, 10, { tipo_evento: "partido", titulo: "Partido" });
        await m.tickScheduler();

        expect(await m.responder("56912345678", "2")).toBe("❌ Partido cancelado.");
        expect(m.bd.estado("i1")).toBe("cancelado");
        expect(m.bd.tokens()).toBe(0);
    });

    it("E2E-006: alumno sin teléfono — no se avisa ni se cancela, ni siquiera al pasar la clase", async () => {
        const m = montar();
        alumnoConClase(m, 5, {}, null);

        await m.tickScheduler();
        avanzar(4.5);
        await m.tickScheduler();
        avanzar(3);
        await m.tickScheduler();

        expect(m.enviados).toHaveLength(0);
        expect(m.bd.estado("i1")).toBe("sin_confirmar");
    });

    it("E2E-007: dos clases del mismo alumno — la 2ª se avisa recién cuando responde la 1ª", async () => {
        const m = montar();
        alumnoConClase(m, 5);
        m.bd.clases.push({ id: "c2", titulo: "Fisico", fecha_hora: enHoras(10), tipo_evento: "entrenamiento" });
        m.bd.inscripciones.push({ id: "i2", usuario_id: "u1", clase_id: "c2", asistencia: "sin_confirmar" });

        await m.tickScheduler();
        expect(m.enviados).toHaveLength(1);
        expect(m.enviados[0].texto).toContain("Tecnico");
        expect(m.bd.estado("i2")).toBe("sin_confirmar");

        await m.responder("56912345678", "1"); // confirma la más próxima (c1)
        expect(m.bd.estado("i1")).toBe("confirmado_whatsapp");

        await m.tickScheduler();
        expect(m.enviados).toHaveLength(2);
        expect(m.enviados[1].texto).toContain("Fisico");
        expect(m.bd.estado("i2")).toBe("pendiente");
    });

    it("E2E-008: un recordatorio no se reenvía en los ciclos siguientes", async () => {
        const m = montar();
        alumnoConClase(m, 20);

        await m.tickScheduler();
        await m.tickScheduler();
        avanzar(0.5);
        await m.tickScheduler();

        expect(m.enviados).toHaveLength(1);
    });

    it("E2E-009: mensajes de un número que no es alumno se ignoran", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();

        expect(await m.responder("56999999999", "2")).toBeNull();
        expect(m.bd.estado("i1")).toBe("pendiente");
    });

    it("E2E-010: un texto cualquiera con clase pendiente recuerda las opciones sin tocar la reserva", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();

        expect(await m.responder("56912345678", "hola, a qué hora es?")).toContain("responde *1*");
        expect(m.bd.estado("i1")).toBe("pendiente");
    });

    // ── Bugs corregidos (auditoría del bot, 2026-10-10) ──

    it("BUG-001: inscrito 30 min antes — no recibe recordatorio ni se le cancela la reserva", async () => {
        // Antes: recibía "Confirma tu asistencia" y en el MISMO ciclo la regla de
        // 1 h antes lo cancelaba sin reembolso, sin tiempo para responder.
        const m = montar();
        alumnoConClase(m, 0.5);

        await m.tickScheduler();
        avanzar(0.4);
        await m.tickScheduler();

        expect(m.enviados).toHaveLength(0);
        expect(m.bd.estado("i1")).toBe("sin_confirmar");
    });

    it("BUG-001b: inscrito 1,5 h antes — tampoco se avisa (quedaría < 1 h para responder)", async () => {
        const m = montar();
        alumnoConClase(m, 1.5);

        await m.tickScheduler();

        expect(m.enviados).toHaveLength(0);
        expect(m.bd.estado("i1")).toBe("sin_confirmar");
    });

    it("BUG-001c: inscrito 2,5 h antes — sí se avisa y tiene 1,5 h para responder", async () => {
        const m = montar();
        alumnoConClase(m, 2.5);

        await m.tickScheduler();
        expect(m.enviados).toHaveLength(1);

        avanzar(1); // faltan 1,5 h: responde a tiempo
        expect(await m.responder("56912345678", "1")).toContain("Asistencia confirmada");
        avanzar(0.6);
        await m.tickScheduler();
        expect(m.bd.estado("i1")).toBe("confirmado_whatsapp");
    });

    it("BUG-002: dos '2' a la vez devuelven UN solo token", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();

        const respuestas = await Promise.all([m.responder("56912345678", "2"), m.responder("56912345678", "2")]);

        expect(m.bd.estado("i1")).toBe("cancelado");
        expect(m.bd.tokens()).toBe(1);
        expect(respuestas.filter((r) => r?.includes("Te devolvimos el token"))).toHaveLength(1);
    });

    it("BUG-002b: la web cancela justo mientras el bot procesa el '2' → el bot no devuelve otro token", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();

        // La web cancela (y reembolsa por su cuenta) después de que el bot leyó
        // la reserva como pendiente y antes de que la actualice.
        // procesarMensajeWhatsApp lee la próxima clase y cancelarAsistencia la
        // vuelve a leer: la web cancela justo después de esa segunda lectura.
        const leer = m.bd.db.getProximaClaseUsuario;
        let lecturas = 0;
        m.bd.db.getProximaClaseUsuario = async (usuarioId: string) => {
            const r = await leer(usuarioId);
            if (++lecturas === 2) m.bd.inscripciones[0].asistencia = "cancelado";
            return r;
        };

        const res = await m.responder("56912345678", "2");

        expect(res).toContain("No pudimos cancelar");
        expect(m.bd.tokens()).toBe(0);
    });

    // ── Encendidos cortos: el PC se prende unas veces al día ──

    it("OFF-001: responde '1' con el bot apagado y lo prenden DESPUÉS de la clase → confirmado, no cancelado", async () => {
        // Antes: el '1' no se leía y al encender se cancelaba sin reembolso.
        const m = montar();
        alumnoConClase(m, 20);
        await m.tickScheduler(); // encendido 1: recordatorio
        avanzar(2);
        m.escribirConBotApagado("56912345678", "1"); // faltaban 18 h

        avanzar(19.5); // la clase fue hace 1,5 h
        const [respuesta] = await m.encenderBot();

        expect(respuesta).toContain("Asistencia confirmada");
        // Ya pasó 1 h desde la clase: el scheduler la deja para que el profesor corrija.
        expect(m.bd.estado("i1")).toBe("no_asistio");
    });

    it("OFF-002: cancela con '2' a tiempo (18 h antes) y lo procesan tarde → igual se devuelve el token", async () => {
        const m = montar();
        alumnoConClase(m, 20);
        await m.tickScheduler();
        avanzar(2);
        m.escribirConBotApagado("56912345678", "2");

        avanzar(17); // faltan 1 h al procesar: por hora de proceso NO correspondería
        const [respuesta] = await m.encenderBot();

        expect(respuesta).toBe("❌ Clase cancelada. Te devolvimos el token.");
        expect(m.bd.estado("i1")).toBe("cancelado");
        expect(m.bd.tokens()).toBe(1);
    });

    it("OFF-003: '2' mandado con 2 h de anticipación → sin reembolso aunque se procese más tarde", async () => {
        const m = montar();
        alumnoConClase(m, 20);
        await m.tickScheduler();
        avanzar(18);
        m.escribirConBotApagado("56912345678", "2");

        avanzar(5);
        await m.encenderBot();

        expect(m.bd.estado("i1")).toBe("cancelado_sin_reembolso");
        expect(m.bd.tokens()).toBe(0);
    });

    it("OFF-004: quien de verdad no respondió sí queda cancelado sin reembolso al encender", async () => {
        const m = montar();
        alumnoConClase(m, 20);
        await m.tickScheduler();

        avanzar(21);
        await m.encenderBot();

        expect(m.bd.estado("i1")).toBe("cancelado_sin_reembolso");
    });

    it("OFF-005: la respuesta atrasada aplica a la clase de ESE momento, no a la siguiente", async () => {
        const m = montar();
        alumnoConClase(m, 5);
        m.bd.clases.push({ id: "c2", titulo: "Fisico", fecha_hora: enHoras(30), tipo_evento: "entrenamiento" });
        m.bd.inscripciones.push({ id: "i2", usuario_id: "u1", clase_id: "c2", asistencia: "sin_confirmar" });
        await m.tickScheduler(); // avisa c1
        avanzar(1);
        m.escribirConBotApagado("56912345678", "2"); // cancela c1 (faltan 4 h)

        avanzar(6); // c1 ya pasó
        await m.encenderBot();

        expect(m.bd.estado("i1")).toBe("cancelado");
        expect(m.bd.estado("i2")).not.toBe("cancelado");
        expect(m.bd.tokens()).toBe(1);
    });

    it("OFF-006: '1' mandado 30 min antes y procesado tarde → no alcanza a confirmar y queda cancelado", async () => {
        const m = montar();
        alumnoConClase(m, 20);
        await m.tickScheduler();
        avanzar(19.5);
        m.escribirConBotApagado("56912345678", "1");

        avanzar(2);
        const [respuesta] = await m.encenderBot();

        expect(respuesta).toContain("Ya no alcanzas");
        expect(m.bd.estado("i1")).toBe("cancelado_sin_reembolso");
    });

    it("OFF-007: un 'gracias' atrasado no genera respuesta (no se le recuerda 1/2 horas después)", async () => {
        const m = montar();
        alumnoConClase(m, 20);
        await m.tickScheduler();
        m.escribirConBotApagado("56912345678", "gracias!");

        avanzar(1);
        const [respuesta] = await m.encenderBot();

        expect(respuesta).toBeNull();
        expect(m.bd.estado("i1")).toBe("pendiente");
    });

    it("BUG-003: volver a escribir '1' tras confirmar por WhatsApp no menciona la página web", async () => {
        const m = montar();
        alumnoConClase(m, 10);
        await m.tickScheduler();
        await m.responder("56912345678", "1");

        const res = await m.responder("56912345678", "1");
        expect(res).toContain("Ya confirmaste");
        expect(res).not.toContain("página web");
    });
});
