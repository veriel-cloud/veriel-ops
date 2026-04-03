# Architecture Diagram Guidelines

Reglas generales para generar diagramas de arquitectura de cualquier proyecto.

## Principio fundamental

Un diagrama de arquitectura **no es un inventario de tecnologías**. Debe mostrar:

1. **Actores** — quién o qué inicia las acciones
2. **Componentes reales** — verificados leyendo el código, nunca inventados
3. **Relaciones nodo-a-nodo** — cada línea conecta un componente concreto con otro
4. **Protocolos** — cada conexión indica cómo se comunican (REST, SSE, gRPC, WebSocket, etc.)
5. **Dirección del flujo** — flechas con sentido

## Antes de dibujar

1. **Leer el código fuente** — entry points, rutas, servicios, conexiones a externos
2. **Mapear dependencias reales** — qué componente llama a cuál y con qué protocolo
3. **Verificar que todo existe** — no incluir nada que no esté en el código actual
4. **Identificar actores** — usuarios, sistemas externos, cron jobs, webhooks

## Layout: filas horizontales alineadas

> **Los nodos que se conectan deben estar en la misma fila horizontal.**

Esto hace que la mayoría de conexiones sean líneas rectas, eliminando el ruido visual.

```
Fila N:  [Entrada] ——→ [Lógica] ——→ [Externo/Storage]
```

### Conexiones entre filas distintas

- Usar **routing ortogonal**: ángulos rectos (horizontal → vertical → horizontal)
- Nunca diagonales que cruzan múltiples filas
- Las líneas cross-row van por los **bordes** del diagrama, no por el centro
- Reducir opacidad en conexiones secundarias para no saturar

## Zonas / Columnas

Organizar en columnas verticales que representen capas arquitectónicas reales del proyecto. Ejemplos típicos:

- Actor → Frontend → API → Servicios → Externos/Storage
- Cliente → Gateway → Microservicios → Bases de datos
- Usuario → CDN → Backend → Cache → DB

Cada zona con borde semitransparente y label uppercase en la esquina.

## Iconos

**Nunca iconos genéricos.** Usar logos reales de cada tecnología. CDN recomendado:

```
https://cdn.simpleicons.org/{slug}/{color_hex_sin_hash}
```

Consultar slugs en [simpleicons.org](https://simpleicons.org). Para componentes internos sin logo (servicios custom, orquestadores), usar SVGs inline simples con el color de su tipo de conexión.

## Conexiones

### Color por tipo de protocolo

Asignar un color único a cada tipo de comunicación:
- Cada protocolo = un color distinto
- Sólido para conexiones síncronas (REST, gRPC)
- Dash para conexiones asíncronas/push (SSE, WebSocket, Webhooks)
- Grosor mayor para flujos principales, menor para secundarios

### Etiquetas obligatorias

Cada conexión debe tener un label flotante con el protocolo o mecanismo:
`REST`, `SSE`, `gRPC`, `WebSocket`, `Octokit`, `aws4fetch`, `HMAC`, `SQL`, etc.

### Routing

| Caso | Solución |
|------|----------|
| Misma fila | `<line>` recta horizontal |
| Fila adyacente | `<path>` con un codo (L-shape) |
| Cruza 2+ filas | `<path>` ortogonal por el borde |

Nunca curvas bezier entre filas distintas.

## Leyenda

Siempre incluir leyenda (esquina inferior derecha) con:
- Todos los tipos de conexión usados
- Línea de muestra con su color y patrón (sólido/dash)
- Nombre del protocolo

## Nodos

- Iconos circulares (border-radius 50%), borde del color de la tecnología
- Nombre debajo del icono (10-11px, bold)
- Descripción breve opcional (8-9px, muted)
- Fondo oscuro consistente

## Elementos complementarios

- **Info boxes** para listados (tablas DB, páginas, endpoints) — borde dashed, fuente pequeña
- **Barra de toolchain** en la parte inferior — logos del toolchain de desarrollo
- **Badges** para paquetes compartidos
- **Entornos** como nodos especiales (DES → PRE → PRO con flechas de promoción)

## Proceso paso a paso

1. Leer código: entry points, rutas, servicios, configs
2. Listar todos los componentes reales y sus dependencias
3. Agrupar por filas: cada fila = un flujo entrada → lógica → externo
4. Colocar nodos alineados horizontalmente
5. Dibujar conexiones misma-fila (líneas rectas)
6. Añadir conexiones cross-row (ortogonales, por los bordes)
7. Etiquetar cada conexión con su protocolo
8. Añadir leyenda, zonas, toolchain
9. Abrir en navegador y verificar que no hay cruces innecesarios

## Anti-patterns

- Cajas de tecnologías sin conexiones entre ellas (es un "stack list", no arquitectura)
- Flechas genéricas entre capas sin especificar componentes concretos
- Curvas que se cruzan y enredan
- Iconos genéricos cuando existe el logo real
- Componentes inventados que no existen en el código
- Diagrama sin actores
- Conexiones sin etiqueta de protocolo
- Layout sin alineación horizontal (nodos dispersos sin lógica espacial)
