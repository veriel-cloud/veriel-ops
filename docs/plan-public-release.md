# Plan: Publicar veriel-ops en portfolio

## Fase 1 — Preparar repo para público

### 1.1 Rotar secrets

Rotar todos los tokens antes de cambiar la visibilidad del repo:

- [ ] GitHub PAT (`ghp_*`) → GitHub Settings → Developer settings → Revoke + crear nuevo
- [ ] Cloudflare API Token (`cfut_*`) → Cloudflare Dashboard → API Tokens → Regenerar
- [ ] R2 Access Keys → Cloudflare R2 → Manage R2 API Tokens → Regenerar par
- [ ] GitHub Webhook Secret → veriel-cloud org → Settings → Webhooks → Regenerar secret
- [ ] Actualizar `.dev.vars` y `.env` locales con los nuevos tokens

### 1.2 Verificar .gitignore

Confirmar que nada sensible se filtra:

```bash
# Verificar que no hay secrets trackeados
git ls-files | grep -E '\.env|\.vars|\.pem|\.key|\.db|\.log'

# Verificar que .env.example no tiene valores reales
cat .env.example
```

### 1.3 README.md para el repo público

Crear un README profesional que:

- Explique qué es veriel-ops en una frase
- Muestre un screenshot del dashboard (Tauri)
- Liste el stack técnico
- Muestre la estructura del monorepo
- Enlace al diagrama de arquitectura
- Incluya instrucciones de setup (para quien quiera leer el código)
- Aclare que es un proyecto personal, no desplegado públicamente

### 1.4 Cambiar visibilidad del repo

```bash
gh repo edit veriel-cloud/veriel-ops --visibility public
```

### 1.5 Verificar post-publicación

- [ ] Visitar el repo desde incógnito — que no se vea nada sensible
- [ ] Revisar las GitHub Actions — que no expongan secrets en logs
- [ ] Comprobar que el repo se puede clonar y leer sin problemas

---

## Fase 2 — Entrada en portfolio (veriel.dev)

Pendiente de instrucciones del usuario sobre:

- Formato de la entrada (blog post, card en CV, o ambos)
- Estructura del contenido
- Si incluir screenshots o solo enlace al repo
- Dónde se escribe (fichero Astro, MDX, JSON de proyectos...)

El repo público servirá como enlace directo desde la entrada del portfolio.
