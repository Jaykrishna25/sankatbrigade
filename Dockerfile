# SankatBrigade — production image.
#
# Stage 1 builds the static site. Stage 2 serves it with the zero-dependency
# Node server, which also exposes /api/assistant when an AI key is present in
# the environment. With no AI variables set, the container still serves the
# whole app and the assistant runs in deterministic mode.
#
#   docker build -t sankatbrigade .
#   docker run -p 8787:8787 sankatbrigade
#   docker run -p 8787:8787 -e AI_PROVIDER=gemini -e AI_API_KEY=... sankatbrigade
#
# The key is passed at run time and never baked into the image.

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- run ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

# Only what is needed to serve: the build output and the server.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

# Run as the image's non-root user.
USER node

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/assistant').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
