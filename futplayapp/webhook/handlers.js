function horasHasta(fecha_hora) {
  return (new Date(fecha_hora) - new Date()) / (1000 * 60 * 60);
}

function buildReminderMessage(usuario, clase, fechaHora) {
  const hora = new Date(fechaHora).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
  const titulo = clase?.titulo || 'tu clase';
  return `Hola ${usuario.nombre}! Recuerda que mañana a las ${hora} tienes "${titulo}". Responde *1* para confirmar o *2* para cancelar.`;
}

async function sendMessageWithRetry(whatsapp, chatId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await whatsapp.sendMessage(chatId, message);
      return;
    } catch (err) {
      if (err.message?.includes('detached Frame') && i < maxRetries - 1) {
        console.log(`[WARN] Frame detached, reintento ${i + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
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

module.exports = { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp, horasHasta, buildReminderMessage, sendMessageWithRetry };
