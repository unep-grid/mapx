FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

RUN addgroup -S mapx && adduser -S -G mapx mapx

COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js configuration.js service-worker.js ./

RUN chown -R mapx:mapx /app
USER mapx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider --quiet http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "server.js"]
