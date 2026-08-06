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
const { confirmarAsistencia, cancelarAsistencia, procesarMensajeWhatsApp, buildReminderMessage, sendMessageWithRetry, recargarPagina, esFrameDetached } = require('./handlers');

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
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.env.WHATSAPP_SESSION_PATH)
  : path.join(__dirname, 'whatsapp-session');

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

let whatsapp = null;
let whatsappReady = false;
let inicializando = false;
let apagando = false;
let ultimoIntento = 0;

function crearCliente() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: puppeteerConfig
  });

  c.on('qr', qr => { qrcode.generate(qr, { small: true }); console.log('Escanea el QR.'); });

  if (process.env.QR_TO_FILE) {
    const qrImg = require('qrcode');
    c.on('qr', qr => {
      qrImg.toFile(process.env.QR_TO_FILE, qr, { width: 400, margin: 2 })
        .then(() => console.log(`QR guardado en ${process.env.QR_TO_FILE}`))
        .catch(err => console.error('Error guardando QR:', err.message));
    });
  }

  c.on('ready', () => { console.log('WhatsApp conectado!'); whatsappReady = true; });

  c.on('disconnected', (reason) => {
    console.error('WhatsApp desconectado:', reason);
    whatsappReady = false;
    if (apagando || reason === 'LOGOUT') return;
    console.log('Programando reconexión en 15s...');
    setTimeout(() => iniciarWhatsApp(), 15000);
  });

  c.on('message', async msg => {
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
    if (respuesta) {
      for (let i = 0; i < 3; i++) {
        try {
          await msg.reply(respuesta);
          break;
        } catch (err) {
          if (esFrameDetached(err) && i < 2) {
            console.log(`[WARN] Frame detached al responder, recargando página...`);
            await recargarPagina(whatsapp);
            continue;
          }
          throw err;
        }
      }
    }
  });

  return c;
}

async function iniciarWhatsApp() {
  if (apagando || inicializando) return;
  inicializando = true;
  ultimoIntento = Date.now();
  try {
    if (whatsapp) await whatsapp.destroy().catch(() => {});
  } catch (err) {
    console.error('Error cerrando cliente anterior:', err.message);
  }
  whatsapp = crearCliente();
  try {
    await whatsapp.initialize();
  } catch (err) {
    console.error(`Error al iniciar WhatsApp: ${err.message}`);
    if (!apagando) {
      console.log('Reintentando en 15s...');
      setTimeout(() => { inicializando = false; iniciarWhatsApp(); }, 15000);
    }
  } finally {
    inicializando = false;
  }
}

// Watchdog: si WhatsApp queda sin conectar y sin reintento pendiente, recarga el cliente
setInterval(() => {
  if (apagando || inicializando || whatsappReady) return;
  if (Date.now() - ultimoIntento > 180000) {
    console.log('[Watchdog] WhatsApp sin conectar por mucho tiempo, reiniciando cliente...');
    iniciarWhatsApp();
  }
}, 60000);

// Cierre limpio: cierra Chrome para que la sesión se flushee y sobreviva a reinicios
async function apagar() {
  if (apagando) return;
  apagando = true;
  console.log('Deteniendo bot y guardando sesión...');
  try {
    if (whatsapp) await whatsapp.destroy();
  } catch (err) {
    console.error('Error al detener el cliente:', err.message);
  }
  console.log('Sesión guardada. Hasta luego.');
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
process.on('uncaughtException', (err) => console.error('Excepción no capturada:', err.message));
process.on('unhandledRejection', (err) => console.error('Rechazo no manejado:', err));

iniciarWhatsApp();

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
        const telefono = usuario.telefono.replace('+', '');
        const mensaje = buildReminderMessage(usuario, clase, fecha);

        console.log(`[DEBUG SERVER] Scheduler: enviando a ${usuario.nombre} (${telefono}): "${mensaje}"`);
        try {
          await sendMessageWithRetry(whatsapp, `${telefono}@c.us`, mensaje);
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
        const telefono = usuario.telefono.replace('+', '');
        const mensaje = buildReminderMessage(usuario, clase, new Date(h.fecha_hora));
        await sendMessageWithRetry(whatsapp, `${telefono}@c.us`, mensaje);
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
