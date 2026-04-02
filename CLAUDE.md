# veriel-ops

Sistema centralizado de DevOps para gestionar despliegues de proyectos web de veriel.dev.

## Stack

- **Runtime**: Bun + TypeScript estricto — **nunca Node.js ni módulos `node:*`**
- **Dashboard**: Vite + React | **API**: Hono sobre Bun
- **Linter**: Biome (nunca ESLint ni Prettier)
- **Infra**: Cloudflare Pages (dashboard) + VPS Bun (server) + R2 (artefactos) + DNS API
- **Tests**: Vitest — cobertura mínima 80%

## Server (`server/`)

Servidor persistente Hono/Bun: SSE, estado en memoria, logs en disco.

- **Solo APIs nativas de Bun** (`Bun.file()`, `Bun.Glob`, `Bun.spawnSync`, etc.)
- Servicios como factories que reciben env → se inyectan via middleware Hono
- Rutas por recurso en `routes/`, tipos de dominio centralizados en `types.ts`

## Entornos y deploy

| Entorno | Branch      | Patrón                      | Gate       |
| ------- | ----------- | --------------------------- | ---------- |
| DES     | `develop`   | `<proyecto>-des.veriel.dev` | Ninguno    |
| PRE     | `release/*` | `<proyecto>-pre.veriel.dev` | Cobertura >= 80% |
| PRO     | `main`      | `<proyecto>.veriel.dev`     | Cobertura >= 80% |

- Builds se almacenan en R2 para rollback
- DNS se crea automáticamente al registrar proyecto
- Workflows reutilizables en el repo `.github` de la org (nunca duplicar en repos individuales)

## Comandos

```bash
pnpm dev              # Dashboard + server en paralelo
pnpm dev:dashboard    # Solo frontend (Vite :5173)
pnpm dev:server       # Solo API (Hono :3001)
pnpm build            # Build de ambas apps
pnpm lint             # Lint con Biome
pnpm lint:fix         # Lint + autofix
pnpm test             # Tests de todo el proyecto
```

## Antes de commitear

1. `pnpm lint` — sin errores
2. `pnpm test` — sin fallos
