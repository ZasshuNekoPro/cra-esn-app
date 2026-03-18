# P14 — Intégration finale et release v1.0

**Branche :** `main` (après merge PR sécurité)
**Date de création :** 2026-03-18
**Statut :** À DÉMARRER

---

## Contexte

L'audit de sécurité v1.0 est terminé (rapport dans `docs/architecture/security-audit.md`).
Le problème critique C1 (isolation données weather) a été corrigé et mergé.
Les 7 avertissements non bloquants ont été documentés pour le suivi post-release.

## Objectif

Préparer la release v1.0 du MVP ESN CRA App :
- Tests e2e complets (parcours salarié, ESN admin, client)
- Build de production frontend + backend
- Documentation de déploiement
- Validation finale des variables d'environnement
- Tag de release `v1.0.0`

## Tâches

1. **Tests e2e** : lancer `pnpm test:e2e` et corriger les éventuels échecs
2. **Build prod** : `pnpm build` — vérifier absence d'erreurs
3. **Checklist déploiement** : `.env.example` complet, migrations Prisma à jour
4. **Tag** : `git tag v1.0.0` + release GitHub
5. **Avertissements audit** : ouvrir des issues GitHub pour W2-W7 (suivi post-release)

## Historique des tâches terminées

| Tâche | Statut | PR |
|-------|--------|-----|
| P1 Auth + Scaffolding | ✅ | #1 |
| P2 Module CRA | ✅ | #2 |
| P3 Module Projets | ✅ | #3 |
| P4 Documents, Consentement, CRA-PDF | ✅ | #4 |
| P5 Reports, Dashboard, Notifications | ✅ | #5 |
| P6 RAG — indexation, streaming, chat | ✅ | #6 |
| P13 Audit sécurité v1.0 | ✅ | #7 (en cours) |
