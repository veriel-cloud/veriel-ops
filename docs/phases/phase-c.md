# Phase C — Datos reales + Visibilidad operativa

## Contexto

Phase A estableció la base técnica (tests, SQLite, auth, cache, TanStack Query). Phase B añade soporte multi-tipo de proyecto. Phase C cierra gaps de visibilidad: coverage siempre es 0, audit log sin UI, Settings hardcodeados, dashboard sin tests.

---

## 5 PRs (B1 y B2 en paralelo, el resto secuencial)

```
PR-C1 (Coverage extraction)  ─┐
                               ├─→ PR-C4 (Notificaciones expandidas)
PR-C2 (Audit log API + UI)   ─┘
PR-C3 (System settings dinámicos) — independiente
PR-C5 (Dashboard tests) — último
```

---

## PR-C1 — Extracción y almacenamiento de coverage real

**Por qué primero**: El coverage es la métrica más visible del sistema. Aparece en 3 componentes (CoverageChart, CoverageBar, EnvironmentCompare) pero siempre es 0. Los workflows de CI ya generan el dato — falta que el server lo capture.

**Estrategia de extracción**: Cuando llega un webhook `workflow_run` con `completed` + `success`:
1. Identificar si es un workflow de deploy (nombre empieza con "Deploy DES/PRE/PRO")
2. Descargar el artifact `coverage-report` del workflow run (contiene `coverage-summary.json`)
3. Parsear el JSON y calcular el porcentaje global
4. Almacenar en `deploy_history` con el commit y entorno
5. Para PRE/PRO: el `build-metadata.json` en R2 ya incluye `"coverage"` — usarlo como fallback

**Qué hacer**:

1. **GitHub service** (`server/src/services/github.ts`) — 2 métodos nuevos:
   - `listWorkflowRunArtifacts(repo, runId)` — `octokit.rest.actions.listWorkflowRunArtifacts`
   - `downloadWorkflowArtifact(repo, artifactId)` — `octokit.rest.actions.downloadArtifact` (retorna zip buffer)

2. **Coverage service** (`server/src/services/coverage.ts`) — nuevo:
   - `extractCoverageFromArtifact(zipBuffer)` — descomprime el zip, lee `coverage-summary.json`, calcula media de statements/branches/functions/lines
   - `extractCoverageFromWorkflow(github, repo, runId)` — orquesta: list artifacts → find "coverage-report" → download → parse

3. **DbStore** (`server/src/services/db-store.ts`) — métodos nuevos:
   - `addDeployRecord(entry)` — insert en `deploy_history`
   - `getLatestCoverage(project)` — última coverage no-zero del proyecto
   - `getCoverageHistory(project, limit?)` — historial para el chart

4. **Webhook handler** (`server/src/routes/webhooks.ts`) — expandir bloque `workflow_run`:
   - Detectar workflows de deploy por nombre
   - Llamar a `extractCoverageFromWorkflow`
   - Crear deploy record en `deploy_history`
   - Extraer environment, version, branch del payload

5. **Data service** (`server/src/services/data.ts`):
   - Inyectar `store` en `Services` interface
   - En `getProjects()`: consultar `store.getLatestCoverage(name)` para popular `project.coverage`
   - En `getProjectDetail()`: incluir `coverageHistory` desde `store.getCoverageHistory(name)`

6. **Tipos compartidos** (`packages/shared/src/types.ts`):
   - Añadir `CoverageDataPoint { date: string; coverage: number; commitSha: string }`
   - Añadir `coverageHistory?: CoverageDataPoint[]` a `ProjectDetailResponse`

**Archivos**:
- Modificar: `server/src/services/github.ts` (+2 métodos)
- Crear: `server/src/services/coverage.ts`
- Modificar: `server/src/services/db-store.ts` (+3 métodos)
- Modificar: `server/src/routes/webhooks.ts` (extracción en workflow_run)
- Modificar: `server/src/services/data.ts` (wire coverage desde DB)
- Modificar: `server/src/index.ts` (pasar store a services si es necesario)
- Modificar: `packages/shared/src/types.ts` (+CoverageDataPoint)

**Tests**: `server/src/services/__tests__/coverage.test.ts` — parsing de coverage-summary.json mock + cálculo de porcentaje. `server/src/services/__tests__/db-store-deploy.test.ts` — addDeployRecord, getLatestCoverage, getCoverageHistory con DB in-memory.

---

## PR-C2 — Audit log: endpoint API + página en dashboard

**Por qué**: Se escriben audit entries en cada operación (deploy, promote, rollback, delete, settings), pero no hay forma de verlas.

**Qué hacer**:

1. **Rutas** (`server/src/routes/audit.ts`) — nuevo:
   - `GET /api/audit` — query params `?resource=nombre&limit=50`
   - Retorna `store.getAuditLog(resource, limit)`

2. **Montar** en `server/src/index.ts`

3. **Tipos** (`packages/shared/src/types.ts`):
   - Mover `AuditEntry` de db-store.ts a shared (o re-exportar)
   - Añadir `AuditLogResponse`

4. **Dashboard hook** (`dashboard/src/hooks/queries.ts`):
   - `useAuditLog(resource?: string)`

5. **Página** (`dashboard/src/pages/AuditLog.tsx`):
   - Tabla con: timestamp, acción, recurso, detalle (JSON formateado), actor
   - Filtro por recurso (dropdown de proyectos)
   - Reusar componentes existentes: Card, Header, Badge

6. **Navegación**: Añadir ruta en `App.tsx` + enlace en `Sidebar.tsx`

**Archivos**:
- Crear: `server/src/routes/audit.ts`
- Modificar: `server/src/index.ts` (mount)
- Modificar: `packages/shared/src/types.ts` (+AuditEntry, AuditLogResponse)
- Modificar: `dashboard/src/hooks/queries.ts` (+useAuditLog)
- Crear: `dashboard/src/pages/AuditLog.tsx`
- Modificar: `dashboard/src/App.tsx` (ruta)
- Modificar: `dashboard/src/components/Sidebar.tsx` (nav item)

**Tests**: `server/src/routes/__tests__/audit.test.ts` — GET retorna entries, filtrado por resource funciona. Usar Hono test client + DB in-memory.

---

## PR-C3 — System settings dinámicos

**Por qué**: Settings.tsx hardcodea "veriel-cloud", "veriel.dev", "80%", "DES: 10 · PRE: 20 · PRO: all". Si cambian en el server, el dashboard muestra datos falsos.

**Qué hacer**:

1. **Constantes** (`server/src/constants.ts`):
   - Añadir `BUILD_RETENTION = { des: 10, pre: 20, pro: Infinity }`

2. **Endpoint** (`server/src/routes/system.ts`):
   - `GET /api/system/settings` — retorna objeto con org, baseDomain, coverageThreshold, buildRetention, templates, workflows (todo desde constants.ts)

3. **Tipos** (`packages/shared/src/types.ts`):
   - `SystemSettings` interface
   - `SystemSettingsResponse`

4. **Dashboard** (`dashboard/src/hooks/queries.ts`):
   - `useSystemSettings()`

5. **Settings.tsx**: Reemplazar strings hardcodeados con datos del hook. Skeleton mientras carga.

**Archivos**:
- Modificar: `server/src/constants.ts` (+BUILD_RETENTION)
- Modificar: `server/src/routes/system.ts` (+GET /settings)
- Modificar: `packages/shared/src/types.ts` (+SystemSettings)
- Modificar: `dashboard/src/hooks/queries.ts` (+useSystemSettings)
- Modificar: `dashboard/src/pages/Settings.tsx` (datos dinámicos)

**Tests**: `server/src/routes/__tests__/system.test.ts` — GET /settings retorna shape esperado.

---

## PR-C4 — Notificaciones expandidas (deploy_success, coverage_low)

**Depende de**: PR-C1 (necesita extracción de coverage)

**Por qué**: Solo se emite `workflow_failed`. Los tipos `deploy_success`, `deploy_failed`, `coverage_low` están definidos pero nunca se usan.

**Qué hacer**:

1. **Webhook handler** (`server/src/routes/webhooks.ts`) — expandir lógica post-B1:
   - Deploy workflow + success → `deploy_success` notification
   - Deploy workflow + failure → `deploy_failed` notification (más específico que `workflow_failed`)
   - Coverage extraída < threshold del proyecto → `coverage_low` notification
   - Helper `identifyDeployWorkflow(name)` → `{ isDeploy, environment }`

2. **Migración v4** (`server/src/lib/migrations.ts`):
   - Añadir `commit_sha TEXT` a notifications para deduplicación

3. **DbStore** (`server/src/services/db-store.ts`):
   - Actualizar `addNotification` con `commitSha?` opcional
   - Check de dedup: no emitir si ya existe notificación del mismo type+project+commit_sha

**Archivos**:
- Modificar: `server/src/routes/webhooks.ts` (expand notification logic)
- Modificar: `server/src/lib/migrations.ts` (+v4)
- Modificar: `server/src/services/db-store.ts` (dedup en addNotification)

**Tests**: `server/src/routes/__tests__/webhooks.test.ts` — webhook success genera deploy_success, coverage bajo genera coverage_low, no duplica.

---

## PR-C5 — Infraestructura de tests del dashboard

**Por qué**: Zero tests en el dashboard. Vitest config existe con jsdom pero no hay testing-library. Establecer patrón para futuros tests.

**Qué hacer**:

1. **Instalar dependencias**:
   ```
   pnpm --filter dashboard add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
   ```

2. **Vitest config** (`dashboard/vitest.config.ts`):
   - Añadir setupFiles, resolve alias

3. **Setup** (`dashboard/src/__tests__/setup.ts`):
   - Import `@testing-library/jest-dom/vitest`

4. **Test utils** (`dashboard/src/__tests__/test-utils.tsx`):
   - Wrapper con `QueryClientProvider` + `MemoryRouter`
   - Re-export render

5. **Primeros tests** (componentes puros, sin API):
   - `CoverageBar.test.tsx` — ancho y color correctos según threshold
   - `CoverageChart.test.tsx` — SVG con puntos, empty state
   - `EnvironmentBadge.test.tsx` — texto y clase por entorno

**Archivos**:
- Modificar: `dashboard/package.json` (+testing-library deps)
- Modificar: `dashboard/vitest.config.ts` (+setup, alias)
- Crear: `dashboard/src/__tests__/setup.ts`
- Crear: `dashboard/src/__tests__/test-utils.tsx`
- Crear: `dashboard/src/components/__tests__/CoverageBar.test.tsx`
- Crear: `dashboard/src/components/__tests__/CoverageChart.test.tsx`
- Crear: `dashboard/src/components/__tests__/EnvironmentBadge.test.tsx`

---

## Verificación global

1. `pnpm lint` sin errores
2. `pnpm test` pasa (server + dashboard)
3. `pnpm build` sin errores
4. Webhook `workflow_run` completed → coverage aparece en DB y dashboard
5. `/audit` en dashboard muestra log de operaciones
6. Settings page muestra datos del server, no hardcodeados
7. Notificaciones de deploy success y coverage low llegan al bell
