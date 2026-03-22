---
name: new-project
description: Registra y configura un nuevo proyecto en veriel-ops
user_invocable: true
---

# /new-project

Registra un nuevo proyecto en el sistema veriel-ops, configurando repo, DNS, Cloudflare Pages y R2.

## Uso

```
/new-project <nombre>
/new-project mi-sass
/new-project mi-sass --domain custom-domain.com
/new-project mi-sass --type astro-static
```

## Comportamiento

1. Preguntar datos faltantes:
   - Tipo de proyecto: `astro-static`, `astro-ssr`, `react-spa`, `backend-worker`
   - Dominio: subdominio de `veriel.dev` (por defecto) o custom
   - Repo: existente en GitHub, local, o crear nuevo
2. Mostrar resumen de lo que se va a configurar
3. Pedir confirmación
4. Ejecutar setup:
   - Crear/configurar repo en GitHub
   - Crear branch `develop`
   - Configurar branch protection rules
   - Añadir workflow callers
   - Crear proyecto en Cloudflare Pages
   - Crear registros DNS
   - Crear estructura en R2
   - Registrar en veriel-ops
5. Mostrar resultado con todas las URLs

## Parámetros

- `nombre` (requerido): nombre del proyecto
- `--domain` (opcional): dominio custom
- `--type` (opcional): tipo de proyecto
