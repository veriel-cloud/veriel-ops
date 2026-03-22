# Especificación — veriel-ops

Sistema centralizado de DevOps para la gestión del ciclo de vida de despliegue de proyectos web.

---

## 1. Visión general

veriel-ops es una plataforma que centraliza la gestión de múltiples proyectos web independientes, proporcionando:

- Un flujo de despliegue estandarizado: **DES → PRE → PRO**
- Almacenamiento de builds para rollback instantáneo
- Gates de calidad basados en cobertura de tests
- Gestión automática de subdominios
- Un dashboard central para monitorizar y operar todos los proyectos

## 2. Arquitectura

### 2.1 Repositorios

```
GitHub Organization (veriel-dev)
│
├── .github/                    # Workflows reutilizables compartidos
├── veriel-ops/                 # Este proyecto (dashboard + scripts + config)
├── proyecto-1/                 # Repo independiente
├── proyecto-2/                 # Repo independiente
└── proyecto-n/                 # Repo independiente
```

- Cada proyecto tiene su propio repositorio
- Todos los proyectos consumen los workflows reutilizables del repo `.github`
- veriel-ops actúa como centro de control

### 2.2 Infraestructura

| Servicio | Proveedor | Uso |
|----------|-----------|-----|
| Hosting frontend | Cloudflare Pages | Deploy por entorno |
| Almacenamiento builds | Cloudflare R2 | Artefactos + rollback |
| DNS | Cloudflare DNS | Subdominios automáticos |
| CI/CD | GitHub Actions | Pipelines reutilizables |
| Repositorios | GitHub | Código fuente |
| Cobertura | Vitest + coverage | Gate de calidad |

---

## 3. Flujo de despliegue

### 3.1 Entornos

| Entorno | Propósito | Branch | Trigger |
|---------|-----------|--------|---------|
| DES (Desarrollo) | Validación continua | `develop` | Push automático |
| PRE (Pre-producción) | Validación pre-release | `release/x.y.z` | Creación de branch |
| PRO (Producción) | Público | `main` | Merge de release |

### 3.2 Flujo de branches

```
feature/* ──PR──▶ develop ──────────▶ DES (auto-deploy)
                      │
                      ▼
                  release/x.y.z ───▶ PRE (deploy si cobertura >= 80%)
                      │
                      ▼ (merge a main tras validación)
                    main ──────────▶ PRO (deploy si cobertura >= 80%)
```

### 3.3 Gates de calidad

Antes de desplegar a PRE o PRO, se verifican obligatoriamente:

1. **Cobertura de tests >= 80%** — si no se supera, el deploy se bloquea
2. **Tests pasando al 100%** — ningún test puede fallar
3. **Lint sin errores** — el código debe cumplir las reglas de linting
4. **Build exitoso** — el proyecto debe compilar sin errores

---

## 4. Gestión de dominios

### 4.1 Dominio base

- Dominio principal: `veriel.dev` (ya configurado en Cloudflare)

### 4.2 Esquema de subdominios

Por defecto, cada proyecto recibe subdominios bajo `veriel.dev`:

```
<proyecto>.veriel.dev              → PRO
dev.<proyecto>.veriel.dev          → DES
pre.<proyecto>.veriel.dev          → PRE
```

### 4.3 Dominios custom

Para proyectos que requieren su propio dominio:

```
<dominio-custom>.com               → PRO
dev.<dominio-custom>.com           → DES
pre.<dominio-custom>.com           → PRE
```

El dominio custom debe estar añadido a Cloudflare previamente.

### 4.4 Automatización DNS

Al registrar un proyecto nuevo en veriel-ops:

1. Se crean los registros CNAME en Cloudflare DNS via API
2. Se configuran los custom domains en Cloudflare Pages
3. Los registros apuntan al deployment de Cloudflare Pages correspondiente

---

## 5. Almacenamiento de builds

### 5.1 Estructura en R2

```
veriel-ops-builds/                          # Bucket R2
└── <proyecto>/
    ├── des/
    │   └── <timestamp>_<commit-sha>.tar.gz
    ├── pre/
    │   └── v<x.y.z>_<commit-sha>.tar.gz
    └── pro/
        └── v<x.y.z>_<commit-sha>.tar.gz
```

### 5.2 Metadata por build

Cada build almacena metadata asociada:

```json
{
  "project": "nombre-proyecto",
  "environment": "des|pre|pro",
  "version": "x.y.z",
  "commitSha": "abc123",
  "branch": "develop|release/x.y.z|main",
  "timestamp": "2026-03-22T10:00:00Z",
  "coverage": 85.2,
  "buildDuration": 45,
  "deployer": "github-actions"
}
```

### 5.3 Rollback

- Desde el dashboard se puede seleccionar cualquier build anterior y redesplegarla
- El rollback ejecuta un redeploy de la build almacenada en R2
- Se crea un registro en el histórico indicando que fue un rollback

### 5.4 Retención

- **DES**: últimas 10 builds (rotación automática)
- **PRE**: últimas 20 builds
- **PRO**: todas (sin límite, retención permanente)

---

## 6. Cobertura de tests

### 6.1 Configuración

- Herramienta: Vitest con `--coverage`
- Umbral mínimo global: **80%**
- Configurable por proyecto si se necesita un umbral diferente (siempre >= 80%)

### 6.2 Flujo

1. En cada PR, los tests se ejecutan automáticamente
2. El reporte de cobertura se publica como comentario en el PR
3. Si la cobertura está por debajo del 80%, el PR no se puede mergear a `release/*` ni a `main`
4. La cobertura se almacena como metadata junto a la build

### 6.3 Reporte

El comment en el PR incluye:

- Porcentaje de cobertura global
- Cobertura por archivo modificado
- Diff de cobertura vs la última build del entorno destino
- Indicador visual (pass/fail) del umbral

---

## 7. Dashboard

### 7.1 Stack

- **Framework**: Astro
- **Estilos**: Tailwind CSS
- **Iconos**: tabler-icons
- **APIs consumidas**: GitHub API, Cloudflare API, Cloudflare R2

### 7.2 Funcionalidades

#### Vista principal — Listado de proyectos

- Lista de todos los proyectos registrados
- Estado de cada entorno (DES/PRE/PRO): último deploy, versión, fecha
- Indicador de salud: cobertura, estado del último build
- Filtros y búsqueda

#### Vista de proyecto — Detalle

- Estado detallado de los tres entornos
- Histórico de deploys con: versión, commit, fecha, cobertura, duración
- Gráfico de evolución de cobertura
- Acciones: rollback, redeploy, ver logs

#### Vista de deploy — Detalle de build

- Commit asociado, branch, autor
- Resultado de tests y cobertura desglosada
- Enlace al artefacto en R2
- Enlace al PR/commit en GitHub

#### Acciones disponibles

- **Rollback**: seleccionar una build anterior y redesplegarla
- **Promover**: mover una build de DES a PRE, o de PRE a PRO
- **Registrar proyecto**: dar de alta un nuevo proyecto en el sistema
- **Configurar dominio**: asignar subdominio o dominio custom

### 7.3 Autenticación

- Acceso protegido (definir mecanismo: Cloudflare Access, GitHub OAuth, o similar)
- Solo usuarios autorizados pueden ejecutar acciones (rollback, deploy, registrar)

---

## 8. Workflows reutilizables

### 8.1 Listado de workflows

| Workflow | Trigger | Descripción |
|----------|---------|-------------|
| `ci.yml` | PR abierto/actualizado | Lint + tests + cobertura + comment en PR |
| `deploy-des.yml` | Push a `develop` | Build + deploy a DES + guardar artefacto en R2 |
| `deploy-pre.yml` | Push a `release/*` | Gate cobertura + build + deploy a PRE + guardar artefacto |
| `deploy-pro.yml` | Merge a `main` | Gate cobertura + build + deploy a PRO + guardar artefacto + tag |
| `rollback.yml` | Manual (workflow_dispatch) | Descarga build de R2 y redeploy al entorno indicado |
| `setup-dns.yml` | Manual (workflow_dispatch) | Crea registros DNS en Cloudflare para un proyecto nuevo |
| `cleanup-builds.yml` | Cron (semanal) | Aplica política de retención de builds en R2 |

### 8.2 Secrets requeridos

| Secret | Uso |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | Deploy a Pages + gestión DNS + acceso R2 |
| `CLOUDFLARE_ACCOUNT_ID` | Identificación de la cuenta |
| `R2_ACCESS_KEY_ID` | Acceso al bucket R2 |
| `R2_SECRET_ACCESS_KEY` | Acceso al bucket R2 |

---

## 9. Registro de un proyecto nuevo

Cuando se registra un proyecto nuevo en veriel-ops:

1. Se añade a la configuración del sistema (archivo de registro o base de datos)
2. Se crean los registros DNS automáticamente:
   - `dev.<proyecto>.veriel.dev`
   - `pre.<proyecto>.veriel.dev`
   - `<proyecto>.veriel.dev`
3. Se configura Cloudflare Pages con los custom domains
4. Se añade el workflow caller al repo del proyecto (referencia a los workflows reutilizables)
5. Se crea la estructura de carpetas en R2: `<proyecto>/des/`, `<proyecto>/pre/`, `<proyecto>/pro/`
6. El proyecto aparece en el dashboard

---

## 10. Tipos de proyectos soportados

| Tipo | Ejemplo | Build command |
|------|---------|---------------|
| Astro (estático) | Landing, portfolio | `pnpm build` |
| Astro (SSR) | Micro-SaaS con API | `pnpm build` |
| React (SPA) | Aplicación cliente | `pnpm build` |
| Backend (API) | Express, Hono, etc. | `pnpm build` (Cloudflare Workers) |

El workflow detecta el tipo de proyecto por su configuración (`astro.config.*`, `vite.config.*`, `wrangler.toml`) y adapta el build/deploy.

---

## 11. Fases de implementación

### Fase 1 — Cimientos
- Repo `.github` con workflows reutilizables
- Workflow de CI (tests + cobertura + gate)
- Workflow de deploy a DES

### Fase 2 — Flujo completo
- Workflows de deploy a PRE y PRO
- Almacenamiento de builds en R2
- Workflow de rollback
- Gestión DNS automática

### Fase 3 — Dashboard
- App Astro con panel central
- Integración con GitHub API y Cloudflare API
- Listado de proyectos y estado por entorno
- Histórico de deploys y rollback desde UI

### Fase 4 — Pulido
- Notificaciones (Slack, email, webhook)
- Métricas y gráficos de cobertura
- Configuración avanzada por proyecto
- Documentación de uso
