# Audit & Plan de déploiement — Coolify Production

**Date :** 2026-03-25
**Branche active :** `preprod`
**Statut :** COMPLÉTÉ — tous les bloquants résolus, branche pushée

---

## Résultats d'audit

### AXE 1 — Infrastructure & sécurité production

#### Ce qui existe et fonctionne
- **CORS** : configurable via `CORS_ORIGIN` env var — `main.ts` ✓
- **Rate limiting** : `ThrottlerGuard` global dans `app.module.ts`, 100 req/60s ✓
- **Validation globale** : `ValidationPipe` (whitelist, forbidNonWhitelisted, transform) ✓
- **JWT + RBAC** : guards globaux (ThrottlerGuard → JwtAuthGuard → RolesGuard) ✓
- **Auth NextAuth v5** : JWT + RBAC, session côté frontend ✓
- **S3-compatible** : driver configurable (`local` ou `s3`) via `STORAGE_DRIVER` ✓
- **docker-compose dev** : `infra/docker/docker-compose.dev.yml` — PostgreSQL+pgvector, MinIO, Redis ✓

#### BLOQUANTS pour le déploiement

| # | Problème | Impact |
|---|----------|--------|
| B1 | **Dockerfiles manquants** — aucun Dockerfile dans `apps/backend/` ni `apps/frontend/` | Coolify ne peut pas construire les images |
| B2 | **`output: 'standalone'` absent** — `next.config.js` n'a pas cette option | L'image Next.js sera surdimensionnée (~1 GB vs ~150 MB) et potentiellement non fonctionnelle en conteneur minimal |
| B3 | **Endpoint `/health` inexistant** — aucun `GET /health` ni `HealthController` | Coolify et les load balancers ne peuvent pas détecter si le service est prêt |
| B4 | **`prisma migrate deploy` absent au démarrage** — script `start: "node dist/main"` ne migre pas | Désynchronisation schéma/DB en production au premier démarrage et après chaque deploy |
| B5 | **Pas d'endpoint de création d'utilisateur** — aucun `POST /users` ni `/admin/users` | Impossible de créer l'ESN_ADMIN initial en production sans manipulation DB directe |

#### Non-bloquants (à corriger post-déploiement initial)

| # | Problème | Priorité |
|---|----------|----------|
| NB1 | `ThrottlerModule` hardcodé (`ttl: 60_000, limit: 100`) — ignore `RATE_LIMIT_TTL`/`RATE_LIMIT_MAX` du `.env.example` | Basse |
| NB2 | `CORS_ORIGIN` supporte un seul origin (string, pas tableau) | Basse |
| NB3 | Pas de séparation `.env.backend` / `.env.frontend` — un seul `.env.example` à la racine | Documentation |
| NB4 | Pas de seed de production — seed dev avec `password123` uniquement | Avant mise en prod |

---

### AXE 2 — Gestion des comptes et utilisateurs

#### Réponses aux questions

**Q1 — Qui crée les missions ?**
→ Personne via l'API. `apps/backend/src/modules/missions/` est vide (`.gitkeep`). Les missions sont créées uniquement par `prisma/seed.ts`. En production, il faudra une manipulation directe via Prisma Studio ou un script SQL.

**Q2 — Un compte peut-il exister sans mission ?**
→ Oui techniquement. Mais la plupart des fonctionnalités (CRA, rapports, documents) appellent `mission.findFirst({ where: { employeeId, isActive: true } })` et lèvent une `NotFoundException` si aucune mission active n'existe. Un compte sans mission est fonctionnellement inutilisable.

**Q3 — Distinction Admin vs ESN_ADMIN ?**
→ Il n'y a que 3 rôles : `EMPLOYEE`, `ESN_ADMIN`, `CLIENT`. Pas de rôle `SUPER_ADMIN` séparé. L'`ESN_ADMIN` est le seul rôle "administrateur". La gestion des utilisateurs (CRUD) est prévue Phase 2 — les pages `(esn)/admin/employees/` et `(esn)/admin/missions/` affichent "Fonctionnalité à venir — Phase 2".

#### État du module admin frontend

| Page | Statut |
|------|--------|
| `/esn/admin/dashboard` | ✓ Fonctionnel (stats + lien validation CRA) |
| `/esn/admin/cra-validation` | ✓ Fonctionnel |
| `/esn/admin/consent` | ✓ Fonctionnel |
| `/esn/admin/employees` | ✗ Placeholder Phase 2 |
| `/esn/admin/missions` | ✗ Placeholder Phase 2 |

#### Blocage de compte
Le modèle `User` a un champ `deletedAt` (soft-delete) mais aucun endpoint ni UI ne l'utilise. Non implémenté.

---

### AXE 3 — Architecture Coolify

#### Services requis

| Service | Image | Notes |
|---------|-------|-------|
| PostgreSQL | `pgvector/pgvector:pg15` | Extension pgvector obligatoire pour le module RAG |
| Redis | `redis:7-alpine` | Cache + queues notifications |
| S3 | MinIO self-hosted OU S3/OVH/Scaleway externe | `STORAGE_DRIVER=s3` |
| Backend | Image custom (Dockerfile à créer) | NestJS compilé, port 3001 |
| Frontend | Image custom (Dockerfile à créer) | Next.js standalone, port 3100 |

#### Variables d'environnement par service (Coolify)

**Backend** :
```
DATABASE_URL=postgresql://...
JWT_SECRET=<min 32 chars>
JWT_EXPIRATION=7d
STORAGE_DRIVER=s3
S3_ENDPOINT=<url>
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
S3_BUCKET=esn-cra-documents
S3_REGION=eu-west-3
ANTHROPIC_API_KEY=sk-ant-...
SMTP_HOST=<host>
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>
SMTP_FROM=ESN CRA App <noreply@...>
REDIS_URL=redis://redis:6379
NODE_ENV=production
BACKEND_PORT=3001
FRONTEND_URL=https://<domaine-frontend>
CORS_ORIGIN=https://<domaine-frontend>
BCRYPT_ROUNDS=12
```

**Frontend** :
```
NEXTAUTH_SECRET=<min 32 chars>
NEXTAUTH_URL=https://<domaine-frontend>
BACKEND_URL=http://backend:3001
NODE_ENV=production
```

> Note : `BACKEND_URL` pointe sur le réseau interne Coolify (service-to-service), pas sur le domaine public.

---

## Plan de tâches T1–T8

### BLOQUANTS (déploiement impossible sans ces tâches)

---

### T1 — Dockerfile backend (multi-stage)
- **Type :** INFRASTRUCTURE BLOQUANTE
- **Fichier à créer :** `apps/backend/Dockerfile`
- **Contenu attendu :**
  - Stage `builder` : `node:20-alpine`, installe les dépendances, génère Prisma client, compile TypeScript via `nest build`
  - Stage `runner` : `node:20-alpine` minimal, copie `dist/`, `node_modules/`, `prisma/`
  - Entrypoint : `sh -c "npx prisma migrate deploy && node dist/main"` (résout B4 en même temps)
  - `EXPOSE 3001`
- **Dépend de :** rien
- [x] Implémenté (commit: 5eebbbb)
- [ ] Build Docker testé localement
- [x] Commité

---

### T2 — Dockerfile frontend (Next.js standalone)
- **Type :** INFRASTRUCTURE BLOQUANTE
- **Fichiers à modifier/créer :**
  - `apps/frontend/next.config.js` — ajouter `output: 'standalone'`
  - `apps/frontend/Dockerfile`
- **Contenu Dockerfile attendu :**
  - Stage `deps` : installe les dépendances npm
  - Stage `builder` : `npm run build` (Next.js standalone output dans `.next/standalone/`)
  - Stage `runner` : `node:20-alpine` minimal, copie `.next/standalone/`, `.next/static/`, `public/`
  - Entrypoint : `node server.js`
  - `EXPOSE 3100`
- **Dépend de :** rien
- [x] Implémenté (commit: 692d088)
- [ ] Build Docker testé localement
- [x] Commité

---

### T3 — Endpoint `/health` backend
- **Type :** INFRASTRUCTURE BLOQUANTE
- **Fichiers à créer/modifier :**
  - `apps/backend/src/health/health.controller.ts` — `GET /health` retourne `{ status: 'ok', timestamp: ISO }` — route publique (`@Public()`)
  - `apps/backend/src/health/health.module.ts`
  - `apps/backend/src/app.module.ts` — importer `HealthModule`
- **Tests :** `health.controller.spec.ts` — vérifie retour `{ status: 'ok' }` et code HTTP 200
- **Dépend de :** rien
- [x] Implémenté (commit: 8ae2488)
- [x] Tests passent (3 tests)
- [x] Commité

---

### T4 — Endpoint de création d'utilisateur ESN_ADMIN (initialisation production)
- **Type :** FONCTIONNEL BLOQUANT
- **Objectif :** Permettre la création de l'ESN_ADMIN initial en production sans accès DB direct
- **Options (à valider) :**
  - **Option A (recommandée) :** Script `prisma/seed.prod.ts` avec `ADMIN_EMAIL` / `ADMIN_PASSWORD` depuis les variables d'environnement — exécuté manuellement une fois (`npx ts-node prisma/seed.prod.ts`)
  - **Option B :** Endpoint `POST /admin/init` one-shot protégé par `ADMIN_INIT_SECRET` env var — se désactive après le premier appel
- **Dépend de :** T1 (le Dockerfile doit inclure ts-node ou l'étape de seed)
- [x] Option A validée par l'utilisateur
- [x] Implémenté (commit: d724d59) — seed.prod.ts + pnpm seed:prod
- [x] Commité

---

### NON BLOQUANTS (peuvent être faits après le premier déploiement)

---

### T5 — Corriger ThrottlerModule pour lire RATE_LIMIT_TTL/MAX depuis les env vars
- **Type :** AMÉLIORATION
- **Fichier :** `apps/backend/src/app.module.ts`
- **Changement :** `ThrottlerModule.forRootAsync({ ... })` avec `ConfigService` pour lire `RATE_LIMIT_TTL` et `RATE_LIMIT_MAX`
- **Dépend de :** T1 (déploiement de base fonctionnel)
- [x] Implémenté (commit: 3605699)
- [x] Commité

---

### T6 — docker-compose production (Coolify local test)
- **Type :** INFRASTRUCTURE NON BLOQUANTE
- **Fichier à créer :** `infra/docker/docker-compose.prod.yml`
- **Contenu :** PostgreSQL + Redis + MinIO + Backend + Frontend avec build depuis Dockerfiles
- **Utilité :** Tester le stack complet localement avant déploiement Coolify
- **Dépend de :** T1, T2
- [x] Implémenté (commit: e6386e9)
- [ ] Stack démarré et testé localement (à faire sur le serveur Coolify)
- [x] Commité

---

### T7 — Seed de production
- **Type :** OPÉRATIONNEL NON BLOQUANT
- **Objectif :** Script de seed minimal pour la prod (admin initial uniquement, sans données de test)
- **Fichier à créer :** `apps/backend/prisma/seed.prod.ts`
- **Contenu :** Crée un unique ESN_ADMIN dont les credentials viennent de `ADMIN_EMAIL` et `ADMIN_PASSWORD` env vars. Idempotent (upsert).
- **Lié à T4 Option A**
- **Dépend de :** T4
- [x] Implémenté (fusionné avec T4, commit: d724d59)
- [x] Commité

---

### T8 — Module Users + Missions (Phase 2 — hors scope déploiement)
- **Type :** FONCTIONNEL LONG TERME
- **Objectif :** Permettre la création/gestion des utilisateurs et missions via l'API et l'UI
- **Fichiers concernés :**
  - `apps/backend/src/modules/users/` (actuellement vide)
  - `apps/backend/src/modules/missions/` (actuellement vide)
  - `apps/frontend/src/app/(esn)/admin/employees/page.tsx`
  - `apps/frontend/src/app/(esn)/admin/missions/page.tsx`
- **Note :** Ce module est explicitement différé en Phase 2 selon la roadmap. Non nécessaire pour le déploiement initial si les utilisateurs sont créés via T4/T7.
- [x] Planifié (Phase 2 — hors scope)

---

## Ordre d'exécution recommandé

```
T1 (Dockerfile backend)
T2 (Dockerfile frontend + standalone)  ← parallèle à T1
T3 (Health endpoint)                   ← parallèle à T1, T2
    ↓
T4 (Init admin prod — valider option A ou B d'abord)
    ↓
T6 (docker-compose prod pour test local)
T7 (seed.prod.ts)                      ← parallèle à T6
    ↓
Déploiement Coolify
    ↓
T5 (ThrottlerModule env vars)          ← post-déploiement
T8 (Phase 2)                           ← long terme
```

---

## Checklist déploiement Coolify (post-T1..T4)

```
[ ] Créer projet Coolify
[ ] Ajouter service PostgreSQL (pgvector/pgvector:pg15) — noter DATABASE_URL
[ ] Ajouter service Redis (redis:7-alpine) — noter REDIS_URL
[ ] Ajouter service MinIO OU configurer S3 externe — noter S3_* vars
[ ] Ajouter application Backend — pointer sur apps/backend/Dockerfile
    [ ] Configurer toutes les env vars backend (voir liste AXE 3)
    [ ] Configurer health check : GET /api/health
[ ] Ajouter application Frontend — pointer sur apps/frontend/Dockerfile
    [ ] Configurer toutes les env vars frontend (voir liste AXE 3)
[ ] Premier déploiement — vérifier logs de migration Prisma
[ ] Exécuter seed.prod.ts pour créer l'ESN_ADMIN initial
[ ] Tester login ESN_ADMIN en production
[ ] Vérifier health checks verts dans Coolify
```

---

## Historique sessions précédentes (résumé)

La session précédente (2026-03-23) a implémenté et commité T1–T5 (branche `fix/auth/signin-ok-check`) :
- T1 : Fix login `!result?.ok` + callbackUrl
- T2 : Fix DayCell hover `brightness-95`
- T3 : EntryTypeLegend composant
- T4 : Auto-submit CRA DRAFT→SUBMITTED lors envoi rapport
- T5 : Remplacer bouton Soumettre par guidance vers /reports

PR #9 créée : https://github.com/ZasshuNekoPro/cra-esn-app/pull/9
