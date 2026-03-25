# Fix + Feature : AXE 1 Auth · AXE 2 CRA Coloring · AXE 3 Auto-Submit

**Date :** 2026-03-23
**Branche :** `fix-and-feat/cra-visual-submit-logic`
**Statut :** PLANIFIÉ — en attente de validation

---

## Contexte

Session de diagnostic et planification sur 3 axes indépendants. Aucun code n'a été écrit.
Ce document est le plan validable. Implémentation uniquement après accord explicite.

---

## AXE 1 — Bug : redirection vers /dashboard sans authentification

### Diagnostic

**Fichiers analysés :** `middleware.ts`, `login/page.tsx`, `auth.ts`, `app/page.tsx`

**Root page.tsx** (`/`) fait un `redirect('/dashboard')` inconditionnel côté serveur —
mais le middleware s'exécute AVANT le composant serveur, donc les utilisateurs non
authentifiés sont bien redirigés vers `/login`. Ce n'est pas la cause.

**Cause racine identifiée — `login/page.tsx` ligne 28 :**

```tsx
const result = await signIn('credentials', { ..., redirect: false });
if (result?.error) {
  setError('Identifiants incorrects...');
} else {
  router.push('/dashboard');  // ← exécuté si result?.error est falsy
}
```

La vérification `result?.error` est trop faible. `SignInResponse` expose `ok: boolean` ET
`error?: string`. Dans certains cas (backend mort → `authorize()` throws → NextAuth v5
récupère l'exception mais peut retourner `{ ok: false, error: undefined }`), `result?.error`
est `undefined` (falsy) → la branche `else` s'exécute → `router.push('/dashboard')` → le
middleware bloque et redirige vers `/login` → l'utilisateur voit une redirection confuse
(flash) sans jamais voir le message d'erreur.

**Scénario reproductible :** backend mort au moment du clic "Se connecter".

**Vérification secondaire :** le check `isAuthenticated = !!session` dans le middleware
est correct (NextAuth v5 retourne `null` si token invalide/expiré). La logique de
déconnexion via `signOutAction` est en place. Pas de bug dans le middleware lui-même.

---

## AXE 2 — Feature/Bug : absence de retour visuel coloré sur les cellules du calendrier CRA

### Diagnostic

**Fichiers analysés :** `DayCell.tsx`, `MonthGrid.tsx`, `CraMonthClient.tsx`, `EntryModal.tsx`

**État actuel :** Les couleurs par type d'entrée EXISTENT déjà dans `DayCell.tsx` :
```tsx
const ENTRY_TYPE_COLORS: Record<CraEntryType, string> = {
  [CraEntryType.WORK_ONSITE]: 'bg-blue-100',
  [CraEntryType.WORK_REMOTE]: 'bg-cyan-100',
  ...
};
```

La logique d'application est aussi présente (lignes 59–65 de `DayCell.tsx`).

**Bug réel trouvé — hover efface la couleur (ligne 83 `DayCell.tsx`) :**
```tsx
className={`... hover:bg-gray-50 ${bgColor} ...`}
```
En CSS Tailwind, `hover:bg-gray-50` s'applique au survol avec une spécificité plus élevée
que `bg-blue-100` → la couleur de l'entrée disparaît au survol pour les cellules cliquables.
L'utilisateur survole une cellule colorée → elle devient blanche/grise → illusion que la
couleur n'est pas là.

**Problème UX secondaire :** aucune légende n'explique ce que chaque couleur signifie.

**Réponses aux questions :**

- **Q1 — Légende nécessaire ?** OUI. L'utilisateur ne peut pas deviner que bg-blue-100 = présentiel
  sans légende. À ajouter sous la grille dans `CraMonthClient.tsx`.

- **Q2 — Hover à corriger ?** OUI. Remplacer `hover:bg-gray-50` par `hover:brightness-95`
  (effet assombri subtil qui préserve la teinte de l'entrée).

- **Q3 — Couleur visible en read-only ?** OUI, déjà implémenté dans la branche `div`
  de `DayCell.tsx` (lignes 100–127) — les couleurs s'affichent sans hover. Pas de
  correction nécessaire pour le mode lecture.

**Mise à jour d'état OK :** `CraMonthClient.tsx` met à jour `entries` state immédiatement
après save/delete → `MonthGrid` reçoit les nouvelles entrées → `DayCell` recalcule
`bgColor`. La réactivité est correcte.

---

## AXE 3 — Changement structurel : déclencher SUBMITTED via l'envoi de rapport

### Diagnostic

**Fichiers analysés :** `cra-signature.service.ts`, `reports-send.service.ts`,
`SignatureActions.tsx`, `MonthStatusTimeline.tsx`, `cra.controller.ts`
**Grep SUBMITTED :** 22 occurrences dans backend (service, tests unit, e2e) +
6 occurrences dans frontend (SignatureActions, MonthStatusTimeline, e2e Playwright)

### Machine d'états actuelle
```
DRAFT ──[Soumettre]──→ SUBMITTED ──[Signer]──→ SIGNED_EMPLOYEE
                              ↑                        │
                         [Retirer]◄──────────────────────
SUBMITTED ──[reject-esn]──→ DRAFT
SIGNED_EMPLOYEE ──[sign-esn]──→ SIGNED_ESN ──[sign-client]──→ SIGNED_CLIENT ──→ LOCKED
```

### Proposition : déclencher SUBMITTED lors de l'envoi du rapport

**Nouveau flow :**
```
DRAFT ──[Envoi rapport]──→ SUBMITTED (auto) ──[Signer]──→ SIGNED_EMPLOYEE
                                ↑
                           [Retirer]◄─── toujours disponible
```

Le bouton "Soumettre" dans `SignatureActions` est supprimé pour l'état DRAFT.
Le `POST /cra/months/:id/submit` reste fonctionnel (utile pour les tests et potentiellement
d'autres intégrations futures, mais n'est plus exposé dans l'UI).

### Réponses aux questions (ultrathink)

**Q4 — Fusionner SUBMITTED dans SIGNED_EMPLOYEE (sauter l'état intermédiaire) ?**
→ **NON recommandé.** SUBMITTED est une étape de préparation distincte de la signature
formelle. Le retrait (SUBMITTED → DRAFT) est précieux : l'employé peut annuler avant de
signer officiellement. Supprimer cet état forcerait à gérer la rétractation au niveau
SIGNED_EMPLOYEE, ce qui est plus complexe et plus coûteux à tester.

**Q5 — Que devient "Retirer la soumission" ?**
→ **Inchangé.** Le bouton "Retirer la soumission" reste disponible en état SUBMITTED.
Si l'employé retire, le CRA repasse en DRAFT. Le prochain envoi de rapport re-déclenche
automatiquement la transition DRAFT → SUBMITTED. Cycle logique et cohérent.

**Q6 — Appel atomique de `submit()` dans `sendMonthlyReport()` ?**
→ **Injection directe Prisma, pas via CraSignatureService.** Raisons :
  1. Évite une dépendance circulaire potentielle entre `ReportsSendService` et
     `CraSignatureService` (CraSignatureService utilise `CraPdfService` — pas de risque
     direct aujourd'hui, mais c'est fragile).
  2. La logique d'auto-submit dans le contexte du rapport est plus légère : pas besoin
     de l'audit log CRA_SUBMITTED ni de la notification ESN "Nouveau CRA à valider"
     (le rapport envoyé joue ce rôle).
  3. Garde-fou : auto-submit uniquement si `entries.length > 0` (CRA non vide).
     Un rapport peut être envoyé avec un CRA vide — dans ce cas, le statut reste DRAFT.

**Q7 — Migration des CRA months existants ?**
→ **Aucune migration Prisma requise.** L'auto-submit ne concerne que la transition
DRAFT → SUBMITTED déclenchée lors d'un envoi. Les CRA en SUBMITTED, SIGNED_*, LOCKED
ne sont pas touchés. Les CRA en DRAFT restent en DRAFT jusqu'au prochain envoi de rapport.

### Impact sur les tests

| Fichier | Impact |
|---------|--------|
| `reports-send.service.spec.ts` | Ajouter un cas : CRA en DRAFT avec entrées → auto-submit attendu |
| `cra-workflow.e2e.spec.ts` | Le endpoint `submit` reste testé directement — inchangé |
| `scenario-02-signature-workflow.spec.ts` | Le workflow SUBMITTED → bouton Signer → inchangé |
| `SignatureActions.tsx` tests | Supprimer le test du bouton "Soumettre" en état DRAFT |

### Impact sur les fichiers

**Backend :**
- `apps/backend/src/reports/reports-send.service.ts` — ajouter lookup CraMonth + auto-submit
- `apps/backend/src/reports/reports-send.service.spec.ts` — ajouter cas DRAFT + auto-submit

**Frontend :**
- `apps/frontend/src/components/cra/SignatureActions.tsx` — remplacer le bloc DRAFT+EMPLOYEE
  (bouton "Soumettre") par un message informatif avec lien vers `/reports`

**Shared types / Prisma :** aucun changement.

---

## GROUPE T — Tâches

### T1 — Fix login : résistance aux réponses ambiguës de signIn()
- **Type :** BUG (AXE 1)
- **Fichier :** `apps/frontend/src/components/cra/` → **NON** — `apps/frontend/src/app/(auth)/login/page.tsx`
- **Changement :** Remplacer `if (result?.error)` par `if (!result?.ok)`
  ```tsx
  // Avant
  if (result?.error) { setError(...); } else { router.push('/dashboard'); }

  // Après
  if (!result?.ok) { setError(...); } else { router.push('/dashboard'); }
  ```
- **Bonus (même commit) :** utiliser `callbackUrl` depuis `useSearchParams()` si présent
  ```tsx
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/dashboard';
  router.push(callbackUrl);
  ```
- **Tests :** typecheck + `pnpm test` (frontend)
- **Dépend de :** rien
- [x] Implémenté
- [x] Tests passent
- [x] Commité

---

### T2 — Fix DayCell hover : préserver la couleur de l'entrée au survol
- **Type :** BUG UX (AXE 2)
- **Fichier :** `apps/frontend/src/components/cra/DayCell.tsx`
- **Changement :** Dans la branche `isClickable` (bouton), remplacer
  `hover:bg-gray-50` par `hover:brightness-95` dans la className du bouton
  (Tailwind `brightness` utilities — disponible depuis Tailwind v3.0)
- **Tests :** DayCell.spec.tsx — vérifier que la classe correcte est présente
- **Dépend de :** rien
- [x] Implémenté
- [x] Tests passent
- [x] Commité

---

### T3 — Feature : légende des couleurs sous la grille CRA
- **Type :** FEATURE UX (AXE 2)
- **Fichiers :**
  - `apps/frontend/src/components/cra/CraMonthClient.tsx` — ajouter `<EntryTypeLegend />`
  - `apps/frontend/src/components/cra/EntryTypeLegend.tsx` (nouveau composant)
- **Contenu de la légende :** grille compacte de pastilles colorées + labels courts
  uniquement pour les types "travail" et "congé" courants (pas HOLIDAY, OVERTIME, ASTREINTE
  sauf si présents dans les entrées du mois — option simplifiée : afficher tous les types
  courants statiquement)
- **Dépend de :** T2 (cohérence des couleurs)
- [x] Implémenté
- [x] Tests passent
- [x] Commité

---

### T4 — Feature backend : auto-submit DRAFT → SUBMITTED lors de l'envoi de rapport
- **Type :** FEATURE structurelle (AXE 3)
- **Fichiers :**
  - `apps/backend/src/reports/reports-send.service.ts`
  - `apps/backend/src/reports/reports-send.service.spec.ts`
- **Logique à ajouter dans `sendMonthlyReport()` — avant l'étape 4 (buildMonthlyReportData) :**
  ```typescript
  // Auto-submit si CRA en DRAFT avec des entrées
  const craMonthRaw = await this.prisma.craMonth.findFirst({
    where: { employeeId, year, month },
    include: { entries: { select: { id: true } } },
  });
  if (craMonthRaw?.status === 'DRAFT' && craMonthRaw.entries.length > 0) {
    await this.prisma.craMonth.update({
      where: { id: craMonthRaw.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'CRA_SUBMITTED',
        resource: `cra_month:${craMonthRaw.id}`,
        initiatorId: employeeId,
      },
    });
  }
  ```
- **Tests à ajouter :** cas CRA DRAFT + entrées → status SUBMITTED après send ;
  cas CRA DRAFT sans entrées → status reste DRAFT ; cas CRA déjà SUBMITTED → pas de double transition
- **Dépend de :** rien (pas de dépendance sur T5)
- [x] Implémenté
- [x] Tests passent
- [x] Commité

---

### T5 — Feature frontend : remplacer bouton "Soumettre" par guidance dans SignatureActions
- **Type :** FEATURE UX (AXE 3)
- **Fichier :** `apps/frontend/src/components/cra/SignatureActions.tsx`
- **Changement :** Dans le bloc `EMPLOYEE + DRAFT`, remplacer le bouton "Soumettre" par :
  ```tsx
  {userRole === Role.EMPLOYEE && status === CraStatus.DRAFT && (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-sm text-blue-800">
        Votre CRA est en cours de saisie.{' '}
        <a href="/reports" className="font-medium underline">
          Envoyez un rapport mensuel
        </a>{' '}
        pour le soumettre automatiquement.
      </p>
    </div>
  )}
  ```
- **Dépend de :** T4 (le backend doit auto-soumettre avant de modifier l'UI)
- [x] Implémenté
- [x] Tests passent
- [x] Commité

---

## Risques et points d'attention

| Risque | Mitigation |
|--------|-----------|
| T4 : `status: 'DRAFT'` en string raw (pas l'enum Prisma) | Utiliser `PrismaCraStatus.DRAFT` depuis `@prisma/client` |
| T4 : double auto-submit si report envoyé deux fois pour le même mois | Guard `status === DRAFT` — idempotent, deuxième envoi ne touche pas le status |
| T5 : l'utilisateur ne sait plus comment soumettre son CRA si il n'envoie jamais de rapport | Wording du message guidant vers /reports doit être très clair |
| T2 : `hover:brightness-95` nécessite Tailwind v3 — vérifier que `brightness` est dans la safelist si nécessaire | Non nécessaire en JIT (détecté automatiquement dans le template) |
| T3 : légende = nouveau fichier — vérifier qu'il n'existe pas déjà une abstraction similaire | Grep effectué — aucun composant `Legend` existant dans le codebase |

---

## Ordre d'exécution recommandé

T1 (indépendant) → T2 (indépendant) → T3 (après T2) → T4 (indépendant) → T5 (après T4)

T1 et T2 peuvent être commités dans la même branche feature/fix séparée ou dans
`fix-and-feat/cra-visual-submit-logic`. T4 et T5 constituent le changement structurel
principal de la branche.
