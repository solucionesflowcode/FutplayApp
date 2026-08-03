const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
// En el servidor (Docker) el archivo de entorno es webhook/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./data');
const { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp } = require('./handlers');

const RECORDATORIOS_PATH = process.env.RECORDATORIOS_PATH || path.join(__dirname, '.recordatorios.json');
let recordatoriosEnviados = new Set();
try {
  if (fs.existsSync(RECORDATORIOS_PATH)) {
    const arr = JSON.parse(fs.readFileSync(RECORDATORIOS_PATH, 'utf8'));
    recordatoriosEnviados = new Set(arr);
  }
} catch (e) {
  console.error('Error cargando recordatorios:', e.message);
}

function guardarRecordatorios() {
  try {
    fs.writeFileSync(RECORDATORIOS_PATH, JSON.stringify([...recordatoriosEnviados]));
  } catch (e) {
    console.error('Error guardando recordatorios:', e.message);
  }
}

const app = express();
app.use(express.json());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl) { console.error('Falta NEXT_PUBLIC_SUPABASE_URL'); process.exit(1); }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('AVISO: Sin SUPABASE_SERVICE_ROLE_KEY. Solo lectura.');
db.init(supabaseUrl, supabaseKey);

// ─── WhatsApp Client ───
const puppeteerConfig = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run']
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
} else if (process.platform === 'win32') {
  // Dev local en Windows: usa el Chrome instalado del sistema.
  puppeteerConfig.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}
// En Linux sin PUPPETEER_EXECUTABLE_PATH, puppeteer usa su Chrome for Testing cacheado (imagen Docker).

const whatsapp = new Client({
  authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
  puppeteer: puppeteerConfig
});

let whatsappReady = false;

async function sendMessageWithRetry(chatId, message, maxRetries = 3) {
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

whatsapp.on('qr', qr => { qrcode.generate(qr, { small: true }); console.log('Escanea el QR.'); });
whatsapp.on('ready', () => { console.log('WhatsApp conectado!'); whatsappReady = true; });
whatsapp.on('disconnected', (reason) => { console.error('WhatsApp desconectado:', reason); whatsappReady = false; });

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
  cron.schedule('* * * * *', async () => {
    if (!whatsappReady) { console.log('[Scheduler] WhatsApp no conectado, saltando ciclo'); return; }
    const ahora = new Date();

    let horarios = await db.getHorarios24h();
    horarios.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    console.log(`[DEBUG SERVER] Scheduler: horarios en 24h=${horarios.length}`);
    for (const h of horarios) {
      const hayBloqueo = await db.hayPendientesAnteriores(h.fecha_hora);
      if (hayBloqueo) {
        console.log(`[DEBUG SERVER] Scheduler: clase ${h.id} bloqueada, esperando pendientes anteriores`);
        break;
      }
      console.log(`[DEBUG SERVER] Scheduler: procesando horario id=${h.id}, fecha_hora=${h.fecha_hora}`);
      const inscripciones = await db.getInscripcionesSinConfirmar(h.id);
      if (!inscripciones.length) { console.log(`[DEBUG SERVER] Scheduler: sin inscripciones sin confirmar`); continue; }
      const clase = await db.getClase(h.clase_id);

      for (const insc of inscripciones) {
        if (recordatoriosEnviados.has(insc.id)) { console.log(`[DEBUG SERVER] Scheduler: recordatorio ya enviado para insc=${insc.id}`); continue; }
        const usuario = await db.getUsuario(insc.usuario_id);
        if (!usuario?.telefono) { console.log(`[DEBUG SERVER] Scheduler: usuario ${insc.usuario_id} sin telefono`); continue; }

        const fecha = new Date(h.fecha_hora);
        const hora = fecha.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
        const telefono = usuario.telefono.replace('+', '');
        const mensaje = `Hola ${usuario.nombre}! Recuerda que mañana a las ${hora} tienes "${clase?.titulo || 'tu clase'}". Responde *1* para confirmar o *2* para cancelar.`;

        console.log(`[DEBUG SERVER] Scheduler: enviando a ${usuario.nombre} (${telefono}): "${mensaje}"`);
        try {
          await sendMessageWithRetry(`${telefono}@c.us`, mensaje);
          await db.setPendiente(insc.id);
          recordatoriosEnviados.add(insc.id);
          guardarRecordatorios();
          console.log(`[DEBUG SERVER] Scheduler: enviado OK a ${usuario.nombre}`);
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
app.get('/test-reminder/:claseId', async (req, res) => {
  try {
    const horarios = await db.getHorarios24h();
    const h = horarios.find(x => x.id === req.params.claseId);
    if (!h) return res.status(404).send('Clase no está en ventana 24h');

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
      await sendMessageWithRetry(`${telefono}@c.us`, mensaje);
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
