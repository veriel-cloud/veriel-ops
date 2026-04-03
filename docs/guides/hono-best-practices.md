# Hono — Mejores Prácticas y Guía de Estilos

Guía basada en la documentación oficial de [hono.dev](https://hono.dev) adaptada al contexto de veriel-ops.

## Qué es Hono realmente

Hono es un **router HTTP con middleware**. No es un servidor — es una función `fetch` que recibe un `Request` y devuelve un `Response`. Nada más.

```typescript
// Esto es TODO lo que Hono hace internamente
const app = new Hono();
app.get("/hello", (c) => c.json({ msg: "hi" }));

// app.fetch es una función: (Request) => Promise<Response>
const response = await app.fetch(new Request("http://localhost/hello"));
```

El `app.fetch` es estándar Web — funciona en cualquier runtime que soporte la Web Fetch API (Node.js, Bun, Deno, Cloudflare Workers, navegadores con Service Workers).

## Qué es un adaptador y por qué existe

Cada runtime tiene su propia forma de arrancar un servidor HTTP:

```
Node.js:    http.createServer((req, res) => { ... }).listen(3000)
Bun:        Bun.serve({ fetch: (req) => new Response(...) })
Deno:       Deno.serve((req) => new Response(...))
Workers:    export default { fetch: (req) => new Response(...) }
```

Hono genera una función `fetch(Request) => Response`. El adaptador conecta esa función con el runtime:

```
┌──────────────┐     ┌───────────┐     ┌──────────┐
│  Runtime     │     │ Adaptador │     │  Hono    │
│  (Node/Bun)  │────▶│ traduce   │────▶│ app.fetch│
│  req nativo  │     │ a Request │     │          │
└──────────────┘     └───────────┘     └──────────┘
                           │
                     Response ◀──────────────┘
```

### Node.js (`@hono/node-server`)

Node.js NO soporta la Web Fetch API de forma nativa para servidores. Su API es `http.IncomingMessage` + `http.ServerResponse` (la de Express). El adaptador:

1. Crea un `http.Server` de Node.js
2. Por cada request, convierte `IncomingMessage` → `Request` (Web standard)
3. Llama a `app.fetch(request)`
4. Convierte el `Response` (Web standard) → `ServerResponse` de Node.js

```typescript
import { serve } from "@hono/node-server";
// serve() crea el http.Server y hace la traducción
serve({ fetch: app.fetch, port: 3001 });
```

### Bun

Bun SÍ soporta la Web Fetch API nativamente. No necesita adaptador — su `Bun.serve` acepta `fetch` directamente:

```typescript
// Sin adaptador, sin imports extra
export default { fetch: app.fetch, port: 3001 };
// O: Bun.serve({ fetch: app.fetch, port: 3001 });
```

### Cloudflare Workers

Workers también usan la Web Fetch API nativamente. Tampoco necesita adaptador:

```typescript
// El runtime llama a fetch() directamente
export default app;
// Workers entiende: export default { fetch: (req, env, ctx) => ... }
```

### En resumen

| Runtime | ¿Necesita adaptador? | Por qué |
|---------|----------------------|---------|
| Cloudflare Workers | No | Nativo Web Fetch API |
| Bun | No | Nativo Web Fetch API |
| Deno | No | Nativo Web Fetch API |
| Node.js | Sí (`@hono/node-server`) | Su API HTTP es diferente (IncomingMessage/ServerResponse) |

El adaptador de Node.js es el "pegamento" entre la API antigua de Node.js y la API moderna Web. Si usaras Bun, no necesitarías ni el paquete `@hono/node-server` ni `tsx`.

## Cómo integra con Cloudflare

En Workers, Cloudflare llama a tu `fetch` con 3 argumentos:

```typescript
export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    // env contiene tus secrets/variables (de .dev.vars o del dashboard de CF)
    // ctx tiene waitUntil() para tareas en background
  }
}
```

Cuando haces `export default app`, Hono recibe estos argumentos automáticamente. Luego dentro de un handler:
- `env(c)` devuelve el `env` (tus bindings/secrets)
- `c.executionCtx` devuelve el `ctx`

Cuando usas Node.js con `@hono/node-server`, el adaptador simula este comportamiento:
- `env(c)` lee de `process.env` (porque no hay bindings nativos)
- No hay `executionCtx` (Node.js no lo tiene)

Por eso `env(c)` funciona en ambos runtimes — Hono abstrae la diferencia.

---

## Rutas — mantenerlas finas

### No hacer

```typescript
// MAL: lógica de negocio dentro del handler
app.post("/projects", async (c) => {
  const body = await c.req.json();
  const repo = await octokit.rest.repos.create({ ... });
  await octokit.rest.repos.createFile({ ... });
  await octokit.rest.repos.createFile({ ... });
  await octokit.rest.repos.createFile({ ... });
  const pages = await fetch("https://api.cloudflare.com/...");
  const dns = await fetch("https://api.cloudflare.com/...");
  // ... 200 líneas más
  return c.json({ success: true });
});
```

### Hacer

```typescript
// BIEN: handler delega a servicios
app.post("/projects", async (c) => {
  const { name, type } = await c.req.json();
  if (!name) return c.json({ error: "Name required" }, 400);

  const result = await createProject(c.get("github"), c.get("cloudflare"), { name, type });
  return c.json(result, 201);
});
```

El handler solo:
1. Extrae datos del request
2. Valida
3. Llama al servicio
4. Devuelve la respuesta

## Middleware — inyección de dependencias

### Patrón recomendado

Definir `Variables` en el tipo de Hono y usar un middleware para inyectar:

```typescript
// env.ts
interface Variables {
  github: GitHubService;
  cloudflare: CloudflareService;
}

type Env = { Bindings: Bindings; Variables: Variables };

// index.ts
const app = new Hono<Env>();

app.use("/*", async (c, next) => {
  const e = env(c);
  c.set("github", createGitHubService({ token: e.GITHUB_TOKEN }));
  await next();
});

// En cualquier ruta:
app.get("/repos", (c) => {
  const repos = await c.get("github").listOrgRepos();
  return c.json(repos);
});
```

### No usar imports directos de servicios en rutas

```typescript
// MAL: el servicio es un singleton global
import * as github from "../services/github.js";
app.get("/repos", (c) => github.listOrgRepos());

// BIEN: el servicio viene del contexto
app.get("/repos", (c) => c.get("github").listOrgRepos());
```

## Modularidad con `app.route()`

```typescript
// routes/projects.ts
export const projectsRoutes = new Hono<Env>();
projectsRoutes.get("/", ...);
projectsRoutes.post("/", ...);

// routes/deploys.ts
export const deploysRoutes = new Hono<Env>();
deploysRoutes.get("/", ...);

// index.ts
app.route("/api/projects", projectsRoutes);
app.route("/api/deploys", deploysRoutes);
```

Cada archivo de rutas es una instancia de Hono independiente. Se monta en el prefijo deseado.

## RPC — tipos compartidos entre frontend y backend

La killer feature de Hono. El frontend puede tener tipos inferidos automáticamente de las rutas del backend:

### Servidor

```typescript
const route = app
  .get("/projects", (c) => c.json({ projects: [] }))
  .post("/projects", async (c) => {
    const body = await c.req.json();
    return c.json({ success: true }, 201);
  });

export type AppType = typeof route;
```

### Frontend

```typescript
import { hc } from "hono/client";
import type { AppType } from "server";

const client = hc<AppType>("http://localhost:3001");
const res = await client.projects.$get();
const data = await res.json(); // ← tipado automáticamente
```

El frontend sabe qué rutas existen, qué body aceptan y qué devuelven **sin schemas manuales**.

## Streaming y SSE

### SSE (Server-Sent Events)

```typescript
import { streamSSE } from "hono/streaming";

app.get("/events", (c) => {
  return streamSSE(c, async (stream) => {
    // stream.onAbort() para cleanup si el cliente se desconecta
    stream.onAbort(() => console.log("Client disconnected"));

    await stream.writeSSE({ event: "update", data: JSON.stringify({ status: "running" }) });
    await stream.sleep(1000);
    await stream.writeSSE({ event: "done", data: JSON.stringify({ status: "complete" }) });
  });
});
```

### Importante sobre errores en streaming

Una vez que el streaming empieza, **no se puede cambiar el status code ni los headers**. Si el callback lanza un error, `onError` de Hono **NO se dispara**. Hay que manejar errores dentro del callback:

```typescript
return streamSSE(c, async (stream) => {
  try {
    await doWork(stream);
  } catch (err) {
    // Emitir el error como evento SSE, no lanzar
    await stream.writeSSE({ event: "error", data: JSON.stringify({ error: err.message }) });
  }
});
```

## Testing con `app.request()`

Sin servidor, sin puertos, sin setup:

```typescript
import { describe, it, expect } from "vitest";
import app from "../src/index.js";

describe("Projects API", () => {
  it("returns projects", async () => {
    const res = await app.request("/api/projects");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.projects).toBeDefined();
  });

  it("requires name", async () => {
    const res = await app.request("/api/projects", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  // Mockear env vars (bindings)
  it("works with custom env", async () => {
    const res = await app.request("/api/projects", {}, {
      GITHUB_TOKEN: "test-token",
      GITHUB_ORG: "test-org",
    });
    expect(res.status).toBe(200);
  });
});
```

`app.request()` es la forma oficial de testear. No necesitas `supertest` ni levantar el servidor.

## Resumen de reglas

| Regla | Por qué |
|---|---|
| Handlers finos, lógica en servicios | Legibilidad, testabilidad |
| Servicios via `c.get()`, no imports globales | Testabilidad, desacoplamiento del runtime |
| `env(c)` para variables, nunca `process.env` | Portabilidad entre runtimes |
| Tipos con `Hono<{ Bindings; Variables }>` | Type safety en todo el contexto |
| `app.route()` para modularizar | Organización, separación de responsabilidades |
| Errores en SSE: emitir como evento, no lanzar | No se puede cambiar el response una vez iniciado el streaming |
| `app.request()` para tests | Sin setup de servidor, rápido, oficial |
