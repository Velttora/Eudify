# Eudify

**Eudify es un producto de [Velttora LLC](https://velttora.com).**

Eudify es un marketplace de educación y cuidado para la primera infancia y la edad escolar: conecta familias con educadores, niñeras y cuidadores verificados, y acompaña a cada niño con el **Plan Anual Eudify** — un currículo de 26 módulos quincenales organizado en los **7 Pilares del Desarrollo Integral**.

> Nota de naming: el producto se llama Eudify, pero los paquetes internos conservan los scopes históricos `@trofo/*` (apps) y `@repo/*` (packages compartidos). La app de Fly sigue siendo `trofo-school-api`. Es deuda técnica conocida, no un producto distinto.

## Arquitectura del monorepo

Turborepo + pnpm workspaces (`apps/*`, `packages/*`).

```text
.
├── apps/
│   ├── web/      # Next.js 15 (App Router) — producto principal
│   ├── api/      # NestJS 10 + Prisma + PostgreSQL
│   └── mobile/   # Expo (React Native) — prueba de concepto
├── packages/
│   ├── database/            # @repo/database — schema Prisma + cliente
│   ├── educational-planner/ # @repo/educational-planner — currículo Plan Anual (sin deps)
│   ├── currency/            # @repo/currency — moneda de plataforma (COP)
│   └── typescript-config/   # @repo/typescript-config — tsconfig base
├── docs/
├── docker-compose.yml       # PostgreSQL local (host :5433)
├── fly.toml                 # despliegue de la API
└── turbo.json
```

## Stack

| Capa | Tecnologías |
|------|-------------|
| Web | Next.js 15.2.8 (App Router, Turbopack), React 19, Tailwind CSS v4, TanStack Query, Zustand, Zod, FullCalendar, dnd-kit |
| API | NestJS 10, Prisma 6, PostgreSQL 16, Socket.IO (adaptador Redis opcional), Swagger |
| Mobile | Expo ~54, Expo Router, React Native 0.81 |
| Auth | Clerk (`@clerk/nextjs`, `@clerk/backend`, `@clerk/clerk-expo`) |
| Pagos | Stripe: Subscriptions (planes de familia) + Connect Express (liquidación a educadores) |
| Infra | Fly.io (API), Vercel (web), Turborepo, pnpm |
| Correo / push | Nodemailer (SMTP), Expo Push |

## Inicio rápido

**Requisitos:** Node >= 18, pnpm 8.15.6, Docker (para PostgreSQL local).

```bash
pnpm install                                              # instala todo el workspace
cp apps/api/.env.local.example  apps/api/.env.local       # y completa las claves
cp apps/web/.env.local.example  apps/web/.env.local
cp packages/database/.env.example packages/database/.env  # DATABASE_URL para Prisma CLI
pnpm db:up                                                # PostgreSQL en localhost:5433
pnpm --filter @repo/database exec prisma migrate deploy
```

Levantar el entorno:

```bash
pnpm dev:api    # NestJS  → http://localhost:4000/v1  (docs en /v1/docs)
pnpm dev:web    # Next.js → http://localhost:3000
pnpm dev:mobile # Expo
pnpm dev        # todo junto (Turbo)
```

Datos de demo (**destructivo**: borra usuarios, perfiles, citas y tickets):

```bash
pnpm --filter @repo/database db:seed
```

Otros scripts de raíz: `pnpm build`, `pnpm lint`, `pnpm format`. `pnpm test` está definido en `turbo.json` pero hoy es un no-op: ningún paquete declara `test`.

## Variables de entorno

Plantillas: `.env.example` (raíz), `apps/api/.env.example`, `apps/web/.env.local.example`, `apps/web/.env.vercel.example`, `env.fly.example`.

**Web** — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `CLERK_SECRET_KEY`.

**API** — `DATABASE_URL`, `CLERK_SECRET_KEY`, `WEB_ORIGIN` (allowlist CORS separada por comas), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_FAMILIA`, `STRIPE_PRICE_FAMILIA_PLUS`, `STRIPE_STATEMENT_DESCRIPTOR_SUFFIX` (default `EUDIFY`), `PLATFORM_FEE_BPS` (default 500), `SUPPORT_ADMIN_CLERK_IDS`, SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `SUPPORT_NOTIFY_EMAIL`), `REDIS_URL` y `CHAT_*` para chat/rate-limit, `EXPO_PUSH_ACCESS_TOKEN`.

**Mobile** — `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

En local la API carga por capas `apps/api/.env.development` → `.env` → `.env.local` (ver `apps/api/src/load-dev-env.ts`). En producción solo usa `fly secrets`.

## API (`apps/api`)

Prefijo global `/v1`. Swagger en `/v1/docs` (OpenAPI JSON en `/v1/docs-json`).

| Área | Rutas principales |
|------|-------------------|
| Salud | `GET /health` *(público)* |
| Descubrimiento | `GET /discover/providers`, `GET /discover/providers/:id` *(público)* |
| Feedback | `POST /feedback` *(público)* |
| Usuarios | `POST /users/sync`, `GET /users/me`, `GET /users/bootstrap`, `POST /users/role` |
| Familias | `GET\|PATCH /consumer-profiles/me`, `POST /me/complete`, CRUD de `/me/children` |
| Educadores | `GET\|PATCH /provider-profiles/me`, `POST /me/complete`, CRUD de `/me/rates` y `/me/offers` |
| Disponibilidad | CRUD de `/availability/me/blocks`, `GET /availability/providers/:id/blocks` |
| Citas | `GET /appointments/me`, `GET /appointments/provider/me`, `POST /appointments`, `PATCH /:id`, `POST /:id/review` |
| Chat | `GET /chat/threads`, mensajes, `POST /chat/threads/:id/read`, registro de dispositivos push |
| Pagos | SetupIntent y métodos de pago del consumidor, estado y onboarding de Stripe Connect |
| Suscripciones | `GET /subscriptions/me`, `POST /subscribe`, `POST /cancel` |
| Planner | `GET /planner/me/progress`, `POST /planner/me/progress/complete` |
| Soporte | catálogo, tickets, mensajes, `resolve`, `escalate` |
| Admin | `/admin/support/*`, `PATCH /admin/providers/:id/certification` |
| Webhooks | `POST /webhooks/stripe` *(público, body raw)* |

**Autenticación:** `ClerkAuthGuard` está registrado como guard global — todo requiere `Authorization: Bearer <Clerk session JWT>` salvo lo marcado con `@Public()`. Los endpoints admin usan `RolesGuard`, que resuelve ADMIN por pertenencia a `SUPPORT_ADMIN_CLERK_IDS`. El WebSocket de chat (`/chat`) valida el token en el handshake.

El gating por plan (`RequiresPlanGuard` / `@RequiresPlan()`) está implementado pero todavía no se aplica a ningún endpoint; hoy los límites por plan viven en la web.

## Web (`apps/web`)

Flujo tras login: **Clerk** → `/mi-espacio` (`POST /v1/users/sync`) → `/role` si falta rol → `/onboarding/{consumer,provider}` → dashboard.

- **Público:** `/`, `/explorar`, `/educadores/[providerProfileId]`, `/terminos`, `/privacidad`.
- **Familias:** `/dashboard/consumer` (secciones por `?seccion=resumen|familia|citas|pagos`), `/dashboard/consumer/chat`, `/pagos`, `/soporte/*`.
- **Educadores:** `/dashboard/provider` con hub propio — agenda, vitrina, estudiantes, ofertas, pagos, soporte, más insights y recursos aún en placeholder.
- **Planner:** `/planner` (Plan Anual Eudify).
- **Admin:** `/admin/support` (cola de tickets y métricas; autoriza la API).

`src/middleware.ts` protege todo con `auth.protect()` excepto `/`, `/explorar`, `/educadores`, `/sign-in` y `/sign-up`. Features en `src/features/*` (screaming architecture: `api/`, `components/`, `hooks/`, `lib/`); UI y utilidades compartidas en `src/shared/*`. No hay route handlers de Next: todos los datos vienen de la API.

## Plan Anual (`packages/educational-planner`)

Paquete sin dependencias (importable desde Nest, Next y Expo) con el currículo Eudify: 26 módulos quincenales en 4 bloques (Semilla del Hogar, Cuerpo & Ambiente, Autonomía Saludable, Comunidad & Cultura), los 7 pilares con su paleta accesible, las etapas por edad (0–3, 4–7, 8–12, 13–18) y el motor `getDevelopmentStageByAge()`. El contenido es fijo y curado, no generado por IA. El progreso por niño se persiste vía la API en `ChildCurriculumProgress` / `ChildModuleCompletion`.

## Datos (`packages/database`)

Schema en `packages/database/prisma/schema.prisma`: 34 modelos (identidad y perfiles, oferta del educador, reservas, pagos y Stripe, planner, chat y notificaciones, soporte) y 19 migraciones.

```bash
pnpm --filter @repo/database db:migrate   # migración en desarrollo
pnpm --filter @repo/database db:studio    # Prisma Studio
```

## Pagos

Stripe Connect Express: la familia guarda su método de pago con un SetupIntent, el educador completa el onboarding de Connect y, al aceptarse la cita, se cobra un PaymentIntent `off_session` con `application_fee_amount` para la plataforma (`PLATFORM_FEE_BPS`, 5% por defecto). Los webhooks son idempotentes vía la tabla `StripeWebhookEvent`. Detalle en [`docs/payments-architecture.md`](docs/payments-architecture.md).

Las suscripciones de familia mapean precios de Stripe a los planes `SEMILLA`, `FAMILIA` y `FAMILIA_PLUS`.

## Despliegue

**API → Fly.io** (`fly.toml`, app `trofo-school-api`, región `iad`, puerto 8080). Se construye desde `apps/api/Dockerfile` con contexto en la raíz del monorepo; el release command corre `prisma migrate deploy` y el health check apunta a `GET /v1/health`.

```bash
fly deploy
fly secrets set -a trofo-school-api DATABASE_URL="postgresql://..." CLERK_SECRET_KEY="sk_..."
```

**Web → Vercel**, con las variables del dashboard (ver `apps/web/.env.vercel.example`). Dominio de producción: `eudify.co`.

## Estado actual

- **Web:** superficie principal del producto y la parte más completa.
- **API:** 20 módulos en producción; sin suite de tests todavía.
- **Mobile:** prueba de concepto — solo home y chat, sin auth UI, onboarding, descubrimiento, reservas ni pagos.
- `packages/eslint-config` y `packages/types` están vacíos (placeholders).

---

© Velttora LLC. Eudify es un producto de Velttora LLC. Todos los derechos reservados.
