const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
// En el servidor (Docker) el archivo de entorno es webhook/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./data');
const { sendMessageWithRetry, recargarPagina } = require('./handlers');
const { esErrorPerfilOcupado, matarChromeStale } = require('./limpieza');
const { crearScheduler } = require('./scheduler');
const { crearEstado, manejarMensaje, ponerseAlDia } = require('./mensajes');

// Hasta dónde se revisaron mensajes y cuáles ya se atendieron (encendidos cortos).
const estado = crearEstado(process.env.ESTADO_PATH || path.join(__dirname, '.estado-bot.json'));

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) { console.error('Falta NEXT_PUBLIC_SUPABASE_URL'); process.exit(1); }
// Sin la service role la RLS bloquea todo y el bot "funciona" sin hacer nada
// (antes caía a la clave pública en silencio). Mejor no arrancar.
if (!supabaseKey) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
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
// true cuando ya se atendieron los mensajes que llegaron con el bot apagado.
// El scheduler NO corre antes: si no, cancelaría como "sin respuesta" a quien
// respondió con el PC apagado.
let alDia = false;
let enEspera = [];

const depsMensajes = (atrasado) => ({ db, estado, recargarPagina: () => recargarPagina(whatsapp), atrasado });

function atender(msg, atrasado) {
  return manejarMensaje(msg, depsMensajes(atrasado))
    .catch((err) => console.error(`[Bot] Error atendiendo mensaje de ${msg.from}:`, err.message));
}

async function ponerseAlDiaConReintento(cliente) {
  if (cliente !== whatsapp || !whatsappReady) return;
  const conexion = Date.now();
  const desdeMs = estado.desde();
  try {
    console.log(`[Bot] Revisando mensajes recibidos desde ${new Date(desdeMs).toISOString()}...`);
    const n = await ponerseAlDia(cliente, { desdeMs, manejar: (m) => manejarMensaje(m, depsMensajes(true)) });
    estado.marcarRevisado(conexion);
    console.log(`[Bot] Al día: ${n} mensaje(s) atrasado(s) atendido(s).`);
  } catch (err) {
    console.error('[Bot] Error poniéndose al día, reintento en 60 s:', err.message);
    setTimeout(() => ponerseAlDiaConReintento(cliente), 60000);
    return;
  }
  alDia = true;
  const cola = enEspera;
  enEspera = [];
  for (const msg of cola) await atender(msg, false);
}

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

  c.on('ready', () => {
    console.log('WhatsApp conectado!');
    whatsappReady = true;
    ponerseAlDiaConReintento(c);
  });

  c.on('disconnected', (reason) => {
    console.error('WhatsApp desconectado:', reason);
    whatsappReady = false;
    alDia = false;
    if (apagando) return;
    if (reason === 'LOGOUT') {
      console.log('La sesión fue desvinculada. Vuelve a escanear el QR para reconectar.');
      return;
    }
    console.log('Programando reconexión en 15s...');
    setTimeout(() => iniciarWhatsApp(), 15000);
  });

  c.on('auth_failure', (msg) => {
    console.error('auth_failure:', msg);
    whatsappReady = false;
    alDia = false;
  });

  c.on('message', async msg => {
    // Mientras se pone al día, los mensajes en vivo esperan: así se atienden
    // en orden y después de los atrasados del mismo alumno.
    if (!alDia) { enEspera.push(msg); return; }
    await atender(msg, false);
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
  // Si un reinicio anterior dejó un Chrome huérfano usando el perfil, lo eliminamos
  // antes de abrir uno nuevo. Sin esto, initialize() falla para siempre con
  // "browser is already running" y el bot queda atascado en un loop de 15s.
  await matarChromeStale(SESSION_PATH);
  whatsappReady = false;
  alDia = false;
  enEspera = [];
  whatsapp = crearCliente();
  try {
    await whatsapp.initialize();
    inicializando = false;
  } catch (err) {
    console.error(`Error al iniciar WhatsApp: ${err.message}`);
    if (apagando) { inicializando = false; return; }
    const perfilOcupado = esErrorPerfilOcupado(err);
    if (perfilOcupado) {
      console.log('Perfil de sesión bloqueado por un Chrome anterior. Eliminándolo...');
      await matarChromeStale(SESSION_PATH);
    }
    const esperaMs = perfilOcupado ? 3000 : 15000;
    console.log(`Reintentando en ${esperaMs / 1000}s...`);
    // inicializando sigue en true hasta que dispare el reintento, así no se pisan
    // el watchdog, el evento disconnected y el propio reintento.
    setTimeout(() => { inicializando = false; iniciarWhatsApp(); }, esperaMs);
  }
}

// Watchdog: si WhatsApp queda sin conectar y sin reintento pendiente, recarga el cliente.
// También detecta una initialize() que se quedó colgada (QR sin escanear o página trabada).
setInterval(() => {
  if (apagando) return;
  if (whatsappReady) return;
  const sinProgreso = Date.now() - ultimoIntento;
  if (!inicializando && sinProgreso > 180000) {
    console.log('[Watchdog] WhatsApp sin conectar por mucho tiempo, reiniciando cliente...');
    iniciarWhatsApp();
  } else if (inicializando && sinProgreso > 300000) {
    console.log('[Watchdog] La inicialización lleva más de 5 min, forzando reinicio limpio...');
    matarChromeStale(SESSION_PATH).then(() => {
      inicializando = false;
      iniciarWhatsApp();
    });
  }
}, 60000);

// Cierre limpio: cierra Chrome para que la sesión se flushee y sobreviva a reinicios.
async function apagar() {
  if (apagando) return;
  apagando = true;
  console.log('Deteniendo bot y guardando sesión...');
  const cierre = (async () => {
    if (whatsapp) await whatsapp.destroy();
  })();
  const timeout = new Promise((r) => setTimeout(r, 8000));
  await Promise.race([cierre, timeout]).catch((err) =>
    console.error('Error al detener el cliente:', err.message)
  );
  // Si destroy() se colgó o el proceso va a ser matado, no dejar Chrome huérfano
  // con el perfil bloqueado: el próximo arranque arrancaría en modo "already running".
  await matarChromeStale(SESSION_PATH);
  console.log('Sesión guardada. Hasta luego.');
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
process.on('uncaughtException', (err) => console.error('Excepción no capturada:', err.message));
process.on('unhandledRejection', (err) => console.error('Rechazo no manejado:', err));

iniciarWhatsApp();

// ─── Scheduler (reglas en scheduler.js) ───
if (process.env.SCHEDULER_ENABLED === 'true') {
  const tick = crearScheduler({
    db,
    enviar: (chatId, texto) => sendMessageWithRetry(whatsapp, chatId, texto),
    // Solo con los mensajes atrasados ya atendidos (ver alDia).
    estaListo: () => whatsappReady && alDia,
    recordatoriosEnviados,
    guardarRecordatorios,
  });
  cron.schedule('* * * * *', tick);
}

// Mientras está conectado y al día, los mensajes llegan en vivo: se avanza la
// marca de revisión para que el próximo encendido busque solo lo nuevo. Margen
// de 2 min por si un mensaje llegó justo antes de una desconexión (los ya
// atendidos se saltan por id).
cron.schedule('* * * * *', () => {
  if (whatsappReady && alDia) estado.marcarRevisado(Date.now() - 2 * 60 * 1000);
});

if (process.env.SCHEDULER_ENABLED !== 'true') {
  console.log('[Scheduler] Desactivado. SCHEDULER_ENABLED=true para activar.');
}

// Sin servidor HTTP: los mensajes llegan por el cliente de WhatsApp
// (c.on('message')). Los endpoints /whatsapp-webhook y /test-reminder se
// eliminaron: estaban expuestos sin autenticación y permitían suplantar un
// teléfono para cancelar clases ajenas o disparar recordatorios.
