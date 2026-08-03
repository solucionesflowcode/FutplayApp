# Despliegue del Bot de WhatsApp (webhook) — Oracle Cloud Free Tier

## Resumen

Bot de WhatsApp del proyecto FutPlay basado en `whatsapp-web.js` + `puppeteer`. Corre como un servicio Express dentro de Docker en una instancia ARM Ampere de Oracle Cloud Free Tier.

## Estructura del módulo `webhook/`

```
webhook/
├── server.js            # Express + bot (portable Linux/Windows)
├── data.js              # Persistencia de datos
├── handlers.js          # Manejadores de conversación
├── package.json         # deps: whatsapp-web.js, express, dotenv, node-cron, qrcode-terminal, @supabase/supabase-js
├── Dockerfile           # node:20-slim + Chrome for Testing (puppeteer)
├── docker-compose.yml   # volumenes, env, scheduler, recordatorios
├── .dockerignore        # node_modules, session, cache, .env
└── .env                 # NO se sube al repo (creado en el servidor)
```

## Requisitos de la instancia

- **Shape**: `VM.Standard.A1.Flex` (ARM Ampere), 4 OCPU / 24 GB RAM — dentro del Always Free tier.
- **Imagen**: Ubuntu 22.04 (o compatible).
- **Ingress**: abrir puerto TCP `3001` en el Security List de la VCN (para el webhook de Supabase).
- **Recursos estimados**: Chrome headless usa ~1 GB RAM; suficiente para la instancia.

## Pasos de despliegue

1. **Crear la instancia** en Oracle Cloud Console (Compute → Instances) con el shape ARM Ampere y la llave SSH.
2. **Conectar por SSH**:
   ```bash
   ssh -i ~/.ssh/llave.pem ubuntu@<IP_PUBLICA>
   ```
3. **Instalar Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # cerrar sesion y volver a entrar (o: sudo su - $USER)
   ```
4. **Clonar el repo**:
   ```bash
   git clone <URL_DEL_REPO>
   cd FutplayApp/futplayapp/webhook
   ```
5. **Crear `.env`** con las variables (ver sección de variables):
   ```bash
   nano .env
   ```
6. **Levantar el contenedor**:
   ```bash
   docker compose up -d --build
   ```
7. **Escanear el QR** (una sola vez para vincular el WhatsApp):
   ```bash
   docker compose logs -f bot
   ```
   En los logs aparece un QR en ASCII. Escanear con WhatsApp → Dispositivos vinculados.
8. **Verificar**:
   ```bash
   docker compose ps
   docker compose logs --tail=50 bot
   ```

## Variables de entorno (`webhook/.env`)

| Variable | Valor de ejemplo | Descripción |
|----------|------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret...` | Service Role Key (NO exponer) |
| `SCHEDULER_ENABLED` | `true` | Habilita el scheduler de recordatorios (via docker-compose) |
| `TZ` | `America/Santiago` | Zona horaria |
| `RECORDATORIOS_PATH` | `/data/recordatorios.json` | Ruta del archivo de recordatorios (volumen `bot-data`) |

## Operación

- **Logs**: `docker compose logs -f bot`
- **Reiniciar**: `docker compose restart`
- **Actualizar código**: `git pull` + `docker compose up -d --build`
- **Volúmenes** (persisten la sesión de WhatsApp y los datos):
  - `bot-session` → sesión de WhatsApp (no re-escanear QR)
  - `bot-cache` → caché de `.wwebjs_cache`
  - `bot-data` → recordatorios en `/data/recordatorios.json`
- **Sesión caída / re-vincular**: borrar el volumen de sesión y re-escanear QR:
  ```bash
  docker compose down
  docker volume rm futplayapp_bot-session
  docker compose up -d --build
  ```

## Notas

- El QR solo se muestra si no hay una sesión válida guardada. Si se pierde el celular o se desvincula el dispositivo, hay que borrar el volumen `bot-session` y re-escanear.
- Docker no está instalado en el entorno local de desarrollo; el build solo se prueba en el servidor.
- `server.js` usa `PUPPETEER_EXECUTABLE_PATH` si está definido; en Windows usa el Chrome del sistema y en Linux auto-detecta Chrome for Testing.
- En Supabase se debe configurar el webhook (endpoint `http://<IP>:3001/webhook`) para que el bot reciba los eventos.
