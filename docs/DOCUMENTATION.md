# Documentation technique — ESN CRA App

> Guide de référence complet pour développeurs.
> Version : preprod-1.0.0 — mise à jour : 2026-03-31

---

## Table des matières

1. [Description générale](#1-description-générale)
2. [Architecture technique](#2-architecture-technique)
3. [Modèle de données](#3-modèle-de-données)
4. [Système d'autorisation](#4-système-dautorisation)
5. [Flux applicatifs](#5-flux-applicatifs)
6. [Description des fonctionnalités](#6-description-des-fonctionnalités)
7. [Sécurité](#7-sécurité)
8. [Guide de développement](#8-guide-de-développement)
9. [Tests](#9-tests)
10. [Déploiement](#10-déploiement)
11. [Glossaire](#11-glossaire)

---

## 1. Description générale

### Pitch

**ESN CRA App** est une plateforme SaaS de gestion de Comptes Rendus d'Activité (CRA) pour les Entreprises de Services du Numérique (ESN). Elle couvre la saisie des activités journalières, la gestion des projets clients, la signature électronique tripartite des CRA, et la génération de rapports PDF.

### Problème résolu

Dans une ESN classique, la gestion des CRA est fragmentée : fichiers Excel, emails pour les signatures, absence de traçabilité. L'ESN CRA App centralise tout en imposant un modèle **consentement-first** : le salarié reste propriétaire de ses données et contrôle explicitement qui y a accès.

### Public cible

| Acteur | Rôle dans l'app |
|--------|----------------|
| **Salarié (EMPLOYEE)** | Saisit ses CRA, gère ses projets et documents, donne son consentement |
| **Admin ESN (ESN_ADMIN)** | Supervise les salariés (avec consentement), valide les CRA, crée les comptes |
| **Client (CLIENT)** | Valide les CRA, consulte la météo projet (lecture seule) |
| **Admin plateforme (PLATFORM_ADMIN)** | Crée les comptes ESN_ADMIN, supervise la plateforme |

### Version actuelle et roadmap

**Phase 1 — MVP (déployé)**
- Module auth (RBAC, JWT)
- Module CRA (saisie, PDF, signature tripartite)
- Module projets (météo, commentaires, jalons, validations)
- Module documents (S3, versioning, partage)
- Module rapports (bilan mensuel, dashboard partageable)
- Module RAG (assistant IA pgvector)
- Module notifications (email + in-app)

**Phase 2 — Roadmap**
- CRUD utilisateurs et missions via l'interface (actuellement : en DB directement)
- Blocage de compte (`deletedAt` présent, non exposé)
- Multi-missions simultanées pour un même salarié
- Backoffice ESN consolidé
- 2FA optionnel

---

## 2. Architecture technique

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet / Coolify HTTPS                 │
└────────────────────┬──────────────────────┬─────────────────────┘
                     │                      │
          ┌──────────▼──────────┐  ┌────────▼────────────┐
          │  Frontend :3100     │  │  Backend :3001       │
          │  Next.js 14         │  │  NestJS 10           │
          │  App Router         │  │  REST API + SSE      │
          │  NextAuth.js v5     │  │  Prisma 5            │
          │  Zustand / shadcn   │◄─┤  JWT + RBAC          │
          └─────────────────────┘  └──────────┬───────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
         ┌──────────▼──────────┐   ┌──────────▼──────────┐  ┌──────▼──────┐
         │  PostgreSQL 15      │   │  Redis 7             │  │  MinIO / S3 │
         │  + pgvector         │   │  (Bull queues)       │  │  Fichiers   │
         │  Données + vecteurs │   │  (cache)             │  │  PDF / docs │
         └─────────────────────┘   └─────────────────────┘  └─────────────┘
```

### Packages partagés (monorepo Turborepo)

```
packages/
├── shared-types/      Enums, interfaces, DTOs partagés backend ↔ frontend
├── shared-utils/      Utilitaires communs (placeholder Phase 2)
├── pdf-generator/     Puppeteer HTML→PDF (CRA, rapports mensuels)
└── rag-engine/        LangChain.js : chunker + embedder OpenAI
```

### Flux de communication

| Canal | Usage |
|-------|-------|
| **REST (HTTPS/JSON)** | Toutes les opérations CRUD |
| **SSE (Server-Sent Events)** | Streaming des réponses RAG (Claude API) |
| **S3 (presigned URL)** | Upload et téléchargement de fichiers |
| **SMTP** | Emails de notification et de validation |
| **PostgreSQL** | Données relationnelles + vecteurs pgvector |

### Stack par couche

| Couche | Technologie |
|--------|-------------|
| Backend | NestJS 10, TypeScript 5 strict |
| ORM | Prisma 5, PostgreSQL 15 |
| Vecteurs | pgvector (extension PostgreSQL) |
| Frontend | Next.js 14 App Router, TypeScript 5 |
| Auth | NextAuth.js v5, JWT, RBAC |
| UI | Tailwind CSS 3, shadcn/ui |
| Fichiers | MinIO (dev) / S3-compatible (prod) |
| RAG | LangChain.js, OpenAI text-embedding-3-small, Claude API |
| PDF | Puppeteer (render) + pdf-lib (merge) |
| Queues | Bull + Redis |
| Tests | Vitest (unit) + Playwright (e2e) |
| Monorepo | Turborepo + pnpm workspaces |

---

## 3. Modèle de données

### Schéma relationnel

```
User ──────────────────────────────────────────────────────────────────────┐
 │  (employeeId)                                                            │
 ├──── Mission ──────────────────────────────────────────────────────────┐  │
 │         │  (missionId)                                                │  │
 │         ├──── CraMonth ──── CraEntry ──── ProjectEntry               │  │
 │         │         │             └──────────────────────┐             │  │
 │         │         └──── ValidationRequest              │             │  │
 │         │                                              │             │  │
 │         ├──── Project ──── WeatherEntry                │             │  │
 │         │         ├──── ProjectComment                 ▼             │  │
 │         │         ├──── Milestone               ProjectEntry         │  │
 │         │         └──── ProjectValidationRequest                     │  │
 │         │                                                             │  │
 │         └──── Document ──── DocumentVersion                          │  │
 │                    └──── DocumentShare                               │  │
 │                                                                       │  │
 ├──── Consent (employeeId ↔ requestedById)                              │  │
 ├──── AuditLog                                                          │  │
 ├──── Notification                                                      │  │
 ├──── DashboardShare                                                    │  │
 ├──── LeaveBalance                                                      │  │
 ├──── Embedding (pgvector) ─────────────────────────────────────────── │──┘
 └──── ReportValidationRequest                                          │
                                                                         │
 (esnAdminId / clientId) ─────────────────────────────────────────────── ┘
```

### Enums

| Enum | Valeurs |
|------|---------|
| `Role` | `PLATFORM_ADMIN`, `ESN_ADMIN`, `EMPLOYEE`, `CLIENT` |
| `CraStatus` | `DRAFT`, `SUBMITTED`, `SIGNED_EMPLOYEE`, `SIGNED_ESN`, `SIGNED_CLIENT`, `LOCKED` |
| `CraEntryType` | `WORK_ONSITE`, `WORK_REMOTE`, `WORK_TRAVEL`, `LEAVE_CP`, `LEAVE_RTT`, `SICK`, `HOLIDAY`, `TRAINING`, `ASTREINTE`, `OVERTIME` |
| `PortionType` | `FULL`, `HALF_AM`, `HALF_PM` |
| `WeatherState` | `SUNNY`, `CLOUDY`, `RAINY`, `STORM`, `VALIDATION_PENDING`, `VALIDATED` |
| `ProjectStatus` | `ACTIVE`, `PAUSED`, `CLOSED` |
| `CommentVisibility` | `EMPLOYEE_ESN`, `EMPLOYEE_CLIENT`, `ALL` |
| `MilestoneStatus` | `PLANNED`, `IN_PROGRESS`, `DONE`, `LATE`, `ARCHIVED` |
| `LeaveType` | `PAID_LEAVE`, `RTT`, `SICK_LEAVE`, `OTHER` |
| `DocumentType` | `CRA_PDF`, `CONTRACT`, `AMENDMENT`, `MISSION_ORDER`, `OTHER` |
| `ConsentStatus` | `PENDING`, `GRANTED`, `REVOKED` |
| `ValidationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `ARCHIVED` |
| `NotificationChannel` | `EMAIL`, `IN_APP` |

### Modèles principaux

#### User
```
id          UUID PK
email       String UNIQUE
password    String  — jamais exposé dans les réponses API
firstName   String
lastName    String
role        Role    — stocké en DB, inclus dans JWT
phone       String?
avatarUrl   String?
privateNotes String? — jamais exposé aux ESN_ADMIN/CLIENT
deletedAt   DateTime? — soft delete (Phase 2)
```

Relations principales :
- `missions[]` (3 types : employé, esnAdmin, client)
- `craMonths[]`, `leaveBalances[]`
- `ownedDocuments[]`, `employeeConsents[]`
- `embeddings[]` (vecteurs RAG, isolés par salarié)

#### Mission
```
id          UUID PK
title       String
startDate   DateTime
endDate     DateTime?
dailyRate   Decimal?  — TJM
isActive    Boolean
employeeId  FK → User (EMPLOYEE)
esnAdminId  FK → User? (ESN_ADMIN)
clientId    FK → User? (CLIENT)
```
Pivot central : lie un salarié à son ESN et à son client. Porte les CraMonth, Projects et Documents.

#### CraMonth
```
id          UUID PK
year        Int
month       Int (1-12)
status      CraStatus  — workflow de signature
pdfUrl      String?    — clé S3 du PDF généré
submittedAt, signedByEmployeeAt, signedByEsnAt, signedByClientAt, lockedAt  DateTime?
rejectionComment  String?
employeeId  FK → User
missionId   FK → Mission
UNIQUE (employeeId, missionId, year, month)
```

#### CraEntry
```
id          UUID PK
date        Date
dayFraction Decimal (0.5 ou 1.0)
entryType   CraEntryType
comment     String?
craMonthId  FK → CraMonth (CASCADE)
UNIQUE (craMonthId, date)
```

#### LeaveBalance
```
id          UUID PK
year        Int
leaveType   LeaveType
totalDays   Decimal
usedDays    Decimal
userId      FK → User
UNIQUE (userId, year, leaveType)
```

#### Project
```
id            UUID PK
name          String
startDate, endDate  DateTime
estimatedDays Int?
status        ProjectStatus
missionId     FK → Mission
```

Enfants : `WeatherEntry[]`, `ProjectComment[]`, `Milestone[]`, `ProjectValidationRequest[]`

#### WeatherEntry
```
id          UUID PK
date        Date
state       WeatherState
comment     String?    — obligatoire si dégradation
isEscalated Boolean    — true si escalade automatique
projectId   FK → Project (CASCADE)
reportedById FK → User
```

#### ProjectComment
```
id          UUID PK
content     String
visibility  CommentVisibility  — filtre côté service selon rôle appelant
isBlocker   Boolean
resolvedAt  DateTime?
projectId   FK → Project (CASCADE)
authorId    FK → User
resolvedById FK → User?
```

#### Consent (modèle consentement-first)
```
id            UUID PK
status        ConsentStatus  — PENDING → GRANTED ou REVOKED
scope         String[]       — ["cra", "projects", "documents"] (sous-ensemble)
grantedAt, revokedAt, expiresAt  DateTime?
employeeId    FK → User
requestedById FK → User (ESN_ADMIN)
UNIQUE (employeeId, requestedById)  — un seul consentement par paire
```

#### AuditLog
```
id          UUID PK
action      String   — ex : "CONSENT_ACCESS", "CRA_LOCKED"
resource    String   — ex : "cra_month:uuid"
metadata    JSON?    — contexte additionnel
ipAddress, userAgent  String?
initiatorId FK → User
INDEX (initiatorId, createdAt)
INDEX (resource, createdAt)
```

#### Embedding (RAG)
```
id          UUID PK
content     String   — chunk de texte (512 tokens max)
vector      vector(1536)  — format pgvector
sourceType  String   — 'cra_entry' | 'cra_month' | 'project_comment' | 'weather_entry' | 'milestone' | 'document'
sourceId    UUID
employeeId  FK → User  — isolation stricte : une requête RAG ne lit que ses propres vecteurs
UNIQUE (employeeId, sourceType, sourceId)
INDEX (employeeId)  — ivfflat vector_cosine_ops
```

#### DashboardShare
```
id          UUID PK
token       UUID UNIQUE  — non devinable
expiresAt   DateTime     — max 168h
revokedAt   DateTime?    — révocable par le salarié
accessCount Int          — compteur d'audit
ownerId     FK → User
```

#### ReportValidationRequest
```
id          CUID PK
employeeId  FK → User
year, month Int
reportType  String  — 'CRA_ONLY' | 'CRA_WITH_WEATHER'
recipient   String  — 'ESN' | 'CLIENT'
pdfS3Key    String
token       UUID UNIQUE
status      String  — 'PENDING' | 'VALIDATED' | 'REFUSED' | 'ARCHIVED'
expiresAt   DateTime
```

---

## 4. Système d'autorisation

### Vue d'ensemble RBAC + Consentement

L'application combine deux couches de contrôle :
1. **RBAC (Role-Based Access Control)** : chaque route déclare les rôles autorisés via `@Roles([...])`.
2. **Consentement** : les routes ESN_ADMIN accédant aux données d'un salarié passent par `ConsentGuard` qui vérifie un consentement `GRANTED` en base.

### Chaîne des guards (ordre d'application)

```
Requête HTTP
    │
    ▼
ThrottlerGuard        — rate limiting (RATE_LIMIT_TTL/MAX)
    │
    ▼
JwtAuthGuard          — valide signature + expiration JWT
    │                   @Public() bypass pour routes publiques
    ▼
RolesGuard            — vérifie user.role ∈ @Roles([...])
    │                   HTTP 403 si rôle insuffisant
    ▼
ConsentGuard          — @ConsentRequired : vérifie Consent.status = GRANTED
    │                   pour ESN_ADMIN accédant aux données salarié
    ▼
ResourceOwnerGuard    — @ResourceOwner : vérifie user.id === resource.ownerId
    │
    ▼
Controller Handler
```

### Matrice d'accès par module et par rôle

| Module / Action | EMPLOYEE | ESN_ADMIN | CLIENT | PLATFORM_ADMIN |
|----------------|----------|-----------|--------|----------------|
| Créer/modifier son CRA | ✅ | ❌ | ❌ | ❌ |
| Signer le CRA | ✅ | ✅ (avec consentement) | ✅ | ❌ |
| Voir les CRA d'un salarié | Son propre | Avec consentement | Avec accès mission | ❌ |
| Créer/modifier un projet | ✅ | ❌ | ❌ | ❌ |
| Voir la météo projet | ✅ | Avec consentement | Si partagé | ❌ |
| Uploader un document | ✅ | ❌ | ❌ | ❌ |
| Partager un document | ✅ | ❌ | ❌ | ❌ |
| Demander accès (consentement) | ❌ | ✅ | ❌ | ❌ |
| Valider une demande d'accès | ✅ | ❌ | ❌ | ❌ |
| Requête RAG | ✅ | ❌ | ❌ | ❌ |
| Créer des comptes employé/client | ❌ | ✅ | ❌ | ❌ |
| Créer des comptes ESN_ADMIN | ❌ | ❌ | ❌ | ✅ |
| Accéder à /platform/* | ❌ | ❌ | ❌ | ✅ |
| Accéder à /esn/* | ❌ | ✅ | ❌ | ❌ |
| Validation CRA ESN | ❌ | ✅ | ❌ | ❌ |

### ConsentGuard : principe et implémentation

**Principe** : un ESN_ADMIN ne peut accéder aux données d'un salarié que si ce dernier a accordé un consentement explicite (`Consent.status = GRANTED`) couvrant le scope demandé.

**Flux** :
1. L'ESN_ADMIN envoie `POST /consent/request { employeeId, scope: ["cra", "projects"] }`
2. Le salarié reçoit une notification et accepte via `PATCH /consent/:id/grant`
3. L'ESN_ADMIN peut maintenant accéder aux données — le `ConsentGuard` vérifie à chaque requête
4. Le salarié peut révoquer à tout moment via `PATCH /consent/:id/revoke` — accès coupé immédiatement

**Un seul consentement par paire** `(employeeId, requestedById)` grâce à la contrainte `UNIQUE`.

**Scope granulaire** : le consentement peut couvrir tout ou partie de `["cra", "projects", "documents"]`.

**Audit** : chaque accès ESN via `ConsentGuard` crée une entrée `AuditLog` avec action `CONSENT_ACCESS`.

### Flux de consentement complet

```
ESN_ADMIN                        EMPLOYEE
    │                                │
    │── POST /consent/request ───────►│
    │   { employeeId, scope }        │
    │                                │  Consent créé (PENDING)
    │                                │  Notification envoyée
    │                                │
    │                                │── PATCH /consent/:id/grant
    │                                │   Consent → GRANTED
    │                                │
    │── GET /cra/months/:id ─────────►│
    │   (ConsentGuard passe ✅)      │
    │   AuditLog: CONSENT_ACCESS     │
    │◄─ 200 données CRA ─────────────│
    │                                │
    │                                │── PATCH /consent/:id/revoke
    │                                │   Consent → REVOKED
    │                                │
    │── GET /cra/months/:id ─────────►│
    │   (ConsentGuard bloque ❌)     │
    │◄─ 403 Forbidden ───────────────│
```

### Visibilité des commentaires projet

| `CommentVisibility` | Visible par |
|---------------------|-------------|
| `EMPLOYEE_ESN` | Salarié + ESN_ADMIN (avec consentement) |
| `EMPLOYEE_CLIENT` | Salarié + CLIENT |
| `ALL` | Tous les acteurs de la mission |

Le filtre est appliqué côté service selon le rôle de l'appelant — jamais côté client.

---

## 5. Flux applicatifs

### 5.1 Saisie CRA

```
Salarié ouvre /cra
    │
    ▼
GET /cra/months/:year/:month
    │── Si inexistant → création automatique CraMonth { status: DRAFT }
    │
    ▼
Saisie des entrées journalières
    │── POST /cra/months/:id/entries { date, entryType, dayFraction, comment }
    │   Chaque entrée WORK_* peut pointer vers des projets actifs (ProjectEntry)
    │── PUT /cra/months/:id/entries/:eid — modification
    │── DELETE /cra/months/:id/entries/:eid — suppression
    │
    ▼
Ventilation par projet (optionnel)
    │── ProjectEntry { projectId, portion: FULL | HALF_AM | HALF_PM }
    │   Un CraEntry peut référencer 0-N projets
    │
    ▼
Soumission via rapport mensuel (déclencheur auto)
    │── POST /reports/send → déclenche POST /cra/months/:id/submit
    │   Génération PDF (Puppeteer) → upload S3 → CraMonth.pdfUrl
    │   CraMonth.status: DRAFT → SUBMITTED
    │   AuditLog: CRA_SUBMITTED
    │
    ▼
Fin de saisie — CraMonth prêt pour signature
```

**Calculs automatiques côté service** :
- Jours travaillés = somme des `WORK_*`
- Solde CP restant = `LeaveBalance.totalDays` - somme des `LEAVE_CP` de l'année
- Alerte si total > jours ouvrables du mois

### 5.2 Signature CRA (tripartite)

```
DRAFT
  │
  ├── POST /cra/months/:id/submit         (EMPLOYEE)
  ▼                                        AuditLog: CRA_SUBMITTED
SUBMITTED                                  Notification → ESN_ADMIN
  │
  ├── POST /cra/months/:id/sign-employee  (EMPLOYEE)
  ▼                                        AuditLog: CRA_SIGNED_EMPLOYEE
SIGNED_EMPLOYEE                            Notification → ESN_ADMIN
  │
  ├── POST /cra/months/:id/sign-esn       (ESN_ADMIN — ConsentGuard requis)
  │                                        AuditLog: CRA_SIGNED_ESN
  │                                        Notification → CLIENT
  ├── POST /cra/months/:id/reject-esn     (→ DRAFT + rejectionComment obligatoire)
  ▼
SIGNED_ESN
  │
  ├── POST /cra/months/:id/sign-client    (CLIENT)
  │                                        AuditLog: CRA_SIGNED_CLIENT
  ├── POST /cra/months/:id/reject-client  (→ DRAFT + rejectionComment obligatoire)
  ▼
SIGNED_CLIENT
  │
  └── verrouillage automatique + PDF final archivé en S3
  ▼
LOCKED ✓ — immuable, aucune modification possible
```

Un CRA `LOCKED` ne peut jamais être modifié. Chaque transition est validée côté service (on ne peut pas passer `DRAFT → SIGNED_ESN` directement).

### 5.3 Météo projet (escalade automatique)

```
Salarié ou ESN_ADMIN
    │── POST /projects/:id/weather { state, comment }
    │   comment obligatoire si state > CLOUDY (validation backend)
    │   AuditLog: WEATHER_UPDATED
    │
    ▼
ProjectSchedulerService (cron quotidien)
    │── Pour chaque projet ACTIF avec dernière WeatherEntry = RAINY :
    │   Si date dernière entrée + 3 jours ouvrables ≤ aujourd'hui
    │       → Créer WeatherEntry { state: STORM, isEscalated: true }
    │       → Notification immédiate ESN_ADMIN
    │
    │── Pour chaque Milestone PLANNED/IN_PROGRESS avec dueDate dépassée :
    │       → Milestone.status: LATE
    │       → WeatherEntry CLOUDY automatique sur le projet lié
```

Séquence de sévérité : `SUNNY(1) → CLOUDY(2) → RAINY(3) → STORM(4) → VALIDATION_PENDING(5) → VALIDATED(6)`

### 5.4 Rapport mensuel

```
Salarié
    │── POST /reports/send { year, month, recipient: "ESN"|"CLIENT" }
    │
    │   1. Récupérer CraMonth (DRAFT → soumission automatique)
    │   2. Générer PDF (pdf-generator : CRA + météo projets si demandé)
    │   3. Upload PDF → S3
    │   4. Créer ReportValidationRequest { token, expiresAt }
    │   5. Envoyer email au destinataire avec lien de validation
    │
    ▼
Destinataire (ESN ou CLIENT)
    │── GET /validate-report/:token (public, @Public())
    │── POST /validate-report/:token { action: "VALIDATED"|"REFUSED", comment? }
    │   → ReportValidationRequest.status mis à jour
    │   → Notification au salarié
```

### 5.5 RAG (assistant IA)

```
RagSchedulerService (cron quotidien — indexation)
    │── Pour chaque salarié actif :
    │   Lire CraEntry, ProjectComment, WeatherEntry, Milestone, Document
    │   Chunker (512 tokens, overlap 50) → EmbedderService (OpenAI text-embedding-3-small)
    │   Upsert Embedding { employeeId, sourceType, sourceId, vector, content }
    │   UNIQUE (employeeId, sourceType, sourceId) — pas de doublon

Salarié
    │── POST /rag/stream { question: "Combien de jours de CP me reste-t-il ?" }
    │
    │   1. EmbedderService.embed(question) → vecteur requête
    │   2. pgvector : SELECT ... ORDER BY embedding <=> $query_vector
    │              WHERE employee_id = $session.userId  ← isolation stricte
    │              LIMIT 10 (cosine similarity)
    │   3. Construire contexte : chunks les plus proches
    │   4. Claude API (streaming) : question + contexte
    │   5. SSE stream → frontend (EventSource)
    │   AuditLog: RAG_QUERY
    │
    ▼
Frontend useRagChat.ts
    │── Écoute EventSource sur /api/rag/stream
    │── Accumule les tokens → affichage progressif
    │── SourcesAccordion : sources citées (type + extrait)
```

**Isolation stricte** : un salarié ne peut jamais accéder aux vecteurs d'un autre. L'ESN_ADMIN n'a pas accès au RAG.

### 5.6 Génération PDF

```
CraPdfGenerator (packages/pdf-generator)
    │── buildCraHtml(craMonth, entries, leaveBalances, projectSummary?)
    │   → Template HTML (en-tête mission, tableau journalier, totaux, zones signature)
    │── Puppeteer.launch() → page.setContent(html) → page.pdf({ format: 'A4' })
    │── pdf-lib : merge si plusieurs pages (CRA + annexe projets)
    │── Buffer → StorageService.upload() → S3 key
    │── CraMonth.pdfUrl = s3Key
```

---

## 6. Description des fonctionnalités

### Module Auth (`apps/backend/src/auth/`)

**Quoi** : Authentification par email/mot de passe, émission de JWT, exposition du profil courant.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/auth/login` | Public | Email + password → JWT |
| `GET` | `/auth/me` | Tous | Profil utilisateur courant |

**Règles métier** :
- Le JWT contient `{ sub, email, role }` — pas de données sensibles
- `User.password` et `User.privateNotes` exclus de toutes les réponses
- JWT signé avec `JWT_SECRET` (min 32 chars)

**Fichiers clés** : `auth.controller.ts → auth.service.ts → jwt.strategy.ts`

---

### Module CRA (`apps/backend/src/cra/`)

**Quoi** : Saisie journalière des activités, calcul des soldes de congés, signature tripartite, génération PDF.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/cra/months` | EMPLOYEE | Lister tous les mois CRA |
| `GET` | `/cra/months/:year/:month` | EMPLOYEE | Obtenir ou créer un mois (DRAFT) |
| `POST` | `/cra/months/:id/entries` | EMPLOYEE | Ajouter une entrée journalière |
| `PUT` | `/cra/months/:id/entries/:eid` | EMPLOYEE | Modifier une entrée |
| `DELETE` | `/cra/months/:id/entries/:eid` | EMPLOYEE | Supprimer une entrée |
| `POST` | `/cra/months/:id/submit` | EMPLOYEE | DRAFT → SUBMITTED + PDF |
| `POST` | `/cra/months/:id/sign-employee` | EMPLOYEE | SUBMITTED → SIGNED_EMPLOYEE |
| `POST` | `/cra/months/:id/sign-esn` | ESN_ADMIN | SIGNED_EMPLOYEE → SIGNED_ESN |
| `POST` | `/cra/months/:id/reject-esn` | ESN_ADMIN | → DRAFT (commentaire obligatoire) |
| `POST` | `/cra/months/:id/sign-client` | CLIENT | SIGNED_ESN → SIGNED_CLIENT |
| `POST` | `/cra/months/:id/reject-client` | CLIENT | → DRAFT (commentaire obligatoire) |

**Règles métier** :
- Un CRA est unique par `(employeeId, missionId, year, month)`
- Un CRA `LOCKED` est immuable
- `dayFraction` = 0.5 (demi-journée) ou 1.0 (journée complète)
- Chaque entrée WORK_* peut être ventilée sur des projets actifs

**Fichiers clés** : `cra.controller.ts → cra.service.ts + cra-signature.service.ts + cra-pdf.service.ts → cra.spec.ts`

---

### Module Projets (`apps/backend/src/projects/`)

**Quoi** : Gestion des projets clients avec météo à 6 états, commentaires avec visibilité granulaire, jalons et validations.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/projects` | EMPLOYEE, ESN_ADMIN | Lister les projets accessibles |
| `POST` | `/projects` | EMPLOYEE | Créer un projet |
| `GET` | `/projects/:id` | Tous | Détail (météo, jalons, validations) |
| `POST` | `/projects/:id/weather` | EMPLOYEE, ESN_ADMIN | Enregistrer une météo |
| `GET` | `/projects/:id/weather` | Tous | Historique météo ⚠️ voir §7 |
| `GET` | `/projects/:id/comments` | Tous | Commentaires (filtrés par rôle) |
| `POST` | `/projects/:id/comments` | EMPLOYEE, ESN_ADMIN | Ajouter un commentaire |
| `POST` | `/projects/:id/milestones` | EMPLOYEE | Créer un jalon |
| `POST` | `/projects/:id/validations` | EMPLOYEE | Créer une demande de validation |

**Règles métier** :
- Dégradation météo (state > CLOUDY) → `comment` obligatoire
- RAINY pendant 3 jours ouvrés sans nouvelle saisie → escalade automatique STORM
- Jalon en retard → statut `LATE` automatique
- Fermeture projet → jalons et validations en attente archivés

**Fichiers clés** : `projects.controller.ts → projects.service.ts + weather.service.ts + comments.service.ts + milestones.service.ts + validations.service.ts + project-scheduler.service.ts`

---

### Module Documents (`apps/backend/src/documents/`)

**Quoi** : Upload de fichiers vers S3, versioning, partage sélectif avec audit trail.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/documents/upload` | EMPLOYEE | Upload multipart (max 50 MB) |
| `GET` | `/documents` | EMPLOYEE | Lister ses documents |
| `GET` | `/documents/:id` | EMPLOYEE | Détail avec versions et partages |
| `GET` | `/documents/:id/download` | EMPLOYEE | URL presignée + AuditLog |
| `POST` | `/documents/:id/share` | EMPLOYEE | Partager avec un utilisateur |
| `DELETE` | `/documents/:id/share/:shareId` | EMPLOYEE | Révoquer un partage |
| `DELETE` | `/documents/:id` | EMPLOYEE | Soft delete |

**Règles métier** :
- `Document.s3Key` jamais exposé directement — toujours via `/download`
- URL presignée générée avec expiration courte
- Chaque téléchargement génère `AuditLog: DOCUMENT_URL_GENERATED`
- Partage possible par lien (`shareToken`) ou par utilisateur (`sharedWithId`)

**Fichiers clés** : `documents.controller.ts → documents.service.ts`

---

### Module Consentement (`apps/backend/src/consent/`)

**Quoi** : Modèle consentement-first — gestion des demandes d'accès ESN aux données salarié.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/consent/request` | ESN_ADMIN | Demander accès (`scope`, `employeeId`) |
| `PATCH` | `/consent/:id/grant` | EMPLOYEE | Accorder le consentement |
| `PATCH` | `/consent/:id/revoke` | EMPLOYEE | Révoquer le consentement |
| `GET` | `/consent/my` | EMPLOYEE | Lister ses consentements (reçus) |
| `GET` | `/consent/sent` | ESN_ADMIN | Lister ses demandes (envoyées) |

**Fichiers clés** : `consent.controller.ts → consent.service.ts + consent.guard.ts`

---

### Module Notifications (`apps/backend/src/notifications/`)

**Quoi** : Envoi d'emails et notifications in-app sur les événements métier.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/notifications` | Tous | Lister ses notifications |
| `PATCH` | `/notifications/:id/read` | Tous | Marquer comme lue |

**Événements déclencheurs** : soumission CRA, signature, rejet, consentement accordé/révoqué, escalade météo, jalons en retard.

**Fichiers clés** : `notifications.controller.ts → notifications.service.ts + mailer.service.ts`

---

### Module RAG (`apps/backend/src/rag/`)

**Quoi** : Assistant IA personnel du salarié, basé sur ses propres données indexées.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/rag/stream` | EMPLOYEE | Requête avec réponse SSE (streaming) |

**Règles métier** :
- Accès strictement limité au rôle `EMPLOYEE`
- Toutes les requêtes pgvector filtrées par `WHERE employee_id = $session.userId`
- Modèle embedding : OpenAI `text-embedding-3-small` (1536 dimensions)
- Modèle génération : Claude API (Anthropic)
- Chunking : 512 tokens, overlap 50

**Fichiers clés** : `rag.controller.ts → rag-query.service.ts + rag-indexer.service.ts + rag-scheduler.service.ts`

---

### Module Rapports (`apps/backend/src/reports/`)

**Quoi** : Bilans mensuels, présentations projets, dashboard partageable via token.

**Routes API** :
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/reports/monthly/:year/:month` | EMPLOYEE | Bilan mensuel |
| `GET` | `/reports/projects/:projectId` | EMPLOYEE | Présentation projet |
| `POST` | `/reports/dashboard-share` | EMPLOYEE | Créer un lien de partage (max 168h) |
| `GET` | `/reports/shared/:token` | Public | Dashboard partagé (données limitées) |

**Données jamais exposées via le token public** : soldes de congés, notes privées, commentaires `EMPLOYEE_ESN`.

**Fichiers clés** : `reports.controller.ts → reports.service.ts + reports-send.service.ts + reports-validate.service.ts`

---

### Module Health (`apps/backend/src/health/`)

**Quoi** : Endpoint de santé pour Coolify et load balancers.

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/api/health` | Public | `SELECT 1` DB → 200 OK ou 503 |

---

## 7. Sécurité

### Authentification

**Backend** : JWT signé avec `JWT_SECRET` (min 32 chars). Payload minimal : `{ sub, email, role }`. Expiration configurable (`JWT_EXPIRATION`, défaut `7d`).

**Frontend** : NextAuth.js v5 avec Credentials provider. Le token JWT backend est stocké dans la session NextAuth. Chaque appel API injecte `Authorization: Bearer <accessToken>`.

### RBAC

Tous les contrôleurs utilisent `@Roles([Role.EMPLOYEE, ...])` — les routes sans ce décorateur sont protégées uniquement par JWT (accès à tous les rôles authentifiés). `@Public()` bypass tous les guards pour les routes publiques (login, health, dashboard share, validate-report).

### ConsentGuard

Guard NestJS activé par `@ConsentRequired()`. Vérifie :
1. L'appelant est `ESN_ADMIN`
2. Un `Consent { status: GRANTED, scope includes requested_scope }` existe pour la paire `(employeeId, esnAdminId)`

Crée systématiquement `AuditLog: CONSENT_ACCESS`.

### Rate limiting

`ThrottlerModule` global avec `RATE_LIMIT_TTL` (secondes) et `RATE_LIMIT_MAX` (requêtes). Configurable par environment. Par défaut : 100 req / 60s.

### Audit trail

Toutes les mutations sensibles créent une entrée `AuditLog` immuable (pas d'UPDATE/DELETE sur la table).

| Action auditée | Déclencheur |
|----------------|-------------|
| `CRA_SUBMITTED` | Soumission CRA |
| `CRA_RETRACTED` | Rétractation CRA |
| `CRA_SIGNED_EMPLOYEE/ESN/CLIENT` | Signature CRA |
| `CRA_REJECTED_ESN/CLIENT` | Rejet CRA |
| `CONSENT_GRANTED/REVOKED` | Salarié modifie un consentement |
| `CONSENT_ACCESS` | ESN_ADMIN accède aux données via ConsentGuard |
| `DOCUMENT_URL_GENERATED` | Téléchargement document |
| `WEATHER_UPDATED` | Saisie météo |
| `COMMENT_CREATED` | Commentaire projet |
| `VALIDATION_REQUESTED/APPROVED` | Demande de validation |
| `PROJECT_CLOSED` | Fermeture projet |
| `DASHBOARD_SHARE_CREATED/REVOKED/ACCESSED` | Dashboard partagé |
| `RAG_QUERY` | Requête assistant IA |

### Points de vigilance (rapport d'audit v1.0)

**C1 — CRITIQUE : Weather endpoints sans contrôle d'accès projet**

`weather.service.ts:74-135` — `getHistory()` et `getMonthlySummary()` ne vérifient pas que l'appelant a accès au projet. Vecteur IDOR : un utilisateur authentifié peut lire la météo de n'importe quel projet en devinant un UUID.

**Correction recommandée** : appeler `buildAccessWhere(projectId, callerId, callerRole)` avant de retourner les données, et passer le contexte utilisateur depuis le contrôleur.

**W1-W7 — Avertissements non bloquants** :
- W1 : `NotificationsController` manque `@UseGuards(JwtAuthGuard)` explicite (relié au global)
- W2 : Suppression CraEntry sans AuditLog
- W3 : Modification CraEntry sans AuditLog
- W4 : Suppression Document sans AuditLog
- W5 : Modification commentaire sans AuditLog
- W6 : Jalons sans AuditLog (création, modification, complétion)
- W7 : `process.env` direct dans `main.ts` au lieu de `ConfigService`

---

## 8. Guide de développement

### Setup local

```bash
# 1. Cloner et installer les dépendances
git clone <repo>
cd craESN
pnpm install

# 2. Variables d'environnement
cp .env.example .env
# Éditer .env — JWT_SECRET et NEXTAUTH_SECRET doivent faire min 32 chars
# openssl rand -base64 32  ← pour générer des secrets

# 3. Démarrer les services (PostgreSQL, MinIO, Redis)
bash infra/scripts/start-dev.sh
# ou
docker compose -f infra/docker/docker-compose.dev.yml up -d

# 4. Migrations et données de test
pnpm db:migrate    # Applique les migrations Prisma
pnpm db:seed       # Données de test (alice@example.com / password123)

# 5. Lancer le dev
pnpm dev           # Backend :3001 + Frontend :3000 en parallèle
```

### Commandes

```bash
pnpm dev              # Backend + Frontend en parallèle (watch mode)
pnpm test             # Tous les tests unitaires (Vitest)
pnpm test:e2e         # Tests Playwright (nécessite l'app en cours d'exécution)
pnpm build            # Build de production
pnpm db:migrate       # prisma migrate dev (crée et applique une migration)
pnpm db:seed          # Données de développement
pnpm lint             # ESLint + Prettier (vérification)
pnpm typecheck        # TypeScript strict (zéro any, zéro ts-ignore)
pnpm format           # Prettier auto-fix
pnpm seed:prod        # Seed production (nécessite ADMIN_EMAIL + ADMIN_PASSWORD)
```

### TDD — Règle absolue

Écrire le test **avant** l'implémentation. C'est une contrainte de projet, pas une suggestion.

```bash
# 1. Créer le fichier de test
apps/backend/src/mon-module/test/unit/mon-service.spec.ts

# 2. Écrire les tests (ils échouent — c'est normal)
pnpm test -- mon-service.spec.ts

# 3. Implémenter jusqu'à ce que les tests passent
pnpm test -- mon-service.spec.ts

# 4. Vérifier l'ensemble
pnpm test && pnpm typecheck && pnpm lint
```

### Conventions de code

**TypeScript strict** : zéro `any`, zéro `@ts-ignore` sans justification documentée.

**Commits** : format Conventional Commits :
```
feat(cra): add daily activity input with project breakdown
fix(auth): resolve JWT expiration edge case
docs(rag): document pgvector isolation model
```

**Branches** :
```
feat/<module>/<description-courte>    — nouvelle fonctionnalité
fix/<module>/<description-courte>     — correction de bug
```

**Isolation des données** : l'`employeeId` vient **toujours** du JWT (`request.user.id`), jamais des paramètres de requête.

### Ajouter un nouveau module NestJS

```
1. Créer la structure :
   src/mon-module/
   ├── mon-module.module.ts
   ├── mon-module.controller.ts
   ├── mon-module.service.ts
   ├── dto/
   │   ├── create-mon-resource.dto.ts
   │   └── update-mon-resource.dto.ts
   └── test/
       └── unit/
           └── mon-module.service.spec.ts

2. Déclarer dans mon-module.module.ts :
   @Module({
     imports: [PrismaModule],
     controllers: [MonModuleController],
     providers: [MonModuleService],
     exports: [MonModuleService],  // si utilisé par d'autres modules
   })

3. Importer dans app.module.ts :
   imports: [..., MonModule]

4. Créer les DTOs avec class-validator :
   export class CreateMonResourceDto {
     @IsString()
     @IsNotEmpty()
     title: string;
   }

5. Décorer le contrôleur :
   @Controller('mon-resource')
   @UseGuards(JwtAuthGuard, RolesGuard)  // ou laisser le global
   export class MonModuleController { ... }

6. Décorer chaque route :
   @Post()
   @Roles(Role.EMPLOYEE)
   async create(@Body() dto: CreateMonResourceDto, @CurrentUser() user: JwtPayload) { ... }

7. Écrire les tests unitaires AVANT d'implémenter le service.

8. Mettre à jour shared-types si de nouveaux types sont partagés :
   packages/shared-types/src/
   └── mon-module/
       └── index.ts
   Puis : pnpm --filter @esn/shared-types build
```

### Modifier le schéma Prisma

```bash
# 1. Modifier apps/backend/prisma/schema.prisma
# 2. Créer la migration
pnpm db:migrate  # (prompt pour nommer la migration)
# 3. Régénérer le client Prisma
pnpm prisma generate
# 4. Si nouveaux enums utilisés dans shared-types :
pnpm --filter @esn/shared-types build
# 5. Mettre à jour les types dans packages/shared-types/src/enums/ si nécessaire
# 6. Relancer pnpm typecheck pour vérifier
```

---

## 9. Tests

### Tests unitaires (Vitest)

**Structure** :
```
apps/backend/src/<module>/test/unit/<service>.spec.ts
apps/frontend/src/app/<route>/page.spec.tsx
apps/frontend/src/components/<component>.spec.tsx
```

**Lancer** :
```bash
pnpm test                          # Tous les tests
pnpm --filter backend test         # Backend uniquement
pnpm --filter frontend test        # Frontend uniquement
pnpm test -- mon-service.spec.ts   # Un fichier spécifique
pnpm test -- --watch               # Mode watch
```

**Couverture** : 291 tests unitaires (backend + frontend) au démarrage de la v1.0.

**Configuration frontend** (`test-setup.ts`) : `@testing-library/jest-dom` matchers inclus, mocks pour `next/navigation` et `./actions` serveur.

**Exemple de test unitaire** (pattern type) :
```typescript
// apps/backend/src/cra/test/unit/cra.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CraService } from '../../cra.service';
import { PrismaService } from '../../../database/prisma.service';

describe('CraService', () => {
  let service: CraService;
  let prisma: { craMonth: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prisma = { craMonth: { findMany: vi.fn() } };
    service = new CraService(prisma as unknown as PrismaService);
  });

  it('should list months for the current employee only', async () => {
    prisma.craMonth.findMany.mockResolvedValue([]);
    await service.listMonths('user-123');
    expect(prisma.craMonth.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'user-123' } }),
    );
  });
});
```

### Tests e2e (Playwright)

**43 scénarios** couvrant les flux critiques.

**Lancer** :
```bash
pnpm test:e2e                        # Tous les tests e2e
pnpm test:e2e -- --headed            # Avec navigateur visible
pnpm test:e2e -- mon-scenario.spec.ts
```

**Prérequis** : l'application doit être en cours d'exécution (`pnpm dev`).

**Écrire un nouveau test e2e** :
```typescript
// apps/frontend/e2e/mon-scenario.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Saisie CRA', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter
    await page.goto('/login');
    await page.fill('[name="email"]', 'alice@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new CRA entry', async ({ page }) => {
    await page.goto('/cra/2026/3');
    // Cliquer sur un jour
    await page.click('[data-date="2026-03-10"]');
    // Sélectionner le type
    await page.selectOption('[name="entryType"]', 'WORK_ONSITE');
    // Sauvegarder
    await page.click('[type="submit"]');
    // Vérifier
    await expect(page.locator('[data-date="2026-03-10"]')).toHaveClass(/work-onsite/);
  });
});
```

---

## 10. Déploiement

### Architecture réseau (production)

```
Internet
    │
    ▼
[Coolify Reverse Proxy — HTTPS + TLS Let's Encrypt]
    │
    ├──► frontend:3100   (Next.js standalone, Dockerfile apps/frontend/Dockerfile)
    │         │
    │         ▼ (service-to-service HTTP interne)
    └──► backend:3001    (NestJS, Dockerfile apps/backend/Dockerfile)
              │
              ├──► postgres:5432   (pgvector/pgvector:pg15)
              ├──► redis:6379      (redis:7-alpine)
              └──► minio:9000      (S3 stockage fichiers)
```

### Dockerfiles

**Backend** (`apps/backend/Dockerfile`) — Multi-stage :
1. **Builder** : `node:20-alpine`, installe pnpm, build des packages partagés, `prisma generate`, `tsc`
2. **Runner** : `node:20-alpine`, copie `dist/` + `prisma/`, installe les dépendances prod, utilisateur non-root `nestjs:1001`
   - `CMD`: `prisma migrate deploy && node dist/main.js`
   - Port : `3001`

**Frontend** (`apps/frontend/Dockerfile`) — Multi-stage :
1. **Deps** : installe les dépendances frontend
2. **Builder** : `next build` avec `output: 'standalone'`
3. **Runner** : copie le standalone output, utilisateur non-root `nextjs:1001`
   - `CMD`: `node apps/frontend/server.js`
   - Port : `3100`

### Guide Coolify (étapes)

**1. Provisionner les services** (Coolify → New Resource → Service) :
- PostgreSQL : image `pgvector/pgvector:pg15` (requis pour RAG)
- Redis : image `redis:7-alpine`
- MinIO : image `minio/minio`, créer le bucket `esn-cra-documents` après démarrage

**2. Déployer le backend** :
```
Source       : GitHub, branche preprod
Dockerfile   : apps/backend/Dockerfile
Build context: / (racine du monorepo)
Port         : 3001
Health check : GET /api/health (timeout 60s — migration Prisma au démarrage)
```

**3. Déployer le frontend** (après que le backend est "healthy") :
```
Source       : GitHub, branche preprod
Dockerfile   : apps/frontend/Dockerfile
Build context: / (racine du monorepo)
Port         : 3100
```

**4. Initialiser le compte admin** (une seule fois) :
```bash
# Via Coolify → Backend → Terminal
ADMIN_EMAIL=admin@votre-esn.fr \
ADMIN_PASSWORD=VotreMotDePasse123! \
pnpm seed:prod
# → "✅ Platform admin created: admin@votre-esn.fr"
```
La commande est idempotente — sans effet si le compte existe déjà.

**5. Vérifications** :
```bash
curl https://backend.votre-domaine.fr/api/health
# → 200 { "status": "ok", "db": "connected" }
```

### Variables d'environnement (production)

Configurer dans Coolify via l'onglet "Environment Variables". Template : `.env.production.example`.

**Backend (obligatoires)** :
```bash
DATABASE_URL          # URL PostgreSQL avec pgvector
JWT_SECRET            # min 32 chars (openssl rand -base64 32)
NEXTAUTH_SECRET       # min 32 chars
CORS_ORIGIN           # URL publique du frontend (https://...)
BACKEND_PORT          # 3001
STORAGE_DRIVER        # s3
S3_ENDPOINT           # http://minio:9000 (URL interne)
S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET / S3_REGION
REDIS_URL             # redis://redis:6379
ANTHROPIC_API_KEY     # Claude API
OPENAI_API_KEY        # text-embedding-3-small
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
BCRYPT_ROUNDS         # 12 (prod)
```

**Frontend (obligatoires)** :
```bash
NEXTAUTH_URL          # URL publique du frontend (https://...)
NEXTAUTH_SECRET       # Même valeur que le backend
BACKEND_URL           # http://backend:3001 (URL interne service-to-service)
AUTH_TRUST_HOST       # true (pour NextAuth sur accès IP)
NODE_ENV              # production
PORT                  # 3100
```

### Rollback

Coolify → Application → Deployments → cliquer "Redeploy" sur le déploiement précédent.

### Branche de déploiement

La branche `preprod` est déployée par Coolify. Elle reçoit les syncs depuis `main` via :
```bash
git checkout preprod
git merge main --no-edit
git push origin preprod
```
**Ne jamais merger preprod → main.**

### Test local du stack complet

```bash
cp .env.production.example .env.prod.local
# Éditer .env.prod.local avec de vraies valeurs de test
docker compose -f infra/docker/docker-compose.prod.yml --env-file .env.prod.local up -d
curl http://localhost:3001/api/health
# → { "status": "ok" }
# Frontend : http://localhost:3100/login
```

---

## 11. Glossaire

**CRA** — Compte Rendu d'Activité. Document mensuel déclarant les jours travaillés, congés et absences d'un salarié, signé tripartite (salarié, ESN, client).

**ESN** — Entreprise de Services du Numérique (anciennement SSII). Société qui place ses salariés en mission chez des clients.

**CP** — Congés Payés. Jours de congé légaux acquis et décomptés via `LeaveBalance { leaveType: PAID_LEAVE }`.

**RTT** — Réduction du Temps de Travail. Jours de repos compensateurs. Décomptés via `LeaveBalance { leaveType: RTT }`.

**Météo projet** — Indicateur visuel à 6 états (`SUNNY → CLOUDY → RAINY → STORM → VALIDATION_PENDING → VALIDATED`) reflétant la santé d'un projet à un instant donné. Peut être escaladée automatiquement par le scheduler si dégradation persistante.

**Consentement** — Permission explicite et révocable donnée par un salarié à son ESN pour accéder à certaines de ses données (`scope : ["cra", "projects", "documents"]`). Sans consentement `GRANTED`, l'ESN ne peut rien voir.

**Acte (AuditLog)** — Entrée immuable en base enregistrant qui a fait quoi sur quelle ressource et quand. Trace toutes les mutations sensibles (signatures, consentements, partages, accès, suppressions).

**Rapport mensuel** — Bilan généré automatiquement incluant le CRA PDF et optionnellement un résumé des projets (météo, jalons, commentaires). Envoyé par email pour validation via token.

**RAG** — Retrieval-Augmented Generation. Technique d'IA qui enrichit les réponses d'un LLM avec des documents pertinents récupérés par recherche vectorielle. Ici : données propres du salarié indexées dans pgvector, interrogées par Claude.

**pgvector** — Extension PostgreSQL qui ajoute un type `vector(N)` et des index de recherche approximative par similarité cosinus (IVFFlat). Utilisé pour stocker les embeddings du module RAG.

**Embedding** — Représentation numérique d'un texte sous forme de vecteur de 1536 dimensions (OpenAI `text-embedding-3-small`). Deux textes sémantiquement proches ont des vecteurs proches (distance cosinus faible).

**Chunking** — Découpage d'un texte long en fragments de taille fixe (512 tokens avec 50 tokens de recouvrement) pour l'indexation RAG.

**Presigned URL** — URL S3 temporaire et signée permettant d'accéder directement à un fichier sans exposer les credentials. Générée à la demande via `/documents/:id/download`.

**Turborepo** — Outil de build pour monorepos qui optimise l'ordre de compilation des packages et met en cache les résultats.

**Conventional Commits** — Convention de formatage des messages git : `type(scope): description`. Types autorisés : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `security`.

**IDOR** — Insecure Direct Object Reference. Vulnérabilité où un attaquant peut accéder à des ressources d'autres utilisateurs en devinant un identifiant (ex : UUID dans l'URL). Mitigation principale : filtrer toutes les queries Prisma par `employeeId` issu du JWT.

**SSE** — Server-Sent Events. Protocole HTTP unidirectionnel (serveur → client) permettant de streamer des données en temps réel. Utilisé pour le streaming des réponses du module RAG.
