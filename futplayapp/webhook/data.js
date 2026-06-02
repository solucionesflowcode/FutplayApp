const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function init(supabaseUrl, serviceKey) {
  supabase = createClient(supabaseUrl, serviceKey);
}

function getClient() {
  return supabase;
}

async function buscarUsuarioPorTelefono(telefono) {
  const { data } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .or(`telefono.eq.${telefono},telefono.eq.+${telefono}`)
    .maybeSingle();
  return data;
}

async function getProximaClaseUsuario(usuarioId) {
  const { data: inscripciones } = await supabase
    .from('clase_usuario')
    .select('id, horario_id')
    .eq('usuario_id', usuarioId)
    .in('asistencia', ['sin_confirmar', 'pendiente']);

  if (!inscripciones?.length) return null;

  const horarioIds = inscripciones.map(i => i.horario_id);

  const { data: horario } = await supabase
    .from('horario')
    .select('id, fecha_hora, clase_id')
    .in('id', horarioIds)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!horario) return null;

  const claseUsuario = inscripciones.find(i => i.horario_id === horario.id);

  const { data: clase } = await supabase
    .from('clase')
    .select('titulo')
    .eq('id', horario.clase_id)
    .single();

  return {
    id: claseUsuario.id,
    clase: { titulo: clase?.titulo ?? 'Clase' },
    horario: { fecha_hora: horario.fecha_hora }
  };
}

async function confirmarAsistencia(claseUsuarioId) {
  const { error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: 'confirmado_whatsapp' })
    .eq('id', claseUsuarioId);
  return !error;
}

async function updateAsistencia(claseUsuarioId, estado) {
  const { error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: estado })
    .eq('id', claseUsuarioId);
  return !error;
}

async function devolverToken(usuarioId) {
  const { data: membresia } = await supabase
    .from('membresia')
    .select('id, tokens_usados')
    .eq('usuario_id', usuarioId)
    .gt('tokens_usados', 0)
    .order('mes', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membresia) return false;

  const { error } = await supabase
    .from('membresia')
    .update({ tokens_usados: membresia.tokens_usados - 1 })
    .eq('id', membresia.id);

  return !error;
}

async function getHorariosProximos() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 30 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('horario')
    .select('id, fecha_hora, clase_id')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString());

  return data ?? [];
}

async function getHorariosPasados() {
  const { data } = await supabase
    .from('horario')
    .select('id, clase_id')
    .lt('fecha_hora', new Date().toISOString());

  return data ?? [];
}

async function getInscripcionesSinConfirmar(horarioId) {
  const { data } = await supabase
    .from('clase_usuario')
    .select('id, usuario_id')
    .eq('horario_id', horarioId)
    .eq('asistencia', 'sin_confirmar');

  return data ?? [];
}

async function setPendiente(claseUsuarioId) {
  await supabase.from('clase_usuario').update({ asistencia: 'pendiente' }).eq('id', claseUsuarioId);
}

async function actualizarPorClaseYEstado(horarioId, desde, hacia) {
  await supabase
    .from('clase_usuario')
    .update({ asistencia: hacia })
    .eq('horario_id', horarioId)
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

async function getHorario(horarioId) {
  const { data } = await supabase
    .from('horario')
    .select('clase_id')
    .eq('id', horarioId)
    .single();
  return data;
}

async function getHorarioCompleto(horarioId) {
  const { data } = await supabase
    .from('horario')
    .select('id, fecha_hora, clase_id')
    .eq('id', horarioId)
    .single();
  return data;
}

async function getConfirmadosPorClase(horarioId) {
  const { data } = await supabase
    .from('clase_usuario')
    .select('id')
    .eq('horario_id', horarioId)
    .eq('asistencia', 'confirmado_whatsapp');
  return data ?? [];
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
  getHorariosPasados,
  getInscripcionesSinConfirmar,
  setPendiente,
  actualizarPorClaseYEstado,
  getClase,
  getUsuario,
  getHorario,
  getHorarioCompleto,
  getConfirmadosPorClase,
};
