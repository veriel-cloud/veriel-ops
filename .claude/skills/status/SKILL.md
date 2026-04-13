---
name: status
description: Muestra el estado de todos los proyectos o de uno en concreto
user-invocable: true
argument-hint: "[proyecto] [entorno]"
---

# /status

Muestra el estado actual de los proyectos gestionados por veriel-ops.

## Uso

```
/status                    # Estado de todos los proyectos
/status <proyecto>         # Estado detallado de un proyecto
/status <proyecto> <env>   # Estado de un entorno especifico
```

## Comportamiento

### Sin parametros — Vista general

Muestra una tabla con todos los proyectos:

```
Proyecto       | DES          | PRE          | PRO          | Cobertura
-------------- | ------------ | ------------ | ------------ | ---------
mi-sass        | v0.3.0 (ok)  | v0.2.0 (ok)  | v0.1.0 (ok)  | 87.3%
otro-proyecto  | v1.1.0 (ok)  | v1.0.0 (ok)  | v1.0.0 (ok)  | 92.1%
```

### Con proyecto — Vista detallada

Muestra:
- Estado de cada entorno: version, commit, fecha de deploy, URL
- Ultimas 5 builds por entorno
- Cobertura actual y tendencia
- PRs abiertos y estado de CI

### Con proyecto y entorno — Vista de entorno

Muestra:
- Detalle del deploy actual
- Historico completo de builds
- Opcion de rollback rapido

## Fuentes de datos

- GitHub API: repos, PRs, CI status
- Cloudflare API: deployments, estado
- R2: builds almacenadas y metadata
