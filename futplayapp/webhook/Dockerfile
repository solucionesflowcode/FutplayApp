FROM node:20-slim

WORKDIR /app

# Fuentes para que WhatsApp Web renderice el UI y emojis en Chrome headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

# Descarga Chrome for Testing y sus dependencias del sistema automáticamente
RUN npx puppeteer browsers install chrome --install-deps

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
