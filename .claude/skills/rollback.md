---
name: rollback
description: Revierte un entorno a una build anterior
user_invocable: true
---

# /rollback

Revierte un entorno de un proyecto a una build anterior almacenada en R2.

## Uso

```
/rollback <proyecto> <entorno>
/rollback mi-proyecto pro
```

## Comportamiento

1. Validar proyecto y entorno
2. Listar las últimas builds disponibles en R2 para ese entorno
3. Mostrar lista con: versión, commit, fecha, cobertura
4. El usuario selecciona la build destino
5. Pedir confirmación (doble confirmación para PRO)
6. Descargar artefacto de R2
7. Redesplegar en Cloudflare Pages
8. Verificar que el deploy responde correctamente
9. Registrar el rollback en el histórico

## Parámetros

- `proyecto` (requerido): nombre del proyecto
- `entorno` (requerido): `des`, `pre` o `pro`
