# veriel-ops

Sistema centralizado de DevOps para gestionar despliegues de proyectos web de veriel.dev.
Monorepo con tres workspaces: `dashboard/` (React), `server/` (Hono/Bun) y `packages/shared/`.

## Stack

| Capa      | Tecnología                                      |
| --------- | ----------------------------------------------- |
| Runtime   | Bun + TypeScript estricto                       |
| Dashboard | Vite 6 + React 19 + TanStack Query v5           |
| API       | Hono sobre Bun (servidor persistente)           |
| Estilos   | Tailwind CSS 4 con CSS custom properties        |
| Iconos    | @tabler/icons-react (importación explícita)     |
| Linter    | Biome 2.x (formatter + linter unificado)        |
| Tests     | Vitest + Testing Library (happy-dom)            |
| DB        | Bun SQLite (WAL mode, prepared statements)      |
| Infra     | Cloudflare Pages + VPS Bun + R2 + DNS API       |
| CI/CD     | GitHub Actions (workflows reutilizables en org) |
| Git hooks | Lefthook (pre-commit: biome check --write)      |

## Restricciones absolutas

- **Nunca Node.js ni módulos `node:*`** en `server/` — solo APIs nativas de Bun
- **Nunca ESLint, Prettier, npm ni yarn** — Biome + pnpm exclusivamente
- **Nunca default exports** — solo named exports en todo el monorepo
- **Nunca barrel imports** (`export *`) — importaciones explícitas siempre
- **Nunca `any`** — tipos concretos; `unknown` solo en fronteras externas
- **Nunca duplicar workflows** en repos individuales — callers hacia `veriel-cloud/.github`
- **Nunca clases** para servicios — factory functions que devuelven objetos
- **Nunca Redux, Zustand ni estado global** — TanStack Query + Context API mínimo
- **Nunca CSS modules ni CSS-in-JS** — solo Tailwind CSS
- **Cobertura mínima 80 %** — obligatoria para PRE y PRO

## Estructura del monorepo

```
dashboard/src/
  components/          # Reutilizables (ui/ para primitivos)
  hooks/               # queries.ts, mutations.ts, useDeploysStream.ts
  pages/               # Una vista por ruta
  layouts/             # DashboardLayout (Header + Sidebar + Outlet)
  lib/                 # api.ts, query-client.ts, utils.ts, contexts
  types/               # Tipos de respuesta API

server/src/
  routes/              # Un archivo por recurso
  services/            # Lógica de negocio como factories
  middleware/          # auth.ts, logger.ts
  lib/                 # cache.ts, db.ts, logger.ts, token.ts, migrations.ts
  index.ts             # Entry point
  env.ts               # Tipos Hono: Bindings + Variables
  types.ts             # Tipos solo de servidor
  constants.ts         # Polling, paginación, delays

packages/shared/src/
  types.ts             # Tipos compartidos del dominio
  constants.ts         # BASE_DOMAIN, ENV_BRANCHES, PROJECT_TYPE_CONFIG
  project-types.ts     # Metadata UI por tipo de proyecto
  index.ts             # Re-export (único barrel permitido)
```

### Reglas de ubicación

- **Tipos compartidos** → `packages/shared/src/types.ts`
- **Tipos de servidor** (PipelineJob, PagesProject) → `server/src/types.ts`
- **Tipos de props** → inline en el archivo del componente
- **Constantes de dominio** → `packages/shared/src/constants.ts`
- **Constantes de servidor** (timeouts, paginación) → `server/src/constants.ts`
- **Tests** → `__tests__/{source}.test.ts(x)` junto al código
- **Nuevas rutas** → `server/src/routes/`, un archivo por recurso
- **Nuevos componentes** → `dashboard/src/components/`, primitivos en `ui/`

## Estilo de código

### Formato (Biome)

2 espacios, 120 chars, comillas dobles, punto y coma siempre, trailing commas, organización automática de imports.

### Naming

| Elemento              | Convención       | Ejemplo                             |
| --------------------- | ---------------- | ----------------------------------- |
| Archivos              | kebab-case       | `db-store.ts`                       |
| Componentes React     | PascalCase       | `StatsCard.tsx`                     |
| Funciones y variables | camelCase        | `createGitHubService`               |
| Tipos e interfaces    | PascalCase       | `GitHubService`                     |
| Constantes exportadas | UPPER_SNAKE_CASE | `REPO_CREATION_DELAY_MS`            |
| Columnas de DB        | snake_case       | `token_hash`                        |
| Parámetros de DB      | `$` + snake_case | `$source`                           |
| Enums (union types)   | kebab-case       | `"astro-static"`, `"cf-pages"`      |
| Query keys            | strings planos   | `["projects"]`, `["project", name]` |
| CSS variables         | `--color-*`      | `--color-bg`, `--color-env-des`     |

### Imports

Orden: externos → paquetes monorepo → relativos. `type` keyword para imports solo de tipos.

```typescript
// 1. Externos
import { Hono } from "hono";
// 2. Monorepo
import { BASE_DOMAIN, type Project } from "@veriel-ops/shared";
// 3. Relativos — types separados
import { WORKFLOW_POLL_INTERVAL_MS } from "../constants.js";
import type { Logger } from "../lib/logger.js";
```

- Server: extensión `.js` obligatoria en relativos (ESM)
- Dashboard: sin extensión, alias `@/` → `src/`
- Iconos tabler: `import { IconRocket } from "@tabler/icons-react"` — nunca `import *`

### Exports y funciones

- Solo named exports, nunca default
- Tipos derivados: `export type GitHubService = ReturnType<typeof createGitHubService>`
- Arrow functions para operaciones simples, `function` para lógica compleja
- Preferir inferencia de retorno salvo en interfaces públicas

## Server (`server/`)

API REST + SSE, estado en SQLite, logs en disco con rotación.

### Inyección de servicios

Services se crean como factories en middleware, se inyectan via `c.set()`, se consumen via `c.get()`.
Todo servicio nuevo debe añadirse a `Variables` en `env.ts`. Nunca instanciar servicios en rutas.

```typescript
// index.ts — inyección
app.use("/*", async (c, next) => {
  c.set("github", createGitHubService(config, log));
  c.set("store", dbStore);
  await next();
});

// routes — consumo
const gh = c.get("github");
const store = c.get("store");
```

### Factory de servicio

```typescript
// 1. Interfaz pública
export interface DbStore {
  addEvent(event: Omit<WebhookEvent, "timestamp">): void;
  getEvents(since?: string): WebhookEvent[];
}

// 2. Factory: config → objeto con métodos
export function createDbStore(db: Database): DbStore {
  const stmts = {
    insertEvent: db.prepare("INSERT INTO webhook_events ... VALUES ($source, $type, $project, $data, $timestamp)"),
  };

  function addEvent(event: Omit<WebhookEvent, "timestamp">): void {
    stmts.insertEvent.run({ $source: event.source, $type: event.type, ... });
  }

  return { addEvent, getEvents, ... };
}

// 3. Tipo derivado
export type DbStoreService = ReturnType<typeof createDbStore>;
```

### Rutas

```typescript
export const deploysRoutes = new Hono<Env>();

deploysRoutes.get("/", async (c) => {
  try {
    const deploys = await c.get("cachedData").getDeploys({ ... });
    return c.json({ deploys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});
```

**Reglas de rutas:**

- Validar input al principio → 400 con `{ error: string }`
- Extraer servicios con `c.get()` al inicio
- Loggear con contexto estructurado antes de ejecutar
- Responder con `c.json(data, status)` — códigos: 200, 201, 400, 401, 404, 500
- Try/catch en cada handler
- Errores: `error instanceof Error ? error.message : "Unknown error"`
- Errores no críticos: `.catch(() => {})` para continuar

### Caché

In-memory con TTL 2 min. Keys: `"projects"`, `"project:<name>"`, `"deploys"`, `"system-stats"`.
Invalidación por prefijo desde webhooks. Deploys activos bypass caché (poll cada 5s).

## Dashboard (`dashboard/`)

SPA React 19 con Vite. Estado servidor via TanStack Query, tiempo real via SSE.

### Componentes

```typescript
interface StatsCardProps {
  label: string;
  value: string | number;
}

export function StatsCard({ label, value }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <span className="text-sm text-[var(--color-text-tertiary)]">{label}</span>
      <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}
```

**Reglas:**

- `export function ComponentName()` — nunca default, nunca `const Component = () =>`
- Props con `interface` inline encima del componente
- Un componente por archivo, responsabilidad única
- `ErrorBoundary` es la única clase permitida

### Estilos

Colores siempre via CSS custom properties, nunca colores Tailwind directos:

```typescript
// ✅ Correcto
className = "bg-[var(--color-bg)] text-[var(--color-text-primary)]";
// ❌ Incorrecto
className = "bg-gray-900 text-white";
```

Variables de tema:

- Fondos: `--color-bg`, `--color-bg-secondary`, `--color-bg-tertiary`
- Texto: `--color-text-primary` a `--color-text-quaternary`
- Bordes: `--color-border`, `--color-border-hover`
- Estado: `--color-success`, `--color-error`, `--color-warning`
- Entornos: `--color-env-des`, `--color-env-pre`, `--color-env-pro`

Variantes de UI con `Record<Variant, string>` + utilidad `cn()` para clases condicionales.

### TanStack Query

```typescript
// Query simple
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<ProjectsResponse>("/projects"),
  });
}

// Query condicional
export function useProjectDetail(name: string) {
  return useQuery({
    queryKey: ["project", name],
    queryFn: () => api.get<ProjectDetailResponse>(`/projects/${name}`),
    enabled: !!name,
  });
}

// Mutation con invalidación
export function useDeployProject(projectName: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (body: { environment: string }) =>
      api.post<{ success: boolean }>(`/projects/${projectName}/deploy`, body),
    onSuccess: () => invalidate(projectName),
  });
}
```

**Reglas:**

- Queries en `hooks/queries.ts`, mutations en `hooks/mutations.ts`
- Query keys: arrays planos `["recurso", id]` — nunca objetos anidados
- `staleTime` por defecto: 2 min | `enabled: !!param` para condicionales
- Mutations invalidan queries afectadas en `onSuccess`
- Nunca `useEffect` para fetch — siempre `useQuery`

### API Client (`lib/api.ts`)

Objeto `api` con métodos `get`, `post`, `put`, `delete` genéricos con tipo `<T>`.
Token Bearer desde localStorage (`veriel-ops-token`). 401 limpia token y redirige a `/login`.
Nunca usar `fetch` directo en componentes — siempre via `api.*`.

### Routing y modales

- React Router v7, `RequireAuth` wrapper, `DashboardLayout` con `<Outlet />`
- Modales controlados con `open` + `onClose`, focus trap, Escape, `aria-modal="true"`
- Mutations se resetean en `onClose`: `mutation.reset()`
- Solo 2 contextos: `SidebarContext` y `ThemeContext` — nunca más para estado servidor

## Paquete shared (`packages/shared/`)

**Va aquí**: tipos de dominio, union types, constantes, helpers puros, config UI por tipo.
**No va aquí**: lógica de negocio, tipos Hono, props de componentes, constantes de implementación.

Convenciones de tipos:

```typescript
// ✅ Union types — nunca enum
export type Environment = "des" | "pre" | "pro";

// Separadores por dominio
// ─── Project ─────────────────────────────────────────────
export interface Project { ... }

// ─── Deploy ──────────────────────────────────────────────
export interface DeployEntry { ... }
```

- Interfaces para objetos, types para uniones y alias
- API responses wrappean siempre el recurso: `{ projects: Project[] }`, nunca array directo

## Base de datos (Bun SQLite)

### Schema

```
webhook_events   — source, type, project, data JSON, timestamp
notifications    — id PK, type, project, message, timestamp, read
project_settings — name PK, settings JSON
deploy_history   — id PK, project, environment, version, commit_sha, branch, action, status, coverage, duration
audit_log        — id PK, action, resource, resource_name, details JSON, performed_by, timestamp
auth_tokens      — id PK, name, token_hash, created_at, last_used_at
```

### Migraciones

En `lib/migrations.ts`, array incremental de SQL. Nunca borrar ni reordenar existentes.
Siempre `CREATE TABLE IF NOT EXISTS` o `ALTER TABLE` — nunca `DROP`.

### Acceso a datos

```typescript
const stmts = {
  insertEvent: db.prepare(
    "INSERT INTO webhook_events (source, type, project, data, timestamp) VALUES ($source, $type, $project, $data, $timestamp)",
  ),
  upsertSettings: db.prepare(
    "INSERT INTO project_settings (name, settings) VALUES ($name, $settings) ON CONFLICT(name) DO UPDATE SET settings = $settings",
  ),
};
```

- Parámetros `$`: `.run()` para writes, `.get()` para un row, `.all()` para múltiples
- JSON: `JSON.stringify()` al guardar, `JSON.parse()` al leer
- Timestamps ISO 8601. Nunca concatenar SQL. Nunca ORM.

## SSE (Server-Sent Events)

### Eventos

| Evento     | Uso                           | Payload clave                         |
| ---------- | ----------------------------- | ------------------------------------- |
| `init`     | Estado inicial al conectar    | `{ title, jobs }`                     |
| `job`      | Cambio de estado de job       | `{ jobId, status }`                   |
| `step`     | Cambio de estado de step      | `{ jobId, stepId, status }`           |
| `update`   | Datos frescos (deploy stream) | `DeployEntry[]`                       |
| `complete` | Pipeline terminado            | `{ success, totalDuration, project }` |
| `error`    | Fallo irrecuperable           | `{ error, failedJob }`                |

Status: `"pending"` | `"running"` | `"success"` | `"error"` | `"skipped"`

### Servidor

```typescript
function emit(stream: SSEWriter, event: string, data: Record<string, unknown>) {
  return stream.writeSSE({ event, data: JSON.stringify(data) });
}

return streamSSE(c, async (stream) => {
  await emit(stream, "init", { title: "Creating project", jobs });
  // ... ejecutar pipeline emitiendo job/step ...
  await emit(stream, "complete", { success: true, totalDuration });
});
```

### Cliente

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  buffer = parseSSELines(buffer, (event, jsonStr) => {
    if (event === "update") setDeploys(JSON.parse(jsonStr));
  });
}
```

### Reglas

- Servidor: `streamSSE()` de Hono, emitir `init` al inicio, `complete`/`error` al final
- Cliente: `fetch` + `ReadableStream` — nunca `EventSource` (no soporta auth headers)
- Cliente: `AbortController` en cleanup, flag `mounted`, buffer para chunks parciales

## Tests

Vitest en ambos workspaces. Cobertura mínima 80 %.

### Server — Hono app en memoria

```typescript
let app: Hono<Env>;

beforeEach(async () => {
  const db = new Database(":memory:");
  runMigrations(db);
  app = new Hono<Env>();
  app.use("/*", async (c, next) => {
    c.set("store", createDbStore(db));
    await next();
  });
});

it("returns 200", async () => {
  const res = await app.request("/api/projects");
  expect(res.status).toBe(200);
});
```

### Dashboard — render con providers

```typescript
it("renders label", () => {
  render(<StatsCard label="Projects" value={5} />);
  expect(screen.getByText("Projects")).toBeInTheDocument();
});
```

### Reglas

- DB siempre `:memory:` — nunca archivos en disco
- `beforeEach` para estado limpio — nunca compartir estado entre tests
- Mock factories para objetos complejos: `function mockWorkflowRun(overrides = {})`
- Requests con `app.request()` — nunca supertest ni HTTP real
- Nunca `test.skip` ni `test.todo` permanentes
- Si cambias comportamiento → test nuevo o actualizado

## Entornos y deploy

```
develop → DES (sin gate) → release/* → PRE (cob >= 80%) → main → PRO (cob >= 80%)
```

| Entorno | Branch      | Dominio                     |
| ------- | ----------- | --------------------------- |
| DES     | `develop`   | `<proyecto>-des.veriel.dev` |
| PRE     | `release/*` | `<proyecto>-pre.veriel.dev` |
| PRO     | `main`      | `<proyecto>.veriel.dev`     |

- **Deploy**: dispatch workflow → webhook marca activo → SSE tracking → webhook marca done
- **Rollback**: artefacto R2 → workflow re-sube a Cloudflare
- **Promote**: PR release→main → merge → deploy-pro automático
- Artefactos en R2: `{project}/{env}/{version}_{commitSha}.tar.gz`
- Workflows reutilizables en `veriel-cloud/.github`, repos solo tienen callers

## Comandos

```bash
pnpm dev              # Dashboard (:5173) + server (:3001) en paralelo
pnpm dev:dashboard    # Solo frontend
pnpm dev:server       # Solo API
pnpm build            # Build de ambos workspaces
pnpm lint             # Biome check
pnpm lint:fix         # Biome check --write
pnpm test             # Vitest en todo el monorepo
pnpm typecheck        # tsc --noEmit
```

## Antes de commitear

1. `pnpm lint` — cero errores
2. `pnpm test` — cero fallos
3. `pnpm typecheck` — cero errores de tipos
4. Si se cambió comportamiento → test nuevo o actualizado
5. Si se añadió restricción nueva → documentar aquí
