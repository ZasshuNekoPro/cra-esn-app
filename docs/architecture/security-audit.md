# Rapport d'audit sécurité — v1.0

**Date :** 2026-03-17
**Périmètre :** `apps/backend/src/` — tous les modules NestJS
**Auditeur :** Claude Code (analyse statique)

---

## Résumé exécutif

**Score global : 4/5 problèmes critiques couverts**

L'application présente une base de sécurité solide :
- Guards globaux (ThrottlerGuard → JwtAuthGuard → RolesGuard) correctement configurés
- Isolation des données Prisma bien respectée dans la majorité des modules
- Payload JWT minimal (sub, email, role — sans données sensibles)
- Audit log couvert sur les actions les plus critiques (signatures CRA, consentements, partage documents, accès RAG)
- pgvector filtré par `employee_id` dans toutes les requêtes RAG

**1 problème critique bloquant** (isolation données weather), **7 avertissements** non bloquants (trous d'audit log).

---

## ✅ Points conformes

### Guards & Authentification
- **Guards globaux** (`app.module.ts:38-45`) : ThrottlerGuard + JwtAuthGuard + RolesGuard appliqués à toutes les routes
- **Auth controller** : endpoints publics marqués `@Public()`, `/auth/me` protégé globalement
- **CRA controller** : chaque route décore correctement son(ses) rôle(s) autorisé(s)
- **RAG controller** (`rag.controller.ts:17-18`) : `@Roles(Role.EMPLOYEE)` — accès strictement limité aux salariés
- **Reports controller** : endpoint public `/shared/:token` marqué `@Public()`, le reste protégé par rôle
- **Documents controller** : toutes les routes sous `@Roles(Role.EMPLOYEE)`

### Isolation des données Prisma
- **CRA** (`cra.service.ts`) : toutes les queries incluent `where: { employeeId }` ou `where: { employeeId, year, month }`
- **Documents** (`documents.service.ts`) : `upload()` vérifie `mission.employeeId === ownerId` ; `list()` filtre par `ownerId`
- **Projects** (`projects.service.ts`) : `findAllForEmployee()` filtre par `mission.employeeId` ; `findOne()` utilise `buildAccessWhere()` basé sur le rôle appelant
- **Reports** (`reports.service.ts`) : queries CRA et Mission toujours filtrées par `employeeId`
- **Notifications** (`notifications.service.ts`) : `listForUser()` et `markRead()` filtrent par `userId`
- **RAG** (`rag-query.service.ts:63-76`) : requête pgvector avec `WHERE employee_id = ${employeeId}::uuid` obligatoire
- **RAG Indexer** (`rag-indexer.service.ts`) : vérifie `entry.craMonth.employeeId !== employeeId` avant toute indexation

### Données sensibles
- **Secrets** : aucun secret en dur trouvé dans le codebase
- **JWT payload** (`auth.service.ts:57-61`) : contient uniquement `sub`, `email`, `role` — pas de données sensibles
- **Réponses auth** (`auth.service.ts:45-47, 76-78`) : `password` et `privateNotes` systématiquement exclus (`{ password: _pw, privateNotes: _pn, ...rest }`)
- **ConsentGuard** : log d'audit créé à chaque accès ESN aux données salarié

### Audit Log — couverture des actions critiques
| Action | Fichier | Statut |
|--------|---------|--------|
| CRA_SUBMITTED | `cra-signature.service.ts:87-93` | ✅ |
| CRA_RETRACTED | `cra-signature.service.ts:125-131` | ✅ |
| CRA_SIGNED_EMPLOYEE | `cra-signature.service.ts:177-183` | ✅ |
| CRA_SIGNED_ESN | `cra-signature.service.ts:233-239` | ✅ |
| CRA_REJECTED_ESN | `cra-signature.service.ts:339-346` | ✅ |
| CONSENT_GRANTED | `consent.service.ts:74-80` | ✅ |
| CONSENT_REVOKED | `consent.service.ts:100-106` | ✅ |
| CONSENT_ACCESS | `consent.guard.ts:63-72` | ✅ |
| DOCUMENT_URL_GENERATED | `documents.service.ts:164-173` | ✅ |
| WEATHER_UPDATED | `weather.service.ts:56-63` | ✅ |
| COMMENT_CREATED | `comments.service.ts:49-56` | ✅ |
| VALIDATION_REQUESTED | `validations.service.ts:34-41` | ✅ |
| VALIDATION_APPROVED | `validations.service.ts:80-87` | ✅ |
| PROJECT_CLOSED | `projects.service.ts:200-206` | ✅ |
| DASHBOARD_SHARE_CREATED | `reports.service.ts:234-240` | ✅ |
| DASHBOARD_SHARE_REVOKED | `reports.service.ts:263-269` | ✅ |
| DASHBOARD_SHARED_ACCESSED | `reports.service.ts:291-298` | ✅ |
| RAG_QUERY | `rag-query.service.ts:171-178` | ✅ |

---

## ⚠️ Points à vérifier (non bloquants)

### W1 — NotificationsController : guard JwtAuthGuard implicite
**Fichier :** `notifications/notifications.controller.ts:15-17`
```typescript
@Controller('notifications')
@UseGuards(RolesGuard)  // JwtAuthGuard absent — relié au global
export class NotificationsController {
```
**Risque :** Faible. La protection repose sur le guard global plutôt qu'une déclaration explicite. En cas de refactoring (ex. suppression du guard global), ce contrôleur deviendrait non protégé sans alerte.
**Correction :** Ajouter `@UseGuards(JwtAuthGuard, RolesGuard)` explicitement.

### W2 — CRA : suppression d'entrée sans Audit Log
**Fichier :** `cra/cra.service.ts:329-359`
**Risque :** Un salarié peut supprimer des entrées CRA sans laisser de trace d'audit.
**Correction :** Ajouter un `AuditLog` avec action `CRA_ENTRY_DELETED` avant l'opération `prisma.craEntry.delete()`.

### W3 — CRA : modification d'entrée sans Audit Log
**Fichier :** `cra/cra.service.ts:239-325`
**Risque :** Les modifications d'entrées CRA ne génèrent pas d'audit log (contrairement aux signatures).
**Correction :** Ajouter un `AuditLog` avec action `CRA_ENTRY_UPDATED`.

### W4 — Documents : suppression sans Audit Log
**Fichier :** `documents/documents.service.ts:275-287`
```typescript
async softDelete(documentId: string, ownerId: string) {
  // ... checks ...
  return this.prisma.document.delete({ where: { id: documentId } });
  // Pas d'AuditLog !
}
```
**Risque :** La suppression d'un document (action irréversible) n'est pas tracée.
**Correction :** Ajouter un `AuditLog` avec action `DOCUMENT_DELETED`.

### W5 — Comments : modification sans Audit Log
**Fichier :** `projects/comments.service.ts:84-99`
**Risque :** Les modifications de commentaires ne sont pas tracées (la création l'est, ligne 49-56).
**Correction :** Ajouter un `AuditLog` avec action `COMMENT_UPDATED`.

### W6 — Milestones : aucune action auditée
**Fichier :** `projects/milestones.service.ts`
**Risque :** Création, modification et complétion de jalons ne génèrent aucun audit log.
**Correction :** Ajouter `AuditLog` avec actions `MILESTONE_CREATED`, `MILESTONE_UPDATED`, `MILESTONE_COMPLETED`.

### W7 — `process.env` direct dans main.ts
**Fichier :** `main.ts:20, 24`
```typescript
origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
const port = process.env['BACKEND_PORT'] ?? 3001;
```
**Risque :** Faible (valeurs non sensibles). Incohérence avec l'usage de `ConfigService` dans les autres modules.
**Correction :** Utiliser `ConfigService.get<string>('CORS_ORIGIN', 'http://localhost:3000')`.

---

## ❌ Problèmes critiques (bloquants pour la v1.0)

### C1 — Weather endpoints : absence de vérification d'accès au projet
**Fichier :** `projects/weather.service.ts:74-135` | `projects/projects.controller.ts:125-162`
**Sévérité :** CRITIQUE

```typescript
// projects.controller.ts:125-132
@Get(':id/weather')
@Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
getWeatherHistory(@Param('id') id: string, @Query('yearMonth') yearMonth?: string) {
  return this.weatherService.getHistory(id, yearMonth ? { yearMonth } : {});
}

// weather.service.ts:74-92
async getHistory(projectId: string, options?: { yearMonth?: string }) {
  const where: Record<string, unknown> = { projectId };
  // PAS DE VÉRIFICATION QUE L'APPELANT A ACCÈS AU PROJET
  return this.prisma.weatherEntry.findMany({ where, take: 30, orderBy: { date: 'desc' } });
}
```

**Vecteur d'attaque :** Un salarié, ESN_ADMIN ou CLIENT authentifié peut appeler `GET /projects/<uuid>/weather` avec n'importe quel `projectId` — y compris ceux appartenant à d'autres salariés — et obtenir les données météo du projet.

Le même problème existe dans `getMonthlySummary()` (`weather.service.ts:94-135`).

**Correction recommandée :**

```typescript
// weather.service.ts — injecter ProjectsService ou dupliquer buildAccessWhere()
async getHistory(projectId: string, callerId: string, callerRole: Role, options?: {...}) {
  // Vérifier l'accès au projet avant de retourner les données
  const project = await this.prisma.project.findFirst({
    where: this.buildAccessWhere(projectId, callerId, callerRole),
  });
  if (!project) throw new NotFoundException('Project not found or access denied');

  return this.prisma.weatherEntry.findMany({
    where: { projectId },
    take: 30,
    orderBy: { date: 'desc' },
  });
}
```

```typescript
// projects.controller.ts — passer le contexte utilisateur au service
@Get(':id/weather')
@Roles(Role.EMPLOYEE, Role.ESN_ADMIN, Role.CLIENT)
getWeatherHistory(
  @Param('id') id: string,
  @Query('yearMonth') yearMonth?: string,
  @CurrentUser() user: JwtPayload,
) {
  return this.weatherService.getHistory(id, user.sub, user.role as Role, yearMonth ? { yearMonth } : {});
}
```

---

## Plan de correction (ordre de priorité)

| Priorité | Référence | Action | Effort estimé |
|----------|-----------|--------|---------------|
| 🔴 P1 | C1 | Ajouter vérification accès projet dans `WeatherService.getHistory()` et `getMonthlySummary()` | ~2h |
| 🟠 P2 | W2, W3 | Ajouter AuditLog sur `CRA_ENTRY_DELETED` et `CRA_ENTRY_UPDATED` | ~1h |
| 🟠 P3 | W4 | Ajouter AuditLog sur `DOCUMENT_DELETED` | ~30min |
| 🟡 P4 | W5, W6 | Ajouter AuditLog sur modifications commentaires et jalons | ~1h |
| 🟡 P5 | W1 | Expliciter `@UseGuards(JwtAuthGuard, RolesGuard)` dans `NotificationsController` | ~5min |
| 🟢 P6 | W7 | Migrer `process.env` dans `main.ts` vers `ConfigService` | ~30min |

**Estimation totale pour la mise en conformité v1.0 :** ~5h de travail

---

*Rapport généré par analyse statique du code. Aucune modification n'a été apportée au codebase.*
