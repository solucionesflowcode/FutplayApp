const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const db = require('./data');
const { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp } = require('./handlers');

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

  const respuesta = await procesarMensajeWhatsApp(telefono, msg.body, db);
  if (respuesta) await msg.reply(respuesta);
});

whatsapp.initialize().catch(err => console.error('Error al iniciar WhatsApp:', err.message));

// ─── Scheduler ───
if (process.env.SCHEDULER_ENABLED === 'true') {
  cron.schedule('*/15 * * * *', async () => {
    const ahora = new Date();

    const horarios = await db.getHorarios24h();
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
        const mensaje = `Hola ${usuario.nombre}! Recuerda que mañana a las ${hora} tienes "${clase?.titulo || 'tu clase'}". Responde *1* para confirmar o *2* para cancelar.`;

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
    }

    const pasados1h = await db.getHorariosPasados1h();
    for (const h of pasados1h) {
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
      if (telefono && texto) await procesarMensajeWhatsApp(telefono, texto, db);
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
    const horarios = await db.getHorarios24h();
    const h = horarios.find(x => x.id === req.params.horarioId);
    if (!h) return res.status(404).send('Horario no está en ventana 24h');

    const inscripciones = await db.getInscripcionesSinConfirmar(h.id);
    if (!inscripciones.length) return res.send('Sin alumnos sin confirmar');

    const clase = await db.getClase(h.clase_id);
    for (const insc of inscripciones) {
      const usuario = await db.getUsuario(insc.usuario_id);
      if (!usuario?.telefono) continue;
      const fecha = new Date(h.fecha_hora);
      const hora = fecha.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
      const telefono = usuario.telefono.replace('+', '');
      const mensaje = `Hola ${usuario.nombre}! Recordá que mañana a las ${hora} tenés "${clase?.titulo || 'tu clase'}". Respondé *1* para confirmar o *2* para cancelar.`;
      await whatsapp.sendMessage(`${telefono}@c.us`, mensaje);
      await db.setPendiente(insc.id);
      res.send(`✅ Recordatorio enviado a ${usuario.nombre} (${telefono})`);
    }
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});

const PORT = process.env.WEBHOOK_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Webhook Express activo en puerto ${PORT}`);
});
