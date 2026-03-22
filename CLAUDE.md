# veriel-ops

Sistema centralizado de DevOps para gestionar el ciclo de vida de despliegue de todos los proyectos web de veriel.dev.

## Stack

- **Runtime**: Node.js + TypeScript (estricto)
- **Framework dashboard**: Astro
- **Estilos**: Tailwind CSS
- **Package manager**: pnpm
- **CI/CD**: GitHub Actions (workflows reutilizables)
- **Hosting**: Cloudflare Pages
- **Artefactos**: Cloudflare R2
- **DNS**: Cloudflare DNS API
- **Tests**: Vitest

## Estructura del proyecto

```
veriel-ops/
├── .claude/
│   ├── agents/          # Agentes especializados de Claude Code
│   └── skills/          # Skills invocables con /comando
├── dashboard/           # App Astro — panel central de control
├── workflows/           # GitHub Actions reutilizables
├── scripts/             # Scripts de automatización (CLI)
├── packages/
│   └── shared/          # Tipos, utilidades y config compartida
├── docs/                # Documentación del sistema
│   └── spec.md          # Especificación completa
└── package.json
```

## Convenciones

- Código fuente siempre en inglés (variables, funciones, comentarios)
- Documentación en español
- TypeScript obligatorio, evitar `any` y `unknown`
- Preferir inferencia de tipos cuando sea posible
- Tailwind CSS como única solución de estilos
- Importaciones explícitas de tabler-icons, nunca barrels
- ESM y sintaxis moderna

## Entornos

| Entorno | Branch | Subdominio patrón |
|---------|--------|-------------------|
| DES | `develop` | `dev.<proyecto>.veriel.dev` |
| PRE | `release/*` | `pre.<proyecto>.veriel.dev` |
| PRO | `main` | `<proyecto>.veriel.dev` |

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
pnpm dev          # Dashboard en modo desarrollo
pnpm build        # Build del dashboard
pnpm lint         # Lint de todo el proyecto
pnpm test         # Tests de todo el proyecto
```

## Antes de commitear

1. `pnpm lint`
2. `pnpm test`
3. Sin errores de tipos, lint ni tests fallidos
