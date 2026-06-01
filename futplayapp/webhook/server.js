const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const db = require('./data');

const RECORDATORIOS_FILE = path.join(__dirname, '.recordatorios.json');
const recordatoriosEnviados = new Set();
try {
  const data = fs.readFileSync(RECORDATORIOS_FILE, 'utf8');
  JSON.parse(data).forEach(id => recordatoriosEnviados.add(id));
} catch { }

function guardarRecordatorios() {
  fs.writeFileSync(RECORDATORIOS_FILE, JSON.stringify([...recordatoriosEnviados]));
}

const app = express();
app.use(express.json());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl) { console.error('Falta NEXT_PUBLIC_SUPABASE_URL'); process.exit(1); }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('AVISO: Sin SUPABASE_SERVICE_ROLE_KEY. Solo lectura.');
db.init(supabaseUrl, supabaseKey);

function horasHasta(fecha_hora) {
  return (new Date(fecha_hora) - new Date()) / (1000 * 60 * 60);
}

async function confirmarAsistencia(usuarioId) {
  const proxima = await db.getProximaClaseUsuario(usuarioId);
  if (!proxima) return 'No tenés clases próximas agendadas.';
  if (horasHasta(proxima.horario.fecha_hora) < 1) return 'Ya no alcanzás a confirmar, la clase empieza en menos de 1 hora.';
  const ok = await db.confirmarAsistencia(proxima.id);
  return ok ? `✅ Asistencia confirmada! Nos vemos en "${proxima.clase.titulo}".` : 'Error al confirmar. Intentalo de nuevo.';
}

async function cancelarAsistencia(usuarioId) {
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

async function procesarMensajeWhatsApp(telefono, texto) {
  const textoUpper = texto.toUpperCase().trim();
  const usuario = await db.buscarUsuarioPorTelefono(telefono);
  if (!usuario) return 'No estás registrado en la academia. Contactate con la administración.';
  if (textoUpper === 'SI' || textoUpper === 'CONFIRMAR') return await confirmarAsistencia(usuario.id);
  if (textoUpper === 'NO' || textoUpper === 'CANCELAR') return await cancelarAsistencia(usuario.id);
  return null;
}

// ─── WhatsApp Client ───
const whatsapp = new Client({
  authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

whatsapp.on('qr', qr => { qrcode.generate(qr, { small: true }); console.log('Escanea el QR.'); });
whatsapp.on('ready', () => console.log('WhatsApp conectado!'));

whatsapp.on('message', async msg => {
  if (msg.from.endsWith('@g.us') || msg.from.endsWith('@broadcast')) return;

  let telefono;
  if (msg.from.endsWith('@lid')) {
    const contact = await msg.getContact();
    const rawId = contact.id?.user || contact.id?._serialized || contact.id || contact.number;
    telefono = rawId.replace(/@\w+/g, '').replace(/\D/g, '');
  } else {
    telefono = msg.from.replace('@c.us', '');
  }

  const respuesta = await procesarMensajeWhatsApp(telefono, msg.body);
  if (respuesta) await msg.reply(respuesta);
});

whatsapp.initialize().catch(err => console.error('Error al iniciar WhatsApp:', err.message));

// ─── Scheduler ───
if (process.env.SCHEDULER_ENABLED === 'true') {
  cron.schedule('*/15 * * * *', async () => {
    const ahora = new Date();

    const horarios = await db.getHorariosProximos();
    for (const h of horarios) {
      const inscripciones = await db.getInscripcionesSinConfirmar(h.id);
      if (!inscripciones.length) continue;
      const clase = await db.getClase(h.clase_id);

      for (const insc of inscripciones) {
        if (recordatoriosEnviados.has(insc.id)) continue;
        const usuario = await db.getUsuario(insc.usuario_id);
        if (!usuario?.telefono) continue;

        const fecha = new Date(h.fecha_hora);
        const hora = fecha.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
        const telefono = usuario.telefono.replace('+', '');
        const mensaje = `Hola ${usuario.nombre}! Recuerda que mañana a las ${hora} tienes "${clase?.titulo || 'tu clase'}". Responde SI para confirmar o NO para cancelar.`;

        try {
          await whatsapp.sendMessage(`${telefono}@c.us`, mensaje);
          await db.setPendiente(insc.id);
          recordatoriosEnviados.add(insc.id);
          guardarRecordatorios();
        } catch (err) {
          console.error(`Error al enviar a ${usuario.nombre}:`, err.message);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const pasados = await db.getHorariosPasados();
    for (const h of pasados) {
      await db.actualizarPorClaseYEstado(h.id, 'pendiente', 'cancelado_sin_reembolso');
      await db.actualizarPorClaseYEstado(h.id, 'confirmado_whatsapp', 'no_asistio');
    }
  });
}

if (process.env.SCHEDULER_ENABLED !== 'true') {
  console.log('[Scheduler] Desactivado. SCHEDULER_ENABLED=true para activar.');
}

// ─── Webhook HTTP ───
app.post('/whatsapp-webhook', async (req, res) => {
  try {
    const data = req.body;
    if (data.event === 'messages.upsert') {
      const message = data.data?.[0];
      if (!message) return res.sendStatus(200);
      const telefono = message.key?.remoteJid?.split('@')[0];
      const texto = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
      if (telefono && texto) await procesarMensajeWhatsApp(telefono, texto);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err);
    res.sendStatus(200);
  }
});

// ─── Forzar recordatorio ahora (testing) ───
app.get('/test-reminder/:horarioId', async (req, res) => {
  try {
    const h = await db.getHorarioCompleto(req.params.horarioId);
    if (!h) return res.status(404).send('Horario no encontrado');

    const inscripciones = await db.getInscripcionesSinConfirmar(h.id);
    if (!inscripciones.length) return res.send('Sin alumnos sin confirmar');

    const clase = await db.getClase(h.clase_id);
    for (const insc of inscripciones) {
      const usuario = await db.getUsuario(insc.usuario_id);
      if (!usuario?.telefono) continue;
      const fecha = new Date(h.fecha_hora);
      const hora = fecha.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
      const telefono = usuario.telefono.replace('+', '');
      const mensaje = `Hola ${usuario.nombre}! Recordá que mañana a las ${hora} tenés "${clase?.titulo || 'tu clase'}". Respondé SI para confirmar o NO para cancelar.`;
      await whatsapp.sendMessage(`${telefono}@c.us`, mensaje);
      await db.setPendiente(insc.id);
      res.send(`✅ Recordatorio enviado a ${usuario.nombre} (${telefono})`);
    }
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

// ─── QR Scanner ───
app.get('/scan-qr/:horarioId', async (req, res) => {
  try {
    const registros = await db.getConfirmadosPorClase(req.params.horarioId);
    if (!registros.length) return res.send('<h2>No hay alumnos con asistencia confirmada.</h2>');

    for (const r of registros) await db.updateAsistencia(r.id, 'asistio');
    res.send(`<h2>✅ Asistencia marcada para ${registros.length} alumno(s).</h2>`);
  } catch (err) {
    console.error('Error en /scan-qr:', err);
    res.status(500).send('Error interno');
  }
});

const PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Webhook Express activo en puerto ${PORT}`);
  console.log(`QR Scanner: http://localhost:${PORT}/scan-qr/:horarioId`);
});
