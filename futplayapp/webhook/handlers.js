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

function horasHasta(fecha_hora) {
  return (parseFechaHoraChile(fecha_hora) - new Date()) / (1000 * 60 * 60);
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

async function confirmarAsistencia(usuarioId, db) {
  const proxima = await db.getProximaClaseUsuario(usuarioId);
  if (!proxima) return 'No tienes clases próximas agendadas.';
  if (horasHasta(proxima.horario.fecha_hora) < 1) return 'Ya no alcanzas a confirmar, la clase empieza en menos de 1 hora.';
  const ok = await db.confirmarAsistencia(proxima.id);
  return ok ? `✅ Asistencia confirmada! Nos vemos en "${proxima.clase.titulo}".` : 'Error al confirmar. Intentalo de nuevo.';
}

async function cancelarAsistencia(usuarioId, db) {
  const proxima = await db.getProximaClaseUsuario(usuarioId);
  if (!proxima) return 'No tienes clases próximas agendadas.';
  const horas = horasHasta(proxima.horario.fecha_hora);
  if (horas >= 3) {
    await db.updateAsistencia(proxima.id, 'cancelado');
    const tokenOk = await db.devolverToken(usuarioId);
    return tokenOk ? '❌ Clase cancelada. Te devolvimos el token.' : '❌ Clase cancelada. No se pudo devolver el token.';
  }
  await db.updateAsistencia(proxima.id, 'cancelado_sin_reembolso');
  return '❌ Clase cancelada. Como faltan menos de 3h, no se devuelve el token.';
}

async function procesarMensajeWhatsApp(telefono, texto, db) {
  const textoUpper = texto.toUpperCase().trim();
  const usuario = await db.buscarUsuarioPorTelefono(telefono);
  if (!usuario) return null;

  // ── Si no es 1 ni 2, recordar opciones si tiene clase pendiente ──
  if (textoUpper !== '1' && textoUpper !== '2') {
    const pendiente = await db.getProximaClaseUsuario(usuario.id);
    if (pendiente) {
      return `Para confirmar tu clase responde *1*, para cancelar responde *2*.`;
    }
    return null;
  }

  // ── Normal flow: find a pending class ──
  const proxima = await db.getProximaClaseUsuario(usuario.id);
  if (proxima) {
    if (textoUpper === '1') return await confirmarAsistencia(usuario.id, db);
    return await cancelarAsistencia(usuario.id, db);
  }

  // ── Edge case: no pending class — check if it was already actioned from the web ──
  const actioned = await db.getProximaClaseUsuarioActioned(usuario.id);
  if (actioned) {
    if (['cancelado', 'cancelado_sin_reembolso'].includes(actioned.asistencia)) {
      return `Ya cancelaste "${actioned.clase.titulo}" desde la página web. No es necesario que respondas el mensaje.`;
    }
    if (['confirmado', 'confirmado_whatsapp', 'no_asistio'].includes(actioned.asistencia)) {
      return `Ya confirmaste "${actioned.clase.titulo}" desde la página web. Nos vemos allí!`;
    }
  }

  return null;
}

module.exports = { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp, horasHasta, buildReminderMessage, sendMessageWithRetry, recargarPagina, esFrameDetached };
