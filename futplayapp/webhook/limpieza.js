// Limpieza del perfil de Chrome de WhatsApp.
// Evita que un Chrome huérfano de una ejecución anterior bloquee el perfil
// ("The browser is already running for ... Use a different `userDataDir`").
// - Windows (dev): mata el Chrome que quedó vivo con el perfil.
// - Linux/Docker: el perfil vive en un volumen. Si el PC se apagó sin cerrar
//   Chrome, queda el candado SingletonLock ("<host>-<pid>") del contenedor
//   anterior y Chrome no arranca: "The profile appears to be in use by another
//   Chromium process ... on another computer". Se borra el candado huérfano.
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ARCHIVOS_SINGLETON = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

function pidVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

// Borra los candados de Chrome si son de otro host (otro contenedor) o de un
// proceso que ya no existe. Devuelve true si borró algo. Nunca toca el candado
// de un Chrome vivo en este mismo contenedor.
function limpiarLocksHuerfanos(sessionPath, { hostname = os.hostname(), estaVivo = pidVivo, fsImpl = fs } = {}) {
  const perfil = perfilChrome(sessionPath);
  let destino;
  try {
    destino = fsImpl.readlinkSync(path.join(perfil, 'SingletonLock'));
  } catch {
    return false; // sin candado
  }
  const m = /^(.*)-(\d+)$/.exec(String(destino));
  const huerfano = !m || m[1] !== hostname || !estaVivo(parseInt(m[2], 10));
  if (!huerfano) return false;

  for (const nombre of ARCHIVOS_SINGLETON) {
    try {
      fsImpl.unlinkSync(path.join(perfil, nombre));
    } catch {
      // ya no estaba
    }
  }
  console.log(`[Limpieza] Candado de Chrome huérfano eliminado (${destino}).`);
  return true;
}

function ejecutarCmd(comando, args) {
  return new Promise((resolve) => {
    execFile(comando, args, { timeout: 10000, windowsHide: true }, (err, stdout, stderr) => {
      resolve(String(stdout || '') + String(stderr || ''));
    });
  });
}

function perfilChrome(sessionPath) {
  return path.join(sessionPath, 'session');
}

// Chrome guarda el PID del proceso principal en <perfil>/SingletonLock.
function leerPidSingletonLock(sessionPath) {
  const lockFile = path.join(perfilChrome(sessionPath), 'SingletonLock');
  try {
    const texto = fs.readFileSync(lockFile, 'utf8');
    const m = /(\d+)/.exec(texto);
    return m ? parseInt(m[1], 10) : null;
  } catch {
    return null;
  }
}

function esErrorPerfilOcupado(err) {
  const msg = String((err && err.message) || '');
  return /browser is already running/i.test(msg)
    || /Use a different `userDataDir`/i.test(msg)
    || /profile appears to be in use/i.test(msg);
}

async function pidsChromeConPerfil(sessionPath, ejecutar = ejecutarCmd) {
  const perfil = perfilChrome(sessionPath);
  const salida = await ejecutar('wmic', ['process', 'where', 'name="chrome.exe"', 'get', 'processid,commandline']);
  const pids = new Set();
  // Formato típico: "chrome.exe,<pid>,<commandline>"
  const pidRe = /chrome\.exe,\s*(\d+)/i;
  for (const linea of salida.split(/\r?\n/)) {
    if (linea.includes('chrome.exe') && linea.includes(perfil)) {
      const m = pidRe.exec(linea);
      if (m) pids.add(parseInt(m[1], 10));
    }
  }
  return [...pids];
}

async function matarChromeStale(sessionPath, ejecutar = ejecutarCmd) {
  if (process.platform !== 'win32') {
    limpiarLocksHuerfanos(sessionPath);
    return 0;
  }
  const pids = new Set();
  const pidLock = leerPidSingletonLock(sessionPath);
  if (pidLock) pids.add(pidLock);
  for (const pid of await pidsChromeConPerfil(sessionPath, ejecutar)) pids.add(pid);
  for (const pid of pids) {
    const salida = await ejecutar('taskkill', ['/PID', String(pid), '/T', '/F']);
    console.log(`[Limpieza] Chrome huérfano del bot terminado (PID ${pid}). ${salida.trim()}`);
  }
  return pids.size;
}

module.exports = {
  perfilChrome,
  leerPidSingletonLock,
  esErrorPerfilOcupado,
  pidsChromeConPerfil,
  matarChromeStale,
  limpiarLocksHuerfanos,
  ejecutarCmd,
};
