# Server image. Built from the repository root:
#   docker build -f apps/server/Dockerfile -t pokerall-server .
FROM node:22-bookworm-slim

ENV NODE_ENV=production
RUN corepack enable
WORKDIR /app

COPY . .
# Only the server and the workspace packages it uses, without dev tools.
RUN pnpm install --frozen-lockfile --prod --filter "@pokerall/server..." \
  && rm -rf /root/.cache /root/.local/share/pnpm

WORKDIR /app/apps/server
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/main.ts"]
