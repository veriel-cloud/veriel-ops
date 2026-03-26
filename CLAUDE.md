# veriel-ops

Sistema centralizado de DevOps para gestionar el ciclo de vida de despliegue de todos los proyectos web de veriel.dev.

## Stack

- **Runtime**: Bun + TypeScript (estricto). **Nunca Node.js** — usar siempre APIs nativas de Bun
- **Framework dashboard**: Vite + React
- **API**: Hono (framework HTTP) sobre Bun (runtime + servidor)
- **Estilos**: Tailwind CSS
- **Linter/Formatter**: Biome (nunca ESLint ni Prettier)
- **Package manager**: pnpm
- **CI/CD**: GitHub Actions (workflows reutilizables)
- **Hosting dashboard**: Cloudflare Pages
- **Hosting server**: VPS con Bun (proceso persistente)
- **Artefactos**: Cloudflare R2
- **DNS**: Cloudflare DNS API
- **Tests**: Vitest

## Estructura del proyecto

```
veriel-ops/
├── dashboard/           # App Vite + React — frontend del panel
├── server/              # API Hono sobre Bun — servidor persistente
├── .github-org/         # Reusable workflows de la org GitHub
├── docs/                # Documentación del sistema
├── packages/
│   └── shared/          # Tipos, utilidades y config compartida
├── scripts/             # Scripts de automatización (CLI)
└── package.json
```

## Arquitectura del server (`server/`)

El directorio `server/` es una **API Hono sobre Bun**. Es un servidor tradicional con proceso persistente: puede mantener conexiones SSE de larga duración, escribir logs en disco y mantener estado en memoria. Bun actúa como runtime y servidor HTTP, Hono como framework de routing y middlewares.

### Estructura

```
server/src/
├── index.ts             # Entry point — app Hono, CORS, middleware, montaje de rutas
├── env.ts               # Tipos de bindings/env vars del Worker
├── types.ts             # Tipos de dominio (Project, Deploy, Build, etc.)
├── constants.ts         # Constantes de configuración
├── lib/                 # Utilidades internas
│   └── logger.ts        # Logger estructurado
├── middleware/           # Middleware Hono (logger, auth, etc.)
│   └── logger.ts        # Request ID + logging por petición
├── routes/              # Handlers agrupados por recurso
│   ├── projects.ts      # CRUD proyectos + pipeline de setup
│   ├── deploys.ts       # Historial de despliegues
│   ├── actions.ts       # GitHub Actions workflows
│   ├── webhooks.ts      # Receivers de GitHub y Cloudflare
│   ├── system.ts        # Health checks
│   └── events.ts        # Cache de eventos webhook
└── services/            # Clientes de APIs externas
    ├── github.ts        # Octokit — repos, workflows, webhooks
    ├── cloudflare.ts    # Pages, DNS, custom domains
    ├── r2.ts            # Artefactos de build en R2
    ├── data.ts          # Agregación y transformación de datos
    ├── pipeline.ts      # Pipeline de setup de proyectos
    ├── sse.ts           # Ejecución con Server-Sent Events
    └── webhook-cache.ts # Cache en memoria de eventos webhook
```

### Reglas del server

- **Runtime**: Bun (desarrollo y producción)
- **Nunca usar `node:*`** — usar APIs nativas de Bun (`Bun.file()`, `Bun.Glob`, `Bun.spawnSync`, etc.)
- **Servidor persistente** — puede mantener estado en memoria, SSE de larga duración y logs en disco
- **Servicios como factories** — cada servicio es una función que recibe env y retorna un cliente
- **Inyección via middleware** — los servicios se inyectan en el contexto de Hono
- **Rutas por recurso** — cada archivo en `routes/` agrupa endpoints de un mismo dominio
- **Tipos de dominio en `types.ts`** — no dispersar tipos por servicios o rutas

## Convenciones

- Código fuente siempre en inglés (variables, funciones, comentarios)
- Documentación en español
- TypeScript obligatorio, evitar `any` y `unknown`
- Preferir inferencia de tipos cuando sea posible
- Tailwind CSS como única solución de estilos
- Importaciones explícitas de tabler-icons, nunca barrels
- ESM y sintaxis moderna
- Biome para lint y formato (nunca ESLint ni Prettier)
- En `server/`: solo APIs nativas de Bun, nunca módulos `node:*`

## Entornos

| Entorno | Branch      | Subdominio patrón           |
| ------- | ----------- | --------------------------- |
| DES     | `develop`   | `<proyecto>-des.veriel.dev` |
| PRE     | `release/*` | `<proyecto>-pre.veriel.dev` |
| PRO     | `main`      | `<proyecto>.veriel.dev`     |

## Reglas de despliegue

- **DES**: deploy automático en cada push a `develop`
- **PRE**: deploy en creación de branch `release/*`. Requiere cobertura >= 80%
- **PRO**: deploy en merge de release a `main`. Requiere cobertura >= 80%
- Cada build se almacena en R2 para rollback
- Los registros DNS se crean automáticamente al registrar un proyecto

## Cobertura de tests

- Umbral mínimo global: **80%**
- Se ejecuta con Vitest + `--coverage`
- Gate obligatorio para PRE y PRO: si no supera el 80%, se bloquea el deploy
- El reporte se adjunta como comment en el PR

## Workflows reutilizables

Los workflows viven en el repo `.github` de la organización y se invocan desde cada proyecto con `uses:`. No se duplican workflows en los repos individuales.

## Comandos

```bash
pnpm dev              # Levanta dashboard + server en paralelo
pnpm dev:dashboard    # Solo frontend (Vite :5173)
pnpm dev:server       # Solo API (Hono :3001)
pnpm build            # Build de ambas apps
pnpm lint             # Lint con Biome (todo el proyecto)
pnpm lint:fix         # Lint + autofix con Biome
pnpm test             # Tests de todo el proyecto
```

## Antes de commitear

1. `pnpm lint`
2. `pnpm test`
3. Sin errores de tipos, lint ni tests fallidos
