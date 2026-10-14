import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearScheduler } from "../../../webhook/scheduler";

const EN_5H = () => new Date(Date.now() + 5 * 3600000).toISOString();

function crearDb(over: Record<string, unknown> = {}) {
    return {
        getHorarios24h: vi.fn().mockResolvedValue([{ id: "c1", clase_id: "c1", fecha_hora: EN_5H() }]),
        getInscripcionesSinConfirmar: vi.fn().mockResolvedValue([{ id: "insc-1", usuario_id: "u1" }]),
        getClase: vi.fn().mockResolvedValue({ titulo: "Tecnico" }),
        usuarioTienePendienteAntes: vi.fn().mockResolvedValue(false),
        getUsuario: vi.fn().mockResolvedValue({ nombre: "Ana", telefono: "+56912345678" }),
        setPendiente: vi.fn().mockResolvedValue(true),
        getHorariosProximos1h: vi.fn().mockResolvedValue([]),
        getHorariosPasados: vi.fn().mockResolvedValue([]),
        getHorariosPasados1h: vi.fn().mockResolvedValue([]),
        actualizarPorClaseYEstado: vi.fn().mockResolvedValue(undefined),
        getAvisosCambioHoraPendientes: vi.fn().mockResolvedValue([]),
        marcarAvisosProcesados: vi.fn().mockResolvedValue(undefined),
        getClaseConHora: vi.fn(),
        getInscripcionesAbiertas: vi.fn().mockResolvedValue([]),
        ...over,
    };
}

function crear(db: ReturnType<typeof crearDb>, extra: Record<string, unknown> = {}) {
    const enviar = vi.fn().mockResolvedValue(undefined);
    const recordatoriosEnviados = new Set<string>();
    const tick = crearScheduler({
        db,
        enviar,
        estaListo: () => true,
        recordatoriosEnviados,
        guardarRecordatorios: vi.fn(),
        esperaEntreEnviosMs: 0,
        ...extra,
    });
    return { tick, enviar, recordatoriosEnviados };
}

describe("scheduler del bot", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("SCH-001: envía el recordatorio, marca pendiente y lo registra", async () => {
        const db = crearDb();
        const { tick, enviar, recordatoriosEnviados } = crear(db);

        await tick();

        expect(enviar).toHaveBeenCalledWith("56912345678@c.us", expect.stringContaining("Hola Ana"));
        expect(db.setPendiente).toHaveBeenCalledWith("insc-1");
        expect(recordatoriosEnviados.has("insc-1")).toBe(true);
    });

    it("SCH-002: el bloqueo es POR ALUMNO — un alumno con pendiente anterior no frena a los demás", async () => {
        // Antes: si cualquier alumno tenía un 'pendiente' en una clase anterior,
        // se cortaba el ciclo y nadie recibía recordatorio de las clases siguientes.
        const db = crearDb({
            getInscripcionesSinConfirmar: vi.fn().mockResolvedValue([
                { id: "insc-bloqueado", usuario_id: "u-bloqueado" },
                { id: "insc-libre", usuario_id: "u-libre" },
            ]),
            usuarioTienePendienteAntes: vi.fn((usuarioId: string) => Promise.resolve(usuarioId === "u-bloqueado")),
        });
        const { tick } = crear(db);

        await tick();

        expect(db.setPendiente).toHaveBeenCalledTimes(1);
        expect(db.setPendiente).toHaveBeenCalledWith("insc-libre");
    });

    it("SCH-003: 1 h antes cancela SOLO a quien fue avisado y no respondió (pendiente), no a sin_confirmar", async () => {
        // Antes también se cancelaba 'sin_confirmar' (alumnos sin teléfono o con
        // envío fallido) y perdían el token sin haber sido avisados.
        const db = crearDb({
            getHorarios24h: vi.fn().mockResolvedValue([]),
            getHorariosProximos1h: vi.fn().mockResolvedValue([{ id: "c9", clase_id: "c9" }]),
        });
        const { tick } = crear(db);

        await tick();

        expect(db.actualizarPorClaseYEstado).toHaveBeenCalledWith("c9", "pendiente", "cancelado_sin_reembolso");
        expect(db.actualizarPorClaseYEstado).not.toHaveBeenCalledWith("c9", "sin_confirmar", expect.anything());
    });

    it("SCH-004: post-clase — pendiente → cancelado_sin_reembolso y confirmado_whatsapp → no_asistio", async () => {
        const db = crearDb({
            getHorarios24h: vi.fn().mockResolvedValue([]),
            getHorariosPasados: vi.fn().mockResolvedValue([{ id: "p1" }]),
            getHorariosPasados1h: vi.fn().mockResolvedValue([{ id: "p2" }]),
        });
        const { tick } = crear(db);

        await tick();

        expect(db.actualizarPorClaseYEstado).toHaveBeenCalledWith("p1", "pendiente", "cancelado_sin_reembolso");
        expect(db.actualizarPorClaseYEstado).toHaveBeenCalledWith("p2", "confirmado_whatsapp", "no_asistio");
    });

    it("SCH-005: no reenvía a quien ya recibió el recordatorio", async () => {
        const db = crearDb();
        const { tick, enviar, recordatoriosEnviados } = crear(db);
        recordatoriosEnviados.add("insc-1");

        await tick();

        expect(enviar).not.toHaveBeenCalled();
    });

    it("SCH-006: sin teléfono no envía ni marca pendiente", async () => {
        const db = crearDb({ getUsuario: vi.fn().mockResolvedValue({ nombre: "Sin Fono", telefono: null }) });
        const { tick, enviar } = crear(db);

        await tick();

        expect(enviar).not.toHaveBeenCalled();
        expect(db.setPendiente).not.toHaveBeenCalled();
    });

    it("SCH-007: si falla el envío no marca pendiente (queda sin_confirmar y no se cancela)", async () => {
        const db = crearDb();
        const { tick, enviar } = crear(db);
        enviar.mockRejectedValueOnce(new Error("no conectado"));

        await tick();

        expect(db.setPendiente).not.toHaveBeenCalled();
    });

    it("SCH-008: no corre dos ciclos en paralelo (evita recordatorios duplicados)", async () => {
        let liberar: () => void = () => {};
        const db = crearDb({
            getHorarios24h: vi.fn(() => new Promise((r) => { liberar = () => r([]); })),
        });
        const { tick } = crear(db);

        const primero = tick();
        await tick(); // mientras el primero sigue corriendo: debe salir sin hacer nada
        // El ciclo revisa antes la cola de avisos de cambio de hora: esperar a que llegue aquí.
        await vi.waitFor(() => expect(db.getHorarios24h).toHaveBeenCalled());
        liberar();
        await primero;

        expect(db.getHorarios24h).toHaveBeenCalledTimes(1);
    });

    it("SCH-009: si WhatsApp no está conectado no hace nada (ni cancela)", async () => {
        const db = crearDb({ getHorariosProximos1h: vi.fn().mockResolvedValue([{ id: "c9" }]) });
        const { tick, enviar } = crear(db, { estaListo: () => false });

        await tick();

        expect(enviar).not.toHaveBeenCalled();
        expect(db.actualizarPorClaseYEstado).not.toHaveBeenCalled();
    });

    it("SCH-011: no avisa clases que empiezan en menos de 2 h (ni consulta sus inscripciones)", async () => {
        const db = crearDb({
            getHorarios24h: vi.fn().mockResolvedValue([
                { id: "c-30m", clase_id: "c-30m", fecha_hora: new Date(Date.now() + 0.5 * 3600000).toISOString() },
                { id: "c-119m", clase_id: "c-119m", fecha_hora: new Date(Date.now() + 119 * 60000).toISOString() },
            ]),
        });
        const { tick, enviar } = crear(db);

        await tick();

        expect(enviar).not.toHaveBeenCalled();
        expect(db.getInscripcionesSinConfirmar).not.toHaveBeenCalled();
    });

    it("SCH-012: con 2 h justas o más sí avisa", async () => {
        const db = crearDb({
            getHorarios24h: vi.fn().mockResolvedValue([
                { id: "c-121m", clase_id: "c-121m", fecha_hora: new Date(Date.now() + 121 * 60000).toISOString() },
            ]),
        });
        const { tick, enviar } = crear(db);

        await tick();

        expect(db.getInscripcionesSinConfirmar).toHaveBeenCalledWith("c-121m");
        expect(enviar).toHaveBeenCalledTimes(1);
    });

    it("SCH-010: normaliza el teléfono a solo dígitos para el chatId", async () => {
        const db = crearDb({ getUsuario: vi.fn().mockResolvedValue({ nombre: "Ana", telefono: "+56 9 1234 5678" }) });
        const { tick, enviar } = crear(db);

        await tick();

        expect(enviar).toHaveBeenCalledWith("56912345678@c.us", expect.any(String));
    });
});

// Decisión 4 del plan UI/UX: al cambiar la hora de una clase se avisa a los inscritos.
describe("scheduler — aviso de cambio de hora", () => {
    const EN_H = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
    // Sin clases en las próximas 24 h: solo corre la regla 5.
    const base = (over: Record<string, unknown>) => crearDb({ getHorarios24h: vi.fn().mockResolvedValue([]), ...over });

    it("SCH-AVI-001: avisa a las reservas abiertas con la hora anterior y la nueva, y marca el aviso", async () => {
        const anterior = EN_H(30);
        const db = base({
            getAvisosCambioHoraPendientes: vi.fn().mockResolvedValue([{ id: "a1", clase_id: "c1", fecha_anterior: anterior, fecha_nueva: EN_H(32) }]),
            getClaseConHora: vi.fn().mockResolvedValue({ titulo: "Tecnico", fecha_hora: EN_H(32) }),
            getInscripcionesAbiertas: vi.fn().mockResolvedValue([{ id: "i1", usuario_id: "u1" }, { id: "i2", usuario_id: "u2" }]),
            getUsuario: vi.fn((id: string) => Promise.resolve(id === "u1" ? { nombre: "Ana", telefono: "+56912345678" } : { nombre: "Sin tel", telefono: null })),
        });
        const { tick, enviar } = crear(db);

        await tick();

        expect(enviar).toHaveBeenCalledTimes(1);
        expect(enviar).toHaveBeenCalledWith("56912345678@c.us", expect.stringMatching(/Cambió el horario de "Tecnico".*ahora es el/));
        expect(enviar.mock.calls[0][1]).toContain("Tu reserva se mantiene");
        expect(db.marcarAvisosProcesados).toHaveBeenCalledWith(["a1"], 1);
    });

    it("SCH-AVI-002: varios cambios seguidos de la misma clase se avisan una sola vez", async () => {
        const db = base({
            getAvisosCambioHoraPendientes: vi.fn().mockResolvedValue([
                { id: "a1", clase_id: "c1", fecha_anterior: EN_H(30), fecha_nueva: EN_H(31) },
                { id: "a2", clase_id: "c1", fecha_anterior: EN_H(31), fecha_nueva: EN_H(33) },
            ]),
            getClaseConHora: vi.fn().mockResolvedValue({ titulo: "Tecnico", fecha_hora: EN_H(33) }),
            getInscripcionesAbiertas: vi.fn().mockResolvedValue([{ id: "i1", usuario_id: "u1" }]),
        });
        const { tick, enviar } = crear(db);

        await tick();

        expect(enviar).toHaveBeenCalledTimes(1);
        expect(db.marcarAvisosProcesados).toHaveBeenCalledWith(["a1", "a2"], 1);
    });

    it("SCH-AVI-003: si volvió a la hora original o la clase ya pasó, no avisa (pero cierra el aviso)", async () => {
        const original = EN_H(30);
        const db = base({
            getAvisosCambioHoraPendientes: vi.fn().mockResolvedValue([
                { id: "a1", clase_id: "c1", fecha_anterior: original, fecha_nueva: EN_H(31) },
                { id: "a2", clase_id: "c2", fecha_anterior: EN_H(-5), fecha_nueva: EN_H(-2) },
            ]),
            getClaseConHora: vi.fn((id: string) => Promise.resolve(id === "c1" ? { titulo: "A", fecha_hora: original } : { titulo: "B", fecha_hora: EN_H(-2) })),
            getInscripcionesAbiertas: vi.fn().mockResolvedValue([{ id: "i1", usuario_id: "u1" }]),
        });
        const { tick, enviar } = crear(db);

        await tick();

        expect(enviar).not.toHaveBeenCalled();
        expect(db.marcarAvisosProcesados).toHaveBeenCalledWith(["a1"], 0);
        expect(db.marcarAvisosProcesados).toHaveBeenCalledWith(["a2"], 0);
    });

    it("SCH-AVI-004: si fallan todos los envíos, el aviso queda en cola para reintentar", async () => {
        const db = base({
            getAvisosCambioHoraPendientes: vi.fn().mockResolvedValue([{ id: "a1", clase_id: "c1", fecha_anterior: EN_H(30), fecha_nueva: EN_H(32) }]),
            getClaseConHora: vi.fn().mockResolvedValue({ titulo: "Tecnico", fecha_hora: EN_H(32) }),
            getInscripcionesAbiertas: vi.fn().mockResolvedValue([{ id: "i1", usuario_id: "u1" }]),
        });
        const { tick, enviar } = crear(db);
        enviar.mockRejectedValue(new Error("WhatsApp desconectado"));

        await tick();

        expect(db.marcarAvisosProcesados).not.toHaveBeenCalled();
    });

    it("SCH-AVI-005: el aviso sale antes que los recordatorios del mismo ciclo", async () => {
        const orden: string[] = [];
        const db = crearDb({
            getAvisosCambioHoraPendientes: vi.fn().mockResolvedValue([{ id: "a1", clase_id: "c1", fecha_anterior: EN_H(8), fecha_nueva: EN_H(5) }]),
            getClaseConHora: vi.fn().mockResolvedValue({ titulo: "Tecnico", fecha_hora: EN_H(5) }),
            getInscripcionesAbiertas: vi.fn().mockResolvedValue([{ id: "insc-1", usuario_id: "u1" }]),
        });
        const { tick, enviar } = crear(db);
        enviar.mockImplementation((_chat: string, texto: string) => {
            orden.push(texto.includes("Cambió el horario") ? "aviso" : "recordatorio");
            return Promise.resolve();
        });

        await tick();

        expect(orden).toEqual(["aviso", "recordatorio"]);
    });

    it("SCH-AVI-006: si la cola de avisos falla, los recordatorios salen igual", async () => {
        const db = crearDb({ getAvisosCambioHoraPendientes: vi.fn().mockRejectedValue(new Error("relation aviso_cambio_hora does not exist")) });
        const { tick, enviar } = crear(db);
        vi.spyOn(console, "error").mockImplementation(() => {});

        await tick();

        expect(enviar).toHaveBeenCalledWith("56912345678@c.us", expect.stringContaining("Confirma tu asistencia"));
        expect(db.setPendiente).toHaveBeenCalledWith("insc-1");
    });
});
