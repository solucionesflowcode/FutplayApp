function horasHasta(fecha_hora) {
  return (new Date(fecha_hora) - new Date()) / (1000 * 60 * 60);
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
  if (!proxima) return 'No tenés clases próximas agendadas.';
  const horas = horasHasta(proxima.horario.fecha_hora);
  if (horas >= 3) {
    await db.updateAsistencia(proxima.id, 'cancelado');
    await db.devolverToken(usuarioId);
    return '❌ Clase cancelada. Te devolvimos el token.';
  }
  await db.updateAsistencia(proxima.id, 'cancelado_sin_reembolso');
  return '❌ Clase cancelada. Como faltan menos de 3h, no se devuelve el token.';
}

async function procesarMensajeWhatsApp(telefono, texto, db) {
  const textoUpper = texto.toUpperCase().trim();
  const usuario = await db.buscarUsuarioPorTelefono(telefono);
  if (!usuario) return 'No estás registrado en la academia. Contactate con la administración.';
  if (textoUpper === '1') return await confirmarAsistencia(usuario.id, db);
  if (textoUpper === '2') return await cancelarAsistencia(usuario.id, db);
  return null;
}

module.exports = { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp, horasHasta };
