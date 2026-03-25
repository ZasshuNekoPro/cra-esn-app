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

## Sprint 3 — Module Projets ✅
- [x] Entités Project + WeatherEntry + ProjectComment + Milestone + ValidationRequest (Prisma)
- [x] API projets (NestJS) + DTOs — CRUD, météo, commentaires, validations, jalons
- [x] Escalade météo automatique (cron quotidien 08:00 — RAINY→STORM après 3 jours ouvrés)
- [x] Interface météo + commentaires (frontend)
- [x] Composant WeatherIcon avec 6 états
- [x] MilestonesService + ValidationsService + CommentsService (TDD)
- [x] Tests e2e workflow complet (22 scénarios supertest)
- [x] PR Sprint 3 → main (PR #3 ouverte ✅)

## Sprint 4 — Documents & Signature ✅
- [x] Upload S3 avec MinIO (backend)
- [x] Interface upload / partage (frontend)
- [x] Génération PDF CRA (packages/pdf-generator)
- [x] Workflow signature complet (backend + frontend)
- [x] Annexe projets dans le CRA PDF
- [x] Tests e2e signature tripartite
- [x] PR Sprint 4 → main (PR #4 mergé ✅)

## Sprint 5 — Reports & Finitions ✅
- [x] Bilan mensuel automatique
- [x] Dashboard partageable (token temporaire)
- [x] Présentation projets PDF + lien live
- [x] Tests e2e complets
- [x] Audit sécurité (/review-security)
- [x] PR Sprint 5 → main (PR #5 mergé ✅)

## Sprint 6 — RAG Assistant ✅
- [x] Indexation pgvector (LangChain.js + OpenAI embeddings)
- [x] Query streaming SSE via Claude API
- [x] Chat frontend avec suggestions proactives
- [x] Isolation stricte par employeeId
- [x] PR Sprint 6 → main (PR #6 mergé ✅)

## v1.0 — Release ✅
- [x] 6 scénarios e2e Playwright (intégration complète)
- [x] N+1 query fixes (leaveBalance, scheduler météo)
- [x] Loading skeletons (9 routes, Suspense boundaries)
- [x] Audit de sécurité complet (docs/architecture/security-audit.md)
- [x] Documentation architecture : data-model, api-overview, security-model
- [x] README v1.0 rewrite (quickstart, .env, architecture)
- [x] Tag v1.0.0 + GitHub Release
- [x] Push main ✅ — **v1.0.0 Released 🎉**

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
