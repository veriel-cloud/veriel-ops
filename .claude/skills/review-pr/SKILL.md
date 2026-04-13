---
name: review-pr
description: Revisa un PR de GitHub con el checklist del proyecto
user-invocable: true
argument-hint: "<pr-number>"
---

# /review-pr

Revisa un Pull Request aplicando las convenciones de veriel-ops.

## Uso

```
/review-pr 42
/review-pr https://github.com/veriel-dev/veriel-ops/pull/42
```

## Proceso

1. Obtener diff del PR: `gh pr diff $ARGUMENTS`
2. Obtener descripcion y commits: `gh pr view $ARGUMENTS`
3. Revisar cada archivo modificado

## Checklist

### Bloqueantes
- [ ] Sin modulos `node:*` en server/
- [ ] Sin `any` / `unknown` innecesarios
- [ ] Sin secretos hardcodeados
- [ ] Sin vulnerabilidades de seguridad
- [ ] Input validado en endpoints
- [ ] Sin imports barrel de iconos

### Importantes
- [ ] Tipos correctos e inferidos
- [ ] Handlers delgados, logica en servicios
- [ ] TanStack Query para data fetching (no useEffect)
- [ ] Error handling consistente
- [ ] HTML semantico y accesible
- [ ] Tests cubren los cambios

### PR quality
- [ ] Titulo descriptivo y conciso
- [ ] Cambios enfocados (no mezcla features)
- [ ] Commits con mensajes claros

## Formato de salida

```markdown
## Review — PR #$ARGUMENTS

### Bloqueantes
(lista o "Ninguno")

### Importantes
(lista o "Ninguno")

### Sugerencias
(lista o "Ninguna")

### Veredicto: APROBADO / CAMBIOS REQUERIDOS
```
