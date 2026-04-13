---
name: scaffold
description: Genera boilerplate para rutas Hono, componentes React, servicios o tests
user-invocable: true
argument-hint: "<tipo> <nombre>"
---

# /scaffold

Genera la estructura base para nuevos modulos del proyecto.

## Uso

```
/scaffold route notifications
/scaffold component DeployCard
/scaffold service slack
/scaffold test projects
/scaffold hook useProjects
```

## Tipos disponibles

### `route <nombre>`
Crea una nueva ruta Hono en `server/src/routes/<nombre>.ts`:
- Importaciones de Hono y tipos
- App con tipado `AppEnv`
- Endpoints CRUD base
- Export default del router

### `component <Nombre>`
Crea un componente React en `dashboard/src/components/<Nombre>.tsx`:
- Functional component con props tipadas
- Tailwind CSS para estilos
- HTML semantico

### `service <nombre>`
Crea un servicio en `server/src/services/<nombre>.ts`:
- Factory function que recibe env
- Metodos base tipados
- Error handling consistente
- Solo APIs nativas de Bun

### `test <nombre>`
Crea archivo de test en el directorio correspondiente:
- Import de vitest (`describe`, `it`, `expect`)
- Suite base con describe
- Tests placeholder para happy path y error cases

### `hook <useNombre>`
Crea un custom hook en `dashboard/src/hooks/<useNombre>.ts`:
- TanStack Query (useQuery/useMutation)
- Tipos de retorno explicitos
- Query key consistente

## Reglas

- Sigue los patrones existentes en el proyecto
- Lee un archivo similar antes de generar para mantener consistencia
- No genera codigo de mas — solo el boilerplate minimo necesario
