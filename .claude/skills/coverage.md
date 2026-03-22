---
name: coverage
description: Ejecuta y analiza la cobertura de tests de un proyecto
user_invocable: true
---

# /coverage

Ejecuta los tests con cobertura y muestra un análisis detallado.

## Uso

```
/coverage <proyecto>
/coverage mi-sass
```

## Comportamiento

1. Navegar al directorio del proyecto
2. Ejecutar `pnpm vitest run --coverage`
3. Parsear el reporte de cobertura
4. Mostrar resumen:

```
## Cobertura — mi-sass

Estado: PASS (85.2% >= 80%)

| Métrica      | Valor  | Umbral | Estado |
|------------- |--------|--------|--------|
| Statements   | 85.2%  | 80%    | PASS   |
| Branches     | 81.0%  | 80%    | PASS   |
| Functions    | 90.0%  | 80%    | PASS   |
| Lines        | 84.7%  | 80%    | PASS   |

Archivos con menor cobertura:
- src/utils/parser.ts — 45.2%
- src/api/handler.ts — 62.1%
```

5. Si hay build anterior, mostrar diff de cobertura
6. Indicar si el proyecto pasaría el gate para PRE/PRO

## Parámetros

- `proyecto` (requerido): nombre del proyecto a analizar
