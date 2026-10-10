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
