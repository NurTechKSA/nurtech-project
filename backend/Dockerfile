# Сборка из корня репозитория: docker build -f backend/Dockerfile .
# (нужен docs-short/backend/openapi/openapi.yaml - источник истины контракта)
FROM node:24-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app/backend
ENV NODE_ENV=production OPENAPI_PATH=/app/openapi.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/package.json ./
COPY backend/migrations ./migrations
COPY docs-short/backend/openapi/openapi.yaml /app/openapi.yaml
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
