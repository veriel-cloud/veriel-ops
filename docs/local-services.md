# Local Services (systemd user)

veriel-ops se ejecuta localmente como 3 servicios systemd de usuario que arrancan automáticamente al iniciar sesión.

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `veriel-ops-tunnel` | — | Cloudflare Tunnel → `ops-api-dev.veriel.dev` |
| `veriel-ops-server` | :3001 | API Hono/Bun |
| `veriel-ops-dashboard` | :5173 | Dashboard Vite/React |

Orden de arranque: tunnel → server → dashboard.

## Activar (primera vez)

```bash
systemctl --user daemon-reload
systemctl --user enable --now veriel-ops-tunnel veriel-ops-server veriel-ops-dashboard
```

## Verificar estado

```bash
# Los tres a la vez
systemctl --user status veriel-ops-{tunnel,server,dashboard}

# Uno en concreto
systemctl --user status veriel-ops-server
```

## Ver logs

```bash
# Logs en tiempo real de los tres
journalctl --user -u veriel-ops-tunnel -u veriel-ops-server -u veriel-ops-dashboard -f

# Solo server
journalctl --user -u veriel-ops-server -f

# Últimas 50 líneas del dashboard
journalctl --user -u veriel-ops-dashboard -n 50
```

## Reiniciar

```bash
# Uno solo
systemctl --user restart veriel-ops-server

# Los tres
systemctl --user restart veriel-ops-{tunnel,server,dashboard}
```

## Parar (temporalmente)

Los servicios siguen habilitados y arrancarán de nuevo en el próximo login.

```bash
systemctl --user stop veriel-ops-{tunnel,server,dashboard}
```

## Desactivar (permanentemente)

Para y desactiva los servicios. No arrancarán en el próximo login.

```bash
systemctl --user disable --now veriel-ops-tunnel veriel-ops-server veriel-ops-dashboard
```

Para reactivarlos, ejecutar los comandos de la sección "Activar".

## Ubicación de los archivos

```
~/.config/systemd/user/
├── veriel-ops-tunnel.service
├── veriel-ops-server.service
└── veriel-ops-dashboard.service
```

Tras modificar cualquier `.service`, recargar:

```bash
systemctl --user daemon-reload
systemctl --user restart veriel-ops-{tunnel,server,dashboard}
```

## App de escritorio (Tauri)

El dashboard se puede ejecutar como app nativa con Tauri 2. Usa el webview del sistema (WebKitGTK) en vez del navegador.

### Requisitos

- Rust (`rustup`)
- `webkit2gtk-4.1` (`sudo pacman -S --needed webkit2gtk-4.1`)

### Desarrollo

El server debe estar corriendo (via systemd o manualmente) antes de abrir Tauri.

```bash
# Arranca Vite + ventana nativa con HMR
pnpm tauri:dev
```

Tauri ejecuta Vite en `:5173` y abre una ventana nativa apuntando a esa URL. Los cambios en React se reflejan al instante.

### Build (generar AppImage)

```bash
pnpm tauri:build
```

El binario se genera en:

```
dashboard/src-tauri/target/release/bundle/appimage/veriel-ops.AppImage
```

### Nota: Hyprland (Wayland)

WebKitGTK crashea en Hyprland con error de protocolo Wayland. El fix ya está aplicado en `dashboard/src-tauri/src/main.rs`: fuerza `GDK_BACKEND=x11` (XWayland) antes de inicializar GTK.
