# Node.js 22 LTS
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy manifests first so dependency installation can use Docker layer cache.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# Copy only files not excluded by .dockerignore.
COPY --chown=node:node . .

# Run the application as the unprivileged node user.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
