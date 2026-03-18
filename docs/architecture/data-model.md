# Modèle de données — ESN CRA App v1.0

Schéma Prisma 5 — PostgreSQL 15 + extension pgvector.
Convention : `snake_case` en base, `camelCase` en TypeScript (via `@map` / `@@map`).

---

## Enums

| Enum                  | Valeurs                                                                                 | Usage                                   |
|-----------------------|-----------------------------------------------------------------------------------------|-----------------------------------------|
| `Role`                | `EMPLOYEE` · `ESN_ADMIN` · `CLIENT`                                                     | RBAC — rôle utilisateur                 |
| `CraStatus`           | `DRAFT` → `SUBMITTED` → `SIGNED_EMPLOYEE` → `SIGNED_ESN` → `SIGNED_CLIENT` → `LOCKED`  | Workflow de signature tripartite        |
| `CraEntryType`        | `WORK_ONSITE` · `WORK_REMOTE` · `WORK_TRAVEL` · `LEAVE_CP` · `LEAVE_RTT` · `SICK` · `HOLIDAY` · `TRAINING` · `ASTREINTE` · `OVERTIME` | Type de journée CRA |
| `PortionType`         | `FULL` · `HALF_AM` · `HALF_PM`                                                          | Fraction de journée sur un projet       |
| `WeatherState`        | `SUNNY` · `CLOUDY` · `RAINY` · `STORM` · `VALIDATION_PENDING` · `VALIDATED`            | État projet (météo à 6 niveaux)         |
| `ProjectStatus`       | `ACTIVE` · `PAUSED` · `CLOSED`                                                          | Statut du projet                        |
| `CommentVisibility`   | `EMPLOYEE_ESN` · `EMPLOYEE_CLIENT` · `ALL`                                              | Visibilité granulaire des commentaires  |
| `MilestoneStatus`     | `PLANNED` · `IN_PROGRESS` · `DONE` · `LATE` · `ARCHIVED`                               | Avancement des jalons                   |
| `LeaveType`           | `PAID_LEAVE` · `RTT` · `SICK_LEAVE` · `OTHER`                                          | Type de solde de congé                  |
| `DocumentType`        | `CRA_PDF` · `CONTRACT` · `AMENDMENT` · `MISSION_ORDER` · `OTHER`                       | Catégorie de document                   |
| `ConsentStatus`       | `PENDING` · `GRANTED` · `REVOKED`                                                       | État du consentement salarié → ESN      |
| `ValidationStatus`    | `PENDING` · `APPROVED` · `REJECTED` · `ARCHIVED`                                       | Résultat d'une demande de validation    |
| `NotificationChannel` | `EMAIL` · `IN_APP`                                                                      | Canal d'envoi des notifications         |

---

## Modèles

### `User` (table `users`)

Acteur central — salarié, admin ESN ou client. Soft-delete via `deletedAt`.

```
id          UUID PK
email       String UNIQUE
password    String (bcrypt)
firstName   String
lastName    String
role        Role (EMPLOYEE | ESN_ADMIN | CLIENT)
phone       String?
avatarUrl   String?
privateNotes String?   -- notes visibles salarié uniquement
deletedAt   DateTime?  -- soft delete
createdAt / updatedAt
```

Relations clés :
- `missions[]` (en tant que salarié, admin ESN, ou client) — 3 relations nommées
- `craMonths[]`, `leaveBalances[]`, `projectEntries[]`
- `employeeConsents[]` / `requestedConsents[]` — consentements bi-directionnels
- `embeddings[]` — vecteurs RAG isolés par salarié

---

### `Mission` (table `missions`)

Contrat de prestation liant un salarié, un admin ESN et optionnellement un client.

```
id          UUID PK
title       String
description String?
startDate   DateTime
endDate     DateTime?
dailyRate   Decimal(10,2)?
isActive    Boolean (default: true)
employeeId  FK → User (salarié)
esnAdminId  FK → User (admin ESN, nullable)
clientId    FK → User (client, nullable)
```

Une mission regroupe des `Project[]`, `CraMonth[]`, `Document[]`.

---

### `CraMonth` (table `cra_months`)

CRA mensuel d'un salarié sur une mission. Contrainte unique `(employeeId, missionId, year, month)`.

```
id          UUID PK
year        Int
month       Int (1-12)
status      CraStatus (DRAFT par défaut)
pdfUrl      String?        -- URL S3 du PDF généré
submittedAt / lockedAt / signedBy*At  -- horodatages du workflow
rejectionComment String?
employeeId  FK → User
missionId   FK → Mission
```

Contient `CraEntry[]` (jours individuels) et `ValidationRequest[]`.

---

### `CraEntry` (table `cra_entries`)

Une ligne CRA = une journée (ou demi-journée). Contrainte unique `(craMonthId, date)`.

```
id          UUID PK
date        Date
dayFraction Decimal(3,2)  -- 0.5 ou 1.0
entryType   CraEntryType
comment     String?
craMonthId  FK → CraMonth (CASCADE)
```

Liée à `ProjectEntry[]` pour la ventilation par projet.

---

### `LeaveBalance` (table `leave_balances`)

Solde de congés par salarié, par année et par type. Contrainte unique `(userId, year, leaveType)`.

```
id        UUID PK
year      Int
leaveType LeaveType
totalDays Decimal(6,2)
usedDays  Decimal(6,2)
userId    FK → User
```

---

### `PublicHoliday` (table `public_holidays`)

Référentiel des jours fériés. Contrainte unique `(date, country)`.

```
id      UUID PK
date    Date
name    String
country String (défaut: "FR")
```

---

### `Project` (table `projects`)

Projet client rattaché à une mission. Porte la météo et les jalons.

```
id            UUID PK
name          String
description   String?
startDate     DateTime
endDate       DateTime?
estimatedDays Int?
status        ProjectStatus (ACTIVE | PAUSED | CLOSED)
closedAt      DateTime?
missionId     FK → Mission
```

Contient `WeatherEntry[]`, `ProjectComment[]`, `Milestone[]`, `ProjectEntry[]`, `ProjectValidationRequest[]`.

---

### `ProjectEntry` (table `project_entries`)

Ventilation d'une journée CRA sur un projet (portion AM / PM / journée entière).

```
id          UUID PK
date        Date
portion     PortionType? (FULL | HALF_AM | HALF_PM)
hoursSpent  Decimal(5,2)?
description String?
projectId   FK → Project (CASCADE)
employeeId  FK → User
craEntryId  FK → CraEntry (SetNull)
```

---

### `WeatherEntry` (table `weather_entries`)

Saisie de météo projet à une date donnée.

```
id          UUID PK
date        Date
state       WeatherState
comment     String?
isEscalated Boolean (défaut: false)  -- escalade automatique RAINY → STORM
escalatedAt DateTime?
projectId   FK → Project (CASCADE)
reportedById FK → User
```

---

### `ProjectComment` (table `project_comments`)

Commentaire sur un projet avec visibilité granulaire. Peut être marqué comme bloquant.

```
id          UUID PK
content     String
visibility  CommentVisibility (ALL par défaut)
isBlocker   Boolean (défaut: false)
resolvedAt  DateTime?
projectId   FK → Project (CASCADE)
authorId    FK → User
resolvedById FK → User? (BlockerResolver)
```

---

### `Milestone` (table `milestones`)

Jalon de projet. Marqué `LATE` automatiquement par le scheduler si `dueDate` dépassée.

```
id          UUID PK
title       String
description String?
dueDate     DateTime?
status      MilestoneStatus (PLANNED par défaut)
completedAt / validatedAt DateTime?
projectId   FK → Project (CASCADE)
createdById FK → User
```

---

### `ValidationRequest` (table `validation_requests`)

Demande de validation du CRA par le client.

```
id          UUID PK
status      ValidationStatus (PENDING | APPROVED | REJECTED | ARCHIVED)
comment     String?
requestedAt DateTime
resolvedAt  DateTime?
craMonthId  FK → CraMonth (CASCADE)
validatorId FK → User (client)
```

---

### `ProjectValidationRequest` (table `project_validation_requests`)

Demande de validation formelle sur un projet (ex. passage RAINY → VALIDATION_PENDING).

```
id              UUID PK
title           String
description     String
targetRole      Role (qui doit valider)
status          ValidationStatus
decisionComment String?
projectId       FK → Project (CASCADE)
requestedById   FK → User
resolverId      FK → User?
```

Pièces jointes via `ProjectValidationDocument[]`.

---

### `Document` (table `documents`)

Fichier stocké en S3/MinIO. Appartient à un salarié (ownerId).

```
id        UUID PK
name      String
type      DocumentType
s3Key     String      -- chemin S3
mimeType  String
sizeBytes Int
ownerId   FK → User
missionId FK → Mission?
```

Versions via `DocumentVersion[]`, partages via `DocumentShare[]`.

---

### `DocumentVersion` (table `document_versions`)

Versioning d'un document. Contrainte unique `(documentId, version)`.

```
id           UUID PK
version      Int
s3Key        String
sizeBytes    Int
documentId   FK → Document (CASCADE)
uploadedById FK → User?
```

---

### `DocumentShare` (table `document_shares`)

Partage de document : par lien token ou vers un utilisateur spécifique.

```
id           UUID PK
shareToken   String? UNIQUE  -- pour partage par lien
expiresAt    DateTime?
accessedAt   DateTime?
revokedAt    DateTime?
documentId   FK → Document (CASCADE)
sharedWithId FK → User?      -- pour partage nominal
```

---

### `Consent` (table `consents`)

Consentement d'un salarié accordé à un admin ESN pour accéder à ses données.
Contrainte unique `(employeeId, requestedById)` — un seul consentement actif par paire.

```
id            UUID PK
status        ConsentStatus (PENDING | GRANTED | REVOKED)
scope         String[]  -- ex: ["cra", "projects", "documents"]
grantedAt / revokedAt / expiresAt DateTime?
employeeId    FK → User (salarié)
requestedById FK → User (admin ESN)
```

---

### `AuditLog` (table `audit_logs`)

Trail d'audit immuable. Indexé sur `(initiatorId, createdAt)` et `(resource, createdAt)`.

```
id          UUID PK
action      String   -- ex: "CONSENT_ACCESS", "CRA_LOCKED", "DOCUMENT_SHARED"
resource    String   -- ex: "cra_month:uuid"
metadata    Json?    -- contexte additionnel
ipAddress   String?
userAgent   String?
initiatorId FK → User
createdAt   DateTime (index)
```

---

### `Notification` (table `notifications`)

Notification in-app ou email. Indexé sur `(userId, isRead)`.

```
id      UUID PK
channel NotificationChannel (EMAIL | IN_APP)
subject String
body    String
isRead  Boolean (défaut: false)
sentAt / readAt DateTime?
userId  FK → User (CASCADE)
```

---

### `DashboardShare` (table `dashboard_shares`)

Lien de partage temporaire du dashboard salarié (TTL max 168h).

```
id          UUID PK
token       String UNIQUE (uuid auto-généré)
expiresAt   DateTime
revokedAt   DateTime?
accessCount Int (défaut: 0)
ownerId     FK → User (CASCADE)
```

---

### `Embedding` (table `embeddings`)

Vecteurs pgvector pour le RAG. Isolés par salarié (`employeeId`).
Contrainte unique `(employeeId, sourceType, sourceId)`.

```
id         UUID PK
content    String           -- chunk de texte indexé
vector     vector(1536)     -- embedding OpenAI text-embedding-3-small
metadata   Json?
sourceType String           -- 'cra_entry' | 'cra_month' | 'project_comment' | 'weather_entry' | 'milestone' | 'document'
sourceId   String           -- UUID de l'entité source
employeeId FK → User (CASCADE)
documentId FK → Document?   -- si source = document
```

---

## Diagramme simplifié

```
User ──────────── Mission ──────────── Project
  │                  │                    │
  ├── CraMonth ───── ┘             WeatherEntry
  │     └── CraEntry               ProjectComment
  │           └── ProjectEntry ────┘
  │                                Milestone
  ├── LeaveBalance             ValidationRequest
  ├── Consent
  ├── Document ─── DocumentVersion
  │                DocumentShare
  ├── Notification
  ├── DashboardShare
  ├── AuditLog
  └── Embedding (pgvector)
```
