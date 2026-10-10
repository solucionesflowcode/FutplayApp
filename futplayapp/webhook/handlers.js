// clase.fecha_hora es timestamp sin zona horaria (hora local de Chile).
// Convierte el wall-clock de Chile a instante absoluto; si ya trae Z/offset, se usa tal cual.
function parseFechaHoraChile(fechaHora) {
  if (fechaHora instanceof Date) return new Date(fechaHora.getTime());
  const s = String(fechaHora);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);

  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/.exec(s);
  if (!m) return new Date(s);

  const y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(probe);
  const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
  const santiagoWall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offsetMs = santiagoWall - probe.getTime();

  return new Date(Date.UTC(y, mo - 1, d, h, mi) - offsetMs);
}

// Horas entre `desde` y la clase. `desde` es la hora en que el alumno MANDÓ el
// mensaje: el bot puede procesarlo tarde (corre en encendidos cortos) y las
// reglas de 1 h / 3 h deben juzgarse por cuándo respondió, no por cuándo se leyó.
function horasHasta(fecha_hora, desde = new Date()) {
  return (parseFechaHoraChile(fecha_hora) - desde) / (1000 * 60 * 60);
}

function buildReminderMessage(usuario, clase, fechaHora) {
  const fecha = new Date(fechaHora).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago' }).replace(',', '');
  const hora = new Date(fechaHora).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' });
  const titulo = clase?.titulo || 'tu clase';
  return `Hola ${usuario.nombre}! Confirma tu asistencia a "${titulo}" el ${fecha} a las ${hora}. Responde *1* para confirmar o *2* para cancelar.`;
}

async function recargarPagina(whatsapp) {
  try {
    if (!whatsapp?.puppeteer?.page) return;
    await whatsapp.puppeteer.page.reload({ waitUntil: 'load' }).catch(() => {});
    await whatsapp.puppeteer.page
      .waitForSelector('div#side, div#pane-side', { timeout: 30000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 3000));
    console.log('[WARN] Página de WhatsApp recargada tras Frame detached.');
  } catch (err) {
    console.error('[WARN] Error recargando página:', err.message);
  }
}

function esFrameDetached(err) {
  return !!(err && (err.message?.includes('detached Frame') || err.name === 'DetachedFrameError'));
}

async function sendMessageWithRetry(whatsapp, chatId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await whatsapp.sendMessage(chatId, message);
      return;
    } catch (err) {
      if (esFrameDetached(err) && i < maxRetries - 1) {
        console.log(`[WARN] Frame detached, recargando página y reintentando ${i + 1}/${maxRetries}...`);
        await recargarPagina(whatsapp);
        continue;
      }
      throw err;
    }
  }
}

// enviadoEn: hora del mensaje del alumno. La clase "próxima" se busca a partir
// de esa hora: si respondió antes de una clase que ya pasó cuando el bot lo
// procesa, la respuesta aplica a ESA clase y no a la siguiente.
async function confirmarAsistencia(usuarioId, db, enviadoEn = new Date()) {
  const proxima = await db.getProximaClaseUsuario(usuarioId, enviadoEn);
  if (!proxima) return 'No tienes clases próximas agendadas.';
  if (horasHasta(proxima.horario.fecha_hora, enviadoEn) < 1) return 'Ya no alcanzas a confirmar, la clase empieza en menos de 1 hora.';
  const ok = await db.confirmarAsistencia(proxima.id);
  return ok ? `✅ Asistencia confirmada! Nos vemos en "${proxima.clase.titulo}".` : 'Error al confirmar. Intentalo de nuevo.';
}

const NO_SE_PUDO_CANCELAR = 'No pudimos cancelar: tu reserva ya había cambiado. Revisa "Mis clases" en la página.';

async function cancelarAsistencia(usuarioId, db, enviadoEn = new Date()) {
  const proxima = await db.getProximaClaseUsuario(usuarioId, enviadoEn);
  if (!proxima) return 'No tienes clases próximas agendadas.';
  const horas = horasHasta(proxima.horario.fecha_hora, enviadoEn);
  // Los partidos no descuentan token al inscribirse: cancelarlos nunca
  // devuelve uno (antes el bot lo devolvía y regalaba tokens).
  const esPartido = proxima.clase?.tipo_evento === 'partido';
  const conReembolso = horas >= 3;
  // El token se devuelve solo si ESTA llamada canceló la reserva: si otra
  // (un "2" repetido o la web) ya la cambió, no se reembolsa de nuevo.
  const cancelada = await db.updateAsistencia(proxima.id, conReembolso ? 'cancelado' : 'cancelado_sin_reembolso');
  if (!cancelada) return NO_SE_PUDO_CANCELAR;
  if (esPartido) return '❌ Partido cancelado.';
  if (conReembolso) {
    const tokenOk = await db.devolverToken(usuarioId);
    return tokenOk ? '❌ Clase cancelada. Te devolvimos el token.' : '❌ Clase cancelada. No se pudo devolver el token.';
  }
  return '❌ Clase cancelada. Como faltan menos de 3h, no se devuelve el token.';
}

// Teléfono real de un contacto (para cuentas @lid, cuyo id NO es el número).
// Antes se usaba contact.id.user, que en @lid es un identificador interno:
// el alumno no se encontraba y su respuesta se ignoraba.
function telefonoDesdeContacto(contact) {
  if (!contact) return null;
  const numero = String(contact.number ?? '').replace(/\D/g, '');
  if (numero) return numero;
  if (contact.id?.server === 'c.us' && contact.id?.user) {
    return String(contact.id.user).replace(/\D/g, '');
  }
  return null;
}

const CONFIRMAR = new Set(['1', 'si', 'confirmo', 'confirmar', 'confirmado', 'voy']);
const CANCELAR = new Set(['2', 'no', 'cancelo', 'cancelar', 'cancela', 'no voy']);

// Normaliza la respuesta del alumno: "Sí", "1.", " SI! " → '1'; "No", "2)" → '2'.
// Antes solo se aceptaban "1" y "2" exactos.
function interpretarRespuesta(texto) {
  const t = String(texto ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (CONFIRMAR.has(t)) return '1';
  if (CANCELAR.has(t)) return '2';
  return null;
}

// opts.enviadoEn: hora del mensaje (Date). opts.atrasado: el mensaje llegó con
// el bot apagado y se procesa al ponerse al día; en ese caso solo se atienden
// respuestas 1/2 (no se contesta "responde 1 o 2" a un "gracias" de hace horas).
async function procesarMensajeWhatsApp(telefono, texto, db, opts = {}) {
  const enviadoEn = opts.enviadoEn ?? new Date();
  const opcion = interpretarRespuesta(texto);
  if (!opcion && opts.atrasado) return null;
  const usuario = await db.buscarUsuarioPorTelefono(telefono);
  if (!usuario) return null;

  // ── Si no es confirmar ni cancelar, recordar opciones si tiene clase pendiente ──
  if (!opcion) {
    const pendiente = await db.getProximaClaseUsuario(usuario.id, enviadoEn);
    if (pendiente) {
      return `Para confirmar tu clase responde *1*, para cancelar responde *2*.`;
    }
    return null;
  }

  // ── Normal flow: find a pending class ──
  const proxima = await db.getProximaClaseUsuario(usuario.id, enviadoEn);
  if (proxima) {
    if (opcion === '1') return await confirmarAsistencia(usuario.id, db, enviadoEn);
    return await cancelarAsistencia(usuario.id, db, enviadoEn);
  }

  // ── Sin clase pendiente: ¿ya respondió (por WhatsApp o en la web)? ──
  // No se dice "desde la página web": casi siempre ya respondió por acá.
  const actioned = await db.getProximaClaseUsuarioActioned(usuario.id, enviadoEn);
  if (actioned) {
    if (['cancelado', 'cancelado_sin_reembolso'].includes(actioned.asistencia)) {
      return `Ya cancelaste "${actioned.clase.titulo}". No es necesario que respondas el mensaje.`;
    }
    if (['confirmado', 'confirmado_whatsapp', 'no_asistio'].includes(actioned.asistencia)) {
      return `Ya confirmaste "${actioned.clase.titulo}". Nos vemos allí!`;
    }
  }

  return null;
}

module.exports = { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp, interpretarRespuesta, telefonoDesdeContacto, horasHasta, parseFechaHoraChile, buildReminderMessage, sendMessageWithRetry, recargarPagina, esFrameDetached };
