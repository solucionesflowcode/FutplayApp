# Despliegue del Bot de WhatsApp (webhook) — Oracle / AWS / Google Cloud

## Resumen

Bot de WhatsApp del proyecto FutPlay basado en `whatsapp-web.js` + `puppeteer`. Corre como un servicio Express dentro de Docker en una instancia de la nube (Oracle Cloud Always Free, AWS EC2 Free Tier o Google Cloud Always Free).

## ¿Qué opción elegir?

| Opción | Gratis | Recursos | Requiere | Recomendación |
|---|---|---|---|---|
| **Oracle Cloud** (Opción A) | Por siempre | 4 CPU / 24 GB RAM | Crear cuenta Oracle (a veces rechaza) | ⭐ Mejor si logras la cuenta |
| **Google Cloud e2-micro** (Opción C) | Por siempre | 2 vCPU / 1 GB RAM | Tarjeta + swap | ⭐ Mejor si Oracle te falla |
| **AWS EC2 t3.micro** (Opción B) | Solo 12 meses | 1 vCPU / 1 GB RAM | Tarjeta + swap | Solo temporal / prueba |
| **PC/Raspberry en casa + Cloudflare Tunnel** (Opción D) | Por siempre | Todo el hardware que le pongas | Un equipo siempre encendido | ⭐ Mejor si quieres cero nubes y buena RAM |

> **AWS no es gratis por siempre para máquinas**: su "Always Free" no incluye instancias EC2; la `t2.micro`/`t3.micro` solo es gratis 12 meses.

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
   docker compose logs -f whatsapp-bot
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

- **Logs**: `docker compose logs -f whatsapp-bot`
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

---

# Opción B: AWS EC2 Free Tier

## Diferencias clave vs Oracle

| | Oracle Always Free | AWS Free Tier |
|---|---|---|
| Vigencia | Indefinida | **12 meses** (750 horas/mes ≈ 1 instancia encendida todo el mes) |
| Instancia | 4 OCPU / 24 GB RAM (ARM) | **t2.micro / t3.micro, 1 vCPU / 1 GB RAM** (x86) |
| Costo | $0 | $0 mientras esté en el tier; **cobran si pasas el límite** |
| Dato | Requiere tarjeta | Requiere tarjeta |

⚠️ **"Free tier por siempre" ≠ EC2**: AWS tiene productos "Always Free" (Lambda, DynamoDB, S3, etc.), pero **ninguna máquina virtual (EC2) es gratis por siempre**. La instancia `t2.micro`/`t3.micro` solo entra en el tier de 12 meses. Después cobra ~$8-9/mes. Si quieres una máquina gratis **indefinida**, usa Oracle (Opción A) o Google Cloud (Opción C).

⚠️ **El punto crítico es la RAM**: 1 GB es justo para `whatsapp-web.js` + Chrome headless + Node dentro de Docker. Si Chrome no entra, el kernel mata el proceso (OOM). Por eso el paso 7 (swap) es obligatorio.

## Pasos de despliegue

1. **Crear la cuenta AWS** (aws.amazon.com → "Create an AWS account"). Pide tarjeta para verificar identidad, pero el tier free no cobra mientras no excedas límites.

2. **Entrar a EC2** (console.aws.amazon.com/ec2) → seleccionar la región más cercana a Chile (ej. `sa-east-1` São Paulo).

3. **Lanzar instancia** (EC2 → Instances → Launch instance):
   - **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD, 64-bit (x86). La imagen tiene "Free tier eligible".
   - **Instance type**: `t3.micro` (o `t2.micro`). Confirmar que diga "Free tier eligible".
   - **Key pair**: "Create new key pair" → descargar el `.pem` (guardarlo en `~/.ssh/`). **No perderlo**; sin él no puedes entrar por SSH.
   - **Network settings**: en el Security Group abrir:
     - SSH `22` (solo desde tu IP: "My IP").
     - Custom TCP `3001` desde `0.0.0.0/0` (para el webhook de Supabase).
   - **Storage**: dejar 20 GB (el tier free incluye 30 GB de EBS).
   - **Launch instance**.

4. **Elastic IP (recomendado)**: la IP pública cambia cada vez que la instancia se reinicia, y el webhook en Supabase apunta a una IP fija. Para fijarla:
   - EC2 → **Elastic IPs** → **Allocate Elastic IP address** → **Associate** a la instancia.
   - Es gratis mientras la instancia esté **encendida**. Copiar esa IP.

5. **Conectar por SSH** (desde PowerShell):
   ```powershell
   ssh -i "C:\Users\tu-usuario\.ssh\llave.pem" ubuntu@<IP_ELASTICA>
   ```
   (Primera conexión: responder `yes` al fingerprint. En Linux/macOS: `chmod 400 llave.pem` antes.)

6. **Instalar Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   sudo su - $USER   # para tomar el grupo docker
   ```

7. **Agregar swap (OBLIGATORIO con 1 GB de RAM)**:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   sudo sysctl vm.swappiness=30
   echo 'vm.swappiness=30' | sudo tee -a /etc/sysctl.conf
   ```

8. **Clonar el repo y configurar**:
   ```bash
   git clone <URL_DEL_REPO>
   cd FutplayApp/futplayapp/webhook
   nano .env     # mismas variables que la opción Oracle
   ```

9. **Levantar el bot**:
   ```bash
   docker compose up -d --build
   docker compose logs -f whatsapp-bot   # escanear el QR la primera vez
   ```

10. **Verificar**:
    ```bash
    docker compose ps
    docker compose logs --tail=50 bot
    curl http://localhost:3001/health   # o la ruta de health si existe
    ```

11. **Configurar Supabase**: apuntar el webhook a `http://<IP_ELASTICA>:3001/webhook`.

## Notas AWS

- **En un mes te quedan sin tier**: al cumplir 12 meses o 750 horas/mes, AWS cobra la instancia (~$8-9/mes t3.micro si no la apagas). Poner una alarma de costo o apagar la instancia si ya no se usa.
- **Si la RAM no alcanza aún con swap**, forzar Chrome con menos recursos editando `server.js` (flags `--single-process` o `--disable-dev-shm-usage`). WhatsApp Web suele requerir ~400-500 MB de Chrome; con swap de 2 GB debería alcanzar.
- **Persistence**: los volúmenes Docker viven en el disco EBS de la instancia; sobreviven reinicios, pero **no** si terminas la instancia. Para respaldo, sacar una snapshot del EBS.
- **HTTPS**: si Supabase exige webhook con HTTPS (no HTTP), poner un proxy delante (nginx + Let's Encrypt, o un túnel tipo Cloudflare Tunnel) apuntando al puerto 3001.

---

# Opción C: Google Cloud Always Free (gratis por siempre)

La mejor alternativa a Oracle si no lograste crear la cuenta: una **`e2-micro` gratis indefinidamente** (solo en las regiones us-west1, us-central1 o us-east1).

| | Oracle | Google Cloud (e2-micro) |
|---|---|---|
| Vigencia | Indefinida | **Indefinida (Always Free)** |
| Recursos | 4 OCPU / 24 GB RAM (ARM) | 2 vCPU compartidos / **1 GB RAM** (x86) |
| Costo | $0 | $0 mientras uses lo del tier |
| Dato | Requiere tarjeta | Requiere tarjeta (dan $300 de crédito por 90 días) |

## Pasos de despliegue

1. **Crear cuenta** en cloud.google.com → "Start free". Requiere tarjeta pero no cobra dentro del Always Free.
2. **Habilitar Compute Engine** (console.cloud.google.com/compute) — pide activar la API la primera vez.
3. **Crear instancia** (Compute Engine → VM instances → Create instance):
   - **Name**: `futplay-bot`.
   - **Region**: `us-west1` (Oregon), `us-central1` (Iowa) o `us-east1` (South Carolina). ⚠️ **Solo estas 3 son Always Free**.
   - **Machine type**: `e2-micro` (debe decir "Always free eligible"). Serie e2 = x86, compatible con el Dockerfile.
   - **Boot disk**: Ubuntu 22.04 LTS, 20 GB standard.
   - **Firewall**: marcar "Allow HTTP" y "Allow HTTPS" (después abriremos el puerto 3001).
   - **Create**.
4. **IP estática (recomendado)**: la IP externa cambia al reiniciar la VM. Para fijarla:
   - VPC network → **External IP addresses** → **Reserve static address** → asociarla a `futplay-bot`. Es gratis mientras la VM esté encendida.
5. **Conectar por SSH**:
   - Opción fácil: botón **SSH** en la lista de VM instances (abre una terminal web, sin llaves).
   - O desde PowerShell con `gcloud` o tu llave `.pem`.
6. **Instalar Docker** y **agregar swap** (igual que AWS, es obligatorio por el 1 GB de RAM):
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   sudo su - $USER
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   sudo sysctl vm.swappiness=30
   echo 'vm.swappiness=30' | sudo tee -a /etc/sysctl.conf
   ```
7. **Abrir el puerto 3001** en el firewall:
   - VPC network → Firewall → Create firewall rule: **TCP `3001`** desde `0.0.0.0/0`, aplicada a todas las instancias (target: "All instances").
8. **Clonar el repo, configurar `.env` y levantar** (igual que en AWS):
   ```bash
   git clone <URL_DEL_REPO>
   cd FutplayApp/futplayapp/webhook
   nano .env
   docker compose up -d --build
   docker compose logs -f whatsapp-bot   # escanear el QR la primera vez
   ```
9. **Configurar Supabase**: apuntar el webhook a `http://<IP_ESTATICA>:3001/webhook`.

## Notas Google Cloud

- **Mismo límite de RAM que AWS** (1 GB): sin swap, Chrome puede matar el proceso.
- El crédito de $300 dura 90 días y se gasta primero; después de eso sigues gratis mientras la VM sea `e2-micro` en una región Always Free y el disco ≤ 30 GB.
- **Persistence**: la sesión de WhatsApp vive en el disco de la VM; sobrevive reinicios pero **no** si borras la VM. Para respaldo, sacar un snapshot del disco.
- **HTTPS**: si Supabase exige webhook HTTPS, poner nginx + Let's Encrypt o un túnel (Cloudflare Tunnel) hacia el puerto 3001.

---

# Opción D: Equipo en casa (PC/Raspberry) 24/7 (gratis por siempre)

La forma más barata y sin límites: el bot corre en un equipo que ya tengas (PC o Raspberry Pi) las 24 h. **No requiere túnel ni abrir puertos**: el bot se conecta de forma saliente a WhatsApp (sesión `whatsapp-web.js`) y a Supabase; no recibe nada del exterior. Queda **invisible a internet** (cero superficie de ataque).

> Verificado: el `POST /whatsapp-webhook` del bot no es llamado por la app (`src/` solo usa `/webhook` de pagos Flow). El túnel solo haría falta si usaras la API oficial de WhatsApp Cloud, y no es el caso.

## Ventajas

- **$0 por siempre** (sin nube, sin tarjeta, sin vencimientos).
- RAM de sobra (un PC normal con 4+ GB va perfecto; una Raspberry Pi 4 con 4 GB también).
- No depende de la aprobación de ninguna cuenta de cloud.
- Sin exposición: no hay puertos abiertos ni URL pública.

## Requisitos

- Un equipo encendido 24/7 (PC de escritorio, notebook viejo, Raspberry Pi, o el mismo PC de trabajo si está siempre encendido).
- Conexión a internet estable.
- Node.js instalado (si se corre sin Docker) y Chrome (usa el Chrome del sistema en Windows).

## Pasos (Windows — sin Docker, node directo)

1. **Crear `webhook/.env`** (el `server.js` también lee el `.env.local` del proyecto, pero queda autocontenido):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   SCHEDULER_ENABLED=true
   ```

2. **Probar el bot manualmente**:
   ```powershell
   cd FutplayApp/futplayapp/webhook
   npm start
   ```
   Debe aparecer "WhatsApp conectado!" (con la sesión guardada en `webhook/whatsapp-session`). Si sale un QR, escanearlo con el WhatsApp → **Dispositivos vinculados**. Si se corta, `Ctrl+C`.

3. **Instalar NSSM** (https://nssm.cc) y crear el servicio `futplay-bot`:
   ```powershell
   nssm install futplay-bot
   # Path:   C:\Program Files\nodejs\node.exe
   # Args:   server.js
   # Startup directory:  C:\...\FutplayApp\futplayapp\webhook
   nssm set futplay-bot AppExit Default Restart   # se reinicia solo si se cae
   nssm set futplay-bot AppStdout C:\...\futplay-bot.log
   nssm set futplay-bot AppStderr C:\...\futplay-bot.log
   nssm set futplay-bot AppEnvironmentExtra QR_TO_FILE=C:\...\qr.png SCHEDULER_ENABLED=true
   nssm start futplay-bot
   nssm status futplay-bot
   ```
   (`QR_TO_FILE` hace que `server.js` guarde el QR de vinculación como PNG en esa ruta; abrir ese archivo para escanear.)

4. **Auto-login: NO hace falta.** El servicio se instala por defecto bajo la cuenta **LocalSystem**, que arranca al prender la PC sin que nadie se loguee. (Solo si lo cambiases a otra cuenta habría que configurar netplwiz.)

5. **La PC nunca duerme**:
   ```powershell
   powercfg /change standby-timeout-ac 0
   powercfg /change standby-timeout-dc 0
   powercfg /change hibernate-timeout-ac 0
   powercfg /change hibernate-timeout-dc 0
   powercfg /hibernate off      # requiere administrador
   ```
   En notebook, revisar en la BIOS el "deep sleep" (si está activo, el equipo se suspende aunque Windows diga que no).

6. **Verificar**:
   - `Get-Service futplay-bot` → `Running`; y `nssm status futplay-bot`.
   - `Get-Content C:\...\futplay-bot.log -Tail 30` → debe decir "WhatsApp conectado!".
   - El log debe mostrar el ciclo del scheduler cada minuto (`getHorarios24h ... error=none`) → confirma que consulta Supabase bien.
   - Probar un recordatorio: `http://localhost:3001/test-reminder/<claseId>` (solo si hay una clase en la ventana de 24 h y alumnos sin confirmar; **envía un WhatsApp real**).

## Mantenimiento (Windows)

- **Reiniciar el servicio**: `nssm restart futplay-bot`
- **Actualizar código**: `git pull` (o copiar los archivos) → `nssm restart futplay-bot`.
- **Re-vincular WhatsApp** (se perdió el celular o se desvinculó): borrar `webhook/whatsapp-session` → `nssm restart futplay-bot` → el servicio regenera el QR como imagen en la ruta de la variable `QR_TO_FILE` (configurada con `nssm set futplay-bot AppEnvironmentExtra QR_TO_FILE=C:\...\qr.png`) → abrir ese PNG y escanear. El QR expira en ~30-60 s, se regenera solo mientras no se escanee.
- **Logs**: viven en el archivo que configuraste en `AppStdout`/`AppStderr`.

## Pasos (Raspberry Pi / Linux — con Docker)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && sudo su - $USER
git clone <URL_DEL_REPO>
cd FutplayApp/futplayapp/webhook
nano .env          # mismas variables
docker compose up -d --build
docker compose logs -f whatsapp-bot   # escanear el QR la primera vez
```
Para que arranque solo al encender: `sudo systemctl enable docker` y configurar el servicio con `restart: unless-stopped` (ya viene en el compose).

## Notas casa

- Si se corta la luz o el internet, el bot se cae y vuelve solo al restaurarse (NSSM reinicia el proceso; la sesión de WhatsApp se revalida automáticamente).
- Para que el QR no haya que re-escanear, la sesión persiste en `webhook/whatsapp-session` (disco local).
- El bot usa ~400-800 MB de RAM (Chrome headless); en equipos con < 4 GB conviene cerrar otros programas.

## Notas

- El QR solo se muestra si no hay una sesión válida guardada. Si se pierde el celular o se desvincula el dispositivo, hay que borrar la carpeta `whatsapp-session` y re-escanear.
- Docker no está instalado en el entorno local de desarrollo; en Windows se corre directo con `node server.js` (sin Docker).
- `server.js` usa `PUPPETEER_EXECUTABLE_PATH` si está definido; en Windows usa el Chrome del sistema y en Linux auto-detecta Chrome for Testing.
- El endpoint HTTP (`/whatsapp-webhook` en el puerto 3001) es opcional y no lo usa la app actual; se puede dejar sin exponer a internet.
