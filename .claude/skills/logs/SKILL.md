---
name: logs
description: Consulta y analiza logs del servidor o de GitHub Actions
user-invocable: true
argument-hint: "[server|actions] [filtro]"
---

# /logs

Consulta y analiza logs del servidor o de los workflows de GitHub Actions.

## Uso

```
/logs server                    # Ultimos logs del servidor
/logs server error              # Solo logs de error
/logs actions                   # Ultimos workflow runs
/logs actions mi-proyecto       # Workflows de un proyecto especifico
/logs actions 12345             # Log de un run especifico
```

## Comportamiento

### `server`
1. Leer los archivos de log del servidor en `server/logs/` o stdout
2. Filtrar por nivel (error, warn, info) si se especifica
3. Parsear logs estructurados (JSON)
4. Mostrar resumen: ultimos N eventos, errores recientes, patrones

### `actions`
1. Listar ultimos workflow runs: `gh run list --limit 10`
2. Si se especifica proyecto: filtrar por workflow
3. Si se especifica run ID: `gh run view <id> --log`
4. Mostrar: estado, duracion, branch, commit, errores si los hay

## Formato de salida

```markdown
## Logs — $ARGUMENTS

### Resumen
- Periodo: ultimas 2 horas
- Total eventos: 142
- Errores: 3
- Warnings: 12

### Errores recientes
| Timestamp | Mensaje | Contexto |
|-----------|---------|----------|
| ... | ... | ... |

### Patrones detectados
- (si hay errores repetidos o patrones anomalos)
```
