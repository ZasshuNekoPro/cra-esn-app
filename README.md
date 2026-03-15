# ESN CRA App

Application de gestion CRA & suivi de projets pour salariés d'ESN.

> **Modèle consentement-first** — le salarié est propriétaire de ses données.
> L'ESN et le client n'y accèdent que sur autorisation explicite.

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env
# Éditez .env avec vos valeurs réelles

# 2. Services Docker (PostgreSQL + MinIO + Redis)
bash infra/scripts/start-dev.sh

# 3. Dépendances (après que Claude Code ait initialisé les package.json des apps)
pnpm install

# 4. Lancer l'application
pnpm dev
```

Accès :
- Frontend  →  http://localhost:3000
- Backend   →  http://localhost:3001
- MinIO UI  →  http://localhost:9001

## Développement avec Claude Code

```bash
claude   # Ouvrir Claude Code à la racine du projet
```

Claude Code lit automatiquement `CLAUDE.md` au démarrage.
Voir `prompts-amorçage.md` pour les prompts de démarrage.

Commandes slash disponibles :
- `/new-module <nom>`   — scaffold un nouveau module NestJS
- `/git-commit`         — commit guidé avec checks qualité
- `/git-pr`             — créer une PR GitHub
- `/review-security`    — audit de sécurité ciblé

## Documentation

| Fichier/Dossier             | Description                              |
|-----------------------------|------------------------------------------|
| `CLAUDE.md`                 | Contexte Claude Code (auto-chargé)       |
| `docs/specs/`               | Spécifications fonctionnelles par module |
| `docs/tasks/BACKLOG.md`     | Backlog des sprints                      |
| `docs/tasks/CURRENT_TASK.md`| État de la tâche en cours                |
| `.env.example`              | Variables d'environnement requises       |
| `.claude/commands/`         | Commandes slash personnalisées           |

## Stack

| Couche    | Technologie                              |
|-----------|------------------------------------------|
| Backend   | NestJS 10 · TypeScript 5 · PostgreSQL 15 |
| ORM       | Prisma 5                                 |
| Frontend  | Next.js 14 App Router · Tailwind · shadcn|
| Auth      | NextAuth.js v5 · JWT · RBAC              |
| Fichiers  | MinIO (dev) / S3 (prod)                  |
| IA/RAG    | LangChain.js · pgvector                  |
| PDF       | Puppeteer · PDF-lib                      |
| Tests     | Vitest · Playwright                      |
| Monorepo  | Turborepo · pnpm workspaces              |
