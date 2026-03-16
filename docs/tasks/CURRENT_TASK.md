# Sprint 3 — Module Projets

**Branche de départ :** `main` (après merge PR #2 Sprint 2)
**Date de création :** 2026-03-16
**Statut :** TERMINÉ ✅ — PR #3 ouverte (feat/sprint-3/projects-module)

---

## Analyse des règles métier complexes

### 1. Escalade météo automatique

#### Règle spec
> RAINY sans nouvelle `WeatherEntry` depuis 3 jours ouvrés → escalade STORM auto + notif ESN

#### Décision d'architecture : Cron job avec `@nestjs/schedule`

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| `@nestjs/schedule` cron | Simple, sans Redis, zéro infra supplémentaire | Perte si process redémarre en milieu de nuit | ✅ Retenu |
| Bull queue (`@nestjs/bull`) | Persistance, retry automatique, concurrence | Nécessite Redis, configuration complexe | ❌ Phase 2 |
| Check à la lecture | Zéro infra | Ne déclenche pas de notification | ❌ Insuffisant |

Bull est déjà présent en dépendance directe mais sans `@nestjs/bull` — non utilisé pour Sprint 3.

#### Algorithme du cron (quotidien à 08:00)

```typescript
// WeatherEscaladeScheduler — pseudo-code
@Cron('0 8 * * *')
async checkWeatherEscalation() {
  // 1. Trouver tous les projets ACTIVE
  const activeProjects = await prisma.project.findMany({
    where: { status: ProjectStatus.ACTIVE },
    include: { mission: { include: { employee: true } }, weatherEntries: { orderBy: { date: 'desc' }, take: 1 } }
  });

  for (const project of activeProjects) {
    const lastEntry = project.weatherEntries[0];
    if (!lastEntry || lastEntry.state !== WeatherState.RAINY) continue;
    if (lastEntry.isEscalated) continue; // déjà escaladé, éviter doublons

    // 2. Compter les jours ouvrables depuis lastEntry.date
    const workingDaysSince = await countWorkingDaysSince(lastEntry.date);

    // 3. Soustraire les jours de congé/maladie du salarié (pause escalade)
    const leaveDays = await countEmployeeLeaveDays(
      project.mission.employeeId,
      lastEntry.date,
      today
    );
    const effectiveWorkingDays = workingDaysSince - leaveDays;

    if (effectiveWorkingDays >= 3) {
      // 4. Créer entrée STORM auto + marquer isEscalated
      await prisma.weatherEntry.create({
        data: {
          projectId: project.id,
          state: WeatherState.STORM,
          comment: 'Escalade automatique — RAINY sans mise à jour depuis 3 jours ouvrés',
          isEscalated: true,
          escalatedAt: now(),
          reportedById: SYSTEM_USER_ID, // ou ESN_ADMIN de la mission
        }
      });
      // 5. Notifier ESN_ADMIN de la mission
      await notificationsService.notify(project.mission.esnAdminId, ...);
    }
  }
}
```

#### Règle congés (pause escalade)
Si le salarié a des `CraEntry` de type `LEAVE_CP | LEAVE_RTT | SICK | HOLIDAY` couvrant des jours ouvrables dans la fenêtre de 3 jours, ces jours sont soustraits du compteur. Rationale : il serait injuste d'escalader si le salarié est officiellement absent.

#### Règle anti-doublon
- `WeatherEntry.isEscalated = true` marque les entrées auto-générées
- Le cron vérifie que la dernière entrée réelle (non-escaladée) est bien RAINY
- Une fois STORM créé, le salarié doit créer une nouvelle entrée pour réinitialiser le cycle

---

### 2. Visibilité des commentaires

#### Modèle de visibilité (spec)
```
CommentVisibility:
  EMPLOYEE_ESN   → visible par EMPLOYEE (propriétaire) + ESN_ADMIN (si consentement)
  EMPLOYEE_CLIENT → visible par EMPLOYEE + CLIENT (de la mission)
  ALL            → visible par tous les acteurs de la mission
```

#### Filtre API selon rôle

```typescript
// ProjectsService.getComments(projectId, callerRole, callerId)
function buildVisibilityFilter(callerRole: Role): Prisma.ProjectCommentWhereInput {
  switch (callerRole) {
    case Role.EMPLOYEE:
      return {}; // L'employé voit TOUS ses propres commentaires (pas de filtre)
    case Role.ESN_ADMIN:
      return { visibility: { in: [CommentVisibility.EMPLOYEE_ESN, CommentVisibility.ALL] } };
    case Role.CLIENT:
      return { visibility: { in: [CommentVisibility.EMPLOYEE_CLIENT, CommentVisibility.ALL] } };
  }
}
```

#### Cas multi-rôle
Le schéma Prisma utilise un champ `role: Role` **unique par User** — aucun utilisateur n'a deux rôles simultanément. Le cas multi-rôle ne se pose pas dans ce modèle.

#### Note sur `isPrivate`
L'actuel champ `isPrivate: Boolean` sur `ProjectComment` est insuffisant : il ne distingue pas EMPLOYEE_ESN de EMPLOYEE_CLIENT. Il sera **remplacé** par `visibility: CommentVisibility` lors de la migration Sprint 3.

---

### 3. ValidationRequest — Projets vs CRA

#### Pourquoi un modèle séparé
Le `ValidationRequest` existant est étroitement lié à `CraMonth` (FK `craMonthId` non-nullable). La spec projets demande un objet différent :
- Lie à `Project` (pas à `CraMonth`)
- A `title`, `description`, `targetRole` (Role)
- Peut référencer des `Document[]`
- Résolu par le destinataire ciblé (mission-scoped, pas "n'importe qui du rôle")

**Décision : créer `ProjectValidationRequest` comme modèle distinct.**

#### Qui peut approuver/refuser
```
targetRole = CLIENT   → uniquement project.mission.client (l'User CLIENT de la mission)
targetRole = ESN_ADMIN → uniquement project.mission.esnAdmin
```
Enforcement : `ResourceOwnerGuard` étendu + vérification `mission.clientId === caller.id` dans le service.

#### Projet CLOSED avec validation en attente
Règle spec : "Fermeture projet → tous jalons et validations en attente sont archivés."

```typescript
// ProjectsService.closeProject(projectId)
async closeProject(projectId: string) {
  await prisma.$transaction([
    // Archiver les validations en attente
    prisma.projectValidationRequest.updateMany({
      where: { projectId, status: ValidationStatus.PENDING },
      data: { status: ValidationStatus.ARCHIVED, decisionComment: 'Projet fermé' }
    }),
    // Archiver les jalons non-terminés
    prisma.milestone.updateMany({
      where: { projectId, status: { in: [MilestoneStatus.PLANNED, MilestoneStatus.IN_PROGRESS, MilestoneStatus.LATE] } },
      data: { status: MilestoneStatus.ARCHIVED }
    }),
    // Fermer le projet
    prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.CLOSED, closedAt: new Date() }
    })
  ]);
}
```

---

### 4. Jalons et retard automatique

#### Détection
**Même cron daily à 08:00** que l'escalade météo — deux responsabilités dans `DailyProjectScheduler`:
1. `checkWeatherEscalation()`
2. `checkMilestoneLate()`

```typescript
async checkMilestoneLate() {
  const overdueMilestones = await prisma.milestone.findMany({
    where: {
      dueDate: { lt: today },
      status: { in: [MilestoneStatus.PLANNED, MilestoneStatus.IN_PROGRESS] },
      project: { status: ProjectStatus.ACTIVE }
    },
    include: { project: { include: { mission: true, weatherEntries: { orderBy: { date: 'desc' }, take: 1 } } } }
  });

  for (const milestone of overdueMilestones) {
    // 1. Marquer LATE
    await prisma.milestone.update({ where: { id: milestone.id }, data: { status: MilestoneStatus.LATE } });

    // 2. Météo plancher CLOUDY (si dernière entrée est SUNNY)
    const lastWeather = milestone.project.weatherEntries[0];
    if (!lastWeather || lastWeather.state === WeatherState.SUNNY) {
      await prisma.weatherEntry.create({
        data: {
          projectId: milestone.project.id,
          state: WeatherState.CLOUDY,
          comment: `Jalons "${milestone.title}" en retard — météo plancher CLOUDY`,
          isEscalated: true,
          escalatedAt: new Date(),
          reportedById: SYSTEM_ACTOR_ID,
        }
      });
    }
    // 3. Notifier EMPLOYEE + ESN_ADMIN
    await notificationsService.notify(milestone.project.mission.employeeId, ...);
    if (milestone.project.mission.esnAdminId) {
      await notificationsService.notify(milestone.project.mission.esnAdminId, ...);
    }
  }
}
```

#### Check à la lecture (complémentaire)
`getProject()` calcule dynamiquement `isLate` pour l'affichage sans attendre le cron. Mais le marquage DB (persistant) se fait uniquement via le cron.

---

## Gaps Prisma Sprint 2 → Sprint 3

**Migration nécessaire avant toute implémentation Sprint 3.**

### Enums à créer / modifier

| Enum | Action | Raison |
|---|---|---|
| `WeatherStatus {GREEN,ORANGE,RED}` | **Remplacer** par `WeatherState {SUNNY,CLOUDY,RAINY,STORM,VALIDATION_PENDING,VALIDATED}` | Spec définit 6 états ordonnés par sévérité |
| `CommentVisibility` | **Créer** `{EMPLOYEE_ESN, EMPLOYEE_CLIENT, ALL}` | Visibilité tri-state manquante |
| `ProjectStatus` | **Créer** `{ACTIVE, PAUSED, CLOSED}` | Spec demande statut projet explicite |
| `MilestoneStatus` | **Créer** `{PLANNED, IN_PROGRESS, DONE, LATE, ARCHIVED}` | Spec demande suivi état jalon |
| `ValidationStatus` | **Étendre** : ajouter `ARCHIVED` | Nécessaire pour archivage projet fermé |

### Modèles à modifier

#### `Project`
```prisma
// Avant
isActive Boolean @default(true) @map("is_active")

// Après
status    ProjectStatus @default(ACTIVE)
closedAt  DateTime?     @map("closed_at")
estimatedDays Int?      @map("estimated_days")
```
Migration données : `isActive=true → ACTIVE`, `isActive=false → CLOSED`.

#### `WeatherEntry`
```prisma
// Avant
status WeatherStatus

// Après
state  WeatherState
```
Migration données : `GREEN → SUNNY`, `ORANGE → CLOUDY`, `RED → STORM`.
SQL : `ALTER TYPE "weather_status" RENAME TO "weather_state_old"` (voir stratégie migration ci-dessous).

#### `ProjectComment`
```prisma
// Avant
isPrivate Boolean @default(false) @map("is_private")

// Après
visibility      CommentVisibility @default(ALL)
isBlocker       Boolean           @default(false)  @map("is_blocker")
resolvedAt      DateTime?         @map("resolved_at")
resolvedById    String?           @map("resolved_by_id")
resolvedBy      User?             @relation("BlockerResolver", fields: [resolvedById], references: [id])
```
Migration données : `isPrivate=true → EMPLOYEE_ESN`, `isPrivate=false → ALL`.

#### `Milestone`
```prisma
// Avant
completedAt DateTime? @map("completed_at")

// Après
status      MilestoneStatus @default(PLANNED)
completedAt DateTime?       @map("completed_at")  // conservé pour rétrocompat
validatedAt DateTime?       @map("validated_at")
```

### Nouveau modèle : `ProjectValidationRequest`

```prisma
model ProjectValidationRequest {
  id              String           @id @default(uuid())
  title           String
  description     String
  targetRole      Role             @map("target_role")  // CLIENT ou ESN_ADMIN
  status          ValidationStatus @default(PENDING)
  decisionComment String?          @map("decision_comment")
  requestedAt     DateTime         @default(now()) @map("requested_at")
  resolvedAt      DateTime?        @map("resolved_at")
  createdAt       DateTime         @default(now()) @map("created_at")

  projectId       String           @map("project_id")
  project         Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)

  requestedById   String           @map("requested_by_id")
  requestedBy     User             @relation("ProjectValRequester", fields: [requestedById], references: [id])

  resolverId      String?          @map("resolver_id")
  resolver        User?            @relation("ProjectValResolver", fields: [resolverId], references: [id])

  documents       ProjectValidationDocument[]

  @@map("project_validation_requests")
}

model ProjectValidationDocument {
  id           String   @id @default(uuid())
  validationId String   @map("validation_id")
  validation   ProjectValidationRequest @relation(fields: [validationId], references: [id], onDelete: Cascade)
  documentId   String   @map("document_id")
  document     Document @relation(fields: [documentId], references: [id])

  @@unique([validationId, documentId])
  @@map("project_validation_documents")
}
```

### Impact `User` (nouvelles relations)
```prisma
// Ajouter dans model User
projectValRequests   ProjectValidationRequest[] @relation("ProjectValRequester")
projectValResolutions ProjectValidationRequest[] @relation("ProjectValResolver")
resolvedBlockers     ProjectComment[]            @relation("BlockerResolver")
```

### Impact `Document` (nouvelle relation)
```prisma
// Ajouter dans model Document
projectValidations   ProjectValidationDocument[]
```

### Impact `Project` (nouvelle relation)
```prisma
// Ajouter dans model Project
validationRequests   ProjectValidationRequest[]
```

### Stratégie migration PostgreSQL pour renommage d'enum

PostgreSQL ne permet pas `ALTER TYPE RENAME` directement pour les enums utilisés dans des tables.
Approche via migration manuelle Prisma :

```sql
-- 1. Créer le nouvel enum WeatherState
CREATE TYPE "weather_state" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'STORM', 'VALIDATION_PENDING', 'VALIDATED');

-- 2. Migrer les données (mapping 3→6 valeurs)
ALTER TABLE "weather_entries"
  ALTER COLUMN "status" TYPE "weather_state"
  USING CASE "status"::text
    WHEN 'GREEN'  THEN 'SUNNY'::"weather_state"
    WHEN 'ORANGE' THEN 'CLOUDY'::"weather_state"
    WHEN 'RED'    THEN 'STORM'::"weather_state"
  END;

-- 3. Renommer la colonne
ALTER TABLE "weather_entries" RENAME COLUMN "status" TO "state";

-- 4. Supprimer l'ancien enum
DROP TYPE "weather_status";

-- Enum CommentVisibility
CREATE TYPE "comment_visibility" AS ENUM ('EMPLOYEE_ESN', 'EMPLOYEE_CLIENT', 'ALL');

-- Migrer isPrivate → visibility
ALTER TABLE "project_comments" ADD COLUMN "visibility" "comment_visibility" NOT NULL DEFAULT 'ALL';
UPDATE "project_comments" SET "visibility" = 'EMPLOYEE_ESN' WHERE "is_private" = true;
ALTER TABLE "project_comments" DROP COLUMN "is_private";

-- ProjectStatus
CREATE TYPE "project_status" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');
ALTER TABLE "projects" ADD COLUMN "status" "project_status" NOT NULL DEFAULT 'ACTIVE';
UPDATE "projects" SET "status" = 'CLOSED' WHERE "is_active" = false;
ALTER TABLE "projects" DROP COLUMN "is_active";

-- MilestoneStatus
CREATE TYPE "milestone_status" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'LATE', 'ARCHIVED');
ALTER TABLE "milestones" ADD COLUMN "status" "milestone_status" NOT NULL DEFAULT 'PLANNED';

-- ValidationStatus : ajouter ARCHIVED
ALTER TYPE "validation_status" ADD VALUE IF NOT EXISTS 'ARCHIVED';
```

### Impact `packages/shared-types`
Tout changement schema → mise à jour **obligatoire** de :
- `packages/shared-types/src/enums.ts` : nouveaux enums, modification WeatherStatus→WeatherState
- `packages/shared-types/src/entities.ts` : Project, WeatherEntry, ProjectComment, Milestone + nouveaux modèles
- `packages/shared-types/src/api.ts` : DTOs request/response projets

---

## Plan d'implémentation — 8 Tâches

### T1 — Module Projects NestJS (CRUD + météo)

**Branche :** `feat/sprint-3/projects-module`

**Périmètre :** Migration schema Sprint 3, shared-types, ProjectsModule CRUD, WeatherEntry CRUD, ProjectStatus machine.

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/prisma/schema.prisma` | Modifier : Project, WeatherEntry, ProjectComment, Milestone + nouveaux enums + ProjectValidationRequest |
| `apps/backend/prisma/migrations/<ts>_sprint3_projects/migration.sql` | Créer (migration manuelle pour renommage enums) |
| `apps/backend/prisma/seed.ts` | Mettre à jour : données projets de test avec nouveaux champs |
| `packages/shared-types/src/enums.ts` | Ajouter WeatherState, CommentVisibility, ProjectStatus, MilestoneStatus ; étendre ValidationStatus |
| `packages/shared-types/src/entities.ts` | Mettre à jour Project, WeatherEntry, ProjectComment, Milestone ; ajouter ProjectValidationRequest |
| `packages/shared-types/src/api.ts` | Ajouter DTOs projets : CreateProjectDto, UpdateProjectDto, WeatherEntryDto, ProjectSummaryDto |
| `apps/backend/src/projects/projects.module.ts` | Créer |
| `apps/backend/src/projects/projects.service.ts` | Créer |
| `apps/backend/src/projects/projects.controller.ts` | Créer |
| `apps/backend/src/projects/dto/create-project.dto.ts` | Créer |
| `apps/backend/src/projects/dto/update-project.dto.ts` | Créer |
| `apps/backend/src/projects/dto/weather-entry.dto.ts` | Créer |
| `apps/backend/src/app.module.ts` | Modifier : importer ProjectsModule |
| `apps/backend/test/unit/projects/projects.service.spec.ts` | Créer (TDD — red first) |
| `apps/backend/test/unit/projects/weather.service.spec.ts` | Créer (TDD — red first) |

#### Endpoints T1

```
GET  /projects                        → liste des projets du salarié (via missions)
GET  /projects/:id                    → détail projet + dernière météo + résumé jalons
POST /projects                        → créer un projet (EMPLOYEE)
PUT  /projects/:id                    → modifier un projet (EMPLOYEE)
POST /projects/:id/pause              → ACTIVE → PAUSED
POST /projects/:id/reopen             → PAUSED → ACTIVE
POST /projects/:id/close              → ACTIVE|PAUSED → CLOSED (archive validations+jalons)
GET  /projects/:id/weather            → historique météo (paginé, last 30 entrées)
POST /projects/:id/weather            → créer entrée météo (EMPLOYEE)
GET  /projects/:id/weather/summary    → météo dominante du mois courant
```

#### Tests à écrire (TDD — red first)

```typescript
// projects.service.spec.ts
describe('ProjectsService', () => {
  describe('create', () => {
    it('should create a project linked to active mission')
    it('should throw NotFoundException if mission not found for employee')
    it('should throw ForbiddenException if employee is not the mission owner')
  })

  describe('findAllForEmployee', () => {
    it('should return only projects linked to employee missions')
    it('should include last WeatherEntry for each project')
    it('should include milestone count and LATE count')
  })

  describe('findOne', () => {
    it('should return project with full weather history (30 entries)')
    it('should return project with milestones sorted by dueDate')
    it('should return project with pending validationRequests')
    it('should throw NotFoundException if project not found')
    it('should throw ForbiddenException if caller has no access (ESN without consent)')
  })

  describe('closeProject', () => {
    it('should set status to CLOSED')
    it('should archive all PENDING validationRequests')
    it('should archive all non-DONE milestones')
    it('should set closedAt timestamp')
    it('should write AuditLog PROJECT_CLOSED')
    it('should throw ConflictException if project is already CLOSED')
  })

  describe('pause / reopen', () => {
    it('should transition ACTIVE → PAUSED')
    it('should transition PAUSED → ACTIVE')
    it('should throw ConflictException on invalid transitions')
  })
})

// weather.service.spec.ts
describe('WeatherService', () => {
  describe('createEntry', () => {
    it('should create a SUNNY entry without comment')
    it('should create a RAINY entry with mandatory comment')
    it('should throw BadRequestException if state is RAINY/STORM and comment is empty')
    it('should throw ForbiddenException if caller is not the project employee')
    it('should throw ConflictException if project is CLOSED')
    it('should write AuditLog WEATHER_UPDATED')
  })

  describe('getHistory', () => {
    it('should return last 30 entries ordered by date desc')
    it('should filter by month when yearMonth param provided')
  })

  describe('getMonthlySummary', () => {
    it('should return dominant weather state (most frequent) for the month')
    it('should return STORM if any STORM entry exists in the month')
    it('should return entry count per state')
  })
})
```

#### Message de commit

```
feat(projects): implement Projects module with CRUD and weather tracking

- Sprint 3 Prisma migration: WeatherState (6 values), ProjectStatus,
  CommentVisibility, MilestoneStatus, ARCHIVED validation status,
  ProjectValidationRequest model, ProjectValidationDocument junction
- Data migration: GREEN→SUNNY, ORANGE→CLOUDY, RED→STORM, isPrivate→visibility
- Update shared-types: all new enums, updated entities, new DTOs
- ProjectsModule: CRUD endpoints, project lifecycle (ACTIVE/PAUSED/CLOSED)
- WeatherService: entry CRUD, comment mandatory on degradation, monthly summary
- closeProject: archives pending validations + milestones in a transaction
```

---

### T2 — Commentaires et points de blocage

**Branche :** `feat/sprint-3/projects-module` (même branche que T1)
**Dépend de :** T1 (schema + ProjectsModule)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/src/projects/comments.service.ts` | Créer |
| `apps/backend/src/projects/dto/create-comment.dto.ts` | Créer |
| `apps/backend/src/projects/dto/update-comment.dto.ts` | Créer |
| `apps/backend/test/unit/projects/comments.service.spec.ts` | Créer (TDD) |

#### Endpoints T2

```
GET  /projects/:id/comments            → liste filtrée selon rôle appelant
POST /projects/:id/comments            → créer commentaire
PUT  /projects/:id/comments/:cid       → modifier (auteur uniquement)
DELETE /projects/:id/comments/:cid     → supprimer (auteur ou ESN_ADMIN)
POST /projects/:id/comments/:cid/resolve → résoudre un blocage (marque resolvedAt)
```

#### Logique de filtrage visibilité

```typescript
// Dans CommentsService.findAll(projectId, caller: User)
// EMPLOYEE → voit tout (pas de filtre) + peut voir ses commentaires privés
// ESN_ADMIN → visibility IN [EMPLOYEE_ESN, ALL]   (+ ConsentGuard)
// CLIENT    → visibility IN [EMPLOYEE_CLIENT, ALL]

// CreateCommentDto : visibility mandatory pour EMPLOYEE
// ESN_ADMIN ne peut créer que visibility = EMPLOYEE_ESN
// CLIENT ne peut créer que visibility = EMPLOYEE_CLIENT
```

#### Tests à écrire (TDD)

```typescript
// comments.service.spec.ts
describe('CommentsService', () => {
  describe('findAll', () => {
    it('should return ALL comments when caller is EMPLOYEE (project owner)')
    it('should return only EMPLOYEE_ESN + ALL when caller is ESN_ADMIN')
    it('should return only EMPLOYEE_CLIENT + ALL when caller is CLIENT')
    it('should include isBlocker status and resolvedAt on each comment')
  })

  describe('create', () => {
    it('should create EMPLOYEE_ESN comment with isBlocker=true')
    it('should create ALL visibility comment')
    it('should throw BadRequestException if ESN_ADMIN tries to set visibility=EMPLOYEE_CLIENT')
    it('should throw BadRequestException if CLIENT tries to set visibility=EMPLOYEE_ESN')
    it('should throw ForbiddenException if caller has no access to project')
    it('should write AuditLog COMMENT_CREATED if isBlocker=true')
  })

  describe('resolve', () => {
    it('should set resolvedAt and resolvedById on a blocker comment')
    it('should throw ConflictException if comment is not a blocker')
    it('should throw ForbiddenException if caller cannot resolve (visibility rules)')
  })

  describe('delete', () => {
    it('should allow author to delete own comment')
    it('should allow ESN_ADMIN to delete any comment on accessible project')
    it('should throw ForbiddenException for non-author non-admin')
  })
})
```

#### Message de commit

```
feat(projects): add comment system with tri-state visibility and blocker tracking

- CommentsService: CRUD with visibility filter at query level (not application)
- CommentVisibility enforcement: ESN_ADMIN→EMPLOYEE_ESN, CLIENT→EMPLOYEE_CLIENT
- Blocker resolution: resolvedAt + resolvedById, AuditLog on blocker create
- DELETE: author OR ESN_ADMIN (ConsentGuard on ESN routes)
```

---

### T3 — Validations et jalons

**Branche :** `feat/sprint-3/projects-module`
**Dépend de :** T1 (ProjectValidationRequest model)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/src/projects/validations.service.ts` | Créer |
| `apps/backend/src/projects/milestones.service.ts` | Créer |
| `apps/backend/src/projects/dto/create-validation.dto.ts` | Créer |
| `apps/backend/src/projects/dto/create-milestone.dto.ts` | Créer |
| `apps/backend/test/unit/projects/validations.service.spec.ts` | Créer (TDD) |
| `apps/backend/test/unit/projects/milestones.service.spec.ts` | Créer (TDD) |

#### Endpoints T3

```
GET  /projects/:id/validations             → liste des demandes de validation
POST /projects/:id/validations             → créer une demande (EMPLOYEE)
POST /projects/:id/validations/:vid/approve → approuver (targetRole seulement)
POST /projects/:id/validations/:vid/reject  → refuser avec commentaire obligatoire

GET  /projects/:id/milestones              → liste des jalons
POST /projects/:id/milestones              → créer un jalon (EMPLOYEE)
PUT  /projects/:id/milestones/:mid         → modifier (EMPLOYEE)
DELETE /projects/:id/milestones/:mid       → supprimer (EMPLOYEE, si PLANNED)
POST /projects/:id/milestones/:mid/complete → marquer DONE + validatedAt
```

#### Tests à écrire (TDD)

```typescript
// validations.service.spec.ts
describe('ValidationsService', () => {
  describe('create', () => {
    it('should create a validation request targeting CLIENT')
    it('should create a validation request targeting ESN_ADMIN')
    it('should throw ForbiddenException if caller is not EMPLOYEE')
    it('should throw ConflictException if project is CLOSED')
    it('should write AuditLog VALIDATION_REQUESTED')
  })

  describe('approve', () => {
    it('should approve and set resolvedAt when caller matches targetRole')
    it('should throw ForbiddenException if caller role != targetRole')
    it('should throw ForbiddenException if caller is not the mission-scoped target user')
    it('should throw ConflictException if request is not PENDING')
    it('should write AuditLog VALIDATION_APPROVED')
    it('should notify EMPLOYEE on approval')
  })

  describe('reject', () => {
    it('should reject with decisionComment and set resolvedAt')
    it('should throw BadRequestException if decisionComment is empty')
    it('should write AuditLog VALIDATION_REJECTED')
  })
})

// milestones.service.spec.ts
describe('MilestonesService', () => {
  describe('create', () => {
    it('should create PLANNED milestone with dueDate')
    it('should create milestone without dueDate (open-ended)')
    it('should throw ConflictException if project is CLOSED')
  })

  describe('complete', () => {
    it('should set status DONE and completedAt')
    it('should set validatedAt if optional param provided')
    it('should throw ConflictException if already DONE')
    it('should throw ConflictException if ARCHIVED')
  })

  describe('delete', () => {
    it('should delete a PLANNED milestone')
    it('should throw ConflictException if milestone is not PLANNED')
  })

  describe('getForProject', () => {
    it('should sort milestones by dueDate asc')
    it('should include computed isLate field (dueDate < today and not DONE)')
    it('should exclude ARCHIVED milestones by default')
    it('should include ARCHIVED milestones with includeArchived=true param')
  })
})
```

#### Message de commit

```
feat(projects): add validation requests and milestone tracking

- ValidationsService: create/approve/reject with mission-scoped role enforcement
- MilestonesService: CRUD with status lifecycle PLANNED→IN_PROGRESS→DONE
- Approve/reject guards: targetRole checked against mission.clientId/esnAdminId
- AuditLog on every validation state change
- Notifications on approval/rejection
```

---

### T4 — Escalade automatique (cron daily)

**Branche :** `feat/sprint-3/projects-module`
**Dépend de :** T1 (WeatherEntry), T3 (Milestones)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/backend/package.json` | Ajouter `@nestjs/schedule` + `@types/cron` |
| `apps/backend/src/projects/schedulers/daily-project.scheduler.ts` | Créer |
| `apps/backend/src/projects/schedulers/weather-escalade.service.ts` | Créer |
| `apps/backend/src/projects/schedulers/milestone-late.service.ts` | Créer |
| `apps/backend/src/app.module.ts` | Ajouter `ScheduleModule.forRoot()` |
| `apps/backend/test/unit/projects/weather-escalade.service.spec.ts` | Créer (TDD) |
| `apps/backend/test/unit/projects/milestone-late.service.spec.ts` | Créer (TDD) |

#### Architecture cron

```typescript
// daily-project.scheduler.ts
@Injectable()
export class DailyProjectScheduler {
  constructor(
    private readonly weatherEscaladeService: WeatherEscaladeService,
    private readonly milestoneLateService: MilestoneLateService,
  ) {}

  @Cron('0 8 * * *', { name: 'daily-project-checks', timeZone: 'Europe/Paris' })
  async runDailyChecks() {
    await this.weatherEscaladeService.checkAll();
    await this.milestoneLateService.checkAll();
  }
}
```

#### Tests à écrire (TDD)

```typescript
// weather-escalade.service.spec.ts
describe('WeatherEscaladeService', () => {
  describe('checkAll', () => {
    it('should create STORM entry when RAINY for 3+ working days without update')
    it('should NOT escalate when RAINY for only 2 working days')
    it('should NOT escalate when a newer WeatherEntry (any state) exists after RAINY')
    it('should NOT escalate when entry is already isEscalated=true')
    it('should pause escalade when employee has LEAVE entries covering the working days')
    it('should send notification to ESN_ADMIN of the mission')
    it('should skip PAUSED and CLOSED projects')
    it('should use PublicHoliday table when counting working days')
  })
})

// milestone-late.service.spec.ts
describe('MilestoneLateService', () => {
  describe('checkAll', () => {
    it('should set status LATE for overdue PLANNED milestones')
    it('should set status LATE for overdue IN_PROGRESS milestones')
    it('should NOT set LATE for milestones with no dueDate')
    it('should NOT set LATE for already DONE milestones')
    it('should NOT set LATE for ARCHIVED milestones')
    it('should create CLOUDY WeatherEntry when last weather is SUNNY')
    it('should NOT downgrade weather when last entry is RAINY or worse')
    it('should notify EMPLOYEE and ESN_ADMIN')
    it('should skip milestones on CLOSED projects')
  })
})
```

#### Message de commit

```
feat(projects): add daily scheduler for weather escalation and milestone late detection

- @nestjs/schedule: ScheduleModule registered in AppModule
- WeatherEscaladeService: RAINY→STORM after 3 working days, leave-aware
- MilestoneLateService: overdue detection + CLOUDY floor + notifications
- DailyProjectScheduler: runs both checks at 08:00 Europe/Paris
- Both services independently testable (no cron dependency in unit tests)
```

---

### T5 — Intégration CRA ↔ Projets

**Branche :** `feat/sprint-3/projects-module`
**Dépend de :** T1 (ProjectEntry schema déjà prêt depuis Sprint 2)

#### Contexte
Le lien `CraEntry → ProjectEntry` existe dans le schéma (Sprint 2) mais les endpoints CRA ne le remplissent pas encore. Sprint 3 complète le circuit.

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `packages/shared-types/src/api.ts` | Étendre `CreateCraEntryDto` : ajouter `projects?: { projectId: string; portion: PortionType }[]` |
| `apps/backend/src/cra/cra.service.ts` | Modifier `createEntry()` et `updateEntry()` : créer/mettre à jour ProjectEntry |
| `apps/backend/src/cra/dto/create-cra-entry.dto.ts` | Ajouter `projects?: ProjectLinkDto[]` (optionnel) |
| `apps/backend/src/cra/cra.controller.ts` | Ajouter `GET /cra/months/:id/entries/:eid/projects` |
| `apps/backend/test/unit/cra/cra.service.spec.ts` | Étendre : tests liaison ProjectEntry |

#### Règles de liaison

```
- CraEntry avec type WORK_* → peut référencer 0-N projets
- CraEntry avec type LEAVE_*/SICK/HOLIDAY → projects doit être vide ou absent
- Un projet ne peut être lié qu'à une seule CraEntry par jour (unique par [craEntryId, projectId])
- portion: FULL | HALF_AM | HALF_PM — validation : si 2 projets sur même jour, portions doivent être complémentaires (HALF_AM + HALF_PM)
- À la suppression d'une CraEntry : ProjectEntry.craEntryId → SetNull (conserve l'historique projet)
```

#### Endpoints T5

```
GET  /cra/months/:id/entries/:eid/projects     → projets liés à cette entrée
POST /cra/months/:id/entries/:eid/projects     → lier un projet
DELETE /cra/months/:id/entries/:eid/projects/:pid → délier un projet
```

#### Tests à écrire

```typescript
// cra.service.spec.ts (extensions)
describe('CraService — ProjectEntry linking', () => {
  it('should create ProjectEntry when projects array provided on createEntry')
  it('should create 2 ProjectEntries with HALF_AM + HALF_PM portions on same day')
  it('should throw BadRequestException if projects provided on LEAVE_CP entry')
  it('should throw BadRequestException if two projects both have FULL portion on same day')
  it('should throw NotFoundException if projectId does not exist or not accessible')
  it('should update ProjectEntries on updateEntry with new projects array')
  it('should preserve ProjectEntry.craEntryId=null when CraEntry deleted')
})
```

#### Message de commit

```
feat(cra): wire CRA entries to project entries (ProjectEntry linking)

- CreateCraEntryDto: optional projects array with portion validation
- CraService.createEntry: creates ProjectEntry records in same transaction
- CraService.updateEntry: diffs old/new project links (delete removed, create added)
- Portion validation: FULL=exclusive, HALF_AM+HALF_PM=complementary pair
- GET /cra/months/:id/entries/:eid/projects endpoint
```

---

### T6 — Interface météo + commentaires (Frontend)

**Branche :** `feat/sprint-3/projects-module`
**Dépend de :** T1, T2 (API disponibles)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/frontend/src/app/(dashboard)/projects/page.tsx` | Créer — liste des projets avec météo dominante |
| `apps/frontend/src/app/(dashboard)/projects/[id]/page.tsx` | Créer — détail projet |
| `apps/frontend/src/components/projects/WeatherIcon.tsx` | Créer — icône + couleur par WeatherState |
| `apps/frontend/src/components/projects/WeatherCalendar.tsx` | Créer — grille mensuelle météo |
| `apps/frontend/src/components/projects/WeatherEntryForm.tsx` | Créer — formulaire saisie météo |
| `apps/frontend/src/components/projects/ProjectComments.tsx` | Créer — liste + formulaire commentaires |
| `apps/frontend/src/components/projects/CommentCard.tsx` | Créer — carte commentaire avec badge visibilité |
| `apps/frontend/src/components/projects/ProjectStatusBadge.tsx` | Créer — badge ACTIVE/PAUSED/CLOSED |
| `apps/frontend/src/lib/api/projects.ts` | Créer — wrapper apiClient pour routes projets |
| `apps/frontend/src/components/projects/WeatherIcon.spec.tsx` | Créer (TDD) |
| `apps/frontend/src/components/projects/WeatherCalendar.spec.tsx` | Créer (TDD) |
| `apps/frontend/src/lib/api/projects.spec.ts` | Créer (TDD) |

#### WeatherIcon — 6 états

```typescript
const WEATHER_CONFIG: Record<WeatherState, { icon: string; color: string; label: string }> = {
  SUNNY:              { icon: '☀️',  color: 'text-yellow-500', label: 'Ensoleillé' },
  CLOUDY:             { icon: '⛅',  color: 'text-gray-400',   label: 'Nuageux' },
  RAINY:              { icon: '🌧️',  color: 'text-blue-500',   label: 'Pluvieux' },
  STORM:              { icon: '⛈️',  color: 'text-red-600',    label: 'Orageux' },
  VALIDATION_PENDING: { icon: '⏳',  color: 'text-orange-500', label: 'Validation en attente' },
  VALIDATED:          { icon: '✅',  color: 'text-green-500',  label: 'Validé' },
};
```

#### Tests à écrire (TDD)

```typescript
// WeatherIcon.spec.tsx
describe('WeatherIcon', () => {
  it('should render sun icon for SUNNY state')
  it('should render storm icon for STORM state')
  it('should apply red color class for STORM')
  it('should apply yellow color class for SUNNY')
  it('should render all 6 weather states without error')
  it('should show label text when showLabel=true')
  it('should not show label when showLabel=false (default)')
})

// WeatherCalendar.spec.tsx
describe('WeatherCalendar', () => {
  it('should render correct number of days for the month')
  it('should show WeatherIcon for days with entries')
  it('should show empty cell for days without entry')
  it('should mark escalated entries with a visual indicator')
  it('should call onDayClick with correct date when day clicked')
  it('should disable click when isReadOnly=true')
  it('should grey out weekend days')
})
```

#### Message de commit

```
feat(projects): add weather calendar UI and comments interface

- WeatherIcon: 6 states with semantic icons and colors
- WeatherCalendar: monthly grid analogous to CRA MonthGrid
- WeatherEntryForm: state select + mandatory comment on degradation
- ProjectComments: visibility-aware list with blocker badges
- CommentCard: visibility badge (ESN-only, Client-only, All)
- projectsApi: typed wrapper for all project endpoints
```

---

### T7 — Interface validations + jalons (Frontend)

**Branche :** `feat/sprint-3/projects-module`
**Dépend de :** T3, T6 (composants de base)

#### Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `apps/frontend/src/components/projects/MilestoneTimeline.tsx` | Créer — axe temporel des jalons |
| `apps/frontend/src/components/projects/MilestoneCard.tsx` | Créer — carte jalon avec badge statut |
| `apps/frontend/src/components/projects/ValidationRequestPanel.tsx` | Créer — liste + actions selon rôle |
| `apps/frontend/src/components/projects/ProjectProgressBar.tsx` | Créer — % d'avancement (jalons DONE/total) |
| `apps/frontend/src/components/projects/MilestoneTimeline.spec.tsx` | Créer (TDD) |
| `apps/frontend/src/components/projects/MilestoneCard.spec.tsx` | Créer (TDD) |

#### MilestoneTimeline

```
Affichage :
- Axe horizontal avec marqueurs de jalons (trié par dueDate)
- Badges colorés : PLANNED(gris) | IN_PROGRESS(bleu) | DONE(vert) | LATE(rouge) | ARCHIVED(barré)
- "En retard de N jours" affiché en rouge pour LATE
- Bouton "Marquer terminé" pour EMPLOYEE sur jalons PLANNED/IN_PROGRESS
- Barre de progression : X jalons terminés / Y total
```

#### Tests à écrire (TDD)

```typescript
// MilestoneTimeline.spec.tsx
describe('MilestoneTimeline', () => {
  it('should render milestones sorted by dueDate ascending')
  it('should apply red class to LATE milestone cards')
  it('should apply green class to DONE milestone cards')
  it('should show progress bar at correct percentage')
  it('should show "N jours de retard" for LATE milestones with dueDate set')
  it('should hide ARCHIVED milestones by default')
  it('should call onComplete callback with milestone id')
})

// MilestoneCard.spec.tsx
describe('MilestoneCard', () => {
  it('should render title and dueDate')
  it('should show "Terminer" button only for EMPLOYEE role on non-DONE milestones')
  it('should not show action button for CLIENT role')
  it('should show validatedAt when milestone is DONE and has validatedAt')
})
```

#### Message de commit

```
feat(projects): add milestone timeline and validation request UI

- MilestoneTimeline: sorted milestones with LATE indicators and progress bar
- MilestoneCard: status badge + complete action (role-aware)
- ValidationRequestPanel: create/approve/reject with role-aware action buttons
- ProjectProgressBar: percentage based on DONE milestones
```

---

### T8 — PR Sprint 3

**Branche :** `feat/sprint-3/projects-module`

#### Checklist avant PR

```
[ ] pnpm --filter backend test       → tous les tests unitaires verts
[ ] pnpm --filter backend test:e2e   → e2e workflow verts
[ ] pnpm --filter frontend test      → tests frontend verts
[ ] pnpm typecheck                   → 0 erreur TypeScript
[ ] pnpm lint                        → 0 erreur ESLint
[ ] pnpm db:migrate                  → migration Sprint 3 appliquée proprement
[ ] pnpm db:seed                     → seed avec projets + météo + jalons OK
[ ] Cron testé manuellement (invoquer checkAll() depuis un endpoint de debug temporaire)
[ ] Visibilité commentaires testée pour les 3 rôles
[ ] Workflow complet : créer projet → saisir météo → milestone LATE → escalade STORM → validation
```

#### Corps de la PR

```
## Sprint 3 — Module Projets complet

### Périmètre
Ce PR couvre le module Projets : CRUD projets, météo journalière avec escalade
automatique, commentaires à visibilité tri-state, validations tripartites, jalons.

### Migration Prisma Sprint 3
- Nouveau enum WeatherState (6 valeurs) remplace WeatherStatus (3 valeurs)
- Nouveau enum ProjectStatus, CommentVisibility, MilestoneStatus
- ValidationStatus : ajout ARCHIVED
- Project : status + closedAt + estimatedDays (remplace isActive)
- WeatherEntry : state (remplace status), isEscalated, escalatedAt
- ProjectComment : visibility + isBlocker + resolvedAt (remplace isPrivate)
- Milestone : status + validatedAt
- Nouveau modèle ProjectValidationRequest + junction ProjectValidationDocument

### Backend NestJS
- ProjectsModule : CRUD + lifecycle ACTIVE/PAUSED/CLOSED
- WeatherService : CRUD entrées météo, résumé mensuel
- CommentsService : visibilité filtrée à la requête selon rôle
- ValidationsService : approuver/refuser mission-scoped
- MilestonesService : CRUD + completion
- DailyProjectScheduler (@nestjs/schedule) : escalade météo + jalons LATE à 08:00
- Intégration CRA↔Projets : ProjectEntry linked via CraEntry

### Frontend
- WeatherCalendar : grille mensuelle (analogue MonthGrid)
- WeatherIcon : 6 états avec icônes et couleurs sémantiques
- ProjectComments : visibilité-aware + badges blocage
- MilestoneTimeline : axe temporel avec indicateurs LATE
- ValidationRequestPanel : actions selon rôle

### Tests
- N tests unitaires backend (ProjectsService, WeatherService, CommentsService,
  ValidationsService, MilestonesService, WeatherEscaladeService, MilestoneLateService)
- N tests unitaires frontend (WeatherIcon, WeatherCalendar, MilestoneTimeline)
- N tests e2e backend (CRUD projets, workflow météo, escalade, validations)
```

#### Message de commit du tag PR

```
feat(sprint-3): complete Projects module — weather, comments, milestones, escalation
```

---

## Graphe de dépendances inter-tâches

```
T1 (Projects CRUD + Weather schema + migration)
├── T2 (Commentaires)           ← dépend T1 (ProjectComment schema)
├── T3 (Validations + Jalons)   ← dépend T1 (ProjectValidationRequest schema)
├── T4 (Cron escalade)          ← dépend T1 (WeatherState) + T3 (MilestoneStatus)
└── T5 (CRA↔Projets)            ← dépend T1 (ProjectEntry déjà en place, extend CraService)
     └── T6 (Frontend météo)    ← dépend T1 + T2 (API disponibles)
          └── T7 (Frontend jalons) ← dépend T3 + T6
               └── T8 (PR)
```

**Parallélisations possibles (après T1 terminé) :**
- T2 + T3 + T4 + T5 peuvent avancer **en parallèle**
- T6 peut commencer dès T1 + T2 terminés
- T7 peut commencer dès T3 + T6 terminés

---

## Décisions d'architecture Sprint 3

| Décision | Choix | Raison |
|---|---|---|
| Escalade météo | Cron `@nestjs/schedule` daily 08:00 | Simple, sans Redis ; Bull reporté Phase 2 |
| Pause escalade congés | Soustraire jours LEAVE/SICK du compteur | Évite STORM injuste si salarié absent |
| WeatherState | 6 valeurs ordonnées (spec complète) | Remplace WeatherStatus 3 valeurs qui ne correspondait pas à la spec |
| CommentVisibility | Enum tri-state (remplace `isPrivate`) | `isPrivate` ne distingue pas ESN vs Client |
| ValidationRequest projets | Modèle séparé `ProjectValidationRequest` | Couplage différent (projet vs mois CRA), champs différents |
| Approval scoping | Mission-scoped (clientId/esnAdminId) | "N'importe qui du rôle" serait une faille RBAC |
| Projet CLOSED | Archive dans transaction | Cohérence atomique, pas de validations orphelines en PENDING |
| MilestoneLate floor météo | CLOUDY minimum (pas STORM) | Gradation progressive ; STORM reste réservé à l'escalade météo explicite |
| `completedAt` vs `validatedAt` | Conserver les deux | `completedAt` = terminé par l'employé ; `validatedAt` = validé par le client |

---

✅ Plan Sprint 3 documenté. En attente de validation avant P6.
