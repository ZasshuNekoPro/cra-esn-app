# ESN CRA App — Claude Code Context

## Projet
Application de gestion CRA & suivi de projets pour salariés d'ESN.
Trois acteurs : **Salarié** (propriétaire des données), **ESN** (administration),
**Client** (validation). Modèle consentement-first : aucune donnée accessible
sans accord explicite du salarié.

## Stack technique
| Couche       | Technologie                              |
|--------------|------------------------------------------|
| Backend      | NestJS 10, TypeScript 5, PostgreSQL 15   |
| ORM          | Prisma 5                                 |
| Frontend     | Next.js 14 (App Router), TypeScript 5    |
| UI           | Tailwind CSS 3, shadcn/ui                |
| Auth         | NextAuth.js v5 + JWT + RBAC              |
| Fichiers     | S3-compatible (MinIO dev / S3 prod)      |
| RAG          | LangChain.js + pgvector (PostgreSQL)     |
| PDF          | Puppeteer (génération) + PDF-lib (merge) |
| Tests        | Vitest (unit) + Playwright (e2e)         |
| Monorepo     | Turborepo + pnpm workspaces              |

## Architecture des modules (backend)
```
auth          → JWT, RBAC (EMPLOYEE / ESN_ADMIN / CLIENT)
users         → profils, préférences, consentements
missions      → missions ESN, affectation salarié/client
cra           → jours travaillés, congés, génération PDF, workflow signature
projects      → projets clients, météo, commentaires, validations, jalons
documents     → upload S3, partage sélectif, versioning
notifications → email + in-app, règles d'escalade météo
rag           → indexation pgvector, query contextuelle par salarié
reports       → bilans mensuels, présentations projets, exports
```

## Règles de développement (LIRE AVANT DE CODER)

### Sécurité & consentement
- Tout accès ESN aux données salarié passe par `ConsentGuard`
- Vérifier `user.role` ET `resourceOwner.id === user.id` sur chaque endpoint
- Ne jamais exposer les notes privées ESN/Salarié au client
- Audit trail obligatoire sur toute mutation sensible (partage, blocage, accès)

### Qualité du code
- TypeScript strict — zéro `any`, zéro `@ts-ignore` sans justification
- Toujours écrire les tests AVANT l'implémentation (TDD)
- Chaque module a ses tests unit dans `test/unit/`
- Chaque feature critique a un test e2e dans `test/e2e/`
- Lancer `pnpm test` et `pnpm typecheck` avant chaque commit

### Git — géré intégralement par Claude Code
- Branche principale : `main`
- Branches de feature : `feat/<module>/<description-courte>`
- Branches de fix : `fix/<module>/<description-courte>`
- Format des commits : Conventional Commits (voir .gitmessage)
- Une PR par sprint ou par fonctionnalité majeure
- Ne jamais committer du code cassé ou des tests en échec
- Ne jamais faire `git push --force` sur `main`

### Workflow git par tâche
```
1. git checkout -b feat/<module>/<tâche>
2. Implémenter + tests (TDD)
3. pnpm test && pnpm typecheck && pnpm lint
4. git add -A && git commit -m "feat(<module>): <description>"
5. gh pr create --title "..." --body "..." (quand la feature est complète)
```

## Commandes fréquentes
```bash
pnpm dev              # Lance backend + frontend en parallèle
pnpm test             # Tous les tests (vitest)
pnpm test:e2e         # Tests Playwright
pnpm build            # Build de production
pnpm db:migrate       # Prisma migrate dev
pnpm db:seed          # Seed de données de test
pnpm lint             # ESLint + Prettier check
pnpm typecheck        # TypeScript strict check
pnpm format           # Prettier auto-fix
```

## Commandes git / GitHub (gh CLI)
```bash
git status                          # État du repo
git log --oneline -10               # Derniers commits
git checkout -b feat/<module>/<x>   # Nouvelle branche de feature
git add -A && git commit -m "..."   # Commit
git push -u origin <branche>        # Push + tracking
gh pr create                        # Créer une PR interactive
gh pr create --fill                 # PR avec titre/body auto depuis commits
gh pr list                          # Lister les PRs ouvertes
gh pr merge <n> --squash --delete-branch  # Merger une PR
gh pr view --web                    # Ouvrir la PR dans le navigateur
```

## Fichiers de référence
- `docs/specs/` → Spécifications fonctionnelles (LIRE avant de coder un module)
- `docs/architecture/` → Schémas de données et flux
- `docs/tasks/CURRENT_TASK.md` → État de la tâche en cours
- `docs/tasks/BACKLOG.md` → Backlog des sprints
- `packages/shared-types/` → Types TypeScript partagés backend/frontend
- `.env.example` → Variables d'environnement requises

## Ce que Claude ne doit PAS faire
- Ne pas modifier le schéma Prisma sans mettre à jour les types partagés
- Ne pas bypasser ConsentGuard même pour des tests rapides
- Ne pas utiliser `any` pour contourner une erreur TypeScript — la résoudre
- Ne pas supprimer des tests qui échouent — les corriger
- Ne pas committer directement sur `main` — toujours passer par une branche
- Ne pas créer de nouveaux fichiers sans vérifier s'il existe déjà une abstraction
