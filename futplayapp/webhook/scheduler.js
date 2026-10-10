const { parseFechaHoraChile, buildReminderMessage } = require('./handlers');

// Anticipación mínima para mandar el recordatorio: deja al menos 1 h para
// responder antes del cierre de 1 h previo a la clase.
const MARGEN_RECORDATORIO_MS = 2 * 60 * 60 * 1000;

/**
 * Un ciclo del scheduler (lo dispara node-cron cada minuto desde server.js).
 *
 * deps:
 *   db                     módulo data.js
 *   enviar(chatId, texto)  envía un WhatsApp (con reintentos)
 *   estaListo()            true si el cliente de WhatsApp está conectado
 *   recordatoriosEnviados  Set de ids de clase_usuario ya avisados
 *   guardarRecordatorios() persiste el Set
 *   esperaEntreEnviosMs    pausa entre mensajes (anti-spam), default 1000
 *
 * Reglas:
 *  1. Recordatorio 24 h antes a cada inscripción 'sin_confirmar' → 'pendiente'.
 *     Si el alumno ya tiene un recordatorio sin responder de una clase anterior,
 *     se espera a que responda (sus respuestas aplican a la clase más próxima).
 *     El bloqueo es POR ALUMNO; antes era global y un alumno frenaba a todos.
 *     No se avisa si la clase empieza en menos de 2 h (MARGEN_RECORDATORIO_MS):
 *     quien se inscribe tarde recibía el recordatorio y en el mismo ciclo la
 *     regla 2 lo cancelaba sin reembolso, sin tiempo para responder. Esa
 *     inscripción queda 'sin_confirmar' y no se cancela.
 *  2. 1 h antes de la clase, quien recibió el recordatorio y no respondió
 *     ('pendiente') queda 'cancelado_sin_reembolso'. Las inscripciones
 *     'sin_confirmar' (nunca avisadas: sin teléfono, envío fallido, bot caído)
 *     se mantienen; antes también se cancelaban y el alumno perdía el token
 *     sin haber sido avisado.
 *  3. Clase pasada: 'pendiente' → 'cancelado_sin_reembolso'.
 *  4. 1 h después de la clase: 'confirmado_whatsapp' → 'no_asistio'
 *     (el profesor puede corregirlo a 'asistio').
 */
function crearScheduler(deps) {
  const {
    db,
    enviar,
    estaListo,
    recordatoriosEnviados,
    guardarRecordatorios,
    esperaEntreEnviosMs = 1000,
  } = deps;

  let corriendo = false;

  async function enviarRecordatorios() {
    const horarios = await db.getHorarios24h();
    horarios.sort((a, b) => parseFechaHoraChile(a.fecha_hora) - parseFechaHoraChile(b.fecha_hora));

    for (const h of horarios) {
      if (parseFechaHoraChile(h.fecha_hora).getTime() - Date.now() < MARGEN_RECORDATORIO_MS) continue;
      const inscripciones = await db.getInscripcionesSinConfirmar(h.id);
      if (!inscripciones.length) continue;
      const clase = await db.getClase(h.clase_id);

      for (const insc of inscripciones) {
        if (recordatoriosEnviados.has(insc.id)) continue;
        if (await db.usuarioTienePendienteAntes(insc.usuario_id, h.fecha_hora)) continue;

        const usuario = await db.getUsuario(insc.usuario_id);
        if (!usuario?.telefono) continue;

        const telefono = usuario.telefono.replace(/\D/g, '');
        const mensaje = buildReminderMessage(usuario, clase, parseFechaHoraChile(h.fecha_hora));

        try {
          await enviar(`${telefono}@c.us`, mensaje);
          await db.setPendiente(insc.id);
          recordatoriosEnviados.add(insc.id);
          guardarRecordatorios();
          console.log(`[Scheduler] Recordatorio enviado a ${usuario.nombre}`);
        } catch (err) {
          console.error(`[Scheduler] Error al enviar a ${usuario.nombre}:`, err.message);
        }
        if (esperaEntreEnviosMs > 0) await new Promise((r) => setTimeout(r, esperaEntreEnviosMs));
      }
    }
  }

  async function cerrarConfirmaciones() {
    for (const h of await db.getHorariosProximos1h()) {
      await db.actualizarPorClaseYEstado(h.id, 'pendiente', 'cancelado_sin_reembolso');
    }
    for (const h of await db.getHorariosPasados()) {
      await db.actualizarPorClaseYEstado(h.id, 'pendiente', 'cancelado_sin_reembolso');
    }
    for (const h of await db.getHorariosPasados1h()) {
      await db.actualizarPorClaseYEstado(h.id, 'confirmado_whatsapp', 'no_asistio');
    }
  }

  return async function tick() {
    // Un ciclo puede durar más de un minuto (1 s entre mensajes): sin esta
    // guarda, node-cron arranca otro en paralelo y se duplican recordatorios.
    if (corriendo) return;
    if (!estaListo()) {
      console.log('[Scheduler] WhatsApp no conectado, saltando ciclo');
      return;
    }
    corriendo = true;
    try {
      await enviarRecordatorios();
      await cerrarConfirmaciones();
    } catch (err) {
      console.error('[Scheduler] Error en el ciclo:', err.message);
    } finally {
      corriendo = false;
    }
  };
}

module.exports = { crearScheduler, MARGEN_RECORDATORIO_MS };
