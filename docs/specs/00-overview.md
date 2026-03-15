# Spécifications fonctionnelles — Vue d'ensemble

## Modules MVP (Phase 1)
1. **auth** — Authentification, RBAC, 2FA optionnel
2. **cra** — Saisie journalière, calcul congés, génération PDF, signature tripartite
3. **projects** — Projets clients, météo, commentaires, validations, jalons
4. **documents** — Upload S3, partage sélectif, versioning
5. **reports** — Bilan mensuel, dashboard partageable, annexe CRA

## Modules Phase 2
6. **rag** — Assistant IA sur données de mission (pgvector)
7. **notifications** — Relances automatiques, alertes météo, escalades
8. **admin** — Backoffice ESN, vue consolidée des salariés

## Acteurs et permissions
| Action                           | EMPLOYEE | ESN_ADMIN    | CLIENT        |
|----------------------------------|----------|--------------|---------------|
| Créer/modifier son CRA           | ✅       | ❌           | ❌            |
| Signer le CRA                    | ✅       | ✅           | ✅            |
| Créer/modifier un projet         | ✅       | ❌           | ❌            |
| Voir la météo d'un projet        | ✅       | si consentement | si partagé |
| Uploader un document             | ✅       | ❌           | ❌            |
| Partager un document             | ✅       | ❌           | ❌            |
| Demander accès aux données       | ❌       | ✅           | ❌            |
| Valider une demande d'accès      | ✅       | ❌           | ❌            |
| Bloquer un compte                | ❌       | ✅           | ❌            |
| Requête RAG                      | ✅       | ❌           | ❌            |
| Créer des comptes                | ❌       | ✅           | ❌            |
