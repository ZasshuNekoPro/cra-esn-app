# Sprint 5 — Reports & Dashboard

**Branche de départ :** `main` (après merge PR #4 Sprint 4)
**Date de création :** 2026-03-17
**Statut :** ✅ TERMINÉ — T1 à T7 terminés, PR #5 ouverte vers main

---

## Analyse fonctionnelle

### 1. Bilan mensuel automatique

#### Données composant le bilan

Le bilan mensuel agrège trois sources existantes :

| Source | Données extraites |
|--------|-------------------|
| `CraMonth` + `CraEntry` | totalWorkDays, totalLeaveDays, totalSickDays, totalHolidayDays, workingDaysInMonth, isOvertime, statut signature |
| `ProjectEntry` (via `craEntryId`) | Ventilation des jours par projet (proportion de chaque projet sur le mois) |
| `WeatherEntry` + `Milestone` + `Project` | Météo courante de chaque projet actif, jalons imminents ou en retard |

**Format JSON — réponse API `GET /reports/monthly/:year/:month`**

```typescript
interface MonthlyReport {
  // Identité
  employeeId: string;
  employeeName: string;        // firstName + lastName
  missionTitle: string;
  year: number;
  month: number;
  generatedAt: string;         // ISO 8601

  // CRA
  craStatus: CraStatus;        // DRAFT | SUBMITTED | SIGNED_* | LOCKED
  pdfUrl: string | null;       // URL S3 du CRA signé si LOCKED

  // Temps
  totalWorkDays: number;
  totalLeaveDays: number;
  totalSickDays: number;
  totalHolidayDays: number;
  workingDaysInMonth: number;
  isOvertime: boolean;

  // Ventilation par projet (depuis ProjectEntry du mois)
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    days: number;             // somme des portions (FULL=1, HALF=0.5) du mois
  }>;

  // Soldes congés
  leaveBalances: LeaveBalanceSummary[];  // type existant partagé

  // Projets actifs et leur état
  projects: Array<{
    projectId: string;
    projectName: string;
    latestWeatherState: WeatherState | null;
    milestonesDue: number;    // jalons PLANNED/IN_PROGRESS avec dueDate ≤ fin du mois
    milestonesLate: number;   // jalons status LATE
  }>;
}
```

**Format PDF**
- Générée via Puppeteer (même pipeline que `cra-pdf.service.ts`)
- Template HTML distinct : `packages/pdf-generator/src/templates/monthly-report.html`
- Sections :
  1. Header : salarié + mission + période
  2. Tableau récap temps (travail / congés CP / RTT / maladie / fériés)
  3. Ventilation par projet (tableau jours + icône météo)
  4. Jalons du mois (titre / statut / date d'échéance)
  5. Soldes CP/RTT restants
  6. Footer : généré le {date} — statut signature CRA

**Différence "bilan mensuel" vs "CRA mensuel"**

| Critère | CRA mensuel | Bilan mensuel |
|---------|-------------|---------------|
| Finalité | Document contractuel légal | Synthèse pilotage interne |
| Signataires | 3 (salarié / ESN / client) | Aucun (lecture seule) |
| Périmètre | Jours travaillés + congés | CRA + projets + météo + jalons |
| Généré par | Workflow signature (auto au LOCKED) | À la demande (endpoint dédié) |
| Format légal | Oui, valeur contractuelle | Non |

Le CRA mensuel est une **ligne** dans le bilan (avec son statut de signature).

---

### 2. Dashboard partageable — Token temporaire

#### Choix d'implémentation : UUID en base de données

| Option | Pour | Contre | Verdict |
|--------|------|--------|---------|
| JWT avec `exp` | Stateless, sans DB | Révocation impossible, pas d'audit | ❌ |
| UUID en DB | Révocable, auditale, cohérent avec `DocumentShare.shareToken` | Requête DB à chaque accès | ✅ Retenu |

Le pattern UUID en DB est **déjà établi** dans le schéma (`DocumentShare.shareToken String? @unique`).
Un nouveau modèle `DashboardShare` est nécessaire (migration Sprint 5) :

```prisma
model DashboardShare {
  id          String    @id @default(uuid())
  token       String    @unique @default(uuid())
  expiresAt   DateTime  @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")
  accessCount Int       @default(0) @map("access_count")
  createdAt   DateTime  @default(now()) @map("created_at")

  ownerId     String    @map("owner_id")
  owner       User      @relation(fields: [ownerId], references: [id])

  @@map("dashboard_shares")
}
```

**Génération :** `POST /reports/dashboard-share` → crée le token, retourne `{ token, expiresAt, shareUrl }`.

#### Ce que voit le destinataire (route publique `/shared/:token`)

| Visible | Masqué |
|---------|--------|
| Prénom + nom du salarié | Email / téléphone |
| Titre de la mission | dailyRate |
| Jours travaillés du mois courant | Détail entrée par entrée |
| Statut CRA (LOCKED / en cours) | Commentaires des entrées |
| Projets actifs : nom + météo actuelle | Commentaires privés |
| Jalons imminents (≤ 7 jours) | Soldes CP/RTT |
| — | Notes ESN |

#### Durée de validité

- Défaut : **48h** (`expiresAt = createdAt + 48h`)
- Configurable à la création : `POST /reports/dashboard-share { ttlHours?: number }` (max 168h = 7 jours)
- Révocation explicite : `DELETE /reports/dashboard-share/:token`

---

### 3. Présentation projets

#### Graphiques (recharts)

| Composant | Données | Source |
|-----------|---------|--------|
| `LineChart` météo | Évolution WeatherState sur 30 jours (SUNNY=1, CLOUDY=2, RAINY=3, STORM=4) | `WeatherEntry.date × state` |
| `BarChart` jours | Jours travaillés par projet, empilés par mois | `ProjectEntry` groupé par `projectId + mois` |
| `Progress` jalons | Pourcentage DONE / total (hors ARCHIVED) | `Milestone.status` |
| `Progress` budget | Jours réels vs `estimatedDays` si renseigné | `ProjectEntry sum vs Project.estimatedDays` |

#### PDF statique vs lien live

Les deux sont proposés :
- **Lien live read-only** : token `DashboardShare` avec `scope=project`, charts recharts interactifs, durée configurable
- **PDF statique** : endpoint `GET /reports/projects/:projectId/pdf?from=&to=` → Puppeteer rend les charts en SVG inliné dans le template HTML

#### Filtrage par période

Query params : `?from=YYYY-MM-DD&to=YYYY-MM-DD`
Appliqué à : `WeatherEntry.date`, `ProjectEntry.date`, `Milestone.dueDate`

---

### 4. Notifications

#### Table de priorités

| Événement | Canal | Timing |
|-----------|-------|--------|
| Météo escaladée → STORM | IN_APP + EMAIL | Immédiat (cron escalade) |
| Météo RAINY > 3 jours ouvrés | IN_APP | Immédiat (cron escalade) |
| CRA soumis → en attente signature ESN | IN_APP + EMAIL | Dès soumission |
| CRA signé ESN → en attente client | IN_APP + EMAIL | Dès signature ESN |
| CRA signature client toujours pending | IN_APP + EMAIL | J+3 via cron quotidien |
| Jalon LATE détecté | IN_APP | Cron quotidien 08:00 |
| Consentement accordé / révoqué | IN_APP | Immédiat |
| Document partagé | IN_APP | Immédiat |

**Canal EMAIL pour le MVP** : `NotificationsService.notify()` existant = IN_APP uniquement.
Étendre avec `channel: EMAIL` → log + `sentAt` en DB. Envoi SMTP réel activé par `ENABLE_EMAIL_NOTIFICATIONS=true` (Nodemailer). Par défaut désactivé en dev.

**Centre de notifications in-app** (nouveaux endpoints `NotificationsController`) :

```
GET    /notifications              → liste paginée (read + unread, ?unreadOnly=true)
GET    /notifications/count        → { unreadCount: number } (badge sidebar)
PATCH  /notifications/:id/read    → marquer une notification lue
PATCH  /notifications/read-all    → tout marquer lu
```

---

## Plan d'implémentation

### T1 — Module Reports NestJS (bilan mensuel + présentation projets)

**Branche :** `feat/sprint-5/reports-module`

**Fichiers à créer :**
- `apps/backend/src/reports/reports.module.ts`
- `apps/backend/src/reports/reports.service.ts`
  - `getMonthlyReport(employeeId, year, month): Promise<MonthlyReport>`
  - `getProjectPresentation(projectId, callerId, from?, to?): Promise<ProjectPresentation>`
- `apps/backend/src/reports/reports.controller.ts`
  - `GET /reports/monthly/:year/:month` (EMPLOYEE, ResourceOwnerGuard)
  - `GET /reports/monthly/:year/:month/pdf` (EMPLOYEE, retourne S3 URL ou stream)
  - `GET /reports/projects/:projectId` (EMPLOYEE, query: from/to)
  - `GET /reports/projects/:projectId/pdf` (EMPLOYEE, query: from/to)
- `apps/backend/src/reports/dto/monthly-report.dto.ts`
- `packages/pdf-generator/src/templates/monthly-report.html`
- `packages/shared-types/src/reports.ts` (MonthlyReport, ProjectPresentation)

**Tests TDD :**
- `apps/backend/test/unit/reports.service.spec.ts` (mock Prisma, cas : mois sans entrées, mois avec overtime, projets STORM)
- `apps/backend/test/e2e/reports.e2e-spec.ts` (supertest, 8 scénarios)

---

### T2 — Token de partage temporaire (DashboardShare)

**Branche :** `feat/sprint-5/dashboard-share`

**Prisma :** Ajouter `DashboardShare` au schéma + migration.
Ajouter relation `User.dashboardShares DashboardShare[]` dans le schéma.

**Fichiers à créer / modifier :**
- `apps/backend/prisma/schema.prisma` → ajout `DashboardShare`
- `apps/backend/src/reports/reports.service.ts`
  - `createDashboardShare(ownerId, ttlHours?): Promise<DashboardShare>`
  - `revokeDashboardShare(token, ownerId): Promise<void>`
  - `getDashboardByToken(token): Promise<PublicDashboard>` (vérifie expiry, incrémente accessCount)
- `apps/backend/src/reports/reports.controller.ts`
  - `POST /reports/dashboard-share` (EMPLOYEE)
  - `DELETE /reports/dashboard-share/:token` (EMPLOYEE, owner check)
  - `GET /reports/shared/:token` (`@Public()`, pas de JWT requis)
- `packages/shared-types/src/reports.ts` → `PublicDashboard`, `DashboardShare`

**Tests TDD :**
- Token expiré → 401
- Token révoqué → 410
- Token valide → retourne données masquées (sans CP, notes privées)

---

### T3 — Centre de notifications in-app

**Branche :** `feat/sprint-5/notifications-center`

**Fichiers à créer / modifier :**
- `apps/backend/src/notifications/notifications.controller.ts` (nouveau)
  - `GET /notifications` (EMPLOYEE / ESN_ADMIN)
  - `GET /notifications/count`
  - `PATCH /notifications/:id/read`
  - `PATCH /notifications/read-all`
- `apps/backend/src/notifications/notifications.service.ts` (étendre)
  - `listForUser(userId, unreadOnly?)`
  - `countUnread(userId): Promise<number>`
  - `markRead(notificationId, userId)`
  - `markAllRead(userId)`
  - `notifyEmail(userId, subject, body)` (log + DB, envoi SMTP si env activé)
- `apps/backend/src/notifications/notifications.module.ts` → exporter le controller
- Câbler les notifications existantes (escalade météo, CRA signature) pour appeler `notifyEmail` quand pertinent

**Tests TDD :**
- `apps/backend/test/unit/notifications.service.spec.ts`

---

### T4 — Dashboard principal frontend (vue d'ensemble)

**Branche :** `feat/sprint-5/frontend-dashboard`

**Fichiers à créer :**
- `apps/frontend/src/app/(dashboard)/dashboard/page.tsx`
  - Composants : `MonthSummaryCard`, `ProjectsWeatherGrid`, `UpcomingMilestonesCard`, `LeaveBalanceCard`
  - Appels API : `GET /reports/monthly/{year}/{month}` pour le mois courant
- `apps/frontend/src/app/(dashboard)/dashboard/components/`
  - `MonthSummaryCard.tsx` — jours travaillés + soldes
  - `ProjectsWeatherGrid.tsx` — grille projets avec WeatherIcon
  - `UpcomingMilestonesCard.tsx` — jalons imminents (≤ 7 jours)
  - `LeaveBalanceCard.tsx` — barres CP + RTT restants
  - `NotificationBell.tsx` — badge unreadCount + dropdown liste notifs
- `apps/frontend/src/lib/api/reports.ts` — hooks API reports

---

### T5 — Page présentation projets avec graphiques

**Branche :** `feat/sprint-5/frontend-project-presentation`

**Fichiers à créer :**
- `apps/frontend/src/app/(dashboard)/projects/[id]/presentation/page.tsx`
  - Layout : header projet + tabs (Météo / Jours / Jalons)
  - `DateRangePicker` pour filtrer la période
- `apps/frontend/src/app/(dashboard)/projects/[id]/presentation/components/`
  - `WeatherLineChart.tsx` — recharts LineChart sur `WeatherEntry[]`
  - `DaysBarChart.tsx` — recharts BarChart sur `ProjectEntry[]` groupés par mois
  - `MilestonesProgress.tsx` — recharts RadialBarChart + liste jalons
- `apps/frontend/src/lib/api/reports.ts` → `getProjectPresentation(id, from, to)`

---

### T6 — Vue publique partageable (sans authentification)

**Branche :** `feat/sprint-5/frontend-shared-view`

**Fichiers à créer :**
- `apps/frontend/src/app/shared/[token]/page.tsx`
  - Route hors layout authentifié (`(public)` group ou hors `(dashboard)`)
  - Appel `GET /reports/shared/:token` → rendu `PublicDashboard`
  - Affiche : nom salarié + mission + météo projets + jalons imminents + jours travaillés mois courant
  - Masque : congés, soldes, notes, email
  - Bannière "Vue partagée — expire le {date}"
- `apps/frontend/src/app/(dashboard)/dashboard/components/ShareDashboardModal.tsx`
  - Form : ttlHours (48h/72h/168h)
  - `POST /reports/dashboard-share` → copier URL dans presse-papiers
  - Bouton "Révoquer le lien"

---

### T7 — PR Sprint 5

**Checklist avant PR :**
- [x] `pnpm test` → 273/273 tests passent
- [x] `pnpm typecheck` → zéro erreur TypeScript strict
- [x] `pnpm lint` → zéro erreur ESLint (warnings pré-existants hors périmètre)
- [x] Migration Prisma `20260317000000_sprint5_dashboard_share` créée
- [x] `/review-security` sur les nouvelles routes (notamment `GET /reports/shared/:token`)
- [x] `gh pr create` vers `main` → PR #5

---

## Décisions d'architecture clés

### Nouveau modèle Prisma requis

`DashboardShare` — migration Sprint 5. Pas d'impact sur les modules existants.
Ajouter `User.dashboardShares DashboardShare[]` dans `schema.prisma`.

### Module Reports : dépendances

```
ReportsModule
  imports: [PrismaModule, StorageModule (pour PDF upload S3)]
  providers: [ReportsService]
  controllers: [ReportsController]
  exports: [ReportsService]  // utilisé par NotificationsModule
```

### Sécurité route publique `/reports/shared/:token`

- Décorée `@Public()` (pas de JwtAuthGuard)
- Validation : token existant + non révoqué + `expiresAt > now()`
- Rate limiting : 10 req/min par IP (NestJS ThrottlerGuard)
- Données retournées : filtre whitelist strict côté service (jamais `privateNotes`, jamais `leaveBalances`)
- AuditLog à chaque accès : `action: DASHBOARD_SHARED_ACCESSED, resource: dashboard_share:{token}`

### Notification EMAIL — stratégie MVP

`notifyEmail()` crée toujours l'entrée DB (`channel: EMAIL`). Si `ENABLE_EMAIL_NOTIFICATIONS=true` **et** `SMTP_HOST` défini → envoi réel via Nodemailer. Sinon : log `console.log('[EMAIL]', subject)`. Pas de queue Bull pour le MVP.

---

## Récapitulatif des tâches

| ID | Tâche | Branche | Nouveaux fichiers | Tests |
|----|-------|---------|-------------------|-------|
| T1 | Module Reports NestJS | `feat/sprint-5/reports-module` | 6 | unit (15) + e2e (8) |
| T2 | Token de partage DashboardShare | `feat/sprint-5/dashboard-share` | 3 + migration | unit (8) + e2e (5) |
| T3 | Centre notifications in-app | `feat/sprint-5/notifications-center` | 2 | unit (10) |
| T4 | Dashboard principal frontend | `feat/sprint-5/frontend-dashboard` | 6 | — |
| T5 | Présentation projets + graphiques | `feat/sprint-5/frontend-project-presentation` | 5 | — |
| T6 | Vue publique partageable | `feat/sprint-5/frontend-shared-view` | 2 | e2e playwright (4) |
| T7 | PR Sprint 5 | — | — | audit sécurité |

---

✅ Plan Sprint 5 documenté. En attente de validation avant P10.
