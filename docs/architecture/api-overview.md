# Vue d'ensemble de l'API — ESN CRA App v1.0

Backend NestJS 10 — API REST + SSE (RAG streaming).
Base URL : `http://localhost:3001` (dev).

**Authentification** : JWT Bearer token obtenu via `POST /auth/login`.
Guards appliqués globalement : `JwtAuthGuard` sur toutes les routes sauf celles marquées `@Public()`.

Rôles : `EMPLOYEE` · `ESN_ADMIN` · `CLIENT`

---

## Auth — `/auth`

| Méthode | Endpoint      | Rôles    | Description                                        |
|---------|---------------|----------|----------------------------------------------------|
| POST    | /auth/login   | Public   | Authentification — retourne un JWT                 |
| GET     | /auth/me      | Tous     | Profil de l'utilisateur authentifié                |

---

## CRA — `/cra`

Ressource principale : `CraMonth` (CRA mensuel). Workflow de signature tripartite.

| Méthode | Endpoint                           | Rôles       | Description                                      |
|---------|------------------------------------|-------------|--------------------------------------------------|
| GET     | /cra/months                        | EMPLOYEE    | Liste des CRA du salarié                         |
| GET     | /cra/months/:year/:month           | EMPLOYEE    | Récupère ou crée le CRA du mois (DRAFT)          |
| GET     | /cra/months/:id/summary            | EMPLOYEE    | Récumé calculé : totaux jours, soldes CP/RTT     |
| POST    | /cra/months/:id/entries            | EMPLOYEE    | Ajoute une entrée journalière                    |
| PUT     | /cra/months/:id/entries/:eid       | EMPLOYEE    | Modifie une entrée                               |
| DELETE  | /cra/months/:id/entries/:eid       | EMPLOYEE    | Supprime une entrée                              |
| POST    | /cra/months/:id/submit             | EMPLOYEE    | Soumet le CRA (DRAFT → SUBMITTED)                |
| POST    | /cra/months/:id/retract            | EMPLOYEE    | Retire la soumission (SUBMITTED → DRAFT)         |
| POST    | /cra/months/:id/sign-employee      | EMPLOYEE    | Signature salarié (SUBMITTED → SIGNED_EMPLOYEE)  |
| POST    | /cra/months/:id/sign-esn           | ESN_ADMIN   | Signature ESN (SIGNED_EMPLOYEE → SIGNED_ESN)     |
| POST    | /cra/months/:id/reject-esn         | ESN_ADMIN   | Rejet ESN avec commentaire (→ DRAFT)             |
| POST    | /cra/months/:id/sign-client        | CLIENT      | Signature client (SIGNED_ESN → SIGNED_CLIENT)    |
| POST    | /cra/months/:id/reject-client      | CLIENT      | Rejet client avec commentaire (→ DRAFT)          |

> La signature ESN vérifie le consentement du salarié au niveau service.

---

## Projets — `/projects`

Météo à 6 états, commentaires à visibilité granulaire, jalons, validations formelles.

### Projet

| Méthode | Endpoint                | Rôles                        | Description                              |
|---------|-------------------------|------------------------------|------------------------------------------|
| GET     | /projects               | EMPLOYEE                     | Liste des projets du salarié             |
| POST    | /projects               | EMPLOYEE                     | Crée un projet (mission obligatoire)     |
| GET     | /projects/:id           | EMPLOYEE · ESN_ADMIN · CLIENT| Détail : météo, jalons, validations      |
| PUT     | /projects/:id           | EMPLOYEE                     | Modifie les métadonnées du projet        |
| POST    | /projects/:id/pause     | EMPLOYEE                     | Met en pause (ACTIVE → PAUSED)           |
| POST    | /projects/:id/reopen    | EMPLOYEE                     | Réactive le projet (PAUSED → ACTIVE)     |
| POST    | /projects/:id/close     | EMPLOYEE                     | Clôture le projet                        |

### Météo

| Méthode | Endpoint                          | Rôles                        | Description                                   |
|---------|-----------------------------------|------------------------------|-----------------------------------------------|
| GET     | /projects/:id/weather             | EMPLOYEE · ESN_ADMIN · CLIENT| 30 dernières entrées ou filtré par `yearMonth` |
| POST    | /projects/:id/weather             | EMPLOYEE                     | Saisit l'état météo du jour                   |
| GET     | /projects/:id/weather/summary     | EMPLOYEE · ESN_ADMIN · CLIENT| État dominant du mois (`year` + `month` requis)|

### Commentaires

| Méthode | Endpoint                                  | Rôles                        | Description                                     |
|---------|-------------------------------------------|------------------------------|-------------------------------------------------|
| GET     | /projects/:id/comments                    | EMPLOYEE · ESN_ADMIN · CLIENT| Commentaires filtrés par visibilité de l'appelant|
| POST    | /projects/:id/comments                    | EMPLOYEE · ESN_ADMIN · CLIENT| Ajoute un commentaire                           |
| PATCH   | /projects/:id/comments/:commentId         | Auteur                       | Modifie son propre commentaire                  |
| POST    | /projects/:id/comments/:commentId/resolve | ESN_ADMIN                    | Résout un commentaire bloquant                  |

### Jalons

| Méthode | Endpoint                                           | Rôles                        | Description                    |
|---------|----------------------------------------------------|------------------------------|--------------------------------|
| GET     | /projects/:id/milestones                           | EMPLOYEE · ESN_ADMIN · CLIENT| Liste des jalons               |
| POST    | /projects/:id/milestones                           | EMPLOYEE                     | Crée un jalon                  |
| PATCH   | /projects/:id/milestones/:milestoneId              | EMPLOYEE                     | Modifie un jalon               |
| POST    | /projects/:id/milestones/:milestoneId/complete     | EMPLOYEE                     | Marque le jalon comme terminé  |

### Validations projet

| Méthode | Endpoint                                              | Rôles                 | Description                     |
|---------|-------------------------------------------------------|-----------------------|---------------------------------|
| GET     | /projects/:id/validations                             | EMPLOYEE · ESN_ADMIN · CLIENT| Liste des demandes de validation|
| POST    | /projects/:id/validations                             | EMPLOYEE              | Crée une demande de validation  |
| POST    | /projects/:id/validations/:validationId/approve       | ESN_ADMIN · CLIENT    | Approuve la validation          |
| POST    | /projects/:id/validations/:validationId/reject        | ESN_ADMIN · CLIENT    | Rejette la validation           |

---

## Documents — `/documents`

Upload S3/local, versioning, partage sélectif avec audit trail.

| Méthode | Endpoint                         | Rôles    | Description                                          |
|---------|----------------------------------|----------|------------------------------------------------------|
| POST    | /documents/upload                | EMPLOYEE | Upload multipart avec métadonnées                    |
| GET     | /documents                       | EMPLOYEE | Liste des documents du salarié                       |
| GET     | /documents/:id                   | Propriét.| Détail avec versions et partages                     |
| GET     | /documents/:id/download          | Propriét.| URL de téléchargement (presigned S3 ou local)        |
| GET     | /documents/:id/versions          | Propriét.| Historique de versions                               |
| POST    | /documents/:id/share             | EMPLOYEE | Partage avec un utilisateur cible                    |
| DELETE  | /documents/:id/share/:shareId    | EMPLOYEE | Révoque un partage                                   |
| DELETE  | /documents/:id                   | EMPLOYEE | Supprime le document et révoque tous les partages    |

---

## Consentements — `/consent`

Modèle consentement-first : un admin ESN doit demander l'accès aux données d'un salarié.

| Méthode | Endpoint              | Rôles     | Description                                             |
|---------|-----------------------|-----------|---------------------------------------------------------|
| POST    | /consent/request      | ESN_ADMIN | Demande d'accès aux données d'un salarié                |
| PATCH   | /consent/:id/grant    | EMPLOYEE  | Le salarié accorde le consentement                      |
| PATCH   | /consent/:id/revoke   | EMPLOYEE  | Le salarié révoque le consentement                      |
| GET     | /consent/my           | EMPLOYEE  | Liste tous les consentements sur mes données            |
| GET     | /consent/sent         | ESN_ADMIN | Liste toutes les demandes envoyées par l'admin ESN      |

---

## Reports — `/reports`

Bilans mensuels, présentations projet, dashboard partageable.

| Méthode | Endpoint                           | Rôles    | Description                                           |
|---------|------------------------------------|----------|-------------------------------------------------------|
| GET     | /reports/monthly/:year/:month      | EMPLOYEE | Rapport mensuel : jours travaillés, congés, projets   |
| GET     | /reports/projects/:projectId       | EMPLOYEE | Présentation projet (`?from=` `?to=` optionnels)      |
| POST    | /reports/dashboard-share           | EMPLOYEE | Génère un lien de partage temporaire (TTL max 168h)   |
| DELETE  | /reports/dashboard-share/:token    | EMPLOYEE | Révoque un lien de partage                            |
| GET     | /reports/shared/:token             | **Public** | Dashboard public via token (expiration/révocation vérifiées) |

---

## Notifications — `/notifications`

| Méthode | Endpoint                   | Rôles | Description                                       |
|---------|----------------------------|-------|---------------------------------------------------|
| GET     | /notifications             | Tous  | Notifications (`?unreadOnly=true` disponible)     |
| GET     | /notifications/count       | Tous  | Nombre de notifications non lues                  |
| PATCH   | /notifications/:id/read    | Tous  | Marque une notification comme lue                 |
| PATCH   | /notifications/read-all    | Tous  | Marque toutes les notifications comme lues        |

---

## Assistant RAG — `/rag`

| Méthode | Endpoint   | Rôles    | Description                                                      |
|---------|------------|----------|------------------------------------------------------------------|
| POST    | /rag/stream | EMPLOYEE | Requête contextuelle — réponse en Server-Sent Events (streaming) |

Corps de la requête : `{ "query": "..." }`.
Les sources citées sont isolées par `employeeId` — aucune fuite inter-salariés.

---

## Storage — `/storage`

| Méthode | Endpoint         | Rôles | Description                                                      |
|---------|------------------|-------|------------------------------------------------------------------|
| GET     | /storage/:key(*) | Tous  | Sert les fichiers locaux (STORAGE_DRIVER=local uniquement). Protection contre le path traversal. |

---

## Codes d'erreur standard

| Code | Signification                                                     |
|------|-------------------------------------------------------------------|
| 400  | Corps de requête invalide (validation DTO)                        |
| 401  | Token JWT absent ou expiré                                        |
| 403  | Rôle insuffisant ou consentement absent                           |
| 404  | Ressource introuvable                                             |
| 409  | Conflit d'état (ex. CRA déjà soumis)                             |
| 410  | Token de partage expiré ou révoqué (`GoneException`)             |
| 500  | Erreur serveur interne                                            |
