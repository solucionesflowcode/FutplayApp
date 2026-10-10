# Bot de WhatsApp — despliegue en un PC con Docker Desktop

El bot (whatsapp-web.js + Chrome headless) corre en un contenedor Docker. No
expone puertos: los mensajes llegan por la sesión de WhatsApp Web y el
scheduler corre dentro del contenedor. **Funciona mientras el PC esté encendido
y con internet.**

## Requisitos (una vez)

1. **Docker Desktop** instalado y abierto.
   - Settings → General → activar **"Start Docker Desktop when you sign in to your computer"**, para que arranque con el PC.
2. El repo clonado (`solucionesflowcode/FutplayApp`, rama `deploy-main`).
3. Un teléfono con el **WhatsApp del club**, para vincularlo.

## Primer despliegue

Abre PowerShell en la carpeta `futplayapp/webhook`:

```powershell
# 1. Variables de entorno
Copy-Item .env.example .env
notepad .env        # pegar SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API)

# 2. Construir y levantar
docker compose up -d --build

# 3. Ver los logs y esperar el QR
docker compose logs -f
```

4. **Vincular WhatsApp:** abre `webhook\data\qr.png` (o escanea el QR que aparece en los logs) desde el teléfono del club, en WhatsApp → Dispositivos vinculados → Vincular un dispositivo.
5. En los logs debe aparecer `WhatsApp conectado!`. Desde ese momento el scheduler procesa cada minuto. Sal de los logs con `Ctrl+C`; el bot sigue corriendo.

La sesión queda guardada en el volumen `bot-session`: los reinicios no piden QR de nuevo, salvo que se desvincule el dispositivo desde el teléfono.

## Operación diaria

| Acción | Comando (en `futplayapp/webhook`) |
|---|---|
| Ver si está corriendo | `docker compose ps` |
| Ver logs | `docker compose logs --tail 100 -f` |
| Reiniciar | `docker compose restart` |
| Actualizar a la última versión | `git pull` y luego `docker compose up -d --build` |
| Detener | `docker compose down` (la sesión se conserva) |
| Re-vincular WhatsApp desde cero | `docker compose down` → `docker volume rm webhook_bot-session` → `docker compose up -d` → escanear el QR |

`webhook/data/` contiene `qr.png` y `recordatorios.json` (los recordatorios ya enviados). No se sube al repo.

## Qué hace el bot

- **Recordatorio 24 h antes** a cada reserva `sin_confirmar` de un alumno con teléfono → `pendiente`. Si el alumno tiene otro recordatorio sin responder de una clase anterior, espera a que responda (las respuestas aplican a su clase más próxima).
- **Respuestas:** `1` / `sí` / `confirmo` → `confirmado_whatsapp`. `2` / `no` / `cancelo` → cancela con ≥ 3 h, devolviendo el token (los partidos nunca devuelven token); con < 3 h queda sin reembolso.
- **1 h antes de la clase:** quien recibió el recordatorio y no respondió (`pendiente`) queda `cancelado_sin_reembolso`. Las reservas nunca avisadas (`sin_confirmar`) **no** se cancelan.
- **1 h después de la clase:** `confirmado_whatsapp` → `no_asistio` (el profesor lo corrige a `asistio`).

## Problemas comunes

- **`Falta SUPABASE_SERVICE_ROLE_KEY`:** el bot no arranca sin la clave de servicio. Revisa `.env`.
- **`[Scheduler] WhatsApp no conectado`:** falta escanear el QR o se desvinculó la sesión.
- **Chrome "already running" o perfil bloqueado:** el bot mata el Chrome huérfano solo. Si persiste, ejecuta `docker compose restart`.
- **El PC se suspendió:** al volver, Docker reanuda el contenedor y el watchdog reconecta WhatsApp en ~1–3 min.
