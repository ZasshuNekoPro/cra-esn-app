# Guide de déploiement — Coolify on-premise

## Prérequis

- Serveur dédié avec [Coolify](https://coolify.io) installé et accessible
- Accès au dépôt GitHub — branche `preprod`
- Domaine configuré (DNS → IP du serveur Coolify)
- Certificat TLS (Let's Encrypt, géré automatiquement par Coolify)

---

## 1. Services à provisionner dans Coolify

Créer chaque service via **Coolify → New Resource → Service**.

### PostgreSQL avec pgvector

| Champ | Valeur |
|-------|--------|
| Image | `pgvector/pgvector:pg15` |
| Port | 5432 (interne uniquement) |

> L'extension pgvector est requise pour le module RAG.
> Noter la `DATABASE_URL` générée par Coolify.

### Redis

| Champ | Valeur |
|-------|--------|
| Image | `redis:7-alpine` |
| Port | 6379 (interne uniquement) |

URL interne : `redis://redis:6379`

### MinIO (stockage S3-compatible)

| Champ | Valeur |
|-------|--------|
| Image | `minio/minio` |
| Port API | 9000 (interne) |
| Port console | 9001 (optionnel, exposable pour l'administration) |
| Commande | `server /data --console-address ":9001"` |

Variables à configurer :
- `MINIO_ROOT_USER` → valeur de `S3_ACCESS_KEY`
- `MINIO_ROOT_PASSWORD` → valeur de `S3_SECRET_KEY`

Créer le bucket `esn-cra-documents` via la console MinIO après démarrage.

---

## 2. Déployer le backend

**Coolify → New Resource → Application**

| Champ | Valeur |
|-------|--------|
| Source | Dépôt GitHub, branche `preprod` |
| Dockerfile | `apps/backend/Dockerfile` |
| Build context | `/` (racine du monorepo) |
| Port | `3001` |
| Health check | `GET /api/health` |
| Health check timeout | `60s` (migration Prisma au premier démarrage) |

Configurer **toutes** les variables depuis `.env.production.example` dans l'onglet "Environment Variables".

> Les migrations Prisma s'exécutent automatiquement au démarrage (`prisma migrate deploy`).

---

## 3. Déployer le frontend

**Coolify → New Resource → Application**

| Champ | Valeur |
|-------|--------|
| Source | Dépôt GitHub, branche `preprod` |
| Dockerfile | `apps/frontend/Dockerfile` |
| Build context | `/` (racine du monorepo) |
| Port | `3100` |

Variables à configurer :

```
NEXTAUTH_SECRET=<généré>
NEXTAUTH_URL=https://<domaine-frontend>
BACKEND_URL=http://backend:3001
NODE_ENV=production
PORT=3100
```

> Déployer le frontend **après** que le backend est "healthy".

---

## 4. Initialiser les comptes (une seule fois)

Via **Coolify → Backend → Terminal** (ou en SSH sur le container) :

### Compte ESN_ADMIN de production

```bash
ADMIN_EMAIL=admin@votre-esn.fr \
ADMIN_PASSWORD=VotreMotDePasse123! \
pnpm seed:prod
```

Résultat attendu :
```
✅ ESN_ADMIN account ready: admin@votre-esn.fr (id: ...)
```

> Cette commande est **idempotente** — sans effet si le compte existe déjà.

### Comptes de test (preprod uniquement)

Pour créer les 4 comptes de test (`password123`) sur l'environnement preprod :

```bash
pnpm --filter backend db:seed
```

Comptes créés :

| Email | Rôle | Mot de passe |
|---|---|---|
| `platform@esn-app.local` | PLATFORM_ADMIN | `password123` |
| `admin@esn-corp.local` | ESN_ADMIN | `password123` |
| `alice@example.com` | EMPLOYEE | `password123` |
| `contact@client-corp.local` | CLIENT | `password123` |

> ⚠️ Ne jamais exécuter `db:seed` en production — les mots de passe `password123` sont publics.

---

## 5. Vérifications post-déploiement

```bash
# Health check backend
curl https://<BACKEND_DOMAIN>/api/health
# → 200 {"status":"ok","timestamp":"...","db":"connected"}

# Frontend accessible
curl -I https://<FRONTEND_DOMAIN>/login
# → 200 OK

# Se connecter avec ADMIN_EMAIL → dashboard ESN_ADMIN visible
# Vérifier les healthchecks verts dans Coolify (backend + frontend)
```

---

## Rollback

Coolify → Application → **Deployments** → cliquer "Redeploy" sur le déploiement précédent.

---

## Test local du stack complet (avant Coolify)

```bash
# 1. Copier et remplir les variables
cp .env.production.example .env.prod.local
# (éditer .env.prod.local avec de vraies valeurs de test)

# 2. Démarrer le stack
docker compose -f infra/docker/docker-compose.prod.yml --env-file .env.prod.local up -d

# 3. Attendre les healthchecks
docker compose -f infra/docker/docker-compose.prod.yml ps

# 4. Vérifier le backend
curl http://localhost:3001/api/health

# 5. Créer le compte admin de test
ADMIN_EMAIL=test@esn.local \
ADMIN_PASSWORD=TestAdmin123! \
pnpm seed:prod

# 6. Ouvrir http://localhost:3100/login → se connecter
```

---

## Architecture réseau

```
Internet
    │
    ▼
[Coolify Reverse Proxy — HTTPS]
    │
    ├──► frontend:3100  (Next.js standalone)
    │         │
    │         ▼ (service-to-service)
    └──► backend:3001   (NestJS)
              │
              ├──► postgres:5432   (pgvector/pgvector:pg15)
              ├──► redis:6379      (redis:7-alpine)
              └──► minio:9000      (S3 stockage)
```

---

## Modules Phase 2 (hors scope déploiement initial)

| Module | État | Impact |
|--------|------|--------|
| Gestion utilisateurs (CRUD) | Phase 2 | Comptes créés via `pnpm seed:prod` |
| Gestion missions (CRUD) | Phase 2 | Missions créées directement en DB |
| Blocage de compte | Phase 2 | Champ `deletedAt` présent, non utilisé |
