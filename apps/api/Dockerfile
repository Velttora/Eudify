# Build context: monorepo root (fly.toml: dockerfile = "apps/api/Dockerfile")
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/currency/package.json packages/currency/package.json
COPY packages/currency/index.js packages/currency/index.js
COPY packages/currency/src packages/currency/src
COPY packages/database/package.json packages/database/package.json
COPY packages/database/index.js packages/database/index.js
COPY packages/database/prisma packages/database/prisma
COPY packages/educational-planner/package.json packages/educational-planner/package.json
COPY packages/educational-planner/tsconfig.build.json packages/educational-planner/tsconfig.build.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/database/src packages/database/src
COPY packages/educational-planner/src packages/educational-planner/src

RUN pnpm --filter @repo/educational-planner build
RUN pnpm --filter @trofo/api build

FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/currency/package.json packages/currency/package.json
COPY packages/currency/index.js packages/currency/index.js
COPY packages/currency/src packages/currency/src
COPY packages/database/package.json packages/database/package.json
COPY packages/database/index.js packages/database/index.js
COPY packages/database/prisma packages/database/prisma
COPY packages/educational-planner/package.json packages/educational-planner/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/educational-planner/dist packages/educational-planner/dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]
