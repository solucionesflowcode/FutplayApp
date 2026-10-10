# Node 22+: @supabase/supabase-js (realtime-js) exige WebSocket nativo y en
# Node 20 el bot se cae al crear el cliente.
FROM node:22-slim

WORKDIR /app

# Fuentes para que WhatsApp Web renderice el UI y emojis en Chrome headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

# Descarga Chrome for Testing y sus dependencias del sistema automáticamente.
# --install-deps usa apt: necesita las listas de paquetes, que el paso de las
# fuentes ya borró, así que se vuelven a bajar y se limpian en la misma capa.
RUN apt-get update \
    && npx puppeteer browsers install chrome --install-deps \
    && rm -rf /var/lib/apt/lists/*

COPY . .


CMD ["node", "server.js"]
