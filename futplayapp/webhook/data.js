const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function init(supabaseUrl, serviceKey) {
  supabase = createClient(supabaseUrl, serviceKey);
}

function getClient() {
  return supabase;
}

// Exclusivo para tests — inyecta un cliente mock sin tocar Supabase
function _setTestClient(client) {
  supabase = client;
}

async function buscarUsuarioPorTelefono(telefono) {
  const raw = telefono.replace(/\D/g, '');
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .in('telefono', [raw, '+' + raw])
    .maybeSingle();
  // Lanza en vez de devolver null: un error de BD no debe confundirse con "no
  // es alumno", o el mensaje se marcaría como procesado y se perdería.
  if (error) throw new Error(`buscarUsuarioPorTelefono: ${error.message}`);
  return data;
}

// `desde`: hora en que el alumno mandó el mensaje (por defecto, ahora). Con el
// bot en encendidos cortos, una respuesta puede procesarse cuando su clase ya
// pasó: se busca la próxima clase A PARTIR DE ESA HORA para no aplicarla a la
// clase siguiente.
async function getProximaClaseUsuario(usuarioId, desde = new Date()) {
  const { data: inscripciones, error } = await supabase
    .from('clase_usuario')
    .select('id, clase_id')
    .eq('usuario_id', usuarioId)
    .in('asistencia', ['sin_confirmar', 'pendiente']);

  if (error) throw new Error(`getProximaClaseUsuario: ${error.message}`);
  if (!inscripciones?.length) return null;

  const claseIds = inscripciones.map(i => i.clase_id);

  const { data: clase, error: errorClase } = await supabase
    .from('clase')
    .select('id, titulo, fecha_hora, tipo_evento')
    .in('id', claseIds)
    .gte('fecha_hora', desde.toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (errorClase) throw new Error(`getProximaClaseUsuario: ${errorClase.message}`);
  if (!clase) return null;

  const claseUsuario = inscripciones.find(i => i.clase_id === clase.id);

  return {
    id: claseUsuario.id,
    clase: { titulo: clase.titulo ?? 'Clase', tipo_evento: clase.tipo_evento },
    horario: { fecha_hora: clase.fecha_hora }
  };
}

// Cambia la asistencia solo si sigue en sin_confirmar/pendiente. Devuelve true
// únicamente si ESTA llamada cambió la fila: antes devolvía !error, y con dos
// "2" seguidos (o "2" + cancelar en la web) ambos procesos creían haber
// cancelado y se devolvían dos tokens.
async function cambiarAsistenciaAbierta(claseUsuarioId, estado) {
  const { data, error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: estado })
    .eq('id', claseUsuarioId)
    .in('asistencia', ['sin_confirmar', 'pendiente'])
    .select('id');
  if (error) {
    console.error(`Error actualizando asistencia ${claseUsuarioId}:`, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function confirmarAsistencia(claseUsuarioId) {
  return cambiarAsistenciaAbierta(claseUsuarioId, 'confirmado_whatsapp');
}

async function updateAsistencia(claseUsuarioId, estado) {
  return cambiarAsistenciaAbierta(claseUsuarioId, estado);
}

async function devolverToken(usuarioId) {
  const { data, error } = await supabase.rpc('devolver_token', { p_usuario_id: usuarioId });
  if (error) {
    console.error('devolver_token RPC error:', error.message);
    return false;
  }
  return data === true;
}

async function getHorariosProximos() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 30 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('clase')
    .select('id, fecha_hora')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString());

  return (data ?? []).map(c => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id }));
}

async function getHorariosFuturos() {
  const ahora = new Date();
  console.log(`[DEBUG DATA] getHorariosFuturos: desde=${ahora.toISOString()}`);

  const { data, error } = await supabase
    .from('clase')
    .select('id, fecha_hora')
    .gte('fecha_hora', ahora.toISOString());

  console.log(`[DEBUG DATA] getHorariosFuturos: total=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
  return (data ?? []).map(c => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id }));
}

async function getHorarios24h() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  console.log(`[DEBUG DATA] getHorarios24h: hasta=${hasta.toISOString()}`);

  const { data, error } = await supabase
    .from('clase')
    .select('id, fecha_hora')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString());

  console.log(`[DEBUG DATA] getHorarios24h: total=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
  return (data ?? []).map(c => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id }));
}

async function getHorariosProximos1h() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 60 * 60 * 1000);

  const { data } = await supabase
    .from('clase')
    .select('id')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString());

  return (data ?? []).map(c => ({ id: c.id, clase_id: c.id }));
}

// Ventana hacia atrás para los barridos post-clase. Antes se recorrían TODAS
// las clases históricas cada minuto (crece sin límite). 48 h alcanza de sobra
// para que el scheduler (cada minuto) procese cada clase recién terminada.
const VENTANA_PASADAS_MS = 48 * 60 * 60 * 1000;

async function getHorariosPasados() {
  const ahora = Date.now();
  const { data } = await supabase
    .from('clase')
    .select('id')
    .gte('fecha_hora', new Date(ahora - VENTANA_PASADAS_MS).toISOString())
    .lt('fecha_hora', new Date(ahora).toISOString());

  return (data ?? []).map(c => ({ id: c.id, clase_id: c.id }));
}

async function getHorariosPasados1h() {
  const ahora = Date.now();
  const { data } = await supabase
    .from('clase')
    .select('id')
    .gte('fecha_hora', new Date(ahora - VENTANA_PASADAS_MS).toISOString())
    .lte('fecha_hora', new Date(ahora - 60 * 60 * 1000).toISOString());

  return (data ?? []).map(c => ({ id: c.id, clase_id: c.id }));
}

async function getInscripcionesSinConfirmar(claseId) {
  const { data } = await supabase
    .from('clase_usuario')
    .select('id, usuario_id')
    .eq('clase_id', claseId)
    .eq('asistencia', 'sin_confirmar');

  return data ?? [];
}

async function setPendiente(claseUsuarioId) {
  const { data } = await supabase
    .from('clase_usuario')
    .update({ asistencia: 'pendiente' })
    .eq('id', claseUsuarioId)
    .eq('asistencia', 'sin_confirmar')
    .select('id')
    .maybeSingle();
  return data !== null;
}

async function actualizarPorClaseYEstado(claseId, desde, hacia) {
  await supabase
    .from('clase_usuario')
    .update({ asistencia: hacia })
    .eq('clase_id', claseId)
    .eq('asistencia', desde);
}

async function getClase(claseId) {
  const { data } = await supabase
    .from('clase')
    .select('titulo')
    .eq('id', claseId)
    .single();
  return data;
}

async function getUsuario(usuarioId) {
  const { data } = await supabase
    .from('usuario')
    .select('nombre, telefono')
    .eq('id', usuarioId)
    .single();
  return data;
}

async function getHorario(claseId) {
  const { data } = await supabase
    .from('clase')
    .select('id')
    .eq('id', claseId)
    .single();
  return data ? { clase_id: data.id } : null;
}

async function getHorarioCompleto(claseId) {
  const { data } = await supabase
    .from('clase')
    .select('id, fecha_hora')
    .eq('id', claseId)
    .single();
  return data ? { id: data.id, fecha_hora: data.fecha_hora, clase_id: data.id } : null;
}

// ¿Este alumno tiene un recordatorio sin responder ('pendiente') de una clase
// FUTURA anterior a `fechaHora`? Las respuestas 1/2 aplican a su clase más
// próxima, así que no se le manda un segundo recordatorio hasta que responda
// el primero. Antes el bloqueo era GLOBAL: un solo alumno sin responder frenaba
// los recordatorios de todos para las clases siguientes.
async function usuarioTienePendienteAntes(usuarioId, fechaHora) {
  const { data: pendientes } = await supabase
    .from('clase_usuario')
    .select('clase_id')
    .eq('usuario_id', usuarioId)
    .eq('asistencia', 'pendiente');

  if (!pendientes?.length) return false;

  const { data: clases } = await supabase
    .from('clase')
    .select('id')
    .in('id', pendientes.map(p => p.clase_id))
    .gte('fecha_hora', new Date().toISOString())
    .lt('fecha_hora', fechaHora)
    .limit(1);

  return (clases?.length ?? 0) > 0;
}

async function getProximaClaseUsuarioActioned(usuarioId, desde = new Date()) {
  const { data: inscripciones } = await supabase
    .from('clase_usuario')
    .select('id, clase_id, asistencia')
    .eq('usuario_id', usuarioId);

  if (!inscripciones?.length) return null;

  const claseIds = inscripciones.map(i => i.clase_id);

  const { data: clase } = await supabase
    .from('clase')
    .select('id, titulo, fecha_hora')
    .in('id', claseIds)
    .gte('fecha_hora', desde.toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!clase) return null;

  const claseUsuario = inscripciones.find(i => i.clase_id === clase.id);

  return {
    id: claseUsuario.id,
    clase: { titulo: clase.titulo ?? 'Clase', tipo_evento: clase.tipo_evento },
    horario: { fecha_hora: clase.fecha_hora },
    asistencia: claseUsuario.asistencia,
  };
}

module.exports = {
  init,
  getClient,
  buscarUsuarioPorTelefono,
  getProximaClaseUsuario,
  confirmarAsistencia,
  updateAsistencia,
  devolverToken,
  getHorariosProximos,
  getHorariosFuturos,
  getHorarios24h,
  getHorariosProximos1h,
  getHorariosPasados,
  getHorariosPasados1h,
  getInscripcionesSinConfirmar,
  setPendiente,
  actualizarPorClaseYEstado,
  getClase,
  getUsuario,
  getHorario,
  getHorarioCompleto,
  _setTestClient,
  usuarioTienePendienteAntes,
  getProximaClaseUsuarioActioned,
};
