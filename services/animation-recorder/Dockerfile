# Cloud Run job animation-recorder (see record.mjs). Puppeteer's image: Chrome and its fonts included.
FROM ghcr.io/puppeteer/puppeteer:24.43.1
WORKDIR /home/pptruser/app
COPY package.json record.mjs ./
RUN npm install --omit=dev --no-audit --no-fund
CMD ["node", "record.mjs"]
