const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function init(supabaseUrl, serviceKey) {
  supabase = createClient(supabaseUrl, serviceKey);
}

function getClient() {
  return supabase;
}

async function buscarUsuarioPorTelefono(telefono) {
  const raw = telefono.replace(/\D/g, '');
  const { data } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .in('telefono', [raw, '+' + raw])
    .maybeSingle();
  return data;
}

async function getProximaClaseUsuario(usuarioId) {
  const { data: inscripciones } = await supabase
    .from('clase_usuario')
    .select('id, clase_id')
    .eq('usuario_id', usuarioId)
    .in('asistencia', ['sin_confirmar', 'pendiente']);

  if (!inscripciones?.length) return null;

  const claseIds = inscripciones.map(i => i.clase_id);

  const { data: clase } = await supabase
    .from('clase')
    .select('id, titulo, fecha_hora')
    .in('id', claseIds)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!clase) return null;

  const claseUsuario = inscripciones.find(i => i.clase_id === clase.id);

  return {
    id: claseUsuario.id,
    clase: { titulo: clase.titulo ?? 'Clase' },
    horario: { fecha_hora: clase.fecha_hora }
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

async function getHorarios24h() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from('clase')
    .select('id, fecha_hora')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString());

  return (data ?? []).map(c => ({ id: c.id, fecha_hora: c.fecha_hora, clase_id: c.id }));
}

async function getHorariosPasados() {
  const { data } = await supabase
    .from('clase')
    .select('id')
    .lt('fecha_hora', new Date().toISOString());

  return (data ?? []).map(c => ({ id: c.id, clase_id: c.id }));
}

async function getHorariosPasados1h() {
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);

  const { data } = await supabase
    .from('clase')
    .select('id')
    .lte('fecha_hora', haceUnaHora.toISOString());

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
  await supabase.from('clase_usuario').update({ asistencia: 'pendiente' }).eq('id', claseUsuarioId);
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

module.exports = {
  init,
  getClient,
  buscarUsuarioPorTelefono,
  getProximaClaseUsuario,
  confirmarAsistencia,
  updateAsistencia,
  devolverToken,
  getHorariosProximos,
  getHorarios24h,
  getHorariosPasados,
  getHorariosPasados1h,
  getInscripcionesSinConfirmar,
  setPendiente,
  actualizarPorClaseYEstado,
  getClase,
  getUsuario,
  getHorario,
  getHorarioCompleto,
};
