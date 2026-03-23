# Plan — Migración del dashboard de Astro a React

## Contexto

El dashboard actual en Astro SSR tiene varios problemas:
- UI de baja calidad visual, muy lejos del nivel de Portainer/Vercel/Railway
- Astro no es ideal para una app interactiva con mucho estado (modales, formularios, polling, timelines)
- No hay loading states (spinners/skeletons)
- La creación de proyecto no muestra progreso paso a paso
- Falta la cobertura de tests en el dashboard

Se migra a React para tener un frontend SPA profesional con interactividad completa.

## Arquitectura nueva

```
dashboard/
├── server/                  # Backend API (Hono)
│   ├── index.ts             # Server entry point
│   ├── routes/
│   │   ├── projects.ts      # GET/POST /api/projects
│   │   ├── deploys.ts       # GET /api/projects/:name/deploys
│   │   ├── builds.ts        # GET /api/projects/:name/builds
│   │   ├── actions.ts       # GET /api/actions/:repo/runs
│   │   ├── promote.ts       # POST /api/projects/:name/promote
│   │   ├── rollback.ts      # POST /api/projects/:name/rollback
│   │   ├── webhooks.ts      # POST /api/webhooks/github, cloudflare
│   │   ├── events.ts        # GET /api/events
│   │   └── system.ts        # GET /api/system/status
│   └── services/            # Reutilizados de Astro (adaptados)
│       ├── github.ts
│       ├── cloudflare.ts
│       ├── r2.ts
│       └── webhook-cache.ts
│
├── src/                     # Frontend React SPA
│   ├── main.tsx
│   ├── App.tsx              # Router + Layout
│   ├── layouts/
│   │   └── DashboardLayout.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── NewProject.tsx
│   │   ├── Deploys.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── ui/              # Componentes base reutilizables
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Timeline.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── StatsCard.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── EnvironmentCard.tsx
│   │   ├── EnvironmentBadge.tsx
│   │   ├── CoverageBar.tsx
│   │   ├── DeployTable.tsx
│   │   ├── BuildArtifactRow.tsx
│   │   ├── WorkflowRunRow.tsx
│   │   ├── StatusDot.tsx
│   │   ├── NewProjectTimeline.tsx  # Timeline de creación paso a paso
│   │   └── EventFeed.tsx           # Feed de eventos webhook
│   ├── hooks/
│   │   ├── useProjects.ts
│   │   ├── useProjectDetail.ts
│   │   ├── useDeploys.ts
│   │   ├── useWorkflowRuns.ts
│   │   ├── useEvents.ts
│   │   └── useSystemStatus.ts
│   ├── lib/
│   │   ├── api.ts           # Fetch wrapper para las API routes
│   │   ├── types.ts         # Tipos (reutilizados)
│   │   └── utils.ts         # timeAgo, formatDuration, etc.
│   └── styles/
│       └── global.css
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts       # Solo si Tailwind v3, o CSS con v4
```

## Decisiones técnicas

### Backend: Hono
- Ligero, tipado, compatible con Cloudflare Workers para producción
- Los servicios (github.ts, cloudflare.ts, r2.ts) se adaptan cambiando `import.meta.env` por `process.env`
- Las rutas API se migran casi 1:1 desde las de Astro

### Frontend: React + Vite + React Router
- SPA con client-side routing
- Tailwind CSS v4 para estilos
- Custom hooks para data fetching con loading/error states
- Cada hook devuelve `{ data, loading, error }` → los componentes muestran Skeleton mientras carga

### Loading states
- **Skeleton** para cards, tablas y stats al cargar la página
- **Spinner** para acciones (deploy, rollback, promote)
- **Timeline** para creación de proyecto (muestra cada paso en tiempo real)

### Creación de proyecto con Timeline
El `POST /api/projects` se cambia a un flujo por pasos. El frontend envía la petición y el backend responde con Server-Sent Events (SSE) que reportan progreso:

```
→ Creando repositorio en GitHub...     ✓
→ Añadiendo workflows CI/CD...          ✓
→ Creando branch develop...             ✓
→ Creando proyecto en Cloudflare Pages... ✓
→ Configurando DNS...                    ✓
→ Añadiendo custom domains...           ✓
→ Proyecto creado!
```

### Fix: pnpm version en proyectos nuevos
El template de workflow callers en `github.ts` necesita que el repo inicial incluya un `package.json` con `packageManager: "pnpm@10.6.2"`. Se añade al paso de creación del repo.

## Orden de implementación

| # | Tarea |
|---|-------|
| 1 | Scaffold React + Vite + Tailwind + React Router en `dashboard/` |
| 2 | Migrar backend: Hono server con servicios adaptados + rutas API |
| 3 | Componentes UI base: Skeleton, Spinner, Badge, Button, Card, Table, Modal, Timeline |
| 4 | Layout + Sidebar + Router (diseño profesional estilo Portainer) |
| 5 | Custom hooks de data fetching |
| 6 | Página Dashboard (overview con skeletons) |
| 7 | Página Projects (listado + tabla) |
| 8 | Página ProjectDetail (entornos + deploys + actions + builds) |
| 9 | Página NewProject con Timeline de progreso (SSE) |
| 10 | Página Deploys (historial global) |
| 11 | Página Settings (estado del sistema) |
| 12 | Fix template pnpm version en github.ts |
| 13 | Verificar build + test completo |

## Archivos que se reutilizan (adaptar `import.meta.env` → `process.env`)
- `dashboard/src/lib/services/github.ts`
- `dashboard/src/lib/services/cloudflare.ts`
- `dashboard/src/lib/services/r2.ts`
- `dashboard/src/lib/services/webhook-cache.ts`
- `dashboard/src/lib/types.ts` (tal cual)
- `dashboard/src/lib/data.ts` (la lógica de transformación)

## Archivos que se eliminan
- Todo lo de Astro: `astro.config.mjs`, `*.astro`, `env.d.ts`, `src/pages/` (Astro), `src/layouts/` (Astro)
- Se reemplazan por equivalentes React

## Verificación
1. `pnpm dev` arranca Vite (frontend) + Hono (backend) en paralelo
2. Dashboard muestra pilot-app con datos reales y skeletons mientras carga
3. Crear proyecto muestra timeline de progreso paso a paso
4. Deploys sin duplicados, con entornos correctos
5. `pnpm build` compila sin errores
