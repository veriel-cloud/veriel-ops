---
name: debug
description: Workflow estructurado para diagnosticar y resolver bugs
user-invocable: true
argument-hint: "<descripcion del bug>"
---

# /debug

Diagnostica y resuelve un bug de forma estructurada.

## Uso

```
/debug el endpoint /api/projects devuelve 500
/debug el dashboard no muestra los deploys recientes
/debug los tests de webhook-cache fallan intermitentemente
```

## Proceso

### 1. Reproducir
- Identificar el area afectada (server, dashboard, shared)
- Buscar el codigo relevante
- Intentar reproducir: ejecutar test, curl al endpoint, o leer logs

### 2. Aislar
- Leer el stack trace o mensaje de error
- Trazar el flujo desde el entry point hasta el punto de fallo
- Identificar la linea exacta donde falla
- Verificar tipos, valores nulos, y edge cases

### 3. Diagnosticar
- Determinar la causa raiz (no el sintoma)
- Verificar si es un problema de:
  - Tipos (TypeScript no lo captura)
  - Estado (race condition, cache stale)
  - API externa (respuesta inesperada)
  - Configuracion (env vars, rutas)
  - Logica (condicion incorrecta, off-by-one)

### 4. Corregir
- Aplicar el fix minimo necesario
- Verificar que no rompe otros flujos
- Anadir o actualizar test que cubra el caso

### 5. Verificar
- Ejecutar `pnpm test` para confirmar que todo pasa
- Ejecutar `pnpm lint` para verificar que no hay regresiones
- Confirmar que el bug original esta resuelto

## Reglas

- NO adivinar — leer el codigo antes de proponer fix
- NO aplicar fixes shotgun (cambiar varias cosas a ver que funciona)
- Siempre anadir test que prevenga regresion
