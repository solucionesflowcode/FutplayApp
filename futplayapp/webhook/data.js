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
  console.log(`[DEBUG DATA] buscarUsuarioPorTelefono: raw=${raw}`);
  const { data, error } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .in('telefono', [raw, '+' + raw])
    .maybeSingle();
  console.log(`[DEBUG DATA] buscarUsuarioPorTelefono: encontrado=${!!data}, id=${data?.id ?? 'n/a'}, error=${error?.message ?? 'none'}`);
  return data;
}

async function getProximaClaseUsuario(usuarioId) {
  console.log(`[DEBUG DATA] getProximaClaseUsuario: usuarioId=${usuarioId}`);
  const { data: inscripciones, error: errIns } = await supabase
    .from('clase_usuario')
    .select('id, clase_id')
    .eq('usuario_id', usuarioId)
    .in('asistencia', ['sin_confirmar', 'pendiente']);

  if (errIns) { console.log(`[DEBUG DATA] getProximaClaseUsuario: error inscripciones=${errIns.message}`); return null; }
  console.log(`[DEBUG DATA] getProximaClaseUsuario: inscripciones=${inscripciones?.length ?? 0}`);
  if (!inscripciones?.length) return null;

  const claseIds = inscripciones.map(i => i.clase_id);

  const { data: clase, error: errCl } = await supabase
    .from('clase')
    .select('id, titulo, fecha_hora')
    .in('id', claseIds)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (errCl) { console.log(`[DEBUG DATA] getProximaClaseUsuario: error clase=${errCl.message}`); return null; }
  if (!clase) { console.log(`[DEBUG DATA] getProximaClaseUsuario: sin clases futuras`); return null; }

  const claseUsuario = inscripciones.find(i => i.clase_id === clase.id);
  console.log(`[DEBUG DATA] getProximaClaseUsuario: clase encontrada id=${clase.id}, titulo=${clase.titulo}, fecha_hora=${clase.fecha_hora}`);

  return {
    id: claseUsuario.id,
    clase: { titulo: clase.titulo ?? 'Clase' },
    horario: { fecha_hora: clase.fecha_hora }
  };
}

async function confirmarAsistencia(claseUsuarioId) {
  console.log(`[DEBUG DATA] confirmarAsistencia: claseUsuarioId=${claseUsuarioId}`);
  const { error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: 'confirmado_whatsapp' })
    .eq('id', claseUsuarioId);
  console.log(`[DEBUG DATA] confirmarAsistencia: error=${error?.message ?? 'none'}`);
  return !error;
}

async function updateAsistencia(claseUsuarioId, estado) {
  console.log(`[DEBUG DATA] updateAsistencia: id=${claseUsuarioId}, estado=${estado}`);
  const { error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: estado })
    .eq('id', claseUsuarioId);
  console.log(`[DEBUG DATA] updateAsistencia: error=${error?.message ?? 'none'}`);
  return !error;
}

async function devolverToken(usuarioId) {
  console.log(`[DEBUG DATA] devolverToken: usuarioId=${usuarioId}`);
  const { data, error } = await supabase.rpc('devolver_token', { p_usuario_id: usuarioId });
  console.log(`[DEBUG DATA] devolverToken: result=${data}, error=${error?.message ?? 'none'}`);
  if (error) {
    console.error('devolver_token RPC error:', error.message);
    return false;
  }
  return data === true;
}

async function getHorariosProximos() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 30 * 60 * 60 * 1000);
  console.log(`[DEBUG DATA] getHorariosProximos: desde=${ahora.toISOString()}, hasta=${hasta.toISOString()}`);

  const { data, error } = await supabase
    .from('clase')
    .select('id, fecha_hora')
    .gte('fecha_hora', ahora.toISOString())
    .lte('fecha_hora', hasta.toISOString());

  console.log(`[DEBUG DATA] getHorariosProximos: total=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
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

async function getHorariosPasados() {
  const ahora = new Date().toISOString();
  const { data, error } = await supabase
    .from('clase')
    .select('id')
    .lt('fecha_hora', ahora);

  console.log(`[DEBUG DATA] getHorariosPasados: ahora=${ahora}, total=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
  return (data ?? []).map(c => ({ id: c.id, clase_id: c.id }));
}

async function getHorariosPasados1h() {
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('clase')
    .select('id')
    .lte('fecha_hora', haceUnaHora);

  console.log(`[DEBUG DATA] getHorariosPasados1h: haceUnaHora=${haceUnaHora}, total=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
  return (data ?? []).map(c => ({ id: c.id, clase_id: c.id }));
}

async function getInscripcionesSinConfirmar(claseId) {
  console.log(`[DEBUG DATA] getInscripcionesSinConfirmar: claseId=${claseId}`);
  const { data, error } = await supabase
    .from('clase_usuario')
    .select('id, usuario_id')
    .eq('clase_id', claseId)
    .eq('asistencia', 'sin_confirmar');

  console.log(`[DEBUG DATA] getInscripcionesSinConfirmar: total=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
  return data ?? [];
}

async function setPendiente(claseUsuarioId) {
  console.log(`[DEBUG DATA] setPendiente: id=${claseUsuarioId}`);
  const { error } = await supabase.from('clase_usuario').update({ asistencia: 'pendiente' }).eq('id', claseUsuarioId);
  if (error) console.error(`[DEBUG DATA] setPendiente error: ${error.message}`);
}

async function actualizarPorClaseYEstado(claseId, desde, hacia) {
  console.log(`[DEBUG DATA] actualizarPorClaseYEstado: claseId=${claseId}, desde=${desde}, hacia=${hacia}`);
  const { data, error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: hacia })
    .eq('clase_id', claseId)
    .eq('asistencia', desde)
    .select('id');
  console.log(`[DEBUG DATA] actualizarPorClaseYEstado: afectados=${data?.length ?? 0}, error=${error?.message ?? 'none'}`);
}

async function getClase(claseId) {
  const { data, error } = await supabase
    .from('clase')
    .select('titulo')
    .eq('id', claseId)
    .single();
  if (error) console.error(`[DEBUG DATA] getClase error: ${error.message}`);
  return data;
}

async function getUsuario(usuarioId) {
  const { data, error } = await supabase
    .from('usuario')
    .select('nombre, telefono')
    .eq('id', usuarioId)
    .single();
  if (error) console.error(`[DEBUG DATA] getUsuario error: ${error.message}`);
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
