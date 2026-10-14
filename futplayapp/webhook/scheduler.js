const { parseFechaHoraChile, buildReminderMessage, buildCambioHoraMessage } = require('./handlers');

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
 *  5. Cambio de hora de una clase futura (cola aviso_cambio_hora, la llena un
 *     trigger): se avisa por WhatsApp a las reservas abiertas con la hora que
 *     conocían y la nueva. Varios cambios seguidos se avisan una vez; si volvió
 *     a la hora original o la clase ya pasó, no se avisa. Si fallan todos los
 *     envíos de una clase, el aviso queda en cola para el siguiente ciclo.
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

  async function avisarCambiosDeHora() {
    const avisos = await db.getAvisosCambioHoraPendientes();
    if (!avisos.length) return;

    const porClase = new Map();
    for (const a of avisos) {
      if (!porClase.has(a.clase_id)) porClase.set(a.clase_id, []);
      porClase.get(a.clase_id).push(a);
    }

    for (const [claseId, lista] of porClase) {
      const ids = lista.map((a) => a.id);
      // La hora que conocían los alumnos es la anterior al primer cambio.
      const anterior = parseFechaHoraChile(lista[0].fecha_anterior);
      const clase = await db.getClaseConHora(claseId);
      const nueva = clase ? parseFechaHoraChile(clase.fecha_hora) : null;

      if (!nueva || nueva.getTime() <= Date.now() || nueva.getTime() === anterior.getTime()) {
        await db.marcarAvisosProcesados(ids, 0);
        continue;
      }

      let enviados = 0;
      let fallidos = 0;
      for (const insc of await db.getInscripcionesAbiertas(claseId)) {
        const usuario = await db.getUsuario(insc.usuario_id);
        if (!usuario?.telefono) continue;
        const telefono = usuario.telefono.replace(/\D/g, '');
        try {
          await enviar(`${telefono}@c.us`, buildCambioHoraMessage(usuario, clase, anterior, nueva));
          enviados++;
          console.log(`[Scheduler] Aviso de cambio de hora enviado a ${usuario.nombre}`);
        } catch (err) {
          fallidos++;
          console.error(`[Scheduler] Error al avisar cambio de hora a ${usuario.nombre}:`, err.message);
        }
        if (esperaEntreEnviosMs > 0) await new Promise((r) => setTimeout(r, esperaEntreEnviosMs));
      }

      // Si no salió ninguno (WhatsApp caído a mitad de ciclo) se reintenta después.
      if (fallidos > 0 && enviados === 0) continue;
      await db.marcarAvisosProcesados(ids, enviados);
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
      // Antes que los recordatorios: quien recibe uno ya ve la hora nueva.
      // Aislado: si falla (p. ej. falta la tabla), los recordatorios siguen.
      try {
        await avisarCambiosDeHora();
      } catch (err) {
        console.error('[Scheduler] Error en avisos de cambio de hora:', err.message);
      }
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
