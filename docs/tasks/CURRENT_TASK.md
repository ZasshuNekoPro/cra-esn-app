# P13 — Audit Sécurité

**Branche :** `main` (après merge PR #5 Sprint 5 + PR #6 Sprint 6)
**Date de création :** 2026-03-17
**Statut :** À DÉMARRER

---

## Contexte

Sprint 5 (Reports, Dashboard, Notifications, Share Tokens) et Sprint 6 (RAG — indexation pgvector,
query streaming SSE, chat frontend, suggestions proactives) sont mergés sur `main`.

La prochaine étape est l'audit de sécurité de l'ensemble du MVP avant une éventuelle mise en production.

## Périmètre de l'audit

Utiliser la commande `/review-security` pour déclencher l'audit complet.

### Axes prioritaires

1. **Authentification & RBAC**
   - Vérification que `JwtAuthGuard` + `RolesGuard` couvrent toutes les routes
   - Contrôle que `ConsentGuard` est appliqué sur chaque route ESN accédant aux données salarié
   - Validation des tokens JWT (expiration, rotation, stockage côté client)

2. **Isolation des données (multi-tenant)**
   - Chaque query Prisma filtre sur `employeeId` ou `userId` — pas de fuite cross-salarié
   - Vérifier le module RAG : `searchSimilar(employeeId, ...)` strictement isolé
   - Tokens de partage dashboard : expiration, scope limité, révocabilité

3. **Injection & validation des entrées**
   - DTOs NestJS avec `class-validator` + `ValidationPipe` global
   - Pas d'injection SQL (Prisma paramétré) ni de XSS côté frontend
   - Sanitisation des noms de fichiers S3

4. **Audit trail**
   - Mutations sensibles enregistrées dans `AuditLog`
   - Accès RAG logué (`RAG_QUERY` dans `AuditAction`)

5. **Secrets & configuration**
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `JWT_SECRET` uniquement en variables d'env
   - Pas de secrets dans le code source ni dans les logs

6. **Rate limiting**
   - `ThrottlerGuard` global actif
   - Endpoint `/rag/query` (coûteux) — vérifier throttle spécifique si besoin

## Commande

```bash
/review-security
```

## Résultat attendu

Un rapport des vulnérabilités trouvées avec corrections appliquées directement dans le code.

## Historique des sprints mergés

| PR | Sprint | Contenu |
|----|--------|---------|
| #1 | Sprint 1 | Auth, Prisma, scaffolding |
| #2 | Sprint 2 | Module CRA |
| #3 | Sprint 3 | Module Projets |
| #4 | Sprint 4 | Documents, Consentement, CRA-PDF |
| #5 | Sprint 5 | Reports, Dashboard partageable, Notifications |
| #6 | Sprint 6 | RAG — indexation, streaming, chat, suggestions |
