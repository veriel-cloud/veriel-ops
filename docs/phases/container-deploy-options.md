# PR-B5 — Container deploy target (Go / Spring Boot)

## Contexto

Los tipos `go-fiber` y `spring-boot` tienen templates creados, el pipeline reconoce el deploy target `container` y el dashboard muestra "Container (VPS)". Falta la parte de despliegue real: construir la imagen Docker, almacenarla y ejecutarla.

## Flujo general

```
push a develop
  → webhook llega a veriel-ops
    → dispara workflow / acción de deploy
      → docker build
        → push imagen a registry
          → ejecutar container en el servidor
```

## Opciones de implementación

---

### Opción A — GitHub Actions + SSH al servidor

Es la opción más fiel al VPS real. Los workflows de la org (`deploy-container-{des,pre,pro}.yml`) corren en GitHub Actions y se conectan al servidor por SSH.

**Flujo:**
1. GitHub Actions hace checkout del repo
2. `docker build` en el runner de GitHub
3. `docker push` a GHCR (GitHub Container Registry)
4. SSH al servidor: `docker pull ghcr.io/veriel-cloud/{proyecto}:{tag}` + `docker stop` + `docker run`

**Archivos nuevos:**
- `.github-org/.github/workflows/deploy-container-des.yml`
- `.github-org/.github/workflows/deploy-container-pre.yml`
- `.github-org/.github/workflows/deploy-container-pro.yml`
- `.github-org/.github/workflows/rollback-container.yml`

**Secrets necesarios en la org:**
- `GHCR_TOKEN` — token con permisos `packages:write` para push a GHCR
- `DEPLOY_SSH_KEY` — clave SSH privada para conectar al servidor
- `DEPLOY_HOST` — IP o dominio del servidor (localhost en dev, IP del VPS en prod)
- `DEPLOY_USER` — usuario SSH en el servidor

**Ejemplo de workflow (DES):**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GHCR_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/veriel-cloud/${{ inputs.project_name }}:des-${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            docker pull ghcr.io/veriel-cloud/${{ inputs.project_name }}:des-${{ github.sha }}
            docker stop ${{ inputs.project_name }}-des || true
            docker rm ${{ inputs.project_name }}-des || true
            docker run -d --name ${{ inputs.project_name }}-des \
              --restart unless-stopped \
              -p 0:8080 \
              ghcr.io/veriel-cloud/${{ inputs.project_name }}:des-${{ github.sha }}
```

**Para probar en local:**
- Configurar SSH a `localhost` (o una IP local)
- Tener Docker corriendo en la máquina
- Añadir la clave SSH pública al `~/.ssh/authorized_keys` local

**Ventajas:**
- Idéntico al flujo en producción con VPS real
- No requiere cambios cuando se compre el VPS (solo cambiar `DEPLOY_HOST`)
- La imagen queda en GHCR como backup (rollback = volver a desplegar tag anterior)

**Desventajas:**
- Configurar SSH local es más engorroso
- GitHub Actions necesita poder llegar al servidor (en local requiere tunnel tipo ngrok/cloudflared)
- Más secrets que gestionar

---

### Opción B — Server de veriel-ops hace el deploy directamente

En vez de GitHub Actions, el propio server Hono (que ya corre en la máquina) se encarga del deploy cuando recibe el webhook.

**Flujo:**
1. Push a `develop` → webhook `push` llega a veriel-ops
2. El server detecta que el proyecto es tipo `container`
3. El server ejecuta `docker build` + `docker run` directamente con `Bun.spawn`

**Cambios en el server:**
- `server/src/services/docker.ts` — nuevo servicio:
  - `buildImage(repoPath, imageName, tag)` — clona repo + docker build
  - `runContainer(imageName, tag, name, port)` — docker stop/rm/run
  - `stopContainer(name)` — docker stop + rm
- `server/src/routes/webhooks.ts` — al recibir push en develop para un proyecto container, ejecutar deploy
- Sin workflows de container en la org (los callers de GH solo disparan CI, no deploy)

**Ejemplo del servicio:**
```typescript
async function deployContainer(project: string, env: string, commitSha: string) {
  const tag = `${env}-${commitSha.slice(0, 7)}`;
  const imageName = `veriel-ops/${project}`;
  const containerName = `${project}-${env}`;

  // Clone + build
  await Bun.spawn(["git", "clone", `https://github.com/veriel-cloud/${project}`, `/tmp/${project}`]);
  await Bun.spawn(["docker", "build", "-t", `${imageName}:${tag}`, `/tmp/${project}`]);

  // Stop old + run new
  await Bun.spawn(["docker", "stop", containerName]).catch(() => {});
  await Bun.spawn(["docker", "rm", containerName]).catch(() => {});
  await Bun.spawn(["docker", "run", "-d", "--name", containerName, "--restart", "unless-stopped", `${imageName}:${tag}`]);
}
```

**Para probar en local:**
- Solo necesitas Docker instalado
- Funciona inmediatamente sin SSH ni tunnels

**Ventajas:**
- Muy simple de implementar y probar en local
- No necesita secrets de SSH ni tunnels
- El server tiene control total del deploy

**Desventajas:**
- Diferente del flujo de Pages/Workers (esos usan GitHub Actions)
- Cuando se compre el VPS, si el server corre en el VPS ya funciona, pero si el server y los containers corren en máquinas diferentes, hay que cambiar a SSH
- No hay imagen en GHCR como backup
- El server necesita Docker instalado en la misma máquina

---

### Opción C — Híbrida (GitHub Actions build + server deploy)

GitHub Actions construye la imagen y la sube a GHCR. El server de veriel-ops detecta el workflow completado y hace el `docker pull` + `docker run` en la máquina local.

**Flujo:**
1. Push a `develop` → workflow en GitHub Actions
2. GH Actions: `docker build` + `docker push ghcr.io/veriel-cloud/{proyecto}:{tag}`
3. Webhook `workflow_run` completed llega al server
4. Server: `docker pull` + `docker run`

**Cambios:**
- Workflows de container en la org: solo build + push a GHCR (sin SSH)
- `server/src/services/docker.ts` — solo `pullAndRun(imageName, tag, containerName)`
- `server/src/routes/webhooks.ts` — al recibir `workflow_run` completed para un proyecto container, ejecutar pull + run

**Ventajas:**
- Build en GitHub Actions (no consume recursos del servidor)
- Imagen en GHCR como backup
- No necesita SSH
- El server solo hace pull + run (simple)
- Funciona en local si tienes Docker

**Desventajas:**
- Requiere que el server tenga acceso a GHCR (token de lectura)
- Dos sistemas involucrados (GH Actions + server)
- Más complejo que la opción B

---

## Comparativa

| Criterio | A (GH Actions + SSH) | B (Server directo) | C (Híbrida) |
|---|---|---|---|
| Probar en local | Difícil (SSH + tunnel) | Fácil | Medio |
| Parecido a producción | Idéntico | Diferente | Muy similar |
| Migrar a VPS real | Cambiar 1 secret | Requiere refactor si son máquinas distintas | Cambiar dónde corre el pull |
| Imagen en GHCR | Sí | No | Sí |
| Complejidad | Alta | Baja | Media |
| Rollback | Re-deploy tag de GHCR | Rebuild desde código | Re-pull tag de GHCR |

## Recomendación

**Opción C (Híbrida)** es la más equilibrada:
- Se puede probar en local sin configurar SSH
- Las imágenes quedan en GHCR para rollback
- El build no consume recursos del servidor
- Cuando se compre el VPS, el server de veriel-ops correrá ahí y el `docker pull` + `docker run` funcionará igual

Si se prefiere la máxima simplicidad para empezar, **Opción B** y luego migrar a A o C cuando haya VPS.

## Requisitos comunes (todas las opciones)

1. Docker instalado en la máquina donde corren los containers
2. Reverse proxy (Caddy) para enrutar `{proyecto}-des.veriel.dev` al puerto del container
3. Gestión de puertos: cada container expone un puerto diferente, el reverse proxy mapea dominio → puerto
4. DNS: A record al servidor (en local: no aplica, en VPS: IP del VPS)

## Dependencias

- Templates `template-go` y `template-spring` ya incluyen `Dockerfile`
- `PROJECT_TYPE_CONFIG` ya tiene `go-fiber` y `spring-boot` con deploy target `container`
- Pipeline ya tiene branch `container` con placeholder de DNS
- Falta: workflows de container, servicio Docker en el server, reverse proxy config
