---
name: status
description: Muestra el estado de todos los proyectos o de uno en concreto
user_invocable: true
---

# /status

Muestra el estado actual de los proyectos gestionados por veriel-ops.

## Uso

```
/status                    # Estado de todos los proyectos
/status <proyecto>         # Estado detallado de un proyecto
/status <proyecto> <env>   # Estado de un entorno específico
```

## Comportamiento

### Sin parámetros — Vista general

Muestra una tabla con todos los proyectos:

```
Proyecto       | DES          | PRE          | PRO          | Cobertura
-------------- | ------------ | ------------ | ------------ | ---------
mi-sass        | v0.3.0 (✓)  | v0.2.0 (✓)  | v0.1.0 (✓)  | 87.3%
otro-proyecto  | v1.1.0 (✓)  | v1.0.0 (✓)  | v1.0.0 (✓)  | 92.1%
```

### Con proyecto — Vista detallada

Muestra:
- Estado de cada entorno: versión, commit, fecha de deploy, URL
- Últimas 5 builds por entorno
- Cobertura actual y tendencia
- PRs abiertos y estado de CI

### Con proyecto y entorno — Vista de entorno

Muestra:
- Detalle del deploy actual
- Histórico completo de builds
- Opción de rollback rápido

## Fuentes de datos

- GitHub API: repos, PRs, CI status
- Cloudflare API: deployments, estado
- R2: builds almacenadas y metadata
