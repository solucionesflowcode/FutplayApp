import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  esErrorPerfilOcupado,
  leerPidSingletonLock,
  pidsChromeConPerfil,
  matarChromeStale,
} from "../../../webhook/limpieza";

function tempSesion() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fp-sesion-"));
}

// ─── esErrorPerfilOcupado ────────────────────────────────────────────────

describe("esErrorPerfilOcupado", () => {
  it("BOT-LOCK-001: detecta 'browser is already running'", () => {
    const err = new Error(
      "The browser is already running for C:\\x\\webhook\\whatsapp-session\\session. Use a different `userDataDir` or stop the running browser first."
    );
    expect(esErrorPerfilOcupado(err)).toBe(true);
  });

  it("BOT-LOCK-002: detecta el mensaje sin el prefijo 'The browser'", () => {
    expect(esErrorPerfilOcupado(new Error("Browser is already running"))).toBe(true);
  });

  it("BOT-LOCK-003: no confunde errores de 'detached Frame' con lock de perfil", () => {
    expect(esErrorPerfilOcupado(new Error("target closed; detached Frame"))).toBe(false);
  });

  it("BOT-LOCK-004: no confunde otros errores con lock de perfil", () => {
    expect(esErrorPerfilOcupado(new Error("Page crashed"))).toBe(false);
    expect(esErrorPerfilOcupado(null)).toBe(false);
  });
});

// ─── leerPidSingletonLock ────────────────────────────────────────────────

describe("leerPidSingletonLock", () => {
  it("BOT-LOCK-005: lee el PID del archivo SingletonLock", () => {
    const sesion = tempSesion();
    fs.mkdirSync(path.join(sesion, "session"), { recursive: true });
    fs.writeFileSync(path.join(sesion, "session", "SingletonLock"), "12345\n");
    expect(leerPidSingletonLock(sesion)).toBe(12345);
  });

  it("BOT-LOCK-006: retorna null si el lock no tiene número", () => {
    const sesion = tempSesion();
    fs.mkdirSync(path.join(sesion, "session"), { recursive: true });
    fs.writeFileSync(path.join(sesion, "session", "SingletonLock"), "(no pid)");
    expect(leerPidSingletonLock(sesion)).toBeNull();
  });

  it("BOT-LOCK-007: retorna null si no existe el lock", () => {
    const sesion = tempSesion();
    expect(leerPidSingletonLock(sesion)).toBeNull();
  });
});

// ─── pidsChromeConPerfil ─────────────────────────────────────────────────

describe("pidsChromeConPerfil", () => {
  it("BOT-LOCK-008: filtra solo chrome cuyo commandline contiene el perfil", async () => {
    const sesion = tempSesion();
    const fakeExec = vi.fn().mockResolvedValue(
      [
        "Node,ProcessId,CommandLine",
        'node.exe,9000,"C:\\x\\webhook\\server.js"',
        `chrome.exe,1111,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir=${path.join(sesion, "session")}`,
        `chrome.exe,2222,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir=${path.join(sesion, "session")} --type=renderer`,
        'chrome.exe,3333,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir=C:\\Users\\joaqu\\AppData\\Local\\Google\\Chrome\\User Data',
      ].join("\r\n")
    );
    const pids = await pidsChromeConPerfil(sesion, fakeExec as any);
    expect(pids.sort((a, b) => a - b)).toEqual([1111, 2222]);
  });

  it("BOT-LOCK-009: no toca chrome del usuario normal", async () => {
    const sesion = tempSesion();
    const fakeExec = vi.fn().mockResolvedValue(
      [
        "chrome.exe,3333,\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\" --user-data-dir=C:\\Users\\joaqu\\AppData\\Local\\Google\\Chrome\\User Data",
        "chrome.exe,4444,\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\" --type=renderer --user-data-dir=C:\\Users\\joaqu\\AppData\\Local\\Google\\Chrome\\User Data",
      ].join("\r\n")
    );
    const pids = await pidsChromeConPerfil(sesion, fakeExec as any);
    expect(pids).toEqual([]);
  });
});

// ─── matarChromeStale ────────────────────────────────────────────────────

describe("matarChromeStale", () => {
  it("BOT-LOCK-010: mata el Chrome del lock y el detectado por wmic", async () => {
    const sesion = tempSesion();
    fs.mkdirSync(path.join(sesion, "session"), { recursive: true });
    fs.writeFileSync(path.join(sesion, "session", "SingletonLock"), "12345\n");

    const llamadas: string[][] = [];
    const fakeExec = vi.fn().mockImplementation((comando: string, args: string[]) => {
      llamadas.push([comando, ...args]);
      if (comando === "wmic") {
        return Promise.resolve(
          `chrome.exe,6789,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir=${path.join(sesion, "session")}`
        );
      }
      return Promise.resolve("");
    });

    const matados = await matarChromeStale(sesion, fakeExec as any);
    expect(matados).toBe(2);
    expect(llamadas).toContainEqual(["taskkill", "/PID", "12345", "/T", "/F"]);
    expect(llamadas).toContainEqual(["taskkill", "/PID", "6789", "/T", "/F"]);
  });

  it("BOT-LOCK-011: no intenta matar nada si no hay lock ni chrome con el perfil", async () => {
    const sesion = tempSesion();
    const fakeExec = vi.fn().mockResolvedValue("");
    const matados = await matarChromeStale(sesion, fakeExec as any);
    expect(matados).toBe(0);
    expect(fakeExec).not.toHaveBeenCalledWith("taskkill", expect.anything());
  });
});
