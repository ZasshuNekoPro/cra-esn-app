# Backlog — Phase 1 (MVP)

## Sprint 1 — Fondations ✅
- [x] Init git + remote GitHub
- [x] Setup Turborepo + pnpm workspaces + package.json des apps
- [x] Schema Prisma complet (18 modèles + migrations + seed)
- [x] Auth NestJS (JWT + RBAC guards + ConsentGuard)
- [x] Auth Frontend (NextAuth v5 + middleware de route)
- [x] Layout dashboard de base (sidebar role-aware, login page)
- [x] PR Sprint 1 → main (PR #1 mergé ✅)

## Sprint 2 — Module CRA ✅
- [x] Entités CraEntry + CraMonth + LeaveBalance (Prisma) — migration Sprint 2
- [x] API CRUD CRA (NestJS) + DTOs — 7 endpoints REST
- [x] Calcul automatique soldes CP/RTT — WorkingDaysUtil + jours fériés FR 2024-2027
- [x] Workflow signature tripartite — machine à états DRAFT→LOCKED + AuditLog
- [x] Génération PDF CRA — Puppeteer + upload MinIO + auto-lock
- [x] Interface saisie journalière (frontend) — MonthGrid + DayCell + EntryModal
- [x] Dashboard jours consommés / restants — LeaveBalanceSummary + WorkingDaysProgress
- [x] Tests unit CRA service (TDD) — 142 tests backend, 45 frontend, 36 pdf-generator
- [x] Tests e2e workflow de signature — 22 tests supertest (CRUD + workflow + access control)
- [x] PR Sprint 2 → main (PR #2 mergé ✅)

## Sprint 3 — Module Projets
- [ ] Entités Project + WeatherEntry + ProjectComment + Milestone (Prisma)
- [ ] API projets (NestJS) + DTOs
- [ ] Règles d'escalade météo automatique (cron ou event-driven)
- [ ] Interface météo + commentaires (frontend)
- [ ] Composant WeatherIcon avec 6 états
- [ ] Tests unit projects service
- [ ] PR Sprint 3 → main

## Sprint 4 — Documents & Signature
- [ ] Upload S3 avec MinIO (backend)
- [ ] Interface upload / partage (frontend)
- [ ] Génération PDF CRA (packages/pdf-generator)
- [ ] Workflow signature complet (backend + frontend)
- [ ] Annexe projets dans le CRA PDF
- [ ] Tests e2e signature tripartite
- [ ] PR Sprint 4 → main

## Sprint 5 — Reports & Finitions
- [ ] Bilan mensuel automatique
- [ ] Dashboard partageable (token temporaire)
- [ ] Présentation projets PDF + lien live
- [ ] Tests e2e complets
- [ ] Audit sécurité (/review-security)
- [ ] PR Sprint 5 → main

## Phase 2 — Post-MVP

### Multi-missions (à planifier après validation du MVP)
- [ ] Ajouter `isCurrent: Boolean` sur `Mission` (ou date de fin comme marqueur)
- [ ] Permettre plusieurs `Mission` actives par salarié simultanément
- [ ] Adapter `CraMonth` : retirer la contrainte unique strict sur `missionId`
      ou passer à un modèle `CraMonth` par mission active
- [ ] Adapter la UI saisie journalière : sélecteur de mission + ventilation projets multi-mission
- [ ] Adapter les calculs de soldes CP/RTT (agrégation cross-missions)
- [ ] Adapter les PDF CRA (section par mission ou CRA consolidé)
- [ ] Adapter `ConsentGuard` : consentement par mission ou global salarié ?
- [ ] Migration Prisma non-breaking (champ optionnel + backfill)
