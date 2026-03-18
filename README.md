# ESN CRA App — v1.0.0

Application de gestion CRA & suivi de projets pour salariés d'ESN.

> **Modèle consentement-first** — le salarié est propriétaire de ses données.
> L'ESN et le client n'y accèdent que sur autorisation explicite.

## Fonctionnalités v1.0

- **Module CRA** — saisie journalière, calculs CP/RTT, génération PDF, signature tripartite (Salarié → ESN → Client)
- **Module Projets** — météo 6 états, commentaires (visibilité granulaire), jalons, validations, Gantt
- **Module Documents** — upload S3/local, versioning, partage sélectif, consentement
- **Module Reports** — bilan mensuel, présentation projets, dashboard partageable (lien temporaire)
- **Assistant IA (RAG)** — chat contextuel sur les données mission via pgvector + Claude
- **Admin ESN** — gestion comptes, demandes de consentement, audit trail complet

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env
# Éditez .env — voir la section Variables d'environnement ci-dessous

# 2. Services infrastructure (PostgreSQL 15, MinIO, Redis)
bash infra/scripts/start-dev.sh

# 3. Dépendances
pnpm install

# 4. Base de données
pnpm db:migrate   # applique les migrations Prisma
pnpm db:seed      # données de démonstration (alice / admin / client)

# 5. Lancer l'application
pnpm dev
```

Accès :

| Service      | URL                      | Identifiants (seed)              |
|--------------|--------------------------|----------------------------------|
| Frontend     | http://localhost:3000    | alice@example.com / password123  |
| Backend API  | http://localhost:3001    | admin@esn-corp.fr / password123  |
| MinIO UI     | http://localhost:9001    | minioadmin / minioadmin          |

## Variables d'environnement

Copiez `.env.example` → `.env` et renseignez :

| Variable             | Requis | Description                                    |
|----------------------|--------|------------------------------------------------|
| `DATABASE_URL`       | Oui    | PostgreSQL principal (dev : port 5433)         |
| `JWT_SECRET`         | Oui    | Secret JWT — min 32 caractères                 |
| `NEXTAUTH_SECRET`    | Oui    | Secret NextAuth — min 32 caractères            |
| `NEXTAUTH_URL`       | Oui    | URL publique du frontend                       |
| `STORAGE_DRIVER`     | Oui    | `local` (dev) ou `s3` (prod)                   |
| `ANTHROPIC_API_KEY`  | Oui    | Clé API Claude (assistant RAG)                 |
| `OPENAI_API_KEY`     | Oui    | Clé API OpenAI (embeddings pgvector)           |
| `SMTP_HOST`          | Oui    | Serveur SMTP pour les notifications email      |
| `REDIS_URL`          | Oui    | Redis pour les queues de notifications         |
| `S3_ENDPOINT`        | Non    | Endpoint S3/MinIO (si STORAGE_DRIVER=s3)       |

Voir `.env.example` pour la liste complète avec exemples.

## Commandes fréquentes

```bash
pnpm dev              # Lance backend + frontend en parallèle
pnpm test             # Tests unitaires (Vitest — 291 tests)
pnpm test:e2e         # Tests Playwright (frontend) + Vitest e2e (backend)
pnpm build            # Build de production
pnpm db:migrate       # Prisma migrate dev
pnpm db:seed          # Seed de données de test
pnpm lint             # ESLint + Prettier check
pnpm typecheck        # TypeScript strict (zéro erreur)
pnpm format           # Prettier auto-fix
```

## Architecture

```
monorepo/
├── apps/
│   ├── backend/          NestJS 10 — API REST + SSE (RAG streaming)
│   └── frontend/         Next.js 14 App Router — interface utilisateur
├── packages/
│   ├── shared-types/     Types et enums TypeScript partagés
│   ├── shared-utils/     Utilitaires communs (jours fériés, calculs)
│   └── pdf-generator/    Génération PDF CRA via Puppeteer
├── prisma/               Schéma Prisma 5 — 18 modèles, migrations
└── infra/                Scripts Docker et déploiement
```

### Modules backend

```
auth          → JWT, RBAC (EMPLOYEE / ESN_ADMIN / CLIENT)
users         → profils, préférences, consentements
missions      → missions ESN, affectation salarié/client
cra           → jours travaillés, congés, PDF, workflow signature
projects      → météo, commentaires, validations, jalons
documents     → upload S3, partage sélectif, versioning
notifications → email + in-app, escalade météo automatique
rag           → indexation pgvector, query contextuelle par salarié
reports       → bilans mensuels, présentations, partage temporaire
```

### Flux d'authentification

```
Client → NextAuth.js (JWT) → Middleware Next.js (protection routes)
                           → NestJS JwtAuthGuard + RolesGuard
                           → ConsentGuard (données salarié → ESN)
```

Pour plus de détails : `docs/architecture/`

## Sécurité

Le modèle de sécurité est décrit dans `docs/architecture/security-model.md`.
L'audit de sécurité v1.0 est disponible dans `docs/architecture/security-audit.md`.

Points clés :
- `ConsentGuard` sur toutes les routes ESN accédant aux données salarié
- RBAC strict : `EMPLOYEE`, `ESN_ADMIN`, `CLIENT`
- Audit trail complet sur toutes les mutations sensibles
- Isolation stricte des données par `employeeId`

## Développement avec Claude Code

```bash
claude   # Ouvrir Claude Code à la racine du projet
```

Claude Code lit automatiquement `CLAUDE.md` au démarrage.

Commandes slash disponibles :
- `/new-module <nom>`   — scaffold un nouveau module NestJS
- `/git-commit`         — commit guidé avec checks qualité
- `/git-pr`             — créer une PR GitHub
- `/review-security`    — audit de sécurité ciblé

## Documentation

| Fichier/Dossier                       | Description                              |
|---------------------------------------|------------------------------------------|
| `CLAUDE.md`                           | Contexte Claude Code (auto-chargé)       |
| `docs/architecture/data-model.md`     | Schéma Prisma commenté                   |
| `docs/architecture/api-overview.md`   | Endpoints avec rôles requis              |
| `docs/architecture/security-model.md` | Modèle consentement-first                |
| `docs/architecture/security-audit.md` | Rapport d'audit sécurité v1.0            |
| `docs/specs/`                         | Spécifications fonctionnelles par module |
| `docs/tasks/BACKLOG.md`               | Backlog des sprints                      |
| `.env.example`                        | Variables d'environnement requises       |

## Stack technique

| Couche    | Technologie                              |
|-----------|------------------------------------------|
| Backend   | NestJS 10 · TypeScript 5 · PostgreSQL 15 |
| ORM       | Prisma 5                                 |
| Frontend  | Next.js 14 App Router · Tailwind · shadcn|
| Auth      | NextAuth.js v5 · JWT · RBAC              |
| Fichiers  | MinIO (dev) / S3-compatible (prod)       |
| IA/RAG    | LangChain.js · pgvector · Claude API     |
| PDF       | Puppeteer · PDF-lib                      |
| Tests     | Vitest (291 tests) · Playwright (43 tests)|
| Monorepo  | Turborepo · pnpm workspaces              |
