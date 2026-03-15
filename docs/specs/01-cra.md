# Spécification — Module CRA

## Entités principales
- **CraEntry** : entrée journalière (date, type, portion, notes, projectEntries[])
- **CraMonth** : agrégat mensuel (statut, signedAt*, pdfUrl)
- **LeaveBalance** : solde CP/RTT/maladie par salarié par année
- **ProjectEntry** : lien CraEntry ↔ Project avec portion travaillée

## Types de jours (enum CraEntryType)
WORK_ONSITE | WORK_REMOTE | WORK_TRAVEL | LEAVE_CP | LEAVE_RTT |
SICK | HOLIDAY | TRAINING | ASTREINTE | OVERTIME

## Statuts CraMonth (workflow de signature)
```
DRAFT
  └─ submit()          → SUBMITTED
       └─ signEmployee() → SIGNED_EMPLOYEE
            └─ signESN()    → SIGNED_ESN
                 └─ signClient() → SIGNED_CLIENT  ← état final
```
Chaque transition : audit log + notification aux parties concernées.
Refus possible à chaque étape avec commentaire obligatoire → retour à DRAFT.

## Calculs automatiques
- Jours travaillés = somme des CraEntry de type WORK_*
- Jours non travaillés = somme LEAVE_* + SICK + HOLIDAY
- Solde CP restant = LeaveBalance.cp_initial - somme LEAVE_CP du millésime
- Alerte automatique si total saisi > jours ouvrables du mois

## Génération PDF
Librairie : Puppeteer (rendu HTML → PDF) dans packages/pdf-generator
Contenu : en-tête mission, tableau journalier, totaux, zones de signature
Annexe projets incluse si includeProjectsSummary === true à la soumission

## Intégration Projets
Lors de la saisie journalière, le salarié ventile sa journée entre projets actifs :
projectEntries: [{ projectId: string, portion: FULL | HALF_AM | HALF_PM }]
