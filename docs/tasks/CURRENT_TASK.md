# Sprint 2 — Module CRA

**Branche de départ :** `main` (après merge PR #1)
**Date de création :** 2026-03-16
**Statut :** PLANIFIÉ — EN ATTENTE DE VALIDATION

---

## Analyse Fonctionnelle

### 1. Workflow de signature — Machine à états

#### États et transitions

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   DRAFT ──[submit]──→ SUBMITTED ──[signEmployee]──→ SIGNED_EMPLOYEE │
│     ↑                    │                               │           │
│     │                 [retract]                      [signEsn]       │
│     │                    │                               │           │
│     │                    ↓                               ↓           │
│     └──────────[rejectEsn / rejectClient]──── SIGNED_ESN            │
│                                                           │           │
│                                                       [signClient]   │
│                                                           │           │
│                                               SIGNED_CLIENT          │
│                                                    │                 │
│                                             [auto: PDF généré]       │
│                                                    │                 │
│                                                 LOCKED               │
└──────────────────────────────────────────────────────────────────────┘
```

#### Tableau exhaustif des transitions

| Transition | État source | État cible | Déclencheur | Pré-conditions | Effets |
|---|---|---|---|---|---|
| `submit` | DRAFT | SUBMITTED | EMPLOYEE (propriétaire) | ≥ 1 CraEntry existante | AuditLog `CRA_SUBMITTED` · Notification ESN_ADMIN |
| `retract` | SUBMITTED | DRAFT | EMPLOYEE (propriétaire) | – | AuditLog `CRA_RETRACTED` |
| `signEmployee` | SUBMITTED | SIGNED_EMPLOYEE | EMPLOYEE (propriétaire) | – | `signedByEmployeeAt = now()` · ValidationRequest(ESN_ADMIN, PENDING) · AuditLog `CRA_SIGNED_EMPLOYEE` · Notification ESN_ADMIN |
| `signEsn` | SIGNED_EMPLOYEE | SIGNED_ESN | ESN_ADMIN | ConsentGuard actif | `signedByEsnAt = now()` · Résout ValidationRequest ESN · ValidationRequest(CLIENT, PENDING) si mission.clientId · AuditLog `CRA_SIGNED_ESN` · Notification EMPLOYEE + CLIENT |
| `rejectEsn` | SIGNED_EMPLOYEE | DRAFT | ESN_ADMIN | `comment` non vide obligatoire | `rejectionComment = comment` · Résout ValidationRequest ESN (REJECTED) · AuditLog `CRA_REJECTED_ESN` · Notification EMPLOYEE avec motif |
| `signClient` | SIGNED_ESN | SIGNED_CLIENT | CLIENT (lié à la mission) | – | `signedByClientAt = now()` · Résout ValidationRequest CLIENT · AuditLog `CRA_SIGNED_CLIENT` · Notification EMPLOYEE + ESN_ADMIN · Déclenche génération PDF → LOCKED |
| `rejectClient` | SIGNED_ESN | DRAFT | CLIENT (lié à la mission) | `comment` non vide obligatoire | `rejectionComment = comment` · Résout ValidationRequest CLIENT (REJECTED) · AuditLog `CRA_REJECTED_CLIENT` · Notification EMPLOYEE avec motif |
| `lock` (auto) | SIGNED_CLIENT | LOCKED | Système (post PDF upload) | pdfUrl renseigné | `lockedAt = now()` · AuditLog `CRA_LOCKED` |

#### Règles invariantes
- **Seul DRAFT** autorise les mutations d'entrées (CRUD CraEntry)
- **Commentaire obligatoire** sur tout refus (validé en DTO : `@MinLength(10)`)
- **ConsentGuard** sur toutes les routes ESN accédant aux entrées du salarié
- **ResourceOwnerGuard** : EMPLOYEE ne peut agir que sur son propre CRA
- Tout `ValidationRequest` précédent est résolu (APPROVED ou REJECTED) avant d'en créer un nouveau
- Si la mission n'a pas de CLIENT assigné : `SIGNED_ESN → SIGNED_CLIENT` se fait automatiquement côté backend (pas de blocage)

---

### 2. Calcul des jours ouvrables

#### Stratégie jours fériés : **Table statique `PublicHoliday`**

Décision : table en base de données, pré-remplie par seed/migration.

| Option | Avantages | Inconvénients | Verdict |
|---|---|---|---|
| Table statique | Offline, déterministe, testable | Maintenance annuelle | ✅ Retenu |
| API externe (`api.gouv.fr`) | Toujours à jour | Latence, dépendance, pas testable unitairement | ❌ Rejeté |
| Code hardcodé | Simple | Non maintenable, impossible à étendre | ❌ Rejeté |

Seed initial : jours fériés français 2024–2027 (11 jours × 4 ans = 44 entrées).

#### Algorithme `countWorkingDays(year, month, missionStartDate?, missionEndDate?)`

```typescript
// Pseudo-code
function countWorkingDays(
  year: number, month: number,
  missionStart?: Date, missionEnd?: Date,
  publicHolidays: Date[]
): number {
  // Bornes du mois
  let from = new Date(year, month - 1, 1);
  let to = new Date(year, month, 0); // dernier jour du mois

  // Réduction pour missions partielles (à cheval sur deux mois)
  if (missionStart && missionStart > from) from = missionStart;
  if (missionEnd && missionEnd < to) to = missionEnd;

  let count = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isHoliday = publicHolidays.some(
      h => h.toISOString().slice(0, 10) === d.toISOString().slice(0, 10)
    );
    if (!isWeekend && !isHoliday) count++;
  }
  return count;
}
```

#### Gestion des missions à cheval sur deux mois

Exemple : Mission du 2026-01-20 au 2026-02-10.
- Janvier 2026 : `from = max(Jan 1, Jan 20) = Jan 20` → `to = Jan 31` → ~8 jours ouvrables
- Février 2026 : `from = Feb 1` → `to = min(Feb 28, Feb 10) = Feb 10` → ~7 jours ouvrables

La vérification de dépassement (`totalDayFractions > workingDays`) compare la somme des `dayFraction` de toutes les `CraEntry` du mois (hors `HOLIDAY`, car déjà exclu du compte) avec ce chiffre. C'est un **warning non-bloquant** retourné dans la réponse de l'API.

#### Alerte dépassement
- Calculée à chaque `createEntry` / `updateEntry`
- Retournée dans `CraMonthSummary.isOvertime: boolean`
- Seuil : `sum(dayFraction) > countWorkingDays(...)` pour les types `WORK_*` + `ASTREINTE` + `OVERTIME` (les congés/maladie ne comptent pas comme "overtime", ils remplacent les jours ouvrables)

---

### 3. Structure du PDF CRA

#### Mise en page (A4 portrait, Puppeteer HTML→PDF)

```
┌─────────────────────────────────────────────────────┐
│  LOGO ESN             COMPTE RENDU D'ACTIVITÉ        │  En-tête (60px)
│                       Mois Année                     │
├─────────────────────────────────────────────────────┤
│  Salarié : Prénom NOM          Mission : Titre       │  Bloc identité (40px)
│  Email : …                     Client  : Nom Client  │
├─────────────────────────────────────────────────────┤
│  DATE  │ JOUR │ TYPE              │ FRACTION │ PROJETS │  Tableau journalier
│  01/01 │ Jeu  │ Travail présentiel│   1,0    │ ProjA   │  (variable, ~400px)
│  02/01 │ Ven  │ Télétravail       │   1,0    │ ProjA   │
│  …     │ …    │ …                 │   …      │ …       │
│        │      │        TOTAL      │  XX,X j  │         │  Ligne total
├─────────────────────────────────────────────────────┤
│  RÉCAPITULATIF                                       │  Bloc totaux (80px)
│  Jours travaillés : N  (présentiel: N, TT: N, dépl: N)│
│  Congés payés : N j | RTT : N j | Maladie : N j     │
│  Jours fériés : N | Total saisi : N / N ouvrables   │
├─────────────────────────────────────────────────────┤
│  ANNEXE PROJETS (si includeProjectsSummary = true)   │  Section optionnelle
│  Projet A : N jours (portion totale)                 │  (80px)
│  Projet B : N jours                                  │
├─────────────────────────────────────────────────────┤
│  SIGNATURES                                          │  Zones signature (100px)
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │  SALARIÉ   │ │    ESN     │ │   CLIENT   │       │
│  │ Prénom NOM │ │ [ESN Name] │ │[Client Nm] │       │
│  │ Signé le : │ │ Signé le : │ │ Signé le : │       │
│  │ JJ/MM/AAAA │ │ JJ/MM/AAAA │ │ JJ/MM/AAAA│       │
│  └────────────┘ └────────────┘ └────────────┘       │
└─────────────────────────────────────────────────────┘
```

#### Conventions typographiques
| Élément | Police | Taille | Style |
|---|---|---|---|
| Titre principal | Helvetica | 18pt | Gras |
| Sous-titres sections | Helvetica | 11pt | Gras |
| Corps tableau | Helvetica | 9pt | Normal |
| En-têtes colonnes | Helvetica | 9pt | Gras, fond #F3F4F6 |
| Totaux | Helvetica | 10pt | Gras |
| Zones signature | Helvetica | 9pt | Normal, bordure 1px |

#### Couleurs lignes tableau (fond)
| Type | Couleur fond |
|---|---|
| WORK_ONSITE / WORK_REMOTE / WORK_TRAVEL | Blanc `#FFFFFF` |
| LEAVE_CP / LEAVE_RTT | Jaune pâle `#FEF9C3` |
| SICK | Orange pâle `#FED7AA` |
| HOLIDAY | Gris clair `#F3F4F6` |
| TRAINING / ASTREINTE / OVERTIME | Bleu pâle `#DBEAFE` |
| Weekend (informatif, en italique) | Gris `#E5E7EB` |

#### Intégration de l'annexe projets
- Générée uniquement si `includeProjectsSummary === true` (paramètre passé au moment de `submit`)
- Source : `ProjectEntry` liées aux `CraEntry` du mois
- Groupées par `projectId`, somme des `dayFraction`
- Inclut la météo synthétique du mois (couleur dominante des `WeatherEntry` du mois)
- Si aucun `WeatherEntry` → section météo omise silencieusement

---

## Gaps Prisma Sprint 1 → Sprint 2

**Migration nécessaire avant toute implémentation Sprint 2.**

### Gaps identifiés

| Entité | Problème | Correction |
|---|---|---|
| `CraStatus` enum | `SIGNED_ESN` manquant (spec : SIGNED_EMPLOYEE → SIGNED_ESN → SIGNED_CLIENT) | `ALTER TYPE cra_status ADD VALUE 'SIGNED_ESN' AFTER 'SIGNED_EMPLOYEE'` |
| `CraEntry` | Pas de champ `entryType` — impossible de distinguer WORK_ONSITE de SICK etc. | Ajouter enum `CraEntryType` + champ `entryType CraEntryType` |
| `CraEntry` | `leaveType LeaveType?` : redondant si `entryType` couvre tous les cas | Supprimer (remplacé par `entryType`) |
| `CraMonth` | Timestamps de signature manquants | Ajouter `signedByEmployeeAt`, `signedByEsnAt`, `signedByClientAt`, `rejectionComment` |
| `ProjectEntry` | Lien vers `CraEntry` absent — impossible de savoir à quel jour du CRA se rattache l'entrée projet | Ajouter FK `craEntryId String?` |
| `ProjectEntry` | Pas de `portion` (spec : FULL/HALF_AM/HALF_PM) | Ajouter enum `PortionType` + champ `portion PortionType?` |
| `PublicHoliday` | Table absente — nécessaire pour le calcul des jours ouvrables | Créer modèle `PublicHoliday` |

### Nouveaux enums

```prisma
enum CraEntryType {
  WORK_ONSITE
  WORK_REMOTE
  WORK_TRAVEL
  LEAVE_CP
  LEAVE_RTT
  SICK
  HOLIDAY
  TRAINING
  ASTREINTE
  OVERTIME
}

enum PortionType {
  FULL
  HALF_AM
  HALF_PM
}
```

### Mapping `CraEntryType` → `LeaveType` (pour mise à jour `LeaveBalance`)

| CraEntryType | LeaveType impacté |
|---|---|
| LEAVE_CP | PAID_LEAVE |
| LEAVE_RTT | RTT |
| SICK | SICK_LEAVE |
| Autres | Aucun impact sur LeaveBalance |

### Impact sur `packages/shared-types`

Tout changement schema → mise à jour **obligatoire** de :
- `packages/shared-types/src/enums.ts` (CraEntryType, PortionType, CraStatus)
- `packages/shared-types/src/entities.ts` (CraEntry, CraMonth, ProjectEntry, PublicHoliday)
- `packages/shared-types/src/api.ts` (DTOs request/response CRA)

---

## Plan d'implémentation — 7 Tâches

### T1 — Module CRA NestJS (CRUD + calculs)

**Branche :** `feat/sprint-2/cra-module`

**Périmètre :** Migration schema, shared-types, CraModule CRUD, calcul jours ouvrables, mise à jour LeaveBalance.

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/prisma/schema.prisma` | Modifier : CraEntry, CraMonth, ProjectEntry + nouveaux enums + PublicHoliday |
| `apps/backend/prisma/migrations/<ts>_sprint2_cra_schema/migration.sql` | Créer (Prisma migrate dev) |
| `apps/backend/prisma/seed.ts` | Mettre à jour : PublicHoliday 2024-2027, adapter CraEntry au nouveau schéma |
| `packages/shared-types/src/enums.ts` | Ajouter CraEntryType, PortionType ; mettre à jour CraStatus |
| `packages/shared-types/src/entities.ts` | Mettre à jour CraEntry, CraMonth, ProjectEntry ; ajouter PublicHoliday |
| `packages/shared-types/src/api.ts` | Ajouter : CreateCraEntryDto, UpdateCraEntryDto, CraMonthSummary, LeaveBalanceSummary |
| `apps/backend/src/cra/cra.module.ts` | Créer |
| `apps/backend/src/cra/cra.service.ts` | Créer |
| `apps/backend/src/cra/cra.controller.ts` | Créer |
| `apps/backend/src/cra/dto/create-cra-entry.dto.ts` | Créer |
| `apps/backend/src/cra/dto/update-cra-entry.dto.ts` | Créer |
| `apps/backend/src/cra/dto/get-month-params.dto.ts` | Créer |
| `apps/backend/src/cra/utils/working-days.util.ts` | Créer |
| `apps/backend/src/app.module.ts` | Modifier : importer CraModule |
| `apps/backend/test/unit/cra/working-days.util.spec.ts` | Créer (TDD — red first) |
| `apps/backend/test/unit/cra/cra.service.spec.ts` | Créer (TDD — red first) |

#### Endpoints CRA CRUD

```
GET  /cra/months                     → liste des CraMonth de l'employé authentifié
GET  /cra/months/:id                 → détail CraMonth + entries
GET  /cra/months/:year/:month        → CraMonth par year/month (auto-create DRAFT si absent)
GET  /cra/months/:id/summary         → totaux calculés + jours ouvrables + soldes
POST /cra/months/:id/entries         → créer une CraEntry
PUT  /cra/months/:id/entries/:eid    → modifier une CraEntry
DEL  /cra/months/:id/entries/:eid    → supprimer une CraEntry
```

#### Tests à écrire (red first)

```typescript
// working-days.util.spec.ts
describe('WorkingDaysUtil', () => {
  it('should count all week days when no holidays in month')
  it('should exclude Saturdays and Sundays')
  it('should exclude public holidays falling on weekdays')
  it('should not exclude public holidays falling on weekends')
  it('should count correctly when mission starts mid-month')
  it('should count correctly when mission ends mid-month')
  it('should handle single-day mission')
  it('should return 0 if mission period outside month')
  it('should handle February in leap year (2024)')
  it('should handle February in non-leap year (2025)')
})

// cra.service.spec.ts
describe('CraService', () => {
  describe('getOrCreateMonth', () => {
    it('should return existing CraMonth if found')
    it('should create a new DRAFT CraMonth if none exists')
    it('should link to the active mission of the employee')
    it('should throw NotFoundException if employee has no active mission')
  })

  describe('createEntry', () => {
    it('should create a WORK_ONSITE entry on a DRAFT month')
    it('should create a half-day entry (dayFraction=0.5)')
    it('should throw ForbiddenException if month status is not DRAFT')
    it('should throw ConflictException if entry already exists for that date')
    it('should throw BadRequestException if date is before mission start')
    it('should throw BadRequestException if date is after mission end')
    it('should throw BadRequestException if date is a weekend')
    it('should increment LeaveBalance.usedDays when entryType is LEAVE_CP')
    it('should increment LeaveBalance.usedDays when entryType is LEAVE_RTT')
    it('should not change LeaveBalance for WORK_ONSITE entry')
    it('should return isOvertime=true when total exceeds working days')
    it('should return isOvertime=false when total is within working days')
  })

  describe('updateEntry', () => {
    it('should update entryType and recalculate leave balance delta')
    it('should throw ForbiddenException if month is not DRAFT')
    it('should throw NotFoundException if entry not found')
    it('should revert old LeaveBalance and apply new one on type change')
  })

  describe('deleteEntry', () => {
    it('should delete entry and decrement LeaveBalance if it was a leave entry')
    it('should throw ForbiddenException if month is not DRAFT')
    it('should throw NotFoundException if entry not found')
  })

  describe('getMonthSummary', () => {
    it('should return totalWorkDays, totalLeaveDays, totalSickDays')
    it('should return workingDaysInMonth from working-days util')
    it('should return leaveBalances for PAID_LEAVE and RTT')
    it('should set isOvertime=true when work days exceed working days')
    it('should include breakdown: onsite, remote, travel')
  })
})
```

#### Message de commit

```
feat(cra): implement CRA CRUD module with working-day calculations

- Add Sprint 2 Prisma migration: CraEntryType, PortionType, SIGNED_ESN,
  signature timestamps on CraMonth, PublicHoliday table,
  ProjectEntry.portion + craEntryId FK
- Seed public holidays France 2024–2027 (44 entries)
- Update shared-types: enums, entities, API types
- Implement CraModule: CRUD endpoints for entries + month summary
- WorkingDaysUtil: handles partial missions, leap years, public holidays
- Auto-update LeaveBalance on entry create/update/delete
```

---

### T2 — Workflow de signature

**Branche :** `feat/sprint-2/cra-signature`
**Dépend de :** T1 mergé sur la même branche de sprint

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/src/cra/cra-signature.service.ts` | Créer |
| `apps/backend/src/cra/cra.controller.ts` | Modifier : ajouter endpoints de transition |
| `apps/backend/src/cra/dto/sign-cra-month.dto.ts` | Créer (`includeProjectsSummary?: boolean`) |
| `apps/backend/src/cra/dto/reject-cra-month.dto.ts` | Créer (`comment: string @MinLength(10)`) |
| `apps/backend/src/notifications/notifications.module.ts` | Créer |
| `apps/backend/src/notifications/notifications.service.ts` | Créer (in-app uniquement pour Sprint 2) |
| `apps/backend/src/app.module.ts` | Modifier : importer NotificationsModule |
| `apps/backend/test/unit/cra/cra-signature.service.spec.ts` | Créer (TDD — red first) |
| `apps/backend/test/unit/notifications/notifications.service.spec.ts` | Créer |

#### Endpoints de signature

```
POST /cra/months/:id/submit          → DRAFT → SUBMITTED
POST /cra/months/:id/retract         → SUBMITTED → DRAFT
POST /cra/months/:id/sign-employee   → SUBMITTED → SIGNED_EMPLOYEE
POST /cra/months/:id/sign-esn        → SIGNED_EMPLOYEE → SIGNED_ESN    @ConsentGuard
POST /cra/months/:id/reject-esn      → SIGNED_EMPLOYEE → DRAFT         @ConsentGuard
POST /cra/months/:id/sign-client     → SIGNED_ESN → SIGNED_CLIENT
POST /cra/months/:id/reject-client   → SIGNED_ESN → DRAFT
```

#### Tests à écrire (red first)

```typescript
// cra-signature.service.spec.ts
describe('CraSignatureService', () => {
  describe('submit', () => {
    it('should transition DRAFT → SUBMITTED when CRA has entries')
    it('should throw BadRequestException when CRA has no entries')
    it('should throw ForbiddenException if caller is not the CRA owner')
    it('should throw ConflictException if month is not in DRAFT state')
    it('should write AuditLog with action CRA_SUBMITTED')
    it('should create in-app Notification for ESN_ADMIN of the mission')
    it('should set submittedAt timestamp')
  })

  describe('retract', () => {
    it('should transition SUBMITTED → DRAFT')
    it('should throw ConflictException if month is not SUBMITTED')
    it('should throw ForbiddenException if not the owner')
    it('should write AuditLog CRA_RETRACTED')
  })

  describe('signEmployee', () => {
    it('should transition SUBMITTED → SIGNED_EMPLOYEE')
    it('should set signedByEmployeeAt timestamp')
    it('should throw ForbiddenException if not the CRA owner')
    it('should throw ConflictException if not SUBMITTED')
    it('should create a ValidationRequest for ESN_ADMIN (status PENDING)')
    it('should write AuditLog CRA_SIGNED_EMPLOYEE')
    it('should notify ESN_ADMIN')
  })

  describe('signEsn', () => {
    it('should transition SIGNED_EMPLOYEE → SIGNED_ESN')
    it('should set signedByEsnAt timestamp')
    it('should throw ForbiddenException if caller is not ESN_ADMIN')
    it('should throw ConflictException if month is not SIGNED_EMPLOYEE')
    it('should resolve the pending ESN ValidationRequest as APPROVED')
    it('should create a CLIENT ValidationRequest if mission has a client')
    it('should skip CLIENT ValidationRequest and auto-advance if no client')
    it('should write AuditLog CRA_SIGNED_ESN')
    it('should notify EMPLOYEE and CLIENT')
  })

  describe('rejectEsn', () => {
    it('should transition SIGNED_EMPLOYEE → DRAFT')
    it('should require comment (throw BadRequestException if empty)')
    it('should throw ForbiddenException if not ESN_ADMIN')
    it('should resolve ValidationRequest as REJECTED')
    it('should store rejectionComment on CraMonth')
    it('should write AuditLog CRA_REJECTED_ESN')
    it('should notify EMPLOYEE with the rejection comment')
  })

  describe('signClient', () => {
    it('should transition SIGNED_ESN → SIGNED_CLIENT')
    it('should set signedByClientAt timestamp')
    it('should throw ForbiddenException if caller is not the CLIENT of the mission')
    it('should throw ConflictException if month is not SIGNED_ESN')
    it('should resolve CLIENT ValidationRequest as APPROVED')
    it('should write AuditLog CRA_SIGNED_CLIENT')
    it('should notify EMPLOYEE and ESN_ADMIN')
    it('should trigger auto-lock after SIGNED_CLIENT (pdfUrl set → LOCKED)')
  })

  describe('rejectClient', () => {
    it('should transition SIGNED_ESN → DRAFT')
    it('should require comment')
    it('should throw ForbiddenException if not the CLIENT of the mission')
    it('should store rejectionComment')
    it('should notify EMPLOYEE with motif')
  })
})

// notifications.service.spec.ts
describe('NotificationsService', () => {
  it('should create an in-app Notification for the target user')
  it('should not throw if user has no active session')
  it('should store subject and body')
})
```

#### Message de commit

```
feat(cra): implement signature workflow state machine with audit trail

- CraSignatureService: 7 state transitions with strict guard checks
- NotificationsService: in-app notifications on each transition
- ValidationRequest lifecycle: create on signEmployee/signEsn, resolve on sign/reject
- AuditLog written on every state change (resource: cra_month:<id>)
- Auto-lock triggered after SIGNED_CLIENT when pdfUrl is set
- RejectDto: comment field mandatory @MinLength(10)
```

---

### T3 — Interface saisie journalière frontend

**Branche :** `feat/sprint-2/cra-ui`
**Dépend de :** T1 (API endpoints disponibles)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/frontend/src/app/(dashboard)/cra/page.tsx` | Créer — liste des mois CRA avec statut |
| `apps/frontend/src/app/(dashboard)/cra/[year]/[month]/page.tsx` | Créer — page saisie mensuelle |
| `apps/frontend/src/components/cra/MonthGrid.tsx` | Créer — grille calendrier mensuelle |
| `apps/frontend/src/components/cra/DayCell.tsx` | Créer — cellule d'un jour |
| `apps/frontend/src/components/cra/EntryModal.tsx` | Créer — modal de saisie/modification |
| `apps/frontend/src/components/cra/CraStatusBadge.tsx` | Créer — badge statut coloré |
| `apps/frontend/src/components/cra/SignatureActions.tsx` | Créer — boutons d'action selon rôle et statut |
| `apps/frontend/src/lib/api/cra.ts` | Créer — wrapper apiClient pour les routes CRA |
| `apps/frontend/src/components/cra/MonthGrid.spec.tsx` | Créer (TDD) |
| `apps/frontend/src/components/cra/DayCell.spec.tsx` | Créer (TDD) |
| `apps/frontend/src/lib/api/cra.spec.ts` | Créer (TDD) |

#### Comportements UI critiques

- **Grille** : affiche les 28/29/30/31 jours du mois. Weekends grisés et non cliquables.
- **Jours fériés** : récupérés via `GET /cra/months/:id/summary` (le champ `publicHolidays`). Affichés avec fond gris et label "Férié".
- **Saisie** : cliquer sur un jour ouvre `EntryModal`. Formulaire : type d'entrée (select), fraction (0.5/1.0), projets (multi-select si WORK_*), commentaire.
- **Verrouillage** : si `status !== 'DRAFT'`, la grille est en lecture seule (DayCells disabled).
- **Couleurs** : correspondance type → couleur fond de cellule (voir section PDF ci-dessus).
- **Actions de signature** : `SignatureActions` affiche les boutons pertinents selon `user.role` et `craMonth.status`.

#### Tests à écrire (red first)

```typescript
// MonthGrid.spec.tsx
describe('MonthGrid', () => {
  it('should render correct number of days for a 31-day month')
  it('should render correct number of days for February (28 days, non-leap)')
  it('should render correct number of days for February (29 days, leap year)')
  it('should mark Saturday cells as disabled weekend')
  it('should mark Sunday cells as disabled weekend')
  it('should apply WORK_ONSITE color class to filled WORK_ONSITE entries')
  it('should apply LEAVE_CP color class to leave entries')
  it('should apply HOLIDAY color class to public holiday entries')
  it('should not call onDayClick for weekend cells')
  it('should not call onDayClick when isReadOnly=true')
  it('should call onDayClick with correct date when clicked in editable mode')
  it('should show empty state styling for unfilled working days')
})

// DayCell.spec.tsx
describe('DayCell', () => {
  it('should render the day number')
  it('should render the entry type label when entry is present')
  it('should have disabled cursor when disabled=true')
  it('should apply active color class from entryType')
  it('should render half-day indicator when dayFraction=0.5')
})

// cra.spec.ts (API wrapper)
describe('craApi', () => {
  it('should call GET /cra/months/:year/:month')
  it('should call POST /cra/months/:id/entries with correct body')
  it('should call PUT /cra/months/:id/entries/:eid')
  it('should call DELETE /cra/months/:id/entries/:eid')
  it('should call POST /cra/months/:id/submit')
  it('should call POST /cra/months/:id/sign-employee')
})
```

#### Message de commit

```
feat(cra): implement monthly entry grid UI with day-level editing

- MonthGrid: renders full month calendar with weekend/holiday detection
- DayCell: color-coded by entry type, half-day indicator
- EntryModal: entry type select, fraction toggle, project multi-select
- SignatureActions: role-aware action buttons (submit/sign/reject)
- craApi: typed API wrapper for all CRA endpoints
```

---

### T4 — Dashboard jours consommés / restants

**Branche :** `feat/sprint-2/cra-dashboard`
**Dépend de :** T1 (API summary), T3 (composants CRA de base)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/frontend/src/components/cra/LeaveBalanceSummary.tsx` | Créer — tableau soldes CP/RTT |
| `apps/frontend/src/components/cra/WorkingDaysProgress.tsx` | Créer — barre progression jours saisis |
| `apps/frontend/src/components/cra/MonthStatusTimeline.tsx` | Créer — chronologie des signatures |
| `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` | Modifier — intégrer les widgets CRA du mois courant |
| `apps/frontend/src/components/cra/LeaveBalanceSummary.spec.tsx` | Créer (TDD) |
| `apps/frontend/src/components/cra/WorkingDaysProgress.spec.tsx` | Créer (TDD) |

#### Données affichées (source : `GET /cra/months/:id/summary`)

- **WorkingDaysProgress** : `X / N jours saisis` (barre de progression, rouge si `isOvertime`)
- **LeaveBalanceSummary** : tableau CP (utilisés/total/restants) + RTT idem. Ligne rouge si restant < 2 jours.
- **MonthStatusTimeline** : pas à pas du workflow (signé/en attente pour chaque acteur).

#### Tests à écrire (red first)

```typescript
// LeaveBalanceSummary.spec.tsx
describe('LeaveBalanceSummary', () => {
  it('should display usedDays / totalDays for PAID_LEAVE')
  it('should display usedDays / totalDays for RTT')
  it('should compute remaining days correctly')
  it('should apply red text class when remaining < 2 days')
  it('should apply normal text class when remaining >= 2 days')
  it('should handle zero totalDays without dividing by zero')
  it('should show N/A when balance not available for the year')
})

// WorkingDaysProgress.spec.tsx
describe('WorkingDaysProgress', () => {
  it('should display N filled days out of M working days')
  it('should render progress bar at correct percentage')
  it('should apply warning color when isOvertime=true')
  it('should apply normal color when isOvertime=false')
  it('should show 100% when all working days are filled')
})
```

#### Message de commit

```
feat(cra): add leave balance and working-days progress dashboard widgets

- LeaveBalanceSummary: CP/RTT consumed/available with low-balance alert
- WorkingDaysProgress: visual progress bar with overtime warning
- MonthStatusTimeline: displays current signature step and pending actors
- Dashboard homepage: integrated widgets for current month CRA
```

---

### T5 — Génération PDF CRA

**Branche :** `feat/sprint-2/pdf-generator`
**Dépend de :** T1 (données CRA), T2 (workflow — PDF généré au SIGNED_CLIENT)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `packages/pdf-generator/package.json` | Créer — dépendances : puppeteer, @types/node |
| `packages/pdf-generator/tsconfig.json` | Créer |
| `packages/pdf-generator/src/index.ts` | Créer — barrel export |
| `packages/pdf-generator/src/cra-pdf.generator.ts` | Créer — entry point public |
| `packages/pdf-generator/src/templates/cra.template.ts` | Créer — builder HTML string |
| `packages/pdf-generator/src/templates/cra.styles.ts` | Créer — CSS inline string |
| `packages/pdf-generator/src/utils/format.util.ts` | Créer — formatDate, formatDecimal, entryTypeLabel, entryTypeColor |
| `packages/pdf-generator/src/types.ts` | Créer — CraPdfData interface |
| `packages/pdf-generator/src/cra-pdf.generator.spec.ts` | Créer (TDD) |
| `packages/pdf-generator/src/utils/format.util.spec.ts` | Créer (TDD) |
| `apps/backend/src/cra/cra-pdf.service.ts` | Créer — appelle le générateur + upload S3 MinIO |
| `apps/backend/src/cra/cra.module.ts` | Modifier : importer CraPdfService |
| `apps/backend/test/unit/cra/cra-pdf.service.spec.ts` | Créer (TDD) |

#### Interface `CraPdfData`

```typescript
interface CraPdfData {
  employee: { firstName: string; lastName: string; email: string };
  mission: { title: string; startDate: Date; endDate: Date | null };
  client: { firstName: string; lastName: string } | null;
  year: number;
  month: number; // 1-12
  entries: Array<{
    date: Date;
    entryType: CraEntryType;
    dayFraction: number;
    comment: string | null;
    projects: Array<{ name: string; portion: PortionType | null }>;
  }>;
  summary: {
    totalWorkDays: number;
    totalLeaveDays: number;
    totalSickDays: number;
    workingDaysInMonth: number;
    isOvertime: boolean;
    leaveBalances: Array<{ leaveType: LeaveType; totalDays: number; usedDays: number }>;
  };
  projectsSummary: Array<{ name: string; daysSpent: number }> | null;
  signatures: {
    employee: { signedAt: Date | null; name: string };
    esn: { signedAt: Date | null; name: string };
    client: { signedAt: Date | null; name: string } | null;
  };
}
```

#### Tests à écrire (red first)

```typescript
// format.util.spec.ts
describe('FormatUtil', () => {
  it('should format a Date to DD/MM/YYYY')
  it('should format decimal 1.0 as "1,0"')
  it('should format decimal 0.5 as "0,5"')
  it('should return French label for WORK_ONSITE')
  it('should return French label for LEAVE_CP')
  it('should return French label for all 10 CraEntryTypes')
  it('should return correct hex color for WORK_ONSITE')
  it('should return correct hex color for LEAVE_CP')
  it('should return correct hex color for HOLIDAY')
})

// cra-pdf.generator.spec.ts (mock Puppeteer)
describe('CraPdfGenerator', () => {
  it('should call puppeteer.launch and page.pdf')
  it('should return a non-empty Buffer')
  it('should include employee name in generated HTML')
  it('should include mission title in generated HTML')
  it('should include all entry types in the table body')
  it('should include project summary section when projectsSummary is provided')
  it('should omit project summary section when projectsSummary is null')
  it('should render 3 signature zones')
  it('should show signedAt date in employee signature zone when provided')
  it('should show "En attente" when signedAt is null in a zone')
  it('should throw TypeError if required fields are missing')
})

// cra-pdf.service.spec.ts
describe('CraPdfService', () => {
  it('should fetch CraMonth data and build CraPdfData')
  it('should call CraPdfGenerator.generate with correct data')
  it('should upload resulting Buffer to MinIO with correct S3 key')
  it('should update CraMonth.pdfUrl with the returned S3 URL')
  it('should transition CraMonth status to LOCKED after upload')
  it('should write AuditLog CRA_LOCKED')
  it('should throw BadRequestException if month is not SIGNED_CLIENT')
})
```

#### Déclenchement de la génération PDF

- `POST /cra/months/:id/sign-client` → dans `CraSignatureService.signClient()` → appelle `CraPdfService.generateAndUpload(craMonthId)` → upload S3 → met à jour `pdfUrl` + `LOCKED`
- **S3 key pattern** : `cra/{employeeId}/{year}/{month:02d}/cra-{craMonthId}.pdf`

#### Message de commit

```
feat(pdf): implement CRA PDF generation with Puppeteer and S3 auto-lock

- packages/pdf-generator: HTML/CSS template renderer + Puppeteer PDF export
- CraPdfData interface with full month context including signatures
- Color-coded entry table, optional project summary annex
- CraPdfService: fetches data, generates PDF, uploads to MinIO, locks CraMonth
- Auto-lock (SIGNED_CLIENT → LOCKED) triggered in signClient transition
```

---

### T6 — Tests e2e workflow complet

**Branche :** `feat/sprint-2/e2e`
**Dépend de :** T1 à T5

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/test/e2e/cra/cra-crud.e2e-spec.ts` | Créer — supertest CRUD |
| `apps/backend/test/e2e/cra/cra-workflow.e2e-spec.ts` | Créer — supertest workflow signature complet |
| `apps/backend/test/e2e/helpers/auth.helper.ts` | Créer — login helper retournant JWT |
| `apps/backend/test/e2e/helpers/seed.helper.ts` | Créer — seed test data (employee + esnAdmin + client + mission) |
| `apps/frontend/test/e2e/cra-saisie.spec.ts` | Créer — Playwright smoke test |

#### Tests e2e backend (supertest, vraie DB de test)

```typescript
// cra-crud.e2e-spec.ts
describe('CRA CRUD (e2e)', () => {
  describe('GET /cra/months/:year/:month', () => {
    it('should create a DRAFT month if none exists for the employee mission')
    it('should return existing month without creating duplicate')
    it('should return 401 without JWT')
  })
  describe('POST /cra/months/:id/entries', () => {
    it('should create a WORK_ONSITE entry')
    it('should create a LEAVE_CP half-day entry and increment LeaveBalance')
    it('should return 409 if entry already exists for that date')
    it('should return 400 if date is a weekend')
    it('should return 403 if EMPLOYEE accesses another employee CRA')
  })
  describe('PUT /cra/months/:id/entries/:eid', () => {
    it('should update entry type and recalculate balance')
    it('should return 404 if entry not found')
  })
  describe('DELETE /cra/months/:id/entries/:eid', () => {
    it('should delete entry and decrement LeaveBalance')
  })
  describe('GET /cra/months/:id/summary', () => {
    it('should return correct totalWorkDays after multiple entries')
    it('should set isOvertime=true when entries exceed working days')
  })
})

// cra-workflow.e2e-spec.ts
describe('CRA Signature Workflow (e2e)', () => {
  it('full happy path: DRAFT → SUBMITTED → SIGNED_EMPLOYEE → SIGNED_ESN → SIGNED_CLIENT → LOCKED')
  it('ESN rejet: SIGNED_EMPLOYEE → DRAFT with comment, then re-submit → SIGNED_CLIENT')
  it('CLIENT rejet: SIGNED_ESN → DRAFT with comment')

  describe('Access control', () => {
    it('should return 403 when EMPLOYEE submits another employee CRA')
    it('should return 403 when EMPLOYEE tries to call sign-esn')
    it('should return 403 when ESN_ADMIN calls sign-esn without GRANTED consent')
    it('should return 200 when ESN_ADMIN calls sign-esn with GRANTED consent')
    it('should return 403 when wrong CLIENT calls sign-client')
    it('should return 409 when submit is called on non-DRAFT month')
    it('should return 400 when reject-esn is called with empty comment')
  })

  describe('AuditLog integrity', () => {
    it('should create AuditLog CRA_SUBMITTED after submit')
    it('should create AuditLog CRA_SIGNED_ESN after ESN sign')
    it('should create AuditLog CRA_REJECTED_CLIENT with comment in metadata')
  })

  describe('Notifications', () => {
    it('should create in-app notification for ESN_ADMIN after employee sign')
    it('should create in-app notification for EMPLOYEE after ESN rejection with comment')
  })
})
```

#### Tests Playwright (smoke, frontend)

```typescript
// cra-saisie.spec.ts
describe('CRA Saisie (Playwright smoke)', () => {
  it('should display monthly calendar grid after login as EMPLOYEE')
  it('should open entry modal when clicking on a working day')
  it('should show WORK_ONSITE color after saving entry')
  it('should show leave balance widget on /cra/:year/:month')
  it('should disable grid when status is SUBMITTED')
  it('should show "Soumettre" button when status is DRAFT and entries exist')
})
```

#### Message de commit

```
test(cra): add e2e tests for full CRA workflow — CRUD, signature, access control

- Backend e2e (supertest): CRUD entries, full 6-step signature workflow,
  access control matrix (owner/ESN/client/consent), AuditLog integrity
- Playwright smoke tests: calendar render, entry modal, leave balance widget
- e2e helpers: auth.helper (JWT login), seed.helper (test data setup)
```

---

### T7 — PR Sprint 2

**Branche :** `feat/sprint-2/cra-module` (branche principale du sprint — T1 à T6 mergés)

#### Checklist avant PR

```
[ ] pnpm --filter backend test       → tous les tests unitaires verts
[ ] pnpm --filter backend test:e2e   → e2e workflow verts
[ ] pnpm --filter frontend test      → tests frontend verts
[ ] pnpm --filter frontend test:e2e  → smoke Playwright verts
[ ] pnpm typecheck                   → 0 erreur TypeScript (backend + frontend + shared-types + pdf-generator)
[ ] pnpm lint                        → 0 erreur ESLint
[ ] pnpm db:migrate                  → migration Sprint 2 appliquée proprement
[ ] pnpm db:seed                     → seed avec PublicHoliday + CraEntry au nouveau format OK
[ ] POST /cra/months/:id/submit      → retourne 200 + status SUBMITTED
[ ] Workflow complet en manuel : login employee → saisie → soumettre → signer → (ESN) signer → (CLIENT) signer → PDF généré
```

#### Corps de la PR

```
## Sprint 2 — Module CRA complet

### Périmètre
Ce PR couvre l'intégralité du module CRA : saisie journalière, workflow de
signature tripartite, dashboard soldes, génération PDF.

### Changements

**Migration Prisma Sprint 2**
- Nouveaux enums : CraEntryType (10 valeurs), PortionType (3 valeurs)
- CraStatus : ajout SIGNED_ESN
- CraMonth : signedByEmployeeAt, signedByEsnAt, signedByClientAt, rejectionComment
- CraEntry : entryType (remplace leaveType), FK vers ProjectEntry
- ProjectEntry : portion, craEntryId
- PublicHoliday : table jours fériés FR 2024-2027 (44 entrées)

**Backend NestJS**
- CraModule : CRUD entries, calcul jours ouvrables, mise à jour LeaveBalance
- CraSignatureService : 7 transitions, guards RBAC + ResourceOwner + ConsentGuard
- ValidationRequest lifecycle complet
- NotificationsService : in-app notifications à chaque transition
- AuditLog sur toutes les mutations sensibles

**packages/pdf-generator**
- Nouveau package Puppeteer
- Template HTML/CSS CRA : tableau journalier, récap, annexe projets, signatures
- CraPdfService : génération + upload MinIO + auto-lock SIGNED_CLIENT → LOCKED

**Frontend**
- MonthGrid + DayCell : grille calendrier couleur-codée
- EntryModal : saisie/modification journalière
- LeaveBalanceSummary + WorkingDaysProgress : widgets dashboard
- MonthStatusTimeline : état du workflow de signature

### Tests
- N tests unitaires backend (CraService, WorkingDaysUtil, CraSignatureService, CraPdfService)
- N tests unitaires frontend (MonthGrid, DayCell, LeaveBalanceSummary)
- N tests e2e backend (CRUD + workflow complet + access control + AuditLog)
- N tests Playwright smoke (saisie, modal, dashboard)
```

#### Message de commit du tag PR

```
feat(sprint-2): complete CRA module — CRUD, signature workflow, PDF generation
```

---

## Graphe de dépendances inter-tâches

```
T1 (CRA NestJS CRUD)
├── T2 (Workflow signature)    ← dépend T1 (statuts + entities)
│    └── T5 (PDF generator)   ← dépend T2 (déclenché par signClient)
├── T3 (UI saisie)             ← dépend T1 (API endpoints)
│    └── T4 (Dashboard)        ← dépend T1 + T3 (composants + API summary)
└── T6 (e2e)                   ← dépend T1 + T2 + T3 + T4 + T5
     └── T7 (PR)               ← dépend T6
```

**Parallélisations possibles :**
- T3 + T2 peuvent avancer **en parallèle** dès T1 terminé
- T4 peut commencer dès T3 (composants de base posés)
- T5 peut commencer dès T2 (interface CraPdfData connue)

---

## Décisions d'architecture Sprint 2

| Décision | Choix | Raison |
|---|---|---|
| Jours fériés | Table statique `PublicHoliday` | Déterministe, testable unitairement, offline |
| Workflow refus | Toujours retour à DRAFT | Cohérence — re-saisie complète plutôt que correction partielle |
| Déclenchement PDF | Automatique après `signClient` | Évite un endpoint séparé, cohérence avec LOCKED |
| Notifications Sprint 2 | In-app uniquement (email en Phase 2) | Simplicité, email intégré en Sprint 5 |
| `entryType` vs `leaveType` | Remplacement complet par `CraEntryType` | `leaveType` était redondant, `CraEntryType` couvre tous les cas |
| `ProjectEntry.portion` | Ajout de `portion PortionType?` + conserver `hoursSpent` | Rétrocompatibilité seed + spec respectée |
| ConsentGuard sur sign-esn | Obligatoire | CLAUDE.md : tout accès ESN aux données salarié passe par ConsentGuard |

---

✅ Plan Sprint 2 documenté. En attente de validation avant implémentation (P4).
