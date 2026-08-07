// Limpieza del perfil de Chrome de WhatsApp.
// Evita que un Chrome huérfano de una ejecución anterior bloquee el perfil
// ("The browser is already running for ... Use a different `userDataDir`").
// Solo aplica a Windows (dev/service). En Linux/Docker la sesión se guarda y el
// Chrome se cierra con whatsapp.destroy(); no hay perfiles con lock persistente.
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  return /browser is already running/i.test(msg) || /Use a different `userDataDir`/i.test(msg);
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
  if (process.platform !== 'win32') return 0;
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
  ejecutarCmd,
};
