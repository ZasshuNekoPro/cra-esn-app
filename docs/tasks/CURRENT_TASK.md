# Sprint 1 — Fondations : exploration et planification

**Branche cible :** `feat/sprint-1/foundations`
**Date de création :** 2026-03-15
**Statut :** VALIDÉ — PRÊT POUR IMPLÉMENTATION

---

## Contexte

Ce sprint pose toutes les fondations du projet ESN CRA App : infrastructure
monorepo, schéma de données complet, authentification backend + frontend,
et layout de base. Aucun module fonctionnel (CRA, Projets…) n'est implémenté
ici — ils font l'objet des Sprints 2 à 5.

---

## Tâches ordonnées (avec dépendances)

### Bloc 0 — Outillage monorepo
> Prérequis : aucun

- [ ] **0.1** Initialiser `package.json` des apps (`apps/backend`, `apps/frontend`)
      et des packages (`packages/shared-types`, `packages/shared-utils`,
      `packages/pdf-generator`, `packages/rag-engine`)
- [ ] **0.2** Configurer Turborepo (`turbo.json`) : pipelines `build`, `test`,
      `lint`, `typecheck`, `dev`
- [ ] **0.3** Configurer `tsconfig.json` base + tsconfig spécifiques par app
- [ ] **0.4** Configurer ESLint + Prettier globaux (déjà présents, vérifier cohérence)
- [ ] **0.5** Vérifier `pnpm install` sans erreur + `pnpm build` en sortie propre

### Bloc 1 — Types partagés (`packages/shared-types`)
> Prérequis : 0.1

- [ ] **1.1** Créer `src/enums.ts` : tous les enums
      (`Role`, `CraEntryType`, `CraMonthStatus`, `ProjectStatus`,
      `WeatherState`, `CommentVisibility`, `MilestoneStatus`,
      `ValidationStatus`, `DocumentShareRole`, `PortionType`)
- [ ] **1.2** Créer `src/entities.ts` : interfaces de toutes les entités
      (`User`, `Mission`, `CraEntry`, `CraMonth`, `LeaveBalance`,
      `ProjectEntry`, `Project`, `WeatherEntry`, `ProjectComment`,
      `ValidationRequest`, `Milestone`, `Document`, `DocumentVersion`,
      `DocumentShare`, `Consent`, `AuditLog`)
- [ ] **1.3** Créer `src/api.ts` : types des réponses API (wrappers `ApiResponse<T>`,
      `PaginatedResponse<T>`, `ApiError`)
- [ ] **1.4** Exporter depuis `src/index.ts`, vérifier `pnpm typecheck`

### Bloc 2 — Schéma Prisma
> Prérequis : 0.1, 1.1 (les enums sont miroir du schéma)

- [ ] **2.1** Créer `apps/backend/src/database/schema.prisma` avec le schéma complet
      (18 modèles + enums)
- [ ] **2.2** Vérifier `npx prisma validate` sans erreur
- [ ] **2.3** Écrire la migration initiale : `pnpm db:migrate` (nom : `init_full_schema`)
- [ ] **2.4** Ajouter la migration SQL manuelle pour l'index ivfflat pgvector :
      `CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);`
- [ ] **2.5** Créer `apps/backend/src/database/seeds/dev.seed.ts` :
      1 ESN_ADMIN + 1 EMPLOYEE + 1 CLIENT + 1 Mission de test
- [ ] **2.6** Vérifier `pnpm db:seed` sans erreur

### Bloc 3 — Backend NestJS : infrastructure
> Prérequis : 2.3

- [ ] **3.1** Initialiser `apps/backend` : NestJS CLI, installer dépendances
      (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`,
      `class-validator`, `class-transformer`, `@prisma/client`)
- [ ] **3.2** Créer `DatabaseModule` avec `PrismaService` (singleton, `onModuleInit`,
      `enableShutdownHooks`)
- [ ] **3.3** Créer `CommonModule` : barrel export pour guards, decorators, pipes, filters
- [ ] **3.4** Créer `GlobalExceptionFilter` (erreurs Prisma → HTTP codes lisibles)
- [ ] **3.5** Créer `ValidationPipe` global (class-validator, whitelist: true,
      forbidNonWhitelisted: true)
- [ ] **3.6** Configurer CORS, rate limiting (`@nestjs/throttler`), helmet

### Bloc 4 — Backend : Auth + Guards
> Prérequis : 3.2

- [ ] **4.1** Créer `AuthModule` :
      - `JwtStrategy` (valide Bearer token, injecte `req.user`)
      - `AuthController` : `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
      - `AuthService` : `validateUser`, `login` (retourne JWT)
- [ ] **4.2** Créer `JwtAuthGuard` (étend `AuthGuard('jwt')`, global via `APP_GUARD`)
- [ ] **4.3** Créer `@Roles(...)` decorator + `RolesGuard` (global via `APP_GUARD`)
- [ ] **4.4** Créer `ResourceOwnerGuard` (vérifie `req.user.id === resource.employeeId`)
- [ ] **4.5** Créer `ConsentGuard` (vérifie `Consent` actif en DB + écrit AuditLog)
- [ ] **4.6** Créer `UsersModule` : `GET /users/me`, `PATCH /users/me`
- [ ] **4.7** Écrire tests unit : `AuthService`, `JwtStrategy`, `ConsentGuard`
      (mocks Prisma via jest-mock-extended)
- [ ] **4.8** Écrire tests e2e : login valide, login invalide, accès sans token,
      accès rôle insuffisant, accès ESN sans consentement

### Bloc 5 — Frontend Next.js : infrastructure
> Prérequis : 0.1

- [ ] **5.1** Initialiser `apps/frontend` : Next.js 14 App Router, TypeScript strict
- [ ] **5.2** Installer et configurer Tailwind CSS 3 + shadcn/ui (thème, couleurs, police)
- [ ] **5.3** Installer NextAuth.js v5 (`next-auth@beta`)
- [ ] **5.4** Créer `apps/frontend/src/auth.ts` : configuration NextAuth
      (provider Credentials → appel `POST /auth/login` backend)
- [ ] **5.5** Créer `apps/frontend/src/middleware.ts` : protection des routes par rôle
      (`(dashboard)` → EMPLOYEE, `(esn)` → ESN_ADMIN)
- [ ] **5.6** Créer `apps/frontend/src/lib/api/client.ts` : fetch wrapper
      (injecte `Authorization: Bearer` depuis la session NextAuth)

### Bloc 6 — Frontend : Layout de base
> Prérequis : 5.2, 5.4

- [ ] **6.1** Créer `AppLayout.tsx` : structure sidebar + header + main content
- [ ] **6.2** Créer `Sidebar.tsx` : navigation filtrée par rôle
- [ ] **6.3** Créer `Header.tsx` : user menu (avatar, rôle, logout)
- [ ] **6.4** Créer composants UI partagés :
      `RoleGuard`, `StatusBadge`, `EmptyState`, `ConfirmDialog`, `PageHeader`
- [ ] **6.5** Créer page `/login` (Credentials form, gestion erreurs)
- [ ] **6.6** Créer page `/dashboard` (placeholder EMPLOYEE)
- [ ] **6.7** Créer page `/admin` (placeholder ESN_ADMIN)
- [ ] **6.8** Vérifier `pnpm dev` : les deux apps démarrent, login fonctionne
      end-to-end (frontend → backend → DB)

### Bloc 7 — Validation croisée
> Prérequis : tous les blocs

- [ ] **7.1** `pnpm test` : tous les tests passent (unit + e2e)
- [ ] **7.2** `pnpm typecheck` : zéro erreur TypeScript
- [ ] **7.3** `pnpm lint` : zéro warning ESLint / Prettier
- [ ] **7.4** Vérifier que `packages/shared-types` est consommé correctement
      par backend ET frontend (pas de duplication de types)

### Bloc 8 — Git & PR
> Prérequis : 7.1, 7.2, 7.3

- [ ] **8.1** `git checkout -b feat/sprint-1/foundations`
- [ ] **8.2** Commits atomiques par bloc (Conventional Commits)
- [ ] **8.3** `gh pr create` → PR Sprint 1 → main

---

## Graphe de dépendances entre blocs

```
0 (outillage)
├── 1 (shared-types)
│   └── 2 (Prisma schema)
│       └── 3 (NestJS infra)
│           └── 4 (Auth + Guards)  ←─┐
│                                     ├── 7 (validation) → 8 (PR)
└── 5 (Next.js infra)                 │
    └── 6 (Layout)  ─────────────────┘
```

Blocs 4 et 6 peuvent avancer **en parallèle** une fois 3 et 5 terminés.

---

## Décisions d'architecture retenues

| Décision | Choix | Raison |
|---|---|---|
| Multi-missions | Une mission active par salarié | Simplifie CraMonth (1 missionId) |
| Validation croisée projets | Service-level check | Projet doit appartenir à la mission du CRA |
| CLIENT = User | `Role.CLIENT` en DB | Cohérence RBAC, créé par ESN_ADMIN |
| LeaveBalance | Dénormalisé + recompute | Performance + RAG-friendly |
| Clé S3 sans projet | `.../mission/...` | Segment littéral pour les docs de mission |
| Dégradation météo | `newState > oldState` | Ordre numérique des enum |
| pgvector | `Unsupported` + rawQuery | Prisma 5 non compatible nativement |
| Token dashboard | JWT 48h + table révocation | Révocation immédiate possible |
| Notifications in-app | Table `Notification` créée Sprint 1 | Évite migration breaking Sprint 5+ |

---

## Ambiguïtés en suspens (réponse attendue avant Sprint 2)

1. ~~Un salarié peut-il avoir plusieurs missions **simultanément** ?~~
   **Décision :** non pour le MVP — une mission active par salarié.
   Le support multi-missions est planifié en Phase 2 (voir BACKLOG.md).
2. Le CLIENT peut-il uploader des documents de son côté ?
   (specs : non — mais la spec 03-documents ne le précise pas explicitement)
3. La table `Notification` — polymorphique (`payload Json`) ou typée ?
   (solution par défaut : `payload Json` — plus simple pour Phase 1)

---

## Prochaine étape

> **Lancer le Prompt 2** après validation de ce plan par l'utilisateur.
>
> Le Prompt 2 implémentera les Blocs 0, 1 et 2 (monorepo + shared-types +
> schéma Prisma) en TDD, avec commit atomique à chaque bloc.
