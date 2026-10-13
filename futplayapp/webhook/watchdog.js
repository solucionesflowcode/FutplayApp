// Regla del watchdog de WhatsApp: decide si reiniciar un cliente que no está conectado.
// Mientras el QR se sigue renovando (cada ~20 s) o la sesión está cargando, el
// cliente está vivo y esperando: reiniciarlo cambia el QR bajo el teléfono que lo
// está escaneando y mata el Chrome a mitad de initialize() ("Navigating frame was
// detached"). Solo se reinicia cuando no hay señales de vida.

// Sin QR nuevo ni avance de carga en este tiempo: WhatsApp dejó de renovar el QR
// (pide "clic para recargar") o la página se trabó.
const INACTIVIDAD_MAX_MS = 2 * 60 * 1000;
// initialize() colgada (p. ej. esperando un socket que nunca abre).
const INICIALIZACION_MAX_MS = 5 * 60 * 1000;

/**
 * @returns {'nada' | 'reiniciar' | 'forzar'}
 *   'reiniciar': cliente sin señales de vida, abrir uno nuevo.
 *   'forzar': initialize() colgada, matar Chrome y abrir uno nuevo.
 */
function decidirWatchdog({ ahora, conectado, inicializando, ultimoIntento, ultimaActividad }) {
  if (conectado) return 'nada';
  const inactivo = ahora - Math.max(ultimoIntento, ultimaActividad || 0);
  if (inicializando) return inactivo > INICIALIZACION_MAX_MS ? 'forzar' : 'nada';
  return inactivo > INACTIVIDAD_MAX_MS ? 'reiniciar' : 'nada';
}

module.exports = { decidirWatchdog, INACTIVIDAD_MAX_MS, INICIALIZACION_MAX_MS };
