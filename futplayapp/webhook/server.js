const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const app = express();
app.use(express.json());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL en .env.local');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('AVISO: No hay SUPABASE_SERVICE_ROLE_KEY. Usando anon key (solo lectura).');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getProximaClaseUsuario(usuarioId) {
  const { data: inscripciones, error: errIns } = await supabase
    .from('clase_usuario')
    .select('id, clase_id')
    .eq('usuario_id', usuarioId);

  if (errIns || !inscripciones?.length) {
    console.error(`Error al buscar inscripciones de ${usuarioId}:`, errIns?.message);
    return null;
  }

  const claseIds = inscripciones.map(i => i.clase_id);

  const { data: horario, error: errHor } = await supabase
    .from('horario')
    .select('id, fecha_hora, clase_id')
    .in('clase_id', claseIds)
    .gte('fecha_hora', new Date().toISOString())
    .order('fecha_hora', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (errHor || !horario) {
    console.log(`No hay próximas clases para usuario ${usuarioId}`);
    return null;
  }

  const claseUsuario = inscripciones.find(i => i.clase_id === horario.clase_id);

  const { data: clase, error: errClase } = await supabase
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

async function confirmarAsistencia(usuarioId) {
  const proxima = await getProximaClaseUsuario(usuarioId);
  if (!proxima) {
    console.log(`No se encontró próxima clase para usuario ${usuarioId}`);
    return false;
  }

  const { error } = await supabase
    .from('clase_usuario')
    .update({ asistencia: true })
    .eq('id', proxima.id);

  if (error) {
    console.error(`Error al confirmar asistencia de ${usuarioId}:`, error.message);
    return false;
  }
  console.log(`Asistencia confirmada para usuario ${usuarioId} en clase ${proxima.clase.titulo}`);
  return true;
}

async function liberarCupoFantasma(usuarioId) {
  const proxima = await getProximaClaseUsuario(usuarioId);
  if (!proxima) {
    console.log(`No se encontró próxima clase para usuario ${usuarioId}`);
    return false;
  }

  const { error } = await supabase
    .from('clase_usuario')
    .delete()
    .eq('id', proxima.id);

  if (error) {
    console.error(`Error al liberar cupo de ${usuarioId}:`, error.message);
    return false;
  }
  console.log(`Cupo liberado para usuario ${usuarioId} en clase ${proxima.clase.titulo}`);
  return true;
}

async function procesarMensajeWhatsApp(telefono, texto) {
  console.log(`Procesando mensaje de teléfono: "${telefono}" texto: "${texto.trim()}"`);
  const textoUpper = texto.toUpperCase().trim();
  let respuesta = '';

  const { data: usuario } = await supabase
    .from('usuario')
    .select('id, nombre, rol')
    .or(`telefono.eq.${telefono},telefono.eq.+${telefono}`)
    .maybeSingle();

  if (!usuario) {
    console.log(`Teléfono ${telefono} no registrado`);
    return 'No estás registrado en la academia. Contactate con la administración.';
  }

  if (textoUpper === 'SI' || textoUpper === 'CONFIRMAR') {
    const ok = await confirmarAsistencia(usuario.id);
    respuesta = ok
      ? `✅ Asistencia confirmada ${usuario.nombre}! Nos vemos en la próxima clase.`
      : 'No se pudo confirmar tu asistencia. No tenés clases próximas agendadas.';
  } else if (textoUpper === 'NO' || textoUpper === 'CANCELAR') {
    const ok = await liberarCupoFantasma(usuario.id);
    respuesta = ok
      ? `❌ Cupo liberado ${usuario.nombre}. Esperamos verte la próxima.`
      : 'No se pudo liberar tu cupo. No tenés clases próximas agendadas.';
  } else {
    return null;
  }

  return respuesta;
}

const whatsapp = new Client({
  authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

whatsapp.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Escanea el QR con WhatsApp en tu celular.');
});

whatsapp.on('ready', () => {
  console.log('WhatsApp conectado!');
});

whatsapp.on('message', async msg => {
  if (msg.from.endsWith('@g.us') || msg.from.endsWith('@broadcast')) return;

  if (msg.from.endsWith('@lid')) {
    console.log('DEBUG msg.from:', msg.from);
    console.log('DEBUG msg.author:', msg.author);
    console.log('DEBUG msg._data:', JSON.stringify(msg._data?.key || {}));
    console.log('DEBUG msg.id:', JSON.stringify(msg.id));
    return;
  }

  const telefono = msg.from.replace('@c.us', '');
  const respuesta = await procesarMensajeWhatsApp(telefono, msg.body);

  if (respuesta) {
    await msg.reply(respuesta);
  }
});

whatsapp.initialize().catch(err => {
  console.error('Error al iniciar WhatsApp:', err.message);
});

app.post('/whatsapp-webhook', async (req, res) => {
  try {
    const data = req.body;
    if (data.event === 'messages.upsert') {
      const message = data.data?.[0];
      if (!message) return res.sendStatus(200);

      const telefono = message.key?.remoteJid?.split('@')[0];
      const texto = message.message?.conversation
        || message.message?.extendedTextMessage?.text
        || '';

      if (telefono && texto) {
        await procesarMensajeWhatsApp(telefono, texto);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err);
    res.sendStatus(200);
  }
});

const PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Webhook Express activo en puerto ${PORT}`);
  console.log(`Endpoint: POST http://localhost:${PORT}/whatsapp-webhook`);
});
