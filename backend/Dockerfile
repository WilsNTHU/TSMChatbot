FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:24-slim

WORKDIR /app

RUN groupadd -r tsmchat && useradd -r -g tsmchat tsmchat

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN chown -R tsmchat:tsmchat /app

USER tsmchat

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
