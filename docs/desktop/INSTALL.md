# Veriel Ops como app de escritorio (CachyOS / Arch Linux)

Esta guía deja **Veriel Ops** funcionando como una aplicación nativa del sistema:

- **Server (Bun)** — corre siempre en segundo plano vía systemd, se reinicia solo si cae.
- **Cloudflared tunnel** (opcional) — también como servicio systemd, depende del server.
- **Dashboard** — empaquetado con Tauri 2 como AppImage portable, accesible desde el menú de aplicaciones con el logo de Veriel.

Todo se instala a nivel de **usuario** (no requiere `sudo` salvo para dependencias del build).

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│  Sesión de usuario (systemd --user)                          │
│                                                              │
│   veriel-ops-server.service  ──► bun :3001  (API + SSE)      │
│           ▲                                                  │
│           │ Requires                                         │
│           │                                                  │
│   veriel-ops-tunnel.service  ──► cloudflared  (opcional)     │
│                                                              │
│   ─────────────────────────────────────────────────────────  │
│                                                              │
│   ~/.local/bin/veriel-ops  ──► AppImage Tauri (UI escritorio)│
│           │                                                  │
│           └──► fetch http://localhost:3001                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Requisitos previos

```bash
which bun           # ~/.bun/bin/bun
which cloudflared   # /usr/bin/cloudflared (si vas a usar túnel)
pnpm --version
```

El repo debe tener:

- `server/.dev.vars` con `GITHUB_TOKEN`, `GITHUB_ORG`, etc.
- Dependencias instaladas: `pnpm install` desde la raíz.

---

## 1. Build del binario de escritorio (Tauri)

```bash
cd ~/Proyectos/veriel-ops
pnpm tauri:build
```

El AppImage queda en:

```
dashboard/src-tauri/target/release/bundle/appimage/veriel-ops_<version>_amd64.AppImage
```

> Si el build falla por dependencias del sistema, en CachyOS necesitarás los paquetes WebKit y GTK que pide Tauri 2:
>
> ```bash
> sudo pacman -S --needed webkit2gtk-4.1 base-devel libappindicator-gtk3 librsvg
> ```

### Instalar el AppImage como app del sistema

```bash
# Copiar el binario a un sitio en PATH
cp dashboard/src-tauri/target/release/bundle/appimage/veriel-ops_*.AppImage \
   ~/.local/bin/veriel-ops
chmod +x ~/.local/bin/veriel-ops
```

Los iconos y el `.desktop` ya están instalados (la guía los crea por ti):

- `~/.local/share/icons/hicolor/scalable/apps/veriel-ops.svg` — logo Veriel (SVG)
- `~/.local/share/icons/hicolor/512x512/apps/veriel-ops.png` — fallback PNG
- `~/.local/share/applications/veriel-ops.desktop`

Refresca la base de datos del menú:

```bash
update-desktop-database ~/.local/share/applications/
gtk-update-icon-cache -f ~/.local/share/icons/hicolor/ 2>/dev/null || true
```

Veriel Ops debería aparecer ya en el lanzador (Rofi / Wofi / KRunner / GNOME Activities).

---

## 2. Servicio systemd para el server (Bun)

Archivo: `~/.config/systemd/user/veriel-ops-server.service`

Activación:

```bash
mkdir -p ~/.local/share/veriel-ops
systemctl --user daemon-reload
systemctl --user enable --now veriel-ops-server.service

# Para que arranque aunque no abras sesión gráfica
loginctl enable-linger $USER
```

Verificación:

```bash
systemctl --user status veriel-ops-server
curl http://localhost:3001/api/system/health
```

Logs:

```bash
journalctl --user -u veriel-ops-server -f          # en vivo
tail -f ~/.local/share/veriel-ops/server.log       # archivo plano
```

---

## 3. (Opcional) Servicio systemd para el túnel Cloudflare

El token del túnel **no se versiona**, va en un archivo aparte.

```bash
mkdir -p ~/.config/veriel-ops
cat > ~/.config/veriel-ops/tunnel.env <<'EOF'
TUNNEL_TOKEN=<TUNNEL_TOKEN>   # pegado de: cloudflared tunnel token <tunnel-name>
EOF
chmod 600 ~/.config/veriel-ops/tunnel.env
```

Activación:

```bash
systemctl --user daemon-reload
systemctl --user enable --now veriel-ops-tunnel.service
systemctl --user status veriel-ops-tunnel
```

El túnel **depende del server** (`Requires=veriel-ops-server.service`), así que si paras el server también para el túnel.

---

## 4. Comandos del día a día

```bash
# Estado
systemctl --user status veriel-ops-server
systemctl --user status veriel-ops-tunnel

# Reiniciar tras cambiar .dev.vars o el código (Bun no recarga env en caliente)
systemctl --user restart veriel-ops-server

# Parar todo
systemctl --user stop veriel-ops-tunnel veriel-ops-server

# Desactivar autoarranque
systemctl --user disable veriel-ops-server veriel-ops-tunnel

# Logs en vivo (las dos unidades a la vez)
journalctl --user -u veriel-ops-server -u veriel-ops-tunnel -f
```

Para abrir la app de escritorio: simplemente lánzala desde el menú o:

```bash
veriel-ops
```

---

## 5. Actualizar la app

Cuando hay cambios en el dashboard:

```bash
cd ~/Proyectos/veriel-ops
git pull
pnpm install
pnpm tauri:build
cp dashboard/src-tauri/target/release/bundle/appimage/veriel-ops_*.AppImage \
   ~/.local/bin/veriel-ops
```

Cuando hay cambios en el server:

```bash
git pull
pnpm install
systemctl --user restart veriel-ops-server
```

---

## 6. Desinstalar

```bash
systemctl --user disable --now veriel-ops-server veriel-ops-tunnel
rm ~/.config/systemd/user/veriel-ops-{server,tunnel}.service
rm ~/.local/share/applications/veriel-ops.desktop
rm ~/.local/share/icons/hicolor/scalable/apps/veriel-ops.svg
rm ~/.local/share/icons/hicolor/512x512/apps/veriel-ops.png
rm ~/.local/bin/veriel-ops
rm -rf ~/.local/share/veriel-ops ~/.config/veriel-ops
loginctl disable-linger $USER   # solo si no usas otros servicios user
update-desktop-database ~/.local/share/applications/
```

---

## Solución de problemas

| Síntoma                                  | Diagnóstico                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| App abre pero muestra "Cannot connect"   | `systemctl --user status veriel-ops-server` — revisa logs                   |
| `Bad credentials` de GitHub              | El token de `.dev.vars` caducó o no tiene permisos sobre la org             |
| Túnel "credentials file not found"       | Falta `TUNNEL_TOKEN` en `~/.config/veriel-ops/tunnel.env`                    |
| AppImage no arranca: `FUSE` error        | `sudo pacman -S fuse2`                                                      |
| Icono no aparece en el menú              | `update-desktop-database ~/.local/share/applications/` y reinicia sesión    |
| Server arranca pero falla con `EADDRINUSE` | Otro proceso usa :3001 — `lsof -i :3001`                                  |
| Cambios en `.dev.vars` no aplican        | `systemctl --user restart veriel-ops-server`                                |
| App abre pero todos los fetches fallan   | `vite build` produjo un bundle de modo dev — el script ya fuerza `NODE_ENV=production`, pero verifica que tu shell no tenga `NODE_ENV=development` exportado |
| `failed to run linuxdeploy` al empaquetar | El `strip` que trae `linuxdeploy` no entiende ELFs modernos en Arch — relanza con `NO_STRIP=true pnpm tauri:build` |

---

## Archivos que crea esta guía

```
~/.local/bin/veriel-ops                                       # AppImage Tauri
~/.local/share/applications/veriel-ops.desktop                # entry de menú
~/.local/share/icons/hicolor/scalable/apps/veriel-ops.svg     # logo Veriel
~/.local/share/icons/hicolor/512x512/apps/veriel-ops.png      # fallback
~/.local/share/veriel-ops/                                    # logs
~/.config/systemd/user/veriel-ops-server.service              # server unit
~/.config/systemd/user/veriel-ops-tunnel.service              # tunnel unit
~/.config/veriel-ops/tunnel.env                               # token (chmod 600)
```
