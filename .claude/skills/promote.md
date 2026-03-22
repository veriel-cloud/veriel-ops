---
name: promote
description: Promueve una build de un entorno al siguiente (DES→PRE o PRE→PRO)
user_invocable: true
---

# /promote

Promueve la build actual de un entorno al siguiente en el flujo de despliegue.

## Uso

```
/promote <proyecto> <entorno-origen>
/promote mi-sass des        # Promueve DES → PRE (crea branch release)
/promote mi-sass pre        # Promueve PRE → PRO (merge a main)
```

## Comportamiento

### DES → PRE

1. Verificar que DES tiene un deploy estable
2. Ejecutar tests con cobertura
3. Si cobertura >= 80%:
   - Crear branch `release/x.y.z` desde `develop`
   - Se triggerea automáticamente el deploy a PRE
4. Si cobertura < 80%: bloquear y mostrar reporte

### PRE → PRO

1. Verificar que PRE tiene un deploy estable
2. Verificar que todos los tests pasan y cobertura >= 80%
3. Pedir confirmación (es deploy a producción)
4. Crear PR de `release/x.y.z` → `main`
5. Si auto-merge habilitado, mergear
6. Se triggerea automáticamente el deploy a PRO
7. Crear tag `vx.y.z`

## Parámetros

- `proyecto` (requerido): nombre del proyecto
- `entorno-origen` (requerido): `des` o `pre`

## Notas

- No se puede promover de PRO (es el último entorno)
- La versión se calcula automáticamente por semver basado en los commits
