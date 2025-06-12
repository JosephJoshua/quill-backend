# ---- Base ----
FROM node:22-slim AS base
LABEL authors="jsph273"

WORKDIR /usr/src/app
RUN npm install -g pnpm

# ---- Dependencies ----
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild bcrypt
RUN pnpm rebuild uuid

# ---- Build ----
FROM base AS builder
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Release ----
FROM base AS release
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]