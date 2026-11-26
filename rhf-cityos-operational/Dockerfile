FROM node:22-bookworm-slim AS frontend
WORKDIR /src/web
COPY web/package.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY api/ ./
# RHF-H4-FIX6: Agentic engine readable by nonroot runtime
COPY api/avos-engine/src/ ./avos-engine/src/
RUN chmod a+rx /app/avos-engine && chmod -R a+rX /app/avos-engine/src
COPY --from=frontend /src/web/dist ./public
USER node
EXPOSE 3210
CMD ["node","server.mjs"]
