# Prochaine étape — Lancer P5 : Planification Sprint 3

**Statut :** Sprint 2 ✅ mergé sur `main` le 2026-03-16

---

## Rappel : ce qui a été livré en Sprint 2

| Tâche | Commit | Périmètre |
|---|---|---|
| T1 — CRA CRUD NestJS | `feat(cra): implement CRA CRUD module with working-day calculations` | Migration Prisma Sprint 2, CraModule, WorkingDaysUtil, 7 endpoints REST |
| T2 — Workflow signature | `feat(cra): implement signature workflow state machine with audit trail` | 7 transitions état, AuditLog, ValidationRequest, NotificationsService |
| T3 — UI saisie journalière | `feat(cra): implement monthly entry grid UI with day-level editing` | MonthGrid, DayCell, EntryModal, SignatureActions, craApi |
| T4 — Dashboard widgets | `feat(cra): add leave balance and working-days progress dashboard widgets` | LeaveBalanceSummary, WorkingDaysProgress, MonthStatusTimeline |
| T5 — Génération PDF | `feat(pdf): implement CRA PDF generation with Puppeteer and S3 auto-lock` | packages/pdf-generator, CraPdfService, auto-lock SIGNED_CLIENT→LOCKED |
| T6 — Tests e2e | `test(cra): add e2e tests for full CRA workflow — CRUD, signature, access control` | 22 tests supertest, Playwright smoke tests |

---

## Sprint 3 — Module Projets

> À planifier avec P5 (session dédiée à l'architecture + spec).

### Périmètre pressenti

**Backend NestJS**
- `ProjectsModule` : CRUD projets clients
- `WeatherEntry` : entrée météo journalière (SUN / CLOUDY / RAIN / STORM / RAINBOW / SNOW)
- `ProjectComment` : commentaires libres avec visibilité (EMPLOYEE / ESN / CLIENT)
- `Milestone` : jalons projet avec statut (PLANNED / IN_PROGRESS / DONE / DELAYED)
- Règles d'escalade météo : si `WeatherEntry.status === STORM` pendant N jours consécutifs → notification ESN_ADMIN automatique
- Tests unit + e2e

**Frontend Next.js**
- Page `/projects` : liste des projets avec météo dominante du mois
- Page `/projects/[id]` : détail projet — météo, commentaires, jalons
- Composant `WeatherIcon` : 6 états avec icônes + couleurs sémantiques
- Composant `ProjectTimeline` : jalons sur axe temporel
- Composant `WeatherCalendar` : grille mensuelle météo (analogue à MonthGrid pour le CRA)

**Décisions à prendre en P5**
- Granularité de la météo : journalière ou hebdomadaire ?
- Qui peut saisir la météo : EMPLOYEE seul, ou ESN_ADMIN aussi ?
- Seuil d'escalade automatique : combien de jours STORM consécutifs ?
- Visibilité des commentaires : modèle de permissions (matrice rôles) ?
- Lien avec le CRA : un projet peut-il être lié à plusieurs missions simultanément ?

---

## Action à lancer

```
P5 — Planification Sprint 3 : Module Projets
```

Demander à Claude Code de lire `docs/specs/` (si existant) et `docs/architecture/`
puis rédiger `docs/tasks/CURRENT_TASK.md` Sprint 3 complet (même format que Sprint 2).
