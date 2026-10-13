const fs = require('fs');
const { procesarMensajeWhatsApp, telefonoDesdeContacto, esFrameDetached } = require('./handlers');

// El bot corre en encendidos cortos (el PC se prende unas veces al día). Las
// respuestas que los alumnos mandan con el bot apagado no llegan como evento
// 'message': al conectarse hay que ir a buscarlas al historial de cada chat.
// No se usa "no leídos": si alguien abre el WhatsApp del club en el teléfono,
// los mensajes quedan leídos y se perderían.

// Nunca se mira más atrás que esto, aunque el bot haya estado apagado más tiempo
// (las reglas post-clase del scheduler usan la misma ventana). Antes era 48 h: con
// el PC apagado un fin de semana largo, un "2" del viernes no se leía y la clase
// del sábado quedaba cancelada sin reembolso aunque el alumno avisó a tiempo.
const VENTANA_MAX_MS = 7 * 24 * 60 * 60 * 1000;
// Intentos de puesta al día con mensajes que fallaron (BD o internet caídos)
// antes de dejar correr al scheduler. Uno por minuto.
const MAX_INTENTOS_PUESTA_AL_DIA = 5;
// Primer arranque sin estado guardado: se revisan las últimas 24 h.
const VENTANA_INICIAL_MS = 24 * 60 * 60 * 1000;
// Mensajes por chat que se piden al historial al ponerse al día.
const MENSAJES_POR_CHAT = 30;
// Ids de mensajes ya procesados que se recuerdan (evita contestar dos veces).
const MAX_PROCESADOS = 2000;

const esChatPrivado = (chatId) => !chatId.endsWith('@g.us') && !chatId.endsWith('@broadcast') && !chatId.endsWith('@newsletter');

/**
 * Estado persistido en disco:
 *   ultimaRevision  ms epoch hasta donde ya se revisaron mensajes con certeza
 *   pisoRevision    ms de un mensaje que no se pudo procesar: la marca no lo pasa
 *                   hasta que una puesta al día lo procese (null si no hay)
 *   procesados      ids de mensajes ya atendidos
 */
function crearEstado(ruta, ahora = Date.now) {
  let ultimaRevision = null;
  let pisoRevision = null;
  let procesados = [];
  try {
    if (fs.existsSync(ruta)) {
      const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
      if (Number.isFinite(j.ultimaRevision)) ultimaRevision = j.ultimaRevision;
      if (Number.isFinite(j.pisoRevision)) pisoRevision = j.pisoRevision;
      if (Array.isArray(j.procesados)) procesados = j.procesados.slice(-MAX_PROCESADOS);
    }
  } catch (e) {
    console.error('Error cargando estado del bot:', e.message);
  }
  const set = new Set(procesados);

  function guardar() {
    try {
      fs.writeFileSync(ruta, JSON.stringify({ ultimaRevision, pisoRevision, procesados: [...set].slice(-MAX_PROCESADOS) }));
    } catch (e) {
      console.error('Error guardando estado del bot:', e.message);
    }
  }

  return {
    // Desde cuándo hay que buscar mensajes al conectarse.
    desde() {
      const t = ahora();
      const base = ultimaRevision ?? t - VENTANA_INICIAL_MS;
      return Math.max(base, t - VENTANA_MAX_MS);
    },
    // Nunca pasa del piso: el mensaje que falló se vuelve a leer al próximo
    // encendido (sin esto, el marcado de cada minuto lo dejaba atrás).
    marcarRevisado(ms) {
      ultimaRevision = pisoRevision != null ? Math.min(ms, pisoRevision) : ms;
      guardar();
    },
    fijarPiso(ms) {
      pisoRevision = ms;
      if (ms != null && ultimaRevision != null) ultimaRevision = Math.min(ultimaRevision, ms);
      guardar();
    },
    yaProcesado: (id) => set.has(id),
    marcarProcesado(id) {
      set.add(id);
      if (set.size > MAX_PROCESADOS) set.delete(set.values().next().value);
      guardar();
    },
  };
}

// Id estable del mensaje para no atenderlo dos veces. whatsapp-web.js ya no
// trae id._serialized (llega {fromMe, remote, id}): sin esto ningún mensaje
// quedaba marcado y cada encendido los volvía a procesar.
function idMensaje(msg) {
  const k = msg.id;
  if (!k) return null;
  if (k._serialized) return k._serialized;
  if (k.remote && k.id) return `${k.fromMe ? 'true' : 'false'}_${k.remote}_${k.id}`;
  return null;
}

// Teléfono real de una cuenta @lid (el id NO es el número). contact.number
// devuelve el propio id @lid: el alumno no se encontraba y su respuesta se
// ignoraba. getContactLidAndPhone() consulta el mapeo lid → teléfono.
async function telefonoDeLid(msg) {
  const lidUser = msg.from.split('@')[0];
  try {
    const [r] = (await msg.client?.getContactLidAndPhone?.([msg.from])) ?? [];
    const pn = String(r?.pn ?? '').split('@')[0].replace(/\D/g, '');
    if (pn && pn !== lidUser) return pn;
  } catch (err) {
    console.warn(`[Bot] No se pudo resolver ${msg.from}:`, err?.message || err);
  }
  const t = telefonoDesdeContacto(await msg.getContact());
  return t && t !== lidUser ? t : null;
}

/**
 * Atiende un mensaje (en vivo o atrasado). Devuelve true si lo procesó.
 * deps: db, estado, recargarPagina(), atrasado
 */
async function manejarMensaje(msg, { db, estado, recargarPagina, atrasado = false }) {
  if (msg.fromMe || !esChatPrivado(msg.from)) return false;
  const id = idMensaje(msg);
  if (id && estado.yaProcesado(id)) return false;

  let telefono;
  if (msg.from.endsWith('@lid')) {
    telefono = await telefonoDeLid(msg);
    if (!telefono) {
      console.warn(`[Bot] No se pudo obtener el teléfono de ${msg.from}`);
      return false;
    }
  } else {
    telefono = msg.from.replace('@c.us', '');
  }

  const enviadoEn = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();
  // Si la BD falla, lanza y el mensaje NO queda marcado: se reintenta al
  // próximo encendido. Se marca antes de contestar: si falla el envío de la
  // respuesta, los cambios en la BD ya están hechos y no se repiten.
  if (atrasado) {
    console.log(`[Bot] Atrasado de ${telefono} (${enviadoEn.toISOString()}): ${JSON.stringify(String(msg.body ?? '').slice(0, 20))}`);
  }
  const respuesta = await procesarMensajeWhatsApp(telefono, msg.body, db, { enviadoEn, atrasado });
  if (id) estado.marcarProcesado(id);
  if (!respuesta) return true;

  for (let i = 0; i < 3; i++) {
    try {
      await msg.reply(respuesta);
      break;
    } catch (err) {
      if (esFrameDetached(err) && i < 2) {
        console.log('[WARN] Frame detached al responder, recargando página...');
        await recargarPagina();
        continue;
      }
      throw err;
    }
  }
  return true;
}

// Chat sin serializar su modelo: getChatModel() (getChats/getChatById) falla
// con los chats @lid ("r"), pero fetchMessages() abre el chat crudo y sí funciona.
function chatLiviano(whatsapp, id, timestamp) {
  const { Chat } = require('whatsapp-web.js');
  const chat = Object.create(Chat.prototype);
  Object.defineProperty(chat, 'client', { value: whatsapp });
  chat.id = { _serialized: id };
  chat.timestamp = timestamp;
  chat.isGroup = false;
  return chat;
}

/**
 * Chats privados con actividad desde `desdeMs`, listos para fetchMessages().
 * client.getChats() serializa TODOS los chats en una sola llamada y falla
 * entera con un chat @lid (error minificado "r"): el bot nunca se ponía al
 * día. Aquí se piden solo los ids con actividad reciente y no se serializan.
 */
async function listarChatsSeguros(whatsapp, desdeMs, crearChat = chatLiviano) {
  const recientes = await whatsapp.pupPage.evaluate(
    (desdeSeg) => window.require('WAWebCollections').Chat.getModelsArray()
      .filter((c) => (c.t || 0) > desdeSeg)
      .map((c) => ({ id: c.id._serialized, t: c.t })),
    Math.floor(desdeMs / 1000),
  );
  return recientes
    .filter(({ id }) => esChatPrivado(id))
    .map(({ id, t }) => crearChat(whatsapp, id, t));
}

/**
 * Al conectarse: busca en los chats privados los mensajes recibidos desde
 * `desdeMs` y los atiende en orden cronológico, usando la hora de cada mensaje.
 * Un chat o mensaje con error no frena a los demás, pero se cuenta:
 * devuelve { atendidos, fallidos, primerFallidoMs } (ver decidirPuestaAlDia).
 */
async function ponerseAlDia(whatsapp, { desdeMs, manejar, mensajesPorChat = MENSAJES_POR_CHAT }) {
  const chats = await whatsapp.getChats();
  const atrasados = [];
  let fallidos = 0;
  let primerFallidoMs = null;
  const fallo = (ms) => {
    fallidos++;
    primerFallidoMs = primerFallidoMs == null ? ms : Math.min(primerFallidoMs, ms);
  };

  for (const chat of chats) {
    const chatId = chat.id?._serialized ?? '';
    if (chat.isGroup || chat.isChannel || !esChatPrivado(chatId)) continue;
    if (!chat.timestamp || chat.timestamp * 1000 <= desdeMs) continue;
    try {
      const mensajes = await chat.fetchMessages({ limit: mensajesPorChat, fromMe: false });
      for (const m of mensajes) {
        if (!m.fromMe && m.timestamp && m.timestamp * 1000 > desdeMs) atrasados.push(m);
      }
    } catch (err) {
      console.error(`[Bot] Error leyendo el chat ${chatId}:`, err.message);
      // No se sabe qué mensajes tenía: hay que volver a leer desde el principio.
      fallo(desdeMs + 1);
    }
  }

  atrasados.sort((a, b) => a.timestamp - b.timestamp);
  let atendidos = 0;
  for (const m of atrasados) {
    try {
      if (await manejar(m)) atendidos++;
    } catch (err) {
      console.error(`[Bot] Error procesando mensaje atrasado de ${m.from}:`, err.message);
      fallo(m.timestamp * 1000);
    }
  }
  return { atendidos, fallidos, primerFallidoMs };
}

/**
 * Qué hacer tras una puesta al día (`intento` empieza en 1).
 * Si un mensaje falló (BD o internet caídos), NO se da por al día: el scheduler
 * cancelaría sin reembolso a quien sí respondió, y la marca de revisión dejaba el
 * mensaje atrás para siempre. Se reintenta; tras MAX_INTENTOS se sigue (no se
 * bloquea el bot) dejando un piso para releer ese mensaje al próximo encendido.
 *   { alDia: false }                       → reintentar en 60 s
 *   { alDia: true, revisadoHasta, piso }   → marcar y dejar correr al scheduler
 */
function decidirPuestaAlDia({ fallidos, primerFallidoMs }, intento, conexionMs) {
  if (!fallidos) return { alDia: true, revisadoHasta: conexionMs, piso: null };
  if (intento < MAX_INTENTOS_PUESTA_AL_DIA) return { alDia: false };
  return { alDia: true, revisadoHasta: conexionMs, piso: primerFallidoMs - 1 };
}

module.exports = { crearEstado, manejarMensaje, ponerseAlDia, decidirPuestaAlDia, listarChatsSeguros, esChatPrivado, VENTANA_MAX_MS, VENTANA_INICIAL_MS, MAX_INTENTOS_PUESTA_AL_DIA };
