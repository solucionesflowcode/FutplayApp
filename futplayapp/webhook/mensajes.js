const fs = require('fs');
const { procesarMensajeWhatsApp, telefonoDesdeContacto, esFrameDetached } = require('./handlers');

// El bot corre en encendidos cortos (el PC se prende unas veces al día). Las
// respuestas que los alumnos mandan con el bot apagado no llegan como evento
// 'message': al conectarse hay que ir a buscarlas al historial de cada chat.
// No se usa "no leídos": si alguien abre el WhatsApp del club en el teléfono,
// los mensajes quedan leídos y se perderían.

// Nunca se mira más atrás que esto, aunque el bot haya estado apagado más tiempo
// (las reglas post-clase del scheduler también usan 48 h).
const VENTANA_MAX_MS = 48 * 60 * 60 * 1000;
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
 *   procesados      ids de mensajes ya atendidos
 */
function crearEstado(ruta, ahora = Date.now) {
  let ultimaRevision = null;
  let procesados = [];
  try {
    if (fs.existsSync(ruta)) {
      const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
      if (Number.isFinite(j.ultimaRevision)) ultimaRevision = j.ultimaRevision;
      if (Array.isArray(j.procesados)) procesados = j.procesados.slice(-MAX_PROCESADOS);
    }
  } catch (e) {
    console.error('Error cargando estado del bot:', e.message);
  }
  const set = new Set(procesados);

  function guardar() {
    try {
      fs.writeFileSync(ruta, JSON.stringify({ ultimaRevision, procesados: [...set].slice(-MAX_PROCESADOS) }));
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
    marcarRevisado(ms) {
      ultimaRevision = ms;
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

/**
 * Atiende un mensaje (en vivo o atrasado). Devuelve true si lo procesó.
 * deps: db, estado, recargarPagina(), atrasado
 */
async function manejarMensaje(msg, { db, estado, recargarPagina, atrasado = false }) {
  if (msg.fromMe || !esChatPrivado(msg.from)) return false;
  const id = msg.id?._serialized;
  if (id && estado.yaProcesado(id)) return false;

  let telefono;
  if (msg.from.endsWith('@lid')) {
    // Cuentas con identificador @lid: el id NO es el teléfono.
    telefono = telefonoDesdeContacto(await msg.getContact());
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

/**
 * Al conectarse: busca en los chats privados los mensajes recibidos desde
 * `desdeMs` y los atiende en orden cronológico, usando la hora de cada mensaje.
 * Devuelve cuántos mensajes atendió. Un chat con error no frena a los demás.
 */
async function ponerseAlDia(whatsapp, { desdeMs, manejar, mensajesPorChat = MENSAJES_POR_CHAT }) {
  const chats = await whatsapp.getChats();
  const atrasados = [];

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
    }
  }

  atrasados.sort((a, b) => a.timestamp - b.timestamp);
  let atendidos = 0;
  for (const m of atrasados) {
    try {
      if (await manejar(m)) atendidos++;
    } catch (err) {
      console.error(`[Bot] Error procesando mensaje atrasado de ${m.from}:`, err.message);
    }
  }
  return atendidos;
}

module.exports = { crearEstado, manejarMensaje, ponerseAlDia, esChatPrivado, VENTANA_MAX_MS, VENTANA_INICIAL_MS };
