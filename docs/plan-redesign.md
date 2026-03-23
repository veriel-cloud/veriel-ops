# Plan — Rediseño completo del dashboard (estilo Vercel)

## Contexto

El dashboard actual tiene una UI básica que no cumple el estándar visual esperado (nivel Vercel/Cloudflare/Railway). Se necesita un rediseño completo con:
- Estilo minimalista tipo Vercel: limpio, espaciado, tipografía cuidada
- Todas las operaciones del sistema accesibles desde el dashboard (todo menos escribir código)
- Timeline de procesos largos (crear proyecto, deploy) similar a GitHub Actions
- Loading states profesionales (skeletons)
- Datos correctos y bien mapeados

## Referencia visual: Vercel

- Fondo oscuro pero no negro puro — tonos `#0a0a0a` / `#111`
- Sidebar estrecho, minimalista, solo iconos + labels cortos
- Cards con bordes muy sutiles (`border-white/5`)
- Tipografía Inter/Geist, tamaños pequeños, mucho tracking
- Badges redondeados con colores suaves
- Tablas limpias sin bordes visibles, solo separadores sutiles
- Mucho espacio en blanco entre secciones
- Acciones como botones pequeños, no llamativos
- Modales centrados con overlay blur

## Operaciones completas del dashboard

### Gestión de proyectos
| Operación | Endpoint | Página |
|-----------|----------|--------|
| Crear proyecto (Astro/React) | POST /api/projects | /projects/new |
| Eliminar proyecto (repo + Pages + DNS + R2) | DELETE /api/projects/:name | Modal en /projects/:name |
| Editar configuración (dominio, umbral, tipo) | PATCH /api/projects/:name | Modal en /projects/:name |
| Ver todos los proyectos | GET /api/projects | /projects |
| Ver detalle de proyecto | GET /api/projects/:name | /projects/:name |

### Despliegues
| Operación | Endpoint | Página |
|-----------|----------|--------|
| Ver estado DES/PRE/PRO | GET /api/projects/:name | /projects/:name |
| Promover DES → PRE | POST /api/projects/:name/promote | Modal en /projects/:name |
| Promover PRE → PRO | POST /api/projects/:name/promote | Modal en /projects/:name |
| Rollback a build anterior | POST /api/projects/:name/rollback | Modal en /projects/:name |
| Re-ejecutar deploy fallido | POST /api/actions/:repo/rerun | /projects/:name |
| Ver logs de deploy (GitHub Actions) | GET /api/actions/:repo/:runId/logs | /projects/:name/actions/:runId |

### Builds / Artefactos
| Operación | Endpoint | Página |
|-----------|----------|--------|
| Ver builds en R2 | GET /api/projects/:name/builds | /projects/:name |
| Descargar artefacto | GET /api/projects/:name/builds/:id/download | Botón en tabla |
| Eliminar builds manualmente | DELETE /api/projects/:name/builds/:id | Botón en tabla |

### DNS / Dominios
| Operación | Endpoint | Página |
|-----------|----------|--------|
| Ver subdominios | Incluido en detalle proyecto | /projects/:name |
| Añadir dominio custom | POST /api/projects/:name/domains | Modal en /projects/:name |
| Eliminar dominio | DELETE /api/projects/:name/domains/:id | Botón en tabla |

### Monitorización
| Operación | Endpoint | Página |
|-----------|----------|--------|
| Dashboard overview | GET /api/projects + /api/deploys | / |
| Feed de eventos (webhooks) | GET /api/events | / (sidebar o widget) |
| Estado de salud por entorno | Incluido en detalle proyecto | /projects/:name |
| Estado de conexiones | GET /api/system/status | /settings |

### Settings
| Operación | Página |
|-----------|--------|
| Configuración global | /settings |
| Variables de entorno (verificar) | /settings |
| Workflows disponibles | /settings |

## Timeline de procesos (estilo GitHub Actions)

Los procesos largos (crear proyecto, deploy, rollback) deben mostrar una timeline en tiempo real con:

```
┌─────────────────────────────────────────────────┐
│  Creando proyecto: test-app                      │
│                                                  │
│  ✓ Crear repositorio en GitHub         3.2s     │
│  ✓ Añadir package.json                 0.8s     │
│  ● Añadir workflows CI/CD...           ···      │
│  ○ Crear branch develop                          │
│  ○ Crear proyecto en Cloudflare Pages            │
│  ○ Configurar registros DNS                      │
│  ○ Añadir custom domains                         │
│                                                  │
│  Paso 3 de 7                                     │
└─────────────────────────────────────────────────┘
```

**Implementación**: El backend usa Server-Sent Events (SSE). El frontend se conecta con `EventSource` y actualiza la timeline en tiempo real. Cada paso envía un evento con `{ step, status, duration }`.

**Endpoint SSE**: `POST /api/projects/create-stream` — inicia la creación y devuelve un stream de eventos.

Se aplica también a:
- Rollback → `POST /api/projects/:name/rollback-stream`
- Eliminar proyecto → `DELETE /api/projects/:name/delete-stream`

## Páginas del dashboard

### / (Dashboard)
- Stats grid: proyectos, deploys, cobertura media, entornos activos, builds
- Lista de proyectos como tabla (estilo Vercel: nombre, estado entornos, dominio, último deploy)
- Últimos deploys como tabla
- Feed de actividad reciente (webhooks)

### /projects
- Tabla de proyectos con filtros y búsqueda
- Botón "New Project"
- Cada fila: nombre, tipo, badges DES/PRE/PRO, dominio, último deploy, cobertura

### /projects/new
- Formulario de creación en pasos
- Al submit: timeline SSE de progreso
- Al completar: resumen con URLs y botón "Ver proyecto"

### /projects/:name
- Header con nombre, tipo, repo, dominio
- 3 cards de entornos (DES/PRE/PRO) con estado, versión, commit, URL, acciones
- Botones: Promover, Rollback, Eliminar
- Tabs: Deploys | Actions | Builds | DNS | Settings
  - **Deploys**: tabla de deploys de Cloudflare
  - **Actions**: tabla de workflow runs de GitHub con estado, expandible para ver jobs/steps
  - **Builds**: tabla de artefactos en R2 con descargar/rollback
  - **DNS**: registros CNAME actuales + añadir dominio custom
  - **Settings**: umbral cobertura, tipo proyecto, eliminar proyecto

### /projects/:name/actions/:runId
- Detalle de un workflow run
- Jobs y steps expandibles con estado (similar a GitHub Actions)
- Duración por step
- Re-run button

### /deploys
- Tabla global de todos los deploys
- Filtros: por proyecto, por entorno, por estado
- Stats: total, exitosos, fallidos, duración media

### /settings
- General: org, dominio base, cobertura mínima
- Estado del sistema: checks de GitHub API, Cloudflare, R2 con latencia
- Variables de entorno: listado con estado configurado/no configurado
- Workflows: listado de workflows disponibles en .github

## Estructura de archivos (lo que cambia)

### Nuevos endpoints backend
```
server/routes/
├── projects.ts     # Añadir: DELETE, PATCH, create-stream (SSE), delete-stream
├── domains.ts      # Nuevo: POST/DELETE dominios
├── builds.ts       # Nuevo: DELETE build, GET download
└── actions.ts      # Añadir: POST rerun
```

### Nuevas páginas frontend
```
src/pages/
├── Dashboard.tsx       # Rediseño completo
├── Projects.tsx        # Rediseño completo
├── ProjectDetail.tsx   # Rediseño con tabs
├── NewProject.tsx      # Rediseño con SSE timeline
├── ActionDetail.tsx    # Nueva: detalle de workflow run
├── Deploys.tsx         # Rediseño con filtros
└── Settings.tsx        # Rediseño
```

### Nuevos componentes
```
src/components/
├── ui/
│   ├── Tabs.tsx            # Componente de tabs
│   ├── Select.tsx          # Select/dropdown
│   ├── Input.tsx           # Input reutilizable
│   ├── EmptyState.tsx      # Estado vacío reutilizable
│   └── Toast.tsx           # Notificaciones
├── ActivityFeed.tsx        # Feed de eventos webhook
├── EnvironmentCard.tsx     # Card de entorno con acciones
├── ActionRunRow.tsx        # Fila de workflow run
├── ActionJobSteps.tsx      # Jobs/steps expandibles
├── DomainTable.tsx         # Tabla de dominios
├── ProjectDeleteModal.tsx  # Modal eliminar proyecto (con timeline)
├── PromoteModal.tsx        # Modal promover
├── RollbackModal.tsx       # Modal rollback con selector de build
└── FilterBar.tsx           # Barra de filtros para deploys
```

## Orden de implementación

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | Rediseñar sistema de estilos base (colores Vercel, tipografía, componentes ui) | Alta |
| 2 | Rediseñar Layout + Sidebar | Alta |
| 3 | Rediseñar Dashboard (overview) | Alta |
| 4 | Rediseñar Projects (tabla con filtros) | Alta |
| 5 | Implementar SSE en backend para crear proyecto | Alta |
| 6 | Rediseñar NewProject con timeline SSE real | Alta |
| 7 | Rediseñar ProjectDetail con tabs | Alta |
| 8 | Implementar EnvironmentCard con acciones (promover, rollback) | Alta |
| 9 | Implementar modales (Promote, Rollback, Delete) | Alta |
| 10 | Implementar ActionDetail (workflow run expandible) | Media |
| 11 | Implementar gestión de dominios (tabla + añadir/eliminar) | Media |
| 12 | Rediseñar Deploys con filtros | Media |
| 13 | Rediseñar Settings con estado real | Media |
| 14 | ActivityFeed (eventos webhook) | Media |
| 15 | Toast/notificaciones para acciones | Baja |
| 16 | Nuevos endpoints backend (DELETE project, PATCH, rerun, domains, builds download/delete) | Junto con cada feature |

## Verificación

1. `pnpm dev` arranca frontend + backend
2. Dashboard estilo Vercel, limpio y profesional
3. Crear proyecto muestra timeline SSE paso a paso en tiempo real
4. ProjectDetail con tabs funcionales (Deploys, Actions, Builds, DNS, Settings)
5. Promover y rollback desde modales funciona
6. Detalle de Actions con jobs/steps expandibles
7. Todos los datos correctos (sin duplicados, entornos correctos)
8. Skeletons en todas las cargas
9. `pnpm build` compila sin errores
