# Proceso manual — Setup del proyecto piloto (pilot-app)

Documento que recoge paso a paso todo el proceso manual realizado para configurar el primer proyecto en el sistema veriel-ops. Este proceso es el que se automatizará completamente desde el dashboard.

---

## Pre-requisitos completados

Antes de empezar con el proyecto piloto, se configuraron estos elementos una sola vez:

### 1. Organización GitHub

- Se creó la organización **veriel-cloud** desde la cuenta personal `veriel-dev`
- Plan Free (repos públicos)
- URL: `github.com/veriel-cloud`

### 2. Secrets de la organización

Se añadieron en **GitHub → veriel-cloud → Settings → Secrets → Actions**:

| Secret | Origen |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → Profile → API Tokens → Custom Token (permisos: Zone DNS Edit, Zone Read, Pages Edit, R2 Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Dashboard → cualquier dominio → panel derecho → API → Account ID |
| `CLOUDFLARE_ZONE_ID` | Cloudflare → Dashboard → veriel.dev → panel derecho → API → Zone ID |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 → Manage R2 API Tokens → Create API Token → Object Read & Write |
| `R2_SECRET_ACCESS_KEY` | Mismo paso que el anterior |

### 3. Bucket R2

- Se creó el bucket **veriel-ops-builds** en Cloudflare R2
- Almacena los artefactos de build de todos los proyectos

### 4. Repo .github (workflows reutilizables)

- Se creó el repo **veriel-cloud/.github** con todos los workflows reutilizables
- Contiene: `ci.yml`, `deploy-des.yml`, `deploy-pre.yml`, `deploy-pro.yml`, `rollback.yml`, `setup-dns.yml`, `cleanup-builds.yml`

```bash
cd ~/Proyectos/veriel-ops/.github-org
gh repo create veriel-cloud/.github --public --description "Reusable CI/CD workflows for veriel-cloud organization"
git remote add origin https://github.com/veriel-cloud/.github.git
git push -u origin main
```

### 5. Autorización Cloudflare ↔ GitHub

- Desde Cloudflare Pages → Connect to Git → se autorizó acceso a la organización `veriel-cloud`
- Esto se hace una sola vez. Desde **github.com/settings/installations** → Cloudflare Pages → Configure → dar acceso a la org

---

## Proceso del proyecto piloto

### Paso 1 — Crear el proyecto

```bash
cd ~/Proyectos
pnpm create astro@latest pilot-app -- --template minimal --typescript strict --install --git
```

### Paso 2 — Crear los workflow callers

```bash
cd ~/Proyectos/pilot-app
mkdir -p .github/workflows
```

Se crearon 5 archivos en `.github/workflows/`:

**ci.yml**
```yaml
name: CI
on:
  pull_request:
    branches: [develop, main, "release/**"]
jobs:
  ci:
    uses: veriel-cloud/.github/.github/workflows/ci.yml@main
    with:
      coverage_threshold: 80
```

**deploy-des.yml**
```yaml
name: Deploy DES
on:
  push:
    branches: [develop]
jobs:
  deploy:
    uses: veriel-cloud/.github/.github/workflows/deploy-des.yml@main
    with:
      project_name: "pilot-app"
    secrets: inherit
```

**deploy-pre.yml**
```yaml
name: Deploy PRE
on:
  push:
    branches: ["release/**"]
permissions:
  contents: write
  pull-requests: write
jobs:
  deploy:
    uses: veriel-cloud/.github/.github/workflows/deploy-pre.yml@main
    with:
      project_name: "pilot-app"
      coverage_threshold: 80
    secrets: inherit
```

**deploy-pro.yml**
```yaml
name: Deploy PRO
on:
  push:
    branches: [main]
permissions:
  contents: write
  pull-requests: write
jobs:
  deploy:
    uses: veriel-cloud/.github/.github/workflows/deploy-pro.yml@main
    with:
      project_name: "pilot-app"
      coverage_threshold: 80
    secrets: inherit
```

**rollback.yml**
```yaml
name: Rollback
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options: [des, pre, pro]
      build_artifact:
        description: "Build artifact name (e.g., v1.2.0_abc1234)"
        required: true
        type: string
jobs:
  rollback:
    uses: veriel-cloud/.github/.github/workflows/rollback.yml@main
    with:
      project_name: "pilot-app"
      environment: ${{ inputs.environment }}
      build_artifact: ${{ inputs.build_artifact }}
    secrets: inherit
```

> **Nota**: `deploy-pre.yml` y `deploy-pro.yml` necesitan `permissions: contents: write, pull-requests: write` porque el CI anidado escribe comentarios de cobertura en PRs.

### Paso 3 — Crear repo en la organización

```bash
gh repo create veriel-cloud/pilot-app --public --source=. --push
```

### Paso 4 — Configurar rama por defecto y crear develop

El scaffold de Astro creó la rama como `master`. Se renombró a `main`:

```bash
git checkout master
git branch -m master main
git push -u origin main
gh repo edit veriel-cloud/pilot-app --default-branch main
git push origin --delete master
```

Crear branch `develop`:

```bash
git checkout -b develop
git push -u origin develop
```

### Paso 5 — Crear proyecto en Cloudflare Pages

1. Ir a **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Seleccionar organización **veriel-cloud** y repo **pilot-app**
3. Configuración del build:
   - **Production branch**: `main`
   - **Framework preset**: `Astro`
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
4. Click en **Save and Deploy**
5. Esperar al primer deploy
6. URL generada: `pilot-app.pages.dev`

Después, cambiar la production branch si era `master`:
- **Workers & Pages** → **pilot-app** → **Settings** → **Builds & deployments** → Production branch: `main`

### Paso 6 — Configurar DNS (subdominios)

Desde **dash.cloudflare.com** → **veriel.dev** → **DNS** → **Records** → **Add record**:

| Type | Name | Target |
|------|------|--------|
| CNAME | `dev.pilot-app` | `pilot-app.pages.dev` |
| CNAME | `pre.pilot-app` | `pilot-app.pages.dev` |
| CNAME | `pilot-app` | `pilot-app.pages.dev` |

Proxy activado (nube naranja) en los 3.

### Paso 7 — Asociar custom domains en Cloudflare Pages

**Workers & Pages** → **pilot-app** → **Custom domains** → **Set up a custom domain**:

- `pilot-app.veriel.dev`
- `dev.pilot-app.veriel.dev`
- `pre.pilot-app.veriel.dev`

Esperar a que los 3 estén en estado **Activo** (certificados SSL).

### Paso 8 — Añadir tests y cobertura

Para que el gate de cobertura (80%) permita deploys a PRE y PRO:

```bash
pnpm add -D vitest @vitest/coverage-v8 @astrojs/check typescript
```

Añadir scripts al `package.json`:
```json
{
  "scripts": {
    "lint": "astro check",
    "typecheck": "astro check",
    "test": "vitest run --coverage"
  }
}
```

Crear `vitest.config.ts` con coverage provider v8 y thresholds al 80%.

Crear lógica en `src/lib/` y tests en `src/__tests__/`.

Añadir `"packageManager": "pnpm@10.6.2"` al `package.json` (requerido por GitHub Actions).

---

## Validación del flujo completo

### DES — Push a develop

```bash
git checkout develop
git add .
git commit -m "feat: add something"
git push
```

- Workflow `deploy-des.yml` se ejecuta automáticamente
- Build se almacena en R2: `pilot-app/des/`
- Deploy a: `https://dev.pilot-app.veriel.dev`

### PRE — Crear release

```bash
git checkout develop
git checkout -b release/0.1.0
git push -u origin release/0.1.0
```

- Workflow `deploy-pre.yml` se ejecuta automáticamente
- Gate: lint + typecheck + tests + cobertura >= 80%
- Si pasa: build en R2 + deploy a `https://pre.pilot-app.veriel.dev`
- Si no pasa: deploy bloqueado

### PRO — Merge release a main

```bash
git checkout main
git merge release/0.1.0
git push
```

- Workflow `deploy-pro.yml` se ejecuta automáticamente
- Gate: mismos checks que PRE
- Si pasa: build en R2 + deploy a `https://pilot-app.veriel.dev` + tag `vx.y.z`

### Rollback

Desde **GitHub → Actions → Rollback → Run workflow**:
- Seleccionar entorno (des/pre/pro)
- Indicar nombre del artefacto (ej: `v0.1.0_8ff58a6`)
- Se descarga de R2 y se redespliega

---

## Errores encontrados y solucionados

| Error | Causa | Solución |
|-------|-------|----------|
| `No pnpm version is specified` | Faltaba `packageManager` en package.json | Añadir `"packageManager": "pnpm@10.6.2"` |
| `Node.js v20 is not supported by Astro` | Workflows usaban Node 20 por defecto | Cambiar default a `"22"` en los workflows reutilizables |
| `tar: build-metadata.json: Cannot stat` | El tar buscaba el archivo dentro de `dist` | Copiar `build-metadata.json` a `dist/` antes del tar |
| `requesting pull-requests: write but only allowed none` | Permisos de PR en workflow reutilizable anidado | Mover `permissions` al workflow caller del proyecto |

---

## Resultado final

| Entorno | URL | Estado |
|---------|-----|--------|
| DES | `https://dev.pilot-app.veriel.dev` | Desplegado |
| PRE | `https://pre.pilot-app.veriel.dev` | Desplegado |
| PRO | `https://pilot-app.veriel.dev` | Desplegado |

Build almacenada en R2: `veriel-ops-builds/pilot-app/des/`, `pilot-app/pre/`, `pilot-app/pro/`

---

## Lo que se automatizará

Todo lo descrito en los pasos 1-8 se automatizará desde el dashboard. El usuario solo tendrá que:

1. Abrir el dashboard
2. Click en "Nuevo proyecto"
3. Indicar nombre, tipo y dominio
4. El sistema hace todo lo demás

Los deploys (DES→PRE→PRO) ya son automáticos desde el momento en que el proyecto está configurado.
