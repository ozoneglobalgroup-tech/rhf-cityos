FROM node:22-bookworm-slim
WORKDIR /worker
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY worker.mjs workflows.mjs ./
USER node
CMD ["node","worker.mjs"]
