# Phase A — Seguridad + Base técnica sólida

## Contexto

veriel-ops tiene el dashboard y las features operativas completas, pero la base técnica tiene carencias críticas: la API es pública (sin auth), no hay base de datos (todo en memoria o APIs externas), no hay cache (cada request golpea 3 APIs), no hay tests, y el dashboard no tiene gestión de estado. Esta fase hace el proyecto usable en producción real.

---

## 5 PRs secuenciales (excepto PR5 que es independiente)

```
PR1 (Vitest) → PR2 (SQLite) → PR3 (Auth) → PR4 (Cache)

PR5 (TanStack Query) — independiente, en paralelo con PR2-4
```

---

## PR 1 — Test Infrastructure (Vitest)

**Por qué primero**: Cada PR posterior necesita tests. Sin esta base no podemos verificar nada.

**Tecnología**: **Vitest** (ya especificado en CLAUDE.md)

**Qué hacer**:
- Instalar `vitest` y `@vitest/coverage-v8` como devDependencies
- Crear `server/vitest.config.ts` con pool `bun` y coverage provider `v8`
- Crear `dashboard/vitest.config.ts` (config básica para futuro)
- Añadir scripts: `test`, `test:watch`, `test:coverage`
- Primer test: `server/src/services/__tests__/data.test.ts` — testear funciones puras (timeAgo, formatDuration, mappers)
- Threshold de coverage a 0% inicialmente (objetivo 80% progresivo)

**Archivos**:
- `server/vitest.config.ts` (nuevo)
- `dashboard/vitest.config.ts` (nuevo)
- `server/src/services/__tests__/data.test.ts` (nuevo)
- `server/package.json`, `package.json` (scripts)

---

## PR 2 — Base de datos SQLite con bun:sqlite

**Por qué segundo**: Auth necesita dónde guardar tokens. Cache necesita persistencia. Eventos y notificaciones se pierden al reiniciar.

**Tecnología**: **bun:sqlite** (API nativa de Bun, cero dependencias, alineado con la regla "nunca Node.js")

**Por qué bun:sqlite y no otras opciones**:
- **Turso/D1**: Son para sistemas distribuidos. veriel-ops es un solo proceso en un VPS — SQLite local es más rápido y simple.
- **PostgreSQL**: Overkill para una herramienta personal. Requiere servicio separado.
- **bun:sqlite**: Nativo de Bun, zero config, prepared statements, WAL mode, sin dependencias externas.

**Qué hacer**:

1. `server/src/lib/db.ts` — Factory del database:
   - `createDatabase(path)` con `PRAGMA journal_mode=WAL` y `foreign_keys=ON`
   - Sigue el patrón factory existente (como `createGitHubService`)

2. `server/src/lib/migrations.ts` — Migraciones versionadas:
   - Tabla `schema_version` + array ordenado de SQL
   - Migración 001 crea:
     - `webhook_events` (id, source, type, project, data JSON, timestamp)
     - `notifications` (id, type, project, message, timestamp, read)
     - `project_settings` (name PK, settings JSON)
     - `deploy_history` (id, project, environment, version, commit_sha, branch, timestamp, coverage, status, action, triggered_by)
     - `audit_log` (id, action, resource, detail JSON, timestamp, actor)

3. `server/src/services/db-store.ts` — Reemplaza arrays en memoria:
   - Misma API que webhook-cache.ts y notifications.ts actuales
   - Prepared statements cacheados
   - Audit log en operaciones destructivas (deploy, rollback, delete, promote)

4. Refactorizar `config.ts`: de JSON a SQLite
5. Inyectar db-store en contexto Hono (mismo patrón que github/cloudflare/r2)
6. Actualizar routes: webhooks, events, notifications → usan db-store
7. `.gitignore`: `server/data/*.db*`

**Tests**: `server/src/lib/__tests__/db.test.ts`, `server/src/services/__tests__/db-store.test.ts` — con `:memory:` para aislamiento

**Archivos principales**:
- `server/src/lib/db.ts` (nuevo)
- `server/src/lib/migrations.ts` (nuevo)
- `server/src/services/db-store.ts` (nuevo)
- `server/src/services/config.ts` (reescribir)
- `server/src/index.ts` (init DB + inyectar)
- `server/src/env.ts` (añadir types)
- `server/src/routes/webhooks.ts`, `events.ts`, `notifications.ts` (usar db-store)
- `server/src/routes/projects.ts` (audit log)

---

## PR 3 — Autenticación

**Por qué tercero**: Depende de DB para guardar tokens. Es el gap de seguridad más crítico.

**Tecnología**: **Bearer token (API key)** generada por el servidor, almacenada hasheada en SQLite.

**Por qué API key y no otras opciones**:
- **GitHub OAuth**: Over-engineered para single-user. Requiere callback URLs que complican Tauri.
- **JWT**: Complejidad innecesaria con estado en servidor (SQLite).
- **API key**: Simple, funciona igual en web y Tauri (header `Authorization: Bearer <key>`), sin callbacks.

**Qué hacer**:

1. `server/src/lib/token.ts`:
   - `generateApiToken()` — token random con `crypto.getRandomValues()`
   - `hashToken(token)` — `Bun.password.hash()` (bcrypt/argon2 nativo)
   - `verifyToken(token, hash)` — `Bun.password.verify()`

2. `server/src/middleware/auth.ts`:
   - Lee `Authorization: Bearer <token>`
   - Verifica contra hash en DB
   - 401 si inválido
   - **Exento**: `/api/system/health`, `/api/webhooks/*`

3. Verificación de webhooks:
   - GitHub: verificar `x-hub-signature-256` con `Bun.CryptoHasher`
   - Los webhooks dejan de estar completamente abiertos

4. `server/scripts/generate-token.ts`:
   - CLI: `bun server/scripts/generate-token.ts`
   - Genera token, hashea, guarda en DB tabla `auth_tokens`
   - Imprime token en plaintext (una sola vez)
   - Soporta múltiples tokens con nombre ("dashboard", "tauri", "cli")

5. Nueva migración: tabla `auth_tokens` (id, name, token_hash, created_at, last_used_at)

6. Dashboard:
   - `api.ts`: añadir header Authorization
   - Token en localStorage
   - Nueva página `/login`
   - Redirect a `/login` si no hay token o 401

**Tests**: `server/src/middleware/__tests__/auth.test.ts`

**Archivos principales**:
- `server/src/lib/token.ts` (nuevo)
- `server/src/middleware/auth.ts` (nuevo)
- `server/scripts/generate-token.ts` (nuevo)
- `server/src/lib/migrations.ts` (nueva migración)
- `server/src/routes/webhooks.ts` (verificación firma)
- `server/src/index.ts` (añadir middleware)
- `dashboard/src/lib/api.ts` (header auth)
- `dashboard/src/pages/Login.tsx` (nuevo)
- `dashboard/src/App.tsx` (auth guard + ruta login)

---

## PR 4 — Cache de APIs externas

**Por qué cuarto**: Cada request a `/api/projects` dispara 3-5 API calls en paralelo.

**Tecnología**: **Map en memoria con TTL**. Sin librería.

**Por qué no Redis**: Un solo proceso, ~10 proyectos. Map con timestamps es suficiente.

**Qué hacer**:

1. `server/src/lib/cache.ts`:
   - `createCache<T>({ ttlMs, maxEntries? })` → `{ get, set, invalidate, invalidatePrefix, clear, stats }`
   - Evicción lazy en cada `get()`

2. TTLs:
   - Lista de proyectos: 3 min
   - Detalle de proyecto: 2 min
   - Lista de deploys: 1 min
   - Status del sistema: 30 seg

3. Integrar en `data.ts`: wrap getProjects, getProjectDetail, getDeploys

4. Invalidación en escrituras:
   - `routes/projects.ts`: tras create/delete/deploy/rollback/promote
   - `routes/webhooks.ts`: al recibir webhook

5. Endpoint: `GET /api/system/cache` (hits, misses, size)

**Tests**: `server/src/lib/__tests__/cache.test.ts`

**Archivos principales**:
- `server/src/lib/cache.ts` (nuevo)
- `server/src/services/data.ts` (integrar cache)
- `server/src/routes/projects.ts` (invalidación)
- `server/src/routes/webhooks.ts` (invalidación)
- `server/src/routes/system.ts` (endpoint stats)
- `server/src/index.ts` (crear instancia cache)

---

## PR 5 — TanStack Query en Dashboard (independiente)

**Tecnología**: **@tanstack/react-query v5**

**Qué hacer**:

1. Instalar `@tanstack/react-query`
2. `dashboard/src/lib/query-client.ts`: staleTime 2min, retry 1, refetchOnWindowFocus true
3. Wrap app en `QueryClientProvider`
4. `dashboard/src/hooks/queries.ts`: useProjects, useProjectDetail, useDeploys, useNotifications
5. `dashboard/src/hooks/mutations.ts`: useDeployProject, useRollbackProject, etc. con invalidación
6. Migrar todas las páginas
7. Eliminar `useFetch.ts` y `useAction.ts`

**Archivos principales**:
- `dashboard/src/lib/query-client.ts` (nuevo)
- `dashboard/src/hooks/queries.ts` (nuevo)
- `dashboard/src/hooks/mutations.ts` (nuevo)
- `dashboard/src/main.tsx` (provider)
- Todas las pages (migrar)
- `dashboard/src/hooks/useFetch.ts` (eliminar)
- `dashboard/src/hooks/useAction.ts` (eliminar)
- `dashboard/package.json` (nueva dependencia)

---

## Verificación

1. `pnpm test` pasa
2. `server/data/veriel-ops.db` existe. Reiniciar server no pierde eventos ni notificaciones
3. Peticiones sin token → 401. Con token → 200. Health siempre 200
4. Segunda carga del dashboard no dispara API calls (cache hit)
5. Navegar entre páginas → datos en cache, sin loading spinners innecesarios
6. `pnpm lint` sin errores
7. `pnpm build` sin errores

---

## Lo que NO se hace en Phase A

- RBAC (single user)
- Rate limiting (auth es suficiente)
- Backups de BD (copia manual del .db)
- Tests del dashboard (infra lista pero no prioritario)
- Coverage al 80% (objetivo progresivo)
