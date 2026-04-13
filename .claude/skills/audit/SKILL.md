---
name: audit
description: Audita el codigo del proyecto buscando problemas de seguridad, calidad, rendimiento y convenciones
user-invocable: true
argument-hint: "[server|dashboard|all]"
---

# /audit

Ejecuta una auditoria completa del codigo del proyecto.

## Uso

```
/audit              # Audita todo el proyecto
/audit server       # Solo server/
/audit dashboard    # Solo dashboard/
```

## Proceso

### 1. Seguridad

- Buscar secretos hardcodeados (API keys, tokens, passwords)
- Verificar que no hay inyeccion SQL, XSS o command injection
- Comprobar validacion de input en endpoints publicos
- Revisar CORS y headers de seguridad
- Verificar que las env vars sensibles no se exponen al cliente

### 2. Convenciones del proyecto

- **server/**: sin modulos `node:*`, solo APIs nativas de Bun
- **dashboard/**: sin `useEffect` para datos, usar TanStack Query
- **Ambos**: sin `any`, sin barrels de iconos, TypeScript estricto
- Verificar que Biome no reporta errores: `pnpm lint`

### 3. Calidad

- Archivos con mas de 300 lineas — candidatos a split
- Funciones con mas de 50 lineas — candidatas a refactor
- Codigo duplicado significativo
- Imports sin usar
- Exports sin consumir

### 4. Rendimiento

- Renders innecesarios en React (props inestables, callbacks sin memoizar)
- Queries sin staleTime adecuado
- Operaciones sincronas bloqueantes en server
- Llamadas N+1 a APIs externas

## Formato de salida

```markdown
## Auditoria — $ARGUMENTS

### Seguridad (X hallazgos)

- ...

### Convenciones (X hallazgos)

- ...

### Calidad (X hallazgos)

- ...

### Rendimiento (X hallazgos)

- ...

### Resumen

- Total: X hallazgos (Y criticos, Z importantes, W sugerencias)
```
