# veriel-ops

Sistema centralizado de DevOps para gestionar despliegues, rollbacks y monitorización de los proyectos web de [veriel.dev](https://veriel.dev).

Dashboard web + API REST + app de escritorio (Tauri 2) en un monorepo TypeScript.

## Stack

| Capa | Tecnologia |
|---|---|
| Runtime | Bun + TypeScript estricto |
| API | Hono (servidor persistente sobre Bun) |
| Dashboard | Vite 6 + React 19 + TanStack Query v5 |
| Escritorio | Tauri 2 (Rust + WebKitGTK) |
| Estilos | Tailwind CSS 4 + CSS custom properties (5 temas) |
| DB | Bun SQLite (WAL mode) |
| Linter | Biome 2 |
| Tests | Vitest + Testing Library |
| Infra | Cloudflare Pages + R2 + DNS API + GitHub Actions |

## Estructura

```
dashboard/          React SPA (web + Tauri shell)
server/             API REST + SSE + webhooks
packages/shared/    Tipos y constantes compartidas
```

## Requisitos

- **Bun** >= 1.1 — [bun.sh](https://bun.sh)
- **pnpm** >= 10 — `corepack enable && corepack prepare pnpm@latest --activate`
- **Rust** + **Cargo** (solo para la app Tauri) — [rustup.rs](https://rustup.rs)
- Dependencias de sistema para Tauri/WebKitGTK (solo Linux):
  ```bash
  # Arch / CachyOS
  sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg pango
  # Ubuntu / Debian
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
  ```

## Setup

```bash
# 1. Clonar e instalar dependencias
git clone git@github.com:veriel-cloud/veriel-ops.git
cd veriel-ops
pnpm install

# 2. Configurar variables de entorno
cp .env.example server/.dev.vars
# Editar server/.dev.vars con tus tokens reales

# 3. Arrancar en desarrollo (dashboard :5173 + server :3001)
pnpm dev

# Solo dashboard
pnpm dev:dashboard

# Solo server
pnpm dev:server

# App Tauri (escritorio)
pnpm tauri:dev
```

La base de datos SQLite se crea automaticamente en `server/data/` al arrancar el servidor.

## Comandos

```bash
pnpm dev              # Dashboard + Server en paralelo
pnpm build            # Build de produccion
pnpm lint             # Biome check + fix
pnpm test             # Vitest en todo el monorepo
pnpm typecheck        # tsc --noEmit
pnpm tauri:dev        # App de escritorio en desarrollo
pnpm tauri:build      # Build nativo de escritorio
```

## Entornos

| Entorno | Branch | Dominio |
|---|---|---|
| DES | `develop` | `<proyecto>-des.veriel.dev` |
| PRE | `release/*` | `<proyecto>-pre.veriel.dev` |
| PRO | `main` | `<proyecto>.veriel.dev` |

## Notas

- Los workflows de CI/CD reutilizables viven en [`veriel-cloud/.github`](https://github.com/veriel-cloud/.github)
- En Hyprland (Wayland), Tauri necesita forzar X11: el proyecto ya configura `GDK_BACKEND=x11` en `main.rs`
- Cobertura minima de tests: 80% (obligatoria para PRE y PRO)

## Licencia

MIT
