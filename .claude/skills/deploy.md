---
name: deploy
description: Despliega un proyecto a un entorno (DES, PRE, PRO)
user_invocable: true
---

# /deploy

Despliega un proyecto a un entorno específico.

## Uso

```
/deploy <proyecto> <entorno>
/deploy mi-proyecto des
/deploy mi-proyecto pre
/deploy mi-proyecto pro
```

## Comportamiento

1. Validar que el proyecto está registrado en veriel-ops
2. Validar que el entorno es válido (des, pre, pro)
3. Si es PRE o PRO:
   - Ejecutar tests con cobertura
   - Verificar cobertura >= 80%
   - Si no supera el umbral, bloquear y mostrar el reporte
4. Ejecutar `pnpm build` en el proyecto
5. Desplegar a Cloudflare Pages
6. Almacenar build en R2 con metadata
7. Mostrar resultado: URL del deploy, versión, cobertura

## Parámetros

- `proyecto` (requerido): nombre del proyecto a desplegar
- `entorno` (requerido): `des`, `pre` o `pro`

## Notas

- Para PRO, se pide confirmación explícita antes de ejecutar
- Si se invoca sin parámetros, se pregunta interactivamente
