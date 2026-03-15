# Spécification — Module Projets

## Entités
- **Project** : id, title, description, missionId, estimatedDays?, status
- **WeatherEntry** : projectId, state, comment (obligatoire si dégradation), createdAt
- **ProjectComment** : contenu, visibility, isBlocker, resolvedAt?
- **ValidationRequest** : title, description, documentIds[], targetRole, status, decisionComment?
- **Milestone** : title, targetDate, status, validatedAt?

## Enum ProjectStatus
ACTIVE | PAUSED | CLOSED

## Enum WeatherState (ordre de sévérité)
SUNNY(1) | CLOUDY(2) | RAINY(3) | STORM(4) | VALIDATION_PENDING(5) | VALIDATED(6)

## Enum CommentVisibility
EMPLOYEE_ESN | EMPLOYEE_CLIENT | ALL

## Règles métier critiques
1. Dégradation météo → WeatherEntry.comment obligatoire (validation backend)
2. RAINY sans nouvelle WeatherEntry depuis 3 jours ouvrés → escalade STORM auto + notif ESN
3. Milestone.targetDate dépassée sans validation → statut LATE auto + météo CLOUDY min
4. STORM → notification ESN immédiate non configurable
5. Fermeture projet (CLOSED) → tous les jalons et validations en attente sont archivés

## Saisie journalière
La liaison CRA/Projet se fait via ProjectEntry dans CraEntry :
{ projectId, portion: FULL | HALF_AM | HALF_PM }
Un CraEntry peut référencer 0-N projets (0 = jour sans projet actif)

## Présentation générée
Contenu : avancement en %, timeline jalons, courbe météo historique,
commentaires filtrés selon visibilité du destinataire, liste documents
Formats de sortie : PDF statique | lien live read-only (token temporaire)
