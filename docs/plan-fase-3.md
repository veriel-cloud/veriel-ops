# Plan Fase 3 — Dashboard operativo + Automatización de registro de proyectos

## Contexto

El dashboard actual es estático con datos mock. El objetivo es convertirlo en el **centro de operaciones** donde el usuario gestiona todo sin salir de la app: crear proyectos, ver estado, desplegar, hacer rollback, ver logs de Actions, etc. Cloudflare y GitHub quedan como infraestructura invisible por debajo.

Actualmente:
- Dashboard: Astro estático con Tailwind, datos hardcodeados en `mock-data.ts`
- APIs disponibles: GitHub API, Cloudflare API (Pages, DNS, R2)
- Workflows reutilizables: ya funcionan en `veriel-cloud/.github`
- Piloto validado: `pilot-app` con flujo DES→PRE→PRO funcionando

---

## Decisión arquitectónica: Astro SSR con API routes

El dashboard necesita hacer llamadas a APIs externas (GitHub, Cloudflare) con tokens privados. Esto requiere **Astro en modo SSR** (no estático), usando API routes como backend.

**Cambio clave**: `astro.config.mjs` pasa a `output: 'server'` con adapter de Node (para desarrollo local) o Cloudflare (para producción).

---

## Estructura de implementación

### Paso 1 — Migrar dashboard a SSR + añadir dependencias

**Archivos a modificar:**
- `dashboard/astro.config.mjs` — añadir `output: 'server'` + adapter
- `dashboard/package.json` — añadir `@astrojs/node`, `octokit` (GitHub API), `aws4fetch` (R2 S3-compatible)

**Dependencias nuevas:**
- `@astrojs/node` — adapter SSR para dev local
- `octokit` — cliente oficial GitHub API
- `aws4fetch` — cliente S3 para Cloudflare R2
- `wrangler` — CLI de Cloudflare (para crear Pages projects)

### Paso 2 — Capa de servicios (API layer)

Crear `dashboard/src/lib/services/` con los clientes de cada API:

```
dashboard/src/lib/services/
├── github.ts        # GitHub API: repos, workflows, actions, branches
├── cloudflare.ts    # Cloudflare API: Pages, DNS
├── r2.ts            # R2: listar/descargar builds
└── index.ts         # Re-export de todos los servicios
```

**`github.ts`** — funciones:
- `listOrgRepos()` — listar repos de veriel-cloud
- `getRepo(name)` — detalle de un repo
- `getWorkflowRuns(repo)` — últimas ejecuciones de Actions
- `getWorkflowRunLogs(repo, runId)` — logs de una ejecución
- `createRepo(name, options)` — crear repo en la org
- `createBranch(repo, branch, fromBranch)` — crear branch
- `addFileToRepo(repo, path, content)` — añadir archivo (workflow callers)
- `dispatchWorkflow(repo, workflow, inputs)` — ejecutar workflow manualmente (rollback)
- `setBranchProtection(repo, branch, rules)` — proteger branches

**`cloudflare.ts`** — funciones:
- `listPagesProjects()` — listar proyectos de Pages
- `getPagesProject(name)` — detalle de un proyecto
- `getDeployments(projectName)` — deploys de un proyecto
- `createPagesProject(name, repoOwner, repoName)` — crear proyecto de Pages conectado a GitHub
- `addCustomDomain(projectName, domain)` — añadir custom domain
- `createDnsRecord(name, target)` — crear registro CNAME
- `listDnsRecords()` — listar registros DNS

**`r2.ts`** — funciones:
- `listBuilds(project, environment)` — listar builds en R2
- `getBuildMetadata(project, environment, artifact)` — obtener metadata
- `downloadBuild(project, environment, artifact)` — descargar artefacto

### Paso 3 — API routes del dashboard

Crear `dashboard/src/pages/api/` con endpoints que consumen los servicios:

```
dashboard/src/pages/api/
├── projects/
│   ├── index.ts              # GET: listar proyectos | POST: crear proyecto
│   └── [name]/
│       ├── index.ts          # GET: detalle proyecto
│       ├── deploys.ts        # GET: historial de deploys
│       ├── builds.ts         # GET: builds en R2
│       ├── promote.ts        # POST: promover DES→PRE o PRE→PRO
│       └── rollback.ts       # POST: ejecutar rollback
├── actions/
│   ├── [repo]/
│   │   ├── runs.ts           # GET: workflow runs
│   │   └── [runId]/logs.ts   # GET: logs de un run
└── system/
    └── status.ts             # GET: estado de conexiones (GitHub, CF, R2)
```

### Paso 4 — POST /api/projects (Automatización completa del registro)

Este es el endpoint más importante. Cuando se llama:

1. **Crear repo** en GitHub (`veriel-cloud/<nombre>`) con template de Astro u otro
2. **Crear branch `develop`** en el repo
3. **Añadir workflow callers** (ci.yml, deploy-des.yml, deploy-pre.yml, deploy-pro.yml, rollback.yml) via GitHub API
4. **Crear proyecto en Cloudflare Pages** conectado al repo
5. **Crear registros DNS** (dev.X.veriel.dev, pre.X.veriel.dev, X.veriel.dev)
6. **Añadir custom domains** al proyecto de Pages
7. **Devolver el proyecto creado** con todas sus URLs

### Paso 5 — Actualizar las páginas del dashboard

Reemplazar los imports de `mock-data.ts` por llamadas a los API routes o directamente a los servicios (SSR):

**Páginas a modificar:**
- `src/pages/index.astro` — stats y proyectos desde API real
- `src/pages/projects/index.astro` — listado desde GitHub + Cloudflare
- `src/pages/projects/[name].astro` — detalle con deploys reales y builds de R2
- `src/pages/deploys/index.astro` — historial desde Cloudflare API
- `src/pages/settings/index.astro` — estado real de conexiones

**Páginas nuevas:**
- `src/pages/projects/new.astro` — formulario de creación de proyecto
- `src/pages/projects/[name]/actions.astro` — vista de GitHub Actions del proyecto

**Componentes nuevos:**
- `ActionRunCard.astro` — card de una ejecución de workflow
- `ActionLogs.astro` — visualizador de logs de Actions
- `NewProjectForm.astro` — formulario de creación de proyecto
- `PromoteModal.astro` — modal de confirmación para promover
- `RollbackModal.astro` — modal para seleccionar build y hacer rollback

### Paso 6 — Variables de entorno

El dashboard necesita las siguientes env vars (en `.env` local y en Cloudflare para producción):

```
GITHUB_TOKEN=ghp_...          # Token con permisos: repo, workflow, admin:org
GITHUB_ORG=veriel-cloud
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ZONE_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=veriel-ops-builds
```

---

## Orden de implementación

| # | Tarea | Depende de |
|---|-------|------------|
| 1 | Migrar a SSR + dependencias | — |
| 2 | Servicio GitHub (`github.ts`) | 1 |
| 3 | Servicio Cloudflare (`cloudflare.ts`) | 1 |
| 4 | Servicio R2 (`r2.ts`) | 1 |
| 5 | API route GET /api/projects (listar) | 2, 3 |
| 6 | Actualizar página principal con datos reales | 5 |
| 7 | Actualizar listado de proyectos con datos reales | 5 |
| 8 | Actualizar detalle de proyecto con datos reales | 5, 4 |
| 9 | Actualizar página de deploys con datos reales | 3 |
| 10 | API route GET /api/actions (workflow runs + logs) | 2 |
| 11 | Página de Actions por proyecto | 10 |
| 12 | API route POST /api/projects (crear proyecto) | 2, 3 |
| 13 | Página de nuevo proyecto (formulario) | 12 |
| 14 | API route POST promote + rollback | 2, 3 |
| 15 | Modales de promote y rollback en detalle de proyecto | 14 |
| 16 | Página de settings con estado real | 2, 3, 4 |

---

## Verificación

1. `pnpm dev` arranca el dashboard en modo SSR
2. La página principal muestra `pilot-app` con datos reales de GitHub y Cloudflare
3. El detalle de `pilot-app` muestra los 3 entornos con deploys reales y builds de R2
4. La página de Actions muestra los workflow runs reales
5. Crear un nuevo proyecto desde el formulario → se crea repo + Pages + DNS automáticamente
6. Promover y hacer rollback desde el dashboard funciona
7. `pnpm build` compila sin errores
