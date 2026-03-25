# v1.0.0 Released

**Date :** 2026-03-18
**Statut :** TERMINÉ ✅

---

## Ce qui a été livré

La version 1.0.0 de l'ESN CRA App est publiée sur GitHub :
https://github.com/ZasshuNekoPro/cra-esn-app/releases/tag/v1.0.0

### Sprints mergés

| PR | Sprint | Contenu |
|----|--------|---------|
| #1 | Sprint 1 | Auth, Prisma, scaffolding |
| #2 | Sprint 2 | Module CRA |
| #3 | Sprint 3 | Module Projets |
| #4 | Sprint 4 | Documents, Consentement, CRA-PDF |
| #5 | Sprint 5 | Reports, Dashboard partageable, Notifications |
| #6 | Sprint 6 | RAG — indexation, streaming, chat, suggestions |

### Livraisons v1.0

- 6 scénarios e2e Playwright (auth, CRA, projets, consentement, RAG, partage public)
- N+1 query fixes (leaveBalance → findMany, scheduler → $queryRaw DISTINCT ON)
- 9 loading skeletons (Suspense boundaries App Router)
- Audit de sécurité complet (8 vulnérabilités corrigées)
- Documentation architecture complète (data-model, api-overview, security-model)
- README v1.0 rewrite

### Métriques qualité

- 291 tests unitaires Vitest — 0 échec
- TypeScript strict — 0 erreur typecheck
- 0 `any` non justifié

---

## Prochaine étape

Phase 2 — Post-MVP : voir section "Phase 2" dans BACKLOG.md.
Priorité : multi-missions simultanées (8 chantiers listés).
