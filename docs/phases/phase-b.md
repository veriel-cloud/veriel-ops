# Phase B — Soporte multi-tipo de proyecto

## Contexto

El pipeline actual asume: `pnpm build → dist/ → Cloudflare Pages → .tar.gz en R2`. Esto solo funciona para webs estáticas. veriel-ops necesita soportar 6 tipos de proyecto con 3 targets de deploy diferentes. Este plan está basado en `docs/deployment-targets.html`.

## Tipos y targets

| Tipo           | Deploy target       | Ejemplo                                       |
| -------------- | ------------------- | --------------------------------------------- |
| `static`       | CF Pages            | React SPA, Astro static, Vue, Svelte          |
| `ssr-edge`     | CF Workers          | Astro CF adapter, Next.js OpenNext, Hono edge |
| `ssr-node`     | Container/VPS       | Next.js Node, Nuxt Node                       |
| `backend-js`   | Workers o Container | Hono, Express, Fastify                        |
| `backend-go`   | Container           | Gin, Echo, Fiber                              |
| `backend-java` | Container           | Spring Boot, Quarkus                          |

## Asunciones hardcodeadas a eliminar

1. `data.ts` líneas 42, 101: `type: "astro-static"` para TODO proyecto
2. `NewProject.tsx`: solo 2 opciones (Astro, React) en el dropdown
3. `constants.ts`: `PROJECT_TEMPLATES` con 4 tipos mapeados a 2 template repos
4. Workflows: todos asumen `pnpm build → dist/ → wrangler pages deploy`
5. Pipeline: pasos idénticos para todo tipo (siempre crea CF Pages project)
6. Sin persistencia de tipo: se sobreescribe en cada fetch con "astro-static"

---

## 5 PRs secuenciales

```
PR-B1 (tipos + modelo)
  ├─→ PR-B2 (dashboard UI) ─────── en paralelo
  └─→ PR-B3 (pipeline branching) ─ en paralelo
        ├─→ PR-B4 (DNS + rollback por target)
        └─→ PR-B5 (container target)
```

---

## PR-B1 — Tipos y modelo de datos

**Por qué primero**: Todo lo demás depende de tener los tipos correctos y la persistencia del tipo de proyecto. No cambia comportamiento — todos los proyectos existentes siguen como `static`.

**Qué hacer**:

1. **Tipos compartidos** (`packages/shared/src/types.ts`):
   - `ProjectType = "static" | "ssr-edge" | "ssr-node" | "backend-js" | "backend-go" | "backend-java"`
   - `DeployTarget = "cf-pages" | "cf-workers" | "container"`
   - `ProjectRuntime = "node" | "bun" | "go" | "java"`
   - Extender `ProjectSettings`: añadir `projectType`, `deployTarget`, `buildCommand`, `outputDir`, `runtime`
   - Cambiar `Project.type` de `string` a `ProjectType`

2. **Config de tipos** (`server/src/constants.ts`):
   - Reemplazar `PROJECT_TEMPLATES` con `PROJECT_TYPE_CONFIG`: record por `ProjectType` con `{ template, deployTarget, defaultBuildCommand, defaultOutputDir, defaultRuntime }`
   - `DEFAULT_PROJECT_TYPE = "static"`
   - Tipos sin template (`backend-go`, `backend-java`): template `null` (setup manual)

3. **Data service** (`server/src/services/data.ts`):
   - Líneas 42 y 101: leer `store.getProjectSettings(name)?.projectType ?? "static"` en vez de hardcodear `"astro-static"`
   - Añadir `store` a la interfaz `Services` (o pasarlo aparte)

4. **DbStore** (`server/src/services/db-store.ts`):
   - Fallback de `getProjectSettings`: incluir `projectType: "static"` junto a `coverageThreshold: 80`

5. **Create endpoints** (`server/src/routes/projects.ts`):
   - Al crear proyecto: guardar settings con `projectType`, `deployTarget`, `buildCommand`, `outputDir`, `runtime` (usando defaults de `PROJECT_TYPE_CONFIG`)
   - Validar `projectType` en PUT settings

**Archivos**:

- Modificar: `packages/shared/src/types.ts`
- Modificar: `server/src/constants.ts`
- Modificar: `server/src/services/data.ts`
- Modificar: `server/src/services/db-store.ts`
- Modificar: `server/src/routes/projects.ts`

**Tests**:

- `constants.test.ts`: cada `ProjectType` tiene entrada en `PROJECT_TYPE_CONFIG` con `deployTarget` válido
- `db-store.test.ts`: settings round-trip con nuevos campos
- `data.test.ts`: `getProjects` usa tipo almacenado, no hardcodeado

**Migración**: Ninguna. `project_settings` ya guarda JSON libre. Proyectos sin settings caen al fallback `static`.

---

## PR-B2 — Dashboard: selector de tipo y config de build

**Por qué**: El formulario de creación solo muestra Astro y React. El detalle no muestra el target de deploy.

**Qué hacer**:

1. **Constantes de UI** (`dashboard/src/lib/project-types.ts`) — nuevo:
   - Mapa de `ProjectType` → label, descripción, frameworks, icono, deploy target
   - Reusar desde NewProject, ProjectCard y ProjectDetail

2. **Formulario de creación** (`dashboard/src/pages/NewProject.tsx`):
   - Reemplazar dropdown de 2 opciones con selector agrupado de los 6 tipos
   - Al seleccionar tipo, auto-rellenar `buildCommand`, `outputDir`, `runtime` desde defaults
   - Sección colapsable "Configuración de build" con inputs editables
   - Enviar todos los campos en el POST

3. **Tarjeta de proyecto** (`dashboard/src/components/ProjectCard.tsx`):
   - Actualizar `typeLabels` para cubrir los 6 tipos (o usar el mapa de project-types.ts)

4. **Detalle de proyecto** (`dashboard/src/pages/ProjectDetail.tsx`):
   - Mostrar badge del deploy target (CF Pages / CF Workers / Container)
   - En pestaña Settings: mostrar y permitir editar build config

5. **Import** (`dashboard/src/pages/ImportProject.tsx`):
   - Añadir selector de tipo al importar (actualmente no tiene)

**Archivos**:

- Crear: `dashboard/src/lib/project-types.ts`
- Modificar: `dashboard/src/pages/NewProject.tsx`
- Modificar: `dashboard/src/components/ProjectCard.tsx`
- Modificar: `dashboard/src/pages/ProjectDetail.tsx`
- Modificar: `dashboard/src/pages/ImportProject.tsx`

---

## PR-B3 — Pipeline branching: Static vs Workers

**Por qué**: El pipeline de setup y los workflow callers son idénticos para todo tipo. Necesitan bifurcar según el `deployTarget`.

**Qué hacer**:

1. **Workflow callers** (`server/src/services/github.ts`, función `buildWorkflowCallerFiles`):
   - Aceptar `deployTarget` como parámetro
   - `cf-pages`: generar callers actuales (sin cambio)
   - `cf-workers`: generar callers apuntando a `deploy-worker-des.yml`, etc.
   - `container`: generar callers apuntando a `deploy-container-des.yml`, etc.

2. **Pipeline** (`server/src/services/pipeline.ts`):
   - Leer `deployTarget` del contexto
   - `cf-pages`: flujo actual (crear Pages project, CNAME a \*.pages.dev)
   - `cf-workers`: saltar creación de Pages project. Configurar DNS a \*.workers.dev
   - `container`: saltar CF infra. Solo crear repo + workflow callers + DNS A record

3. **Cloudflare service** (`server/src/services/cloudflare.ts`):
   - `createWorkerSubdomain(name, env)` — para CF Workers
   - `setupWorkerDns(name, env)` — CNAME al subdominio Workers

4. **Deploy endpoint** (`server/src/routes/projects.ts` POST `/:name/deploy`):
   - Leer `deployTarget` de settings
   - `cf-workers`: dispatchar workflow diferente
   - `cf-pages`: comportamiento actual

5. **Workflows de la org** (fuera de este repo, documentar):
   - Nuevos: `deploy-worker-des.yml`, `deploy-worker-pre.yml`, `deploy-worker-pro.yml`
   - Hacen: `pnpm build` → `wrangler deploy` (no `wrangler pages deploy`)

**Archivos**:

- Modificar: `server/src/services/github.ts`
- Modificar: `server/src/services/pipeline.ts`
- Modificar: `server/src/services/cloudflare.ts`
- Modificar: `server/src/routes/projects.ts`
- Modificar: `server/src/constants.ts` (workflow names por target)

**Tests**:

- `buildWorkflowCallerFiles` genera YAML correcto por deploy target
- Pipeline salta Pages para `cf-workers`

---

## PR-B4 — DNS routing y rollback por target

**Por qué**: DNS debe apuntar al sitio correcto según target. Rollback debe dispatchar el workflow correcto.

**Qué hacer**:

1. **DNS helper** (`server/src/constants.ts`):
   - `dnsTargetForProject(name, env, deployTarget)`: retorna CNAME content:
     - `cf-pages`: `{name}-{env}.pages.dev`
     - `cf-workers`: `{name}-{env}.workers.dev`
     - `container`: IP del VPS (desde env var `VPS_IP`)

2. **Cloudflare service** (`server/src/services/cloudflare.ts`):
   - `setupEnvDns`: aceptar `deployTarget` para determinar si crear CNAME o A record

3. **Rollback** (`server/src/routes/projects.ts`):
   - Leer `deployTarget`, dispatchar workflow correcto:
     - `cf-pages`: `rollback.yml` (actual)
     - `cf-workers`: `rollback-worker.yml`
     - `container`: `rollback-container.yml`

4. **Delete** (`server/src/routes/projects.ts` DELETE):
   - `cf-workers`: borrar Worker en vez de Pages project
   - `container`: solo limpiar DNS

5. **Pipeline** (`server/src/services/pipeline.ts`):
   - Step de DNS usa `dnsTargetForProject`

**Archivos**:

- Modificar: `server/src/constants.ts`
- Modificar: `server/src/services/cloudflare.ts`
- Modificar: `server/src/routes/projects.ts`
- Modificar: `server/src/services/pipeline.ts`

**Tests**: DNS target resolution por deploy target, rollback dispatcha workflow correcto.

---

## PR-B5 — Container deploy target (Go/Java)

**Por qué**: Cierra el soporte completo. Proyectos Go y Java usan Docker.

**Qué hacer**:

1. **Pipeline** (`server/src/services/pipeline.ts`):
   - `container` target: crear repo con Dockerfile template, workflow callers de container, DNS A record al VPS, sin CF infra

2. **GitHub service** (`server/src/services/github.ts`):
   - Callers para container: apuntan a `deploy-container-{env}.yml`

3. **Constants** (`server/src/constants.ts`):
   - Templates para `backend-go` y `backend-java` (repos con Dockerfile base)
   - Config de container registry (GHCR)

4. **Workflows de la org** (documentar):
   - `deploy-container-des.yml`, `deploy-container-pre.yml`, `deploy-container-pro.yml`, `rollback-container.yml`
   - Docker build → push a GHCR → SSH deploy al VPS (o Fly.io / Kamal)

**Archivos**:

- Modificar: `server/src/services/pipeline.ts`
- Modificar: `server/src/services/github.ts`
- Modificar: `server/src/constants.ts`

**Tests**: Pipeline genera flujo correcto para container. Workflow callers apuntan a deploy-container-\*.yml.

---

## Verificación global

1. `pnpm lint` sin errores
2. `pnpm test` pasa
3. `pnpm build` sin errores
4. Crear proyecto `static` → mismo comportamiento que ahora (CF Pages)
5. Crear proyecto `ssr-edge` → workflow callers apuntan a deploy-worker, DNS a workers.dev
6. Crear proyecto `backend-go` → workflow callers apuntan a deploy-container, DNS A record a VPS
7. Dashboard muestra tipo y target correcto en cada proyecto
8. Rollback dispatcha workflow correcto según target
9. Proyectos existentes sin settings → fallback a `static` sin romper nada
