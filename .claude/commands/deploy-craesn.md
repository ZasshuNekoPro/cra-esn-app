---
description: Redéploie craESN sur pop-os-neko (192.168.1.138) via la chaîne SSH Coolify. Automatise push preprod + rebuild docker-compose. À utiliser après un merge main→preprod ou pour relancer les containers.
---

# Deploy craESN (preprod → pop-os-neko)

## Contexte

Le projet craESN est déployé sur `pop-os-neko` (192.168.1.138) via **docker-compose direct**, PAS une Application Coolify managée. Les containers sont nommés `esn_cra_*_prod`. La machine n'est accessible que via la VM Coolify (chaîne SSH à double bounce).

**Chaîne SSH** :
```
local → ssh coolify (VM 192.168.1.20)
      → docker exec coolify
      → ssh -i /var/www/html/storage/app/ssh/keys/ssh_key@zhuo5ehz5p5b3x0o6j2e649x neko@192.168.1.138
```

## Étapes du skill

### 1. Pré-flight local (sur `/home/neko/Projects/craESN`)

- `git status` → aucun changement non-committé sur `preprod` (sinon demander à l'utilisateur).
- `git branch --show-current` → si ≠ `preprod`, demander avant de switcher.
- Si commits prêts non poussés → `git push origin preprod`.
- Sinon proposer de merger `main → preprod` via `git checkout preprod && git merge main --no-ff -m "chore(preprod): sync with main" && git push origin preprod`.

### 2. Vérif impact Prisma avant rebuild

```bash
cd /home/neko/Projects/craESN
git log --stat origin/preprod..HEAD -- 'apps/backend/prisma/*' 'apps/backend/**/*.sql' 2>&1
```

Si des migrations nouvelles sont présentes : le backend appliquera `prisma migrate deploy` au démarrage. Allonger le timeout de healthcheck à >60s.

### 3. Git pull sur pop-os-neko

```bash
ssh coolify "docker exec coolify ssh -o StrictHostKeyChecking=no -i /var/www/html/storage/app/ssh/keys/ssh_key@zhuo5ehz5p5b3x0o6j2e649x neko@192.168.1.138 'cd /home/neko/cra-esn/repo && git fetch origin && git checkout preprod && git pull origin preprod && git log --oneline -3'"
```

### 4. Rebuild + up (LONG — lancer en background)

```bash
ssh coolify "docker exec coolify ssh -o StrictHostKeyChecking=no -i /var/www/html/storage/app/ssh/keys/ssh_key@zhuo5ehz5p5b3x0o6j2e649x neko@192.168.1.138 'cd /home/neko/cra-esn/repo/infra/docker && docker compose --env-file /home/neko/cra-esn/.env.prod -f docker-compose.prod.yml up -d --build 2>&1'"
```

Chemins fixes sur .138 :
- Repo : `/home/neko/cra-esn/repo`
- Env file : `/home/neko/cra-esn/.env.prod` (externe, non committé — normal)
- Compose : `infra/docker/docker-compose.prod.yml`

**Durée** : 10-25 min. La machine héberge aussi moulahack et babylog — ressources partagées. Toujours lancer via Bash `run_in_background: true`, puis poller les containers via wakeup toutes les 4-5 min.

### 5. Vérification post-déploiement

```bash
# Containers healthy
ssh coolify "docker exec coolify ssh -o StrictHostKeyChecking=no -i /var/www/html/storage/app/ssh/keys/ssh_key@zhuo5ehz5p5b3x0o6j2e649x neko@192.168.1.138 'docker ps --filter name=esn_cra --format \"{{.Names}} | {{.Status}}\"'"

# Backend API
curl -fsS http://192.168.1.138:3001/api/health

# Frontend HTTP 200
curl -fsSI http://192.168.1.138:3100 | head -3
```

5 containers attendus en `Up (healthy)` : `esn_cra_backend_prod`, `esn_cra_frontend_prod` (pas de healthcheck), `esn_cra_postgres_prod`, `esn_cra_redis_prod`, `esn_cra_minio_prod`.

## Ports exposés sur .138

| Service | Port | URL |
|---|---|---|
| Backend API | 3001 | http://192.168.1.138:3001 (API) + /api/docs (Swagger) |
| Frontend | 3100 | http://192.168.1.138:3100 |
| MinIO console | 9001 | http://192.168.1.138:9001 |
| Postgres/Redis | — | internes (réseau docker uniquement) |

## Gotchas

- **`NEXT_PUBLIC_BACKEND_URL`** : baked à build-time dans le bundle JS frontend via `ARG` Dockerfile (default `http://192.168.1.138:3001`). Si l'IP de la machine change, éditer le commit `43471a2` sur `preprod` avant rebuild — sinon le frontend fetchera une IP morte.
- **NE JAMAIS** merger `preprod → main`. Le Dockerfile frontend contient du config spécifique preprod qui ne doit pas remonter sur main (la conv projet est : main = code, preprod = code + config déploiement).
- **Logs debug** :
  ```bash
  ssh coolify "docker exec coolify ssh ... neko@192.168.1.138 'docker logs esn_cra_backend_prod --tail 100'"
  ssh coolify "docker exec coolify ssh ... neko@192.168.1.138 'docker logs esn_cra_frontend_prod --tail 100'"
  ```
- **Conteneurs zombies après rebuild raté** : `docker compose down` puis relancer `up -d --build` (attention : ça efface les volumes si `-v` ajouté, ne PAS le mettre).
- **Si le build échoue sur pnpm install** : cache buildx peut être corrompu, `docker buildx prune` puis relancer.
