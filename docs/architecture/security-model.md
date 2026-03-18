# Modèle de sécurité — ESN CRA App v1.0

## Principe fondateur : Consentement-first

> **Le salarié est propriétaire de ses données.**
> L'ESN et le client n'y accèdent que sur autorisation explicite et révocable.

Aucun accès aux données d'un salarié n'est possible sans un `Consent` en état `GRANTED` pour ce salarié. Ce principe est appliqué par des guards NestJS, pas par convention.

---

## Acteurs et rôles (RBAC)

| Rôle        | Description                                                          |
|-------------|----------------------------------------------------------------------|
| `EMPLOYEE`  | Salarié — propriétaire de ses données CRA, projets, documents       |
| `ESN_ADMIN` | Administrateur de l'ESN — accès sur consentement, signature CRA     |
| `CLIENT`    | Client final — validation CRA, lecture météo projet en lecture seule |

Le rôle est stocké en base dans `User.role` et inclus dans le payload JWT.

---

## Flux d'authentification

```
Client → POST /auth/login (email + password)
       ← JWT { sub: userId, role, email, exp }

Requêtes suivantes :
Client → Authorization: Bearer <jwt>
       → JwtAuthGuard (vérifie signature + expiration)
       → RolesGuard (vérifie role ∈ @Roles([...]))
       → ConsentGuard (vérifie GRANTED si ESN_ADMIN accède à données salarié)
       → ResourceOwnerGuard (vérifie userId === resource.ownerId)
```

Le JWT est signé avec `JWT_SECRET` (min 32 caractères, rotation recommandée tous les 90 jours).

---

## Guards de sécurité

### `JwtAuthGuard`
Appliqué globalement sur toutes les routes.
Exception : routes décorées `@Public()` (login, dashboard partagé public).

### `RolesGuard`
Vérifie que `user.role` est dans la liste fournie par `@Roles([...])`.
Déclenche `ForbiddenException` (HTTP 403) si le rôle est insuffisant.

### `ConsentGuard`
Appliqué sur les routes ESN_ADMIN qui accèdent aux données d'un salarié.
Vérifie qu'un `Consent` en état `GRANTED` existe pour la paire `(employeeId, esnAdminId)`.
Le scope du consentement est vérifié : `["cra"]`, `["projects"]`, `["documents"]` ou toute combinaison.

### `ResourceOwnerGuard`
Vérifie que `user.id === resource.ownerId` avant toute mutation.
Empêche un salarié de modifier les données d'un autre salarié.

---

## Modèle de consentement

```
ESN_ADMIN → POST /consent/request  { employeeId, scope: ["cra", "projects"] }
                                    → Consent { status: PENDING }
                                    → Notification au salarié

EMPLOYEE  → PATCH /consent/:id/grant
                                    → Consent { status: GRANTED, grantedAt }

ESN_ADMIN → GET /cra/months/:id/summary  (ConsentGuard vérifie GRANTED)
         ← 200 OK  (si consentement accordé)
         ← 403 Forbidden  (si PENDING ou REVOKED)

EMPLOYEE  → PATCH /consent/:id/revoke
                                    → Consent { status: REVOKED, revokedAt }
                                    → Accès ESN_ADMIN immédiatement coupé
```

---

## Workflow de signature CRA (tripartite)

```
DRAFT
  ↓  POST /cra/months/:id/submit        (EMPLOYEE)
SUBMITTED
  ↓  POST /cra/months/:id/sign-employee  (EMPLOYEE)
SIGNED_EMPLOYEE
  ↓  POST /cra/months/:id/sign-esn       (ESN_ADMIN — vérifie consentement)
  ↓  POST /cra/months/:id/reject-esn     (→ retour DRAFT avec commentaire)
SIGNED_ESN
  ↓  POST /cra/months/:id/sign-client    (CLIENT)
  ↓  POST /cra/months/:id/reject-client  (→ retour DRAFT avec commentaire)
SIGNED_CLIENT
  ↓  (verrouillage automatique + génération PDF)
LOCKED  ✓ — immuable, PDF archivé en S3
```

Chaque transition est vérifiée au niveau service : un CRA `LOCKED` ne peut plus être modifié.

---

## Isolation des données par salarié

Toutes les requêtes Prisma qui accèdent à des données salarié incluent un filtre `WHERE employeeId = :userId` provenant du JWT.
Il est **interdit** de passer l'`employeeId` en paramètre de requête — il est toujours lu depuis `request.user`.

```typescript
// Correct — employeeId depuis le JWT
const craMonths = await this.prisma.craMonth.findMany({
  where: { employeeId: request.user.id },
});

// INTERDIT — jamais depuis query params
// const id = req.query.employeeId  ← vecteur d'IDOR
```

---

## Visibilité des commentaires projet

Trois niveaux de visibilité sur `ProjectComment.visibility` :

| Valeur             | Visible par                    |
|--------------------|--------------------------------|
| `EMPLOYEE_ESN`     | Salarié + ESN_ADMIN uniquement |
| `EMPLOYEE_CLIENT`  | Salarié + CLIENT uniquement    |
| `ALL`              | Tous les acteurs de la mission |

Le filtre est appliqué côté service selon le rôle de l'appelant.

---

## Partage de dashboard (token public)

Le endpoint `GET /reports/shared/:token` est public (`@Public()`).
Les données exposées sont volontairement limitées : nom du salarié, titre de mission, résumé mensuel.
Les données **jamais exposées** via ce token : soldes de congés, notes privées, commentaires `EMPLOYEE_ESN`.

Garanties sur le token :
- UUID aléatoire (`@default(uuid())`) — non devinable
- TTL max 168h (configurable à la création, capped côté service)
- Révocable immédiatement par le salarié (`DELETE /reports/dashboard-share/:token`)
- Compteur d'accès `accessCount` pour audit

---

## Audit trail

Toute mutation sensible crée une entrée `AuditLog` :

| Action               | Déclencheur                                   |
|----------------------|-----------------------------------------------|
| `CONSENT_ACCESS`     | ESN_ADMIN accède aux données après consentement|
| `CONSENT_GRANTED`    | Salarié accorde un consentement               |
| `CONSENT_REVOKED`    | Salarié révoque un consentement               |
| `CRA_SUBMITTED`      | Soumission du CRA                             |
| `CRA_LOCKED`         | CRA verrouillé après signature tripartite      |
| `DOCUMENT_SHARED`    | Document partagé avec un utilisateur          |
| `DOCUMENT_DOWNLOADED`| Téléchargement d'un document                  |
| `DASHBOARD_ACCESSED` | Accès au dashboard public via token            |

Les logs sont immuables (pas de `UPDATE` ni `DELETE` sur `AuditLog`).
Index sur `(initiatorId, createdAt)` et `(resource, createdAt)` pour les requêtes d'audit.

---

## Escalade météo automatique (scheduler)

Le `ProjectSchedulerService` tourne sur cron (quotidien) :

1. **Escalade RAINY → STORM** : si un projet est en état `RAINY` depuis plus de 3 jours ouvrables sans nouvelle saisie, une entrée `STORM` est créée automatiquement et l'admin ESN est notifié.
2. **Jalons LATE** : les jalons `PLANNED` ou `IN_PROGRESS` dont `dueDate` est passée sont automatiquement passés en `LATE`.

Ces mutations automatiques créent des entrées `AuditLog` avec `initiatorId` du système.

---

## Variables d'environnement sensibles

| Variable          | Exigence minimale                                   |
|-------------------|-----------------------------------------------------|
| `JWT_SECRET`      | 32 caractères aléatoires minimum                    |
| `NEXTAUTH_SECRET` | 32 caractères aléatoires minimum                    |
| `DATABASE_URL`    | Connexion chiffrée (SSL recommandé en production)   |
| `ANTHROPIC_API_KEY` | Clé API Claude — ne jamais logger, ne jamais exposer|
| `OPENAI_API_KEY`  | Clé API OpenAI embeddings — idem                    |

En production : injecter via secrets manager (Vault, AWS SSM, etc.), jamais dans le code source.

---

## Points de vigilance

- Ne **jamais** bypasser `ConsentGuard` même pour les tests rapides — utiliser les fixtures de seed.
- Ne **jamais** exposer `User.password` dans les réponses API — exclu de tous les `select` Prisma.
- Ne **jamais** exposer `User.privateNotes` aux rôles `ESN_ADMIN` et `CLIENT`.
- Les embeddings RAG sont isolés par `employeeId` — une requête RAG ne peut pas accéder aux données d'un autre salarié.
- Les clés S3 (`Document.s3Key`) ne sont jamais exposées directement — toujours passer par `/documents/:id/download`.

Pour le rapport d'audit complet : `docs/architecture/security-audit.md`.
