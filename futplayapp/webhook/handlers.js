function horasHasta(fecha_hora) {
  return (new Date(fecha_hora) - new Date()) / (1000 * 60 * 60);
}

async function confirmarAsistencia(usuarioId, db) {
  console.log(`[DEBUG] confirmarAsistencia: usuarioId=${usuarioId}`);
  const proxima = await db.getProximaClaseUsuario(usuarioId);
  if (!proxima) { console.log(`[DEBUG] confirmarAsistencia: sin clases próximas`); return 'No tienes clases próximas agendadas.'; }
  const h = horasHasta(proxima.horario.fecha_hora);
  console.log(`[DEBUG] confirmarAsistencia: proxima clase=${proxima.clase.titulo}, id=${proxima.id}, horasHasta=${h}`);
  if (h < 1) { console.log(`[DEBUG] confirmarAsistencia: <1h, rechazado`); return 'Ya no alcanzas a confirmar, la clase empieza en menos de 1 hora.'; }
  const ok = await db.confirmarAsistencia(proxima.id);
  console.log(`[DEBUG] confirmarAsistencia: resultado=${ok}`);
  return ok ? `✅ Asistencia confirmada! Nos vemos en "${proxima.clase.titulo}".` : 'Error al confirmar. Intentalo de nuevo.';
}

async function cancelarAsistencia(usuarioId, db) {
  console.log(`[DEBUG] cancelarAsistencia: usuarioId=${usuarioId}`);
  const proxima = await db.getProximaClaseUsuario(usuarioId);
  if (!proxima) { console.log(`[DEBUG] cancelarAsistencia: sin clases próximas`); return 'No tenés clases próximas agendadas.'; }
  const horas = horasHasta(proxima.horario.fecha_hora);
  console.log(`[DEBUG] cancelarAsistencia: proxima clase=${proxima.clase.titulo}, id=${proxima.id}, horasHasta=${horas}`);
  if (horas >= 3) {
    console.log(`[DEBUG] cancelarAsistencia: >=3h, cancelando con reembolso`);
    await db.updateAsistencia(proxima.id, 'cancelado');
    const tokenOk = await db.devolverToken(usuarioId);
    console.log(`[DEBUG] cancelarAsistencia: devolverToken=${tokenOk}`);
    return tokenOk ? '❌ Clase cancelada. Te devolvimos el token.' : '❌ Clase cancelada. No se pudo devolver el token.';
  }
  console.log(`[DEBUG] cancelarAsistencia: <3h, cancelando sin reembolso`);
  await db.updateAsistencia(proxima.id, 'cancelado_sin_reembolso');
  return '❌ Clase cancelada. Como faltan menos de 3h, no se devuelve el token.';
}

async function procesarMensajeWhatsApp(telefono, texto, db) {
  console.log(`[DEBUG] procesarMensajeWhatsApp: telefono=${telefono}, texto="${texto}"`);
  const textoUpper = texto.toUpperCase().trim();
  const usuario = await db.buscarUsuarioPorTelefono(telefono);
  if (!usuario) { console.log(`[DEBUG] procesarMensajeWhatsApp: usuario no encontrado`); return 'No estás registrado en la academia. Contactate con la administración.'; }
  console.log(`[DEBUG] procesarMensajeWhatsApp: usuario encontrado id=${usuario.id}, nombre=${usuario.nombre}, rol=${usuario.rol}`);
  if (textoUpper === '1') { console.log(`[DEBUG] procesarMensajeWhatsApp: comando=1 → confirmar`); return await confirmarAsistencia(usuario.id, db); }
  if (textoUpper === '2') { console.log(`[DEBUG] procesarMensajeWhatsApp: comando=2 → cancelar`); return await cancelarAsistencia(usuario.id, db); }
  console.log(`[DEBUG] procesarMensajeWhatsApp: comando desconocido="${textoUpper}"`);
  return null;
}

module.exports = { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp, horasHasta };
