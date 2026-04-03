# Server-Sent Events (SSE) — Guía técnica

## Qué es SSE

Server-Sent Events es un **estándar del navegador** (no de Hono ni de ningún framework). Está definido en la especificación HTML del W3C y funciona en todos los navegadores modernos.

Es un protocolo **unidireccional**: el servidor envía datos al cliente por una conexión HTTP que permanece abierta. El cliente no envía datos de vuelta por esa conexión (si necesita enviar algo, hace otra petición HTTP normal).

## SSE vs alternativas

| Tecnología | Dirección | Protocolo | Complejidad | Caso de uso |
|---|---|---|---|---|
| **SSE** | Servidor → Cliente | HTTP | Baja | Notificaciones, progreso en tiempo real, feeds |
| **WebSocket** | Bidireccional | WS | Media | Chat, juegos, colaboración en tiempo real |
| **Long Polling** | Servidor → Cliente | HTTP | Media | Fallback cuando SSE no está disponible |
| **HTTP normal** | Request/Response | HTTP | Baja | Todo lo demás |

SSE es la opción correcta cuando:
- Solo el servidor necesita enviar datos al cliente
- Quieres reconexión automática (el navegador la hace solo)
- No necesitas un protocolo custom (como WebSocket)

## Cómo funciona a nivel de protocolo

### 1. El cliente abre la conexión

```javascript
// Navegador nativo (EventSource API)
const source = new EventSource("/api/stream");

source.addEventListener("step", (event) => {
  const data = JSON.parse(event.data);
  console.log(data); // { status: "running", label: "Build" }
});

// O con fetch (lo que usamos en veriel-ops)
const response = await fetch("/api/projects/create-stream", {
  method: "POST",
  body: JSON.stringify({ name: "demo-app" }),
});
const reader = response.body.getReader();
```

### 2. El servidor responde con headers especiales

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

El `Content-Type: text/event-stream` le dice al navegador: "esta respuesta no termina aquí, sigue leyendo".

### 3. El servidor envía eventos como texto plano

```
event: init
data: {"title":"Deploy demo-app","jobs":[...]}

event: step
data: {"jobId":"setup-repo","stepId":"create-repo","status":"running"}

event: step
data: {"jobId":"setup-repo","stepId":"create-repo","status":"success","duration":4300}

event: complete
data: {"success":true,"totalDuration":107000}
```

Cada evento tiene:
- `event:` — tipo del evento (opcional, por defecto es `message`)
- `data:` — contenido (puede ser cualquier string, nosotros usamos JSON)
- Línea vacía — separa un evento del siguiente

### 4. La conexión se cierra cuando el servidor termina

No hay un "evento de cierre" especial. El servidor simplemente deja de enviar y cierra la conexión. El cliente detecta que la conexión se cerró.

## SSE en Hono

Hono tiene un helper `streamSSE` que abstrae la gestión de la conexión:

```typescript
import { streamSSE } from "hono/streaming";

app.get("/stream", (c) => {
  return streamSSE(c, async (stream) => {
    // stream.writeSSE envía un evento SSE
    await stream.writeSSE({
      event: "message",
      data: JSON.stringify({ hello: "world" }),
    });

    // Puedes hacer async/await, loops, lo que necesites
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      await stream.writeSSE({
        event: "progress",
        data: JSON.stringify({ step: i }),
      });
    }

    // Cuando la función termina, la conexión se cierra
  });
});
```

Sin Hono, en Node.js puro sería:

```typescript
app.get("/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  res.write(`event: message\ndata: {"hello":"world"}\n\n`);

  // Cerrar cuando termines
  res.end();
});
```

## SSE en otros frameworks

SSE no es exclusivo de Hono. Está disponible en cualquier framework que soporte HTTP streaming:

| Framework | Cómo se usa |
|---|---|
| **Hono** | `streamSSE(c, async (stream) => { ... })` |
| **Express** | `res.writeHead(200, headers)` + `res.write()` manual |
| **Fastify** | Plugin `@fastify/sse` o `reply.raw.write()` |
| **Next.js** | `new ReadableStream()` en Route Handlers |
| **Astro** | `new Response(new ReadableStream(...))` en endpoints |
| **Deno/Fresh** | `new Response(new ReadableStream(...))` |
| **Go** | `http.Flusher` interface |
| **Python/FastAPI** | `StreamingResponse` con `EventSourceResponse` |

## Cómo lo usamos en veriel-ops

### Backend (server/src/routes/projects.ts)

El endpoint `POST /api/projects/create-stream` usa SSE para transmitir el progreso de la creación de un proyecto en tiempo real.

Protocolo de eventos:

```
┌─────────────┐
│  event: init │ → Estructura completa del pipeline (todos los jobs/steps en pending)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  event: job  │ → Un job cambia de estado (pending → running → success/error)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  event: step │ → Un step dentro de un job cambia de estado
└──────┬───────┘   Incluye: status, detail, duration, logs
       │
       │  (se repite para cada step/job)
       │
       ▼
┌────────────────┐
│ event: complete│ → Todo terminó bien. Datos finales del proyecto.
└────────────────┘

     ─ o ─

┌──────────────┐
│  event: error │ → Algo falló. Mensaje de error y job que falló.
└──────────────┘
```

### Frontend (dashboard/src/pages/NewProject.tsx)

El frontend usa `fetch` + `ReadableStream` (no `EventSource`) porque necesita enviar un `POST` con body:

```typescript
const response = await fetch("/api/projects/create-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, type, description }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Decodifica los bytes a texto
  buffer += decoder.decode(value, { stream: true });

  // Parsea líneas "event:" y "data:"
  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      const data = JSON.parse(line.slice(5).trim());
      handleSSEEvent(currentEvent, data);
    }
  }
}
```

> **¿Por qué no `EventSource`?** La API nativa `EventSource` solo soporta `GET`. Como necesitamos enviar el body con los datos del proyecto (`POST`), usamos `fetch` y parseamos el stream manualmente. El formato de los eventos es el mismo.

## Ventajas de SSE frente a hacer polling

**Sin SSE** (polling):
```
Cliente: GET /status → Servidor: "running" (200ms)
         ... espera 2s ...
Cliente: GET /status → Servidor: "running" (200ms)
         ... espera 2s ...
Cliente: GET /status → Servidor: "running" (200ms)
         ... espera 2s ...
Cliente: GET /status → Servidor: "success" (200ms)
```
4 peticiones HTTP, latencia de hasta 2s entre cada actualización.

**Con SSE**:
```
Cliente: POST /create-stream → conexión abierta
  ← event: step {"status":"running"}     (instantáneo)
  ← event: step {"status":"success"}     (instantáneo)
  ← event: complete                       (instantáneo)
```
1 sola conexión, actualizaciones instantáneas.

## Limitaciones de SSE

- **Unidireccional**: solo servidor → cliente. Si necesitas bidireccional, usa WebSocket.
- **Conexiones abiertas**: cada cliente SSE mantiene una conexión TCP abierta. En un servidor con miles de clientes concurrentes esto puede ser un problema. En nuestro caso (dashboard interno, pocos usuarios) es irrelevante.
- **Workers/serverless**: los Workers de Cloudflare tienen timeout (~30s CPU). Una conexión SSE que dure minutos no cabe. Por eso usamos un servidor Node.js para veriel-ops.
- **Proxies/load balancers**: algunos proxies cortan conexiones inactivas. SSE envía keep-alive automáticos pero no todos los proxies los respetan.

## Reconexión automática

Si usas la API nativa `EventSource`, el navegador reconecta automáticamente cuando la conexión se pierde. Con `fetch` + `ReadableStream` (nuestro caso) la reconexión es manual — si la conexión se corta, el flujo termina y hay que manejarlo en el `catch`.

## Referencias

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [HTML Spec: EventSource](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Hono: Streaming](https://hono.dev/docs/helpers/streaming)
