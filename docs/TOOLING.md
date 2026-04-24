# Pipeline d'outillage Claude Code — craESN

> **Statut** : Phase 1 installée — gstack (43 skills) + 6 agents Tier 1 opérationnels. GSD et claude-mem non adoptés.
>
> Ce document synthétise l'analyse de trois ensembles d'outils pour Claude Code et propose un **pipeline d'utilisation** pour le projet **craESN** (NestJS + Next.js + Prisma + pgvector + MinIO, TDD strict, consent-first RBAC).

---

## 1. Les outils en une phrase

| Outil | Repo | Nature | Installation |
|---|---|---|---|
| **gstack** | [garrytan/gstack](https://github.com/garrytan/gstack) | Pack de ~39 skills Claude Code (CEO, Eng Manager, QA, CSO, Release Engineer, Browser, etc.) | `git clone ... ~/.claude/skills/gstack && ./setup` (requiert **Bun**) |
| **GSD (Get Shit Done)** | [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | Meta-framework spec-driven — découpe un projet en phases, dispatch des subagents à contexte frais, suit l'état dans `.planning/` | skill install (v1) ou `gsd-pi` CLI (v2) |
| **awesome-claude-code-agents** | [navin4078](https://github.com/navin4078/awesome-claude-code-agents), [VoltAgent](https://github.com/VoltAgent/awesome-claude-code-subagents), [wshobson/agents](https://github.com/wshobson/agents), [0xfurai](https://github.com/0xfurai/claude-code-subagents) | Catalogues curated d'agents spécialisés (NestJS, Prisma, Playwright, security-auditor, etc.) | Copie directe des `.md` dans `.claude/agents/` du projet |
| **RTK (Rust Token Killer)** | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | Proxy CLI transparent via hook PreToolUse — compresse output git/docker/pnpm/etc. (60-90% tokens) | Déjà installé v0.34.2 (user global) |
| **claude-mem** | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Mémoire sémantique cross-session (SQLite + Chroma + worker Express) | 🟡 Non adopté — conditionnel (voir §9) |

**Complémentarité** :
- **gstack** = workflow unifié (planning → ship) + navigateur rapide pour QA.
- **GSD** = structuration de gros chantiers multi-phases avec contexte injecté.
- **awesome-*** = experts ponctuels piqués pour remplir les trous stack-specific.

---

## 2. Pipeline d'utilisation (logique par type de tâche)

Chaque scénario indique l'ordre **recommandé** des invocations. Les commandes entre guillemets existent dans les packs correspondants.

### 2bis. Comment invoquer un slash command — format attendu

Un slash command (`/investigate`, `/office-hours`, `/review`, etc.) **attend du contexte en argument**, comme un prompt normal. Sans contexte, le skill fait sa meilleure interprétation — ce qui donne des résultats médiocres.

**Règle générale** : `/<command> <contexte riche>`

#### Exemples concrets pour les 5 commands gstack les plus utilisées

| Command | Contexte minimum à fournir | Exemple |
|---|---|---|
| `/investigate` | Symptôme + reproduction + erreur/log + fichier suspect | `/investigate Le POST /api/clients retourne 500 quand on crée un nouveau client. Erreur backend: "Cannot read property 'id' of undefined" dans ClientsService.create (apps/backend/src/clients/clients.service.ts:42). Reproduit sur toutes les créations depuis le merge du commit cfd11cb.` |
| `/office-hours` | Problème de design/produit à challenger | `/office-hours Je veux ajouter un workflow de signature électronique des CRA par le client. Question : doit-on passer par DocuSign externe ou implémenter une signature cryptographique interne ? Contraintes : consent-first, audit trail obligatoire.` |
| `/plan-eng-review` | Plan ou design doc à valider | `/plan-eng-review Voici mon plan pour le module notifications v2 (escalade météo projets): [coller le plan]. Vérifier edge cases, threading BullMQ, idempotence, ConsentGuard sur les webhooks client.` |
| `/review` | Rien — lit le diff de la branche en cours automatiquement | `/review` (ou `/review focus on backend services` pour scoper) |
| `/qa` | Flow à tester + URL dev | `/qa Test le flow "création d'un CRA salarié → validation ESN → validation client" sur http://localhost:3100. Compte test: employee@test.fr / Azerty123!` |
| `/ship` | Rien — utilise la branche + diff. Optionnel : message commit custom | `/ship` ou `/ship feat(notifications): ajout escalade météo` |

**Pour les commands craESN-specific** (déjà aligné avec la convention du projet) :
- `/new-module <nom>` — ex: `/new-module signature`
- `/review-security` — pas d'argument, scanne toute la branche
- `/git-commit` / `/git-pr` — lit le staging

**Anti-pattern** : `/investigate bug dans le frontend` — trop flou, le skill partira sur une chasse générique. Donner toujours : quoi + où + reproduction.

### A. Bug fix isolé (<2h, 1 module touché)

| Étape | Outil | Commande | Exemple d'usage |
|---|---|---|---|
| 1 | gstack | `/investigate <description+repro+erreur>` | Voir §2bis ci-dessous pour le format exact |
| 2 | craESN | manuel | **Écrire un test qui reproduit** (TDD strict craESN) |
| 3 | craESN | manuel | Fix + `pnpm test && pnpm typecheck` |
| 4 | gstack | `/review` | Catch regressions + valide coverage (lit la branche en cours) |
| 5 | craESN | `/git-commit` ou gstack `/ship` | `/git-commit` si commit local seul, `/ship` si flow PR complet |

**Ne PAS invoquer** : GSD (overkill pour 2h), architect-reviewer (pas de changement structurel).

### B. Nouvelle feature (1 sprint, 2-3 modules touchés)

| Étape | Outil | Commande | Exemple / Raison |
|---|---|---|---|
| 1 | gstack | `/office-hours <scope>` | `/office-hours Ajout d'un module "signature électronique" pour valider les CRA côté client — scope, entités Prisma, sécurité ?` |
| 2 | gstack | `/plan-eng-review` | Architecture, edge cases ConsentGuard (lit le plan de l'étape 1) |
| 3 | craESN | `/new-module <nom>` | Si module NestJS neuf — scaffold branche + controller + service + Prisma |
| 4 | awesome (VoltAgent) | `nestjs-expert` / `prisma-expert` / `nextjs-developer` | Pattern enterprise + type-safety (si ajout complexe non couvert par `/new-module`) |
| 5 | craESN | manuel | **Tests d'abord** (vitest + playwright), puis code |
| 6 | craESN | `/review-security` | Audit craESN-specific : ConsentGuard, ResourceOwnerGuard, RAG isolation, S3 TTL |
| 7 | gstack | `/cso` | OWASP + STRIDE générique (complète `/review-security`) |
| 8 | gstack | `/review` | Staff-level review sur le diff final |
| 9 | gstack | `/qa` ou `/browse <url>` | Validation UI sur dev local |
| 10 | craESN | `/git-pr` ou gstack `/ship` | Création PR |

### C. Feature majeure / nouveau module (multi-sprint)

| Étape | Outil | Commande | Raison |
|---|---|---|---|
| 1 | GSD | `/gsd-new-project --auto @sprint-N-PRD.md` | Découpe en phases, génère ROADMAP.md |
| 2 | GSD | `/gsd-plan-phase` (par phase) | Plans atomiques, tests-first injectés |
| 3 | awesome (VoltAgent) | `architect-reviewer` | Valide structure globale avant dispatch |
| 4 | GSD | execute waves (dispatch subagents) | Contexte frais par tâche, évite le context rot |
| 5 | gstack | `/cso` (fin de chaque phase) | Audit progressif, pas bloc final |
| 6 | gstack | `/review` + `/qa` (par phase) | Gates itératifs |
| 7 | gstack | `/ship` (PR par phase) | Atomic commits → revert chirurgical |

**Gain concret** : sur un sprint 5 craESN (dashboard, notifications, reports, share-tokens), GSD économise ~4-6h de planning manuel + évite l'oubli de règles ConsentGuard sur sessions longues.

### D. Refactor cross-module

| Étape | Outil | Commande | Raison |
|---|---|---|---|
| 1 | GSD | `/gsd-quick --research --validate "<description>"` | Recherche parallèle + plan |
| 2 | awesome (VoltAgent) | `refactoring-specialist` | Approche structurée |
| 3 | awesome (VoltAgent) | `architect-reviewer` | Validation avant/après |
| 4 | craESN | manuel | Garder tests verts à chaque étape |
| 5 | gstack | `/review` | Valide absence de régression logique |
| 6 | gstack | `/ship` | Une PR par chunk indépendant |

### E. Security review (périodique ou avant release)

| Étape | Outil | Commande | Raison |
|---|---|---|---|
| 1 | craESN | `/review-security` | **Audit craESN-specific existant** : ConsentGuard, ResourceOwnerGuard, RBAC, audit logs, isolation RAG, URLs S3 TTL |
| 2 | gstack | `/cso` | OWASP + STRIDE générique (complète l'étape 1) |
| 3 | awesome (VoltAgent) | `security-auditor` | Audit détaillé vulnérabilités si scope élargi |
| 4 | awesome (0xfurai) | `owasp-top10-expert` | Injections, XSS, CSRF ciblés |
| 5 | awesome (0xfurai) | `jwt-expert` | Revue JWT/NextAuth spécifique |
| 6 | awesome (VoltAgent) | `compliance-auditor` | Conformité GDPR, audit trail |

**Cadence** : `/review-security` après chaque feature touchant les données salarié. Full chain (1→6) 1× par sprint complet ou avant release preprod→prod.

### F. Release preprod (craESN-specific)

| Étape | Outil | Commande | Raison |
|---|---|---|---|
| 1 | gstack | `/ship` | Merge main → preprod (si pas déjà fait) |
| 2 | **proxmox** | `deploy-craesn` (skill projet) | Push + SSH chaîné + docker compose rebuild sur .138 |
| 3 | craESN | manuel | `curl http://192.168.1.138:3001/api/health` + log check |
| 4 | gstack | `/canary` (optionnel) | Monitoring 10 min post-deploy |

**Note** : `gstack /land-and-deploy` ne connaît pas la chaîne SSH `ssh coolify → docker exec → ssh neko@.138`. Le skill `deploy-craesn` (créé dans `proxmox/.claude/skills/`) l'encode.

---

## 3. État d'installation actuel

| Outil | Installé ? | Où |
|---|---|---|
| `skills/deploy-craesn.md` | ✅ | `~/Projects/craESN/.claude/skills/deploy-craesn.md` |
| **gstack (43 skills)** | ✅ Opérationnel | `~/.claude/skills/gstack/` + 43 symlinks à la racine de `~/.claude/skills/`. Bun 1.3.13, Chromium Playwright prêt. |
| **Agents Tier 1 (6)** | ✅ | `~/Projects/craESN/.claude/agents/` : nestjs-expert, prisma-expert, nextjs-developer, vitest-expert, playwright-expert, security-auditor |
| **CLAUDE.md craESN** | ✅ | Section "Outillage Claude Code (Phase 1 adoption)" ajoutée |
| RTK | ✅ Actif mais dormant | `~/.claude/hooks/rtk-rewrite.sh` (v0.34.2). À diagnostiquer après 1er sprint d'usage gstack. |
| GSD v1 | ❌ Non | Phase 2, après validation Phase 1 |
| claude-mem | ❌ Non | Conditionnel (voir §9.2), à ré-évaluer après Phase 1 |

**Commands craESN déjà existants** (dans `~/Projects/craESN/.claude/commands/`) — à intégrer au pipeline :

| Command | Rôle | Concurrent gstack/GSD ? |
|---|---|---|
| `/git-commit` | Commit conventional aligné `.gitmessage` | Gstack `/ship` — keep `/git-commit` pour commits isolés, `/ship` pour flow complet PR |
| `/git-pr` | Création PR | Gstack `/ship` — overlap, choisir un seul à l'usage |
| `/new-module` | Scaffolding NestJS module complet (branche + controller + service + DTO + Prisma) | Gstack `/plan-eng-review` + `nestjs-expert` — `/new-module` plus spécifique, à garder en priorité |
| `/review-security` | Audit ConsentGuard, ResourceOwnerGuard, RBAC, audit logs, isolation RAG, URLs S3 TTL | **Remplace** le besoin d'un skill `consent-guard-audit` custom et complète `/cso` gstack |
| `/startapp`, `/stopapp` | Dev local | Hors scope |

Ces commands existants sont **spécifiques craESN et plus pertinents** que leurs équivalents génériques gstack — les privilégier.

---

## 4. Conflits identifiés & résolutions

| Conflit | Origine | Résolution |
|---|---|---|
| Branches : craESN = `feat/<module>/<desc>`, GSD default = `gsd/phase-N/task-X` | GSD | Config `gsd.yaml` : `phase_branch_template: "feat/{phase_slug}/{task_slug}"` |
| Commits : craESN = conventional `feat(<module>):`, gstack & GSD = proches mais pas identiques | gstack, GSD | Déjà compatibles — vérifier avec `.gitmessage` existant à première run |
| TDD strict (tests AVANT) : gstack `/review` assume tests écrits, GSD peut permettre `<test>alongside>` | GSD | Patcher template GSD : toujours `<test>first</test>` |
| `/cso` gstack = OWASP+STRIDE, ne connaît pas ConsentGuard craESN | gstack | **Créer** skill custom `consent-guard-audit` (voir §5) qui étend `/cso` |
| Design skills gstack (`/design-*`) inutiles pour backend | gstack | Route par nom de branche : `ui/*` → design-on, `feat/backend/*` → skip |
| Session fresh context GSD v2 ≠ session continue Claude Code | GSD v2 | Utiliser **GSD v1** (slash commands dans Claude Code), pas v2 (CLI externe) |
| Code review humain obligatoire (craESN) vs `/gsd-review` auto | GSD | `/gsd-review` = aide, ne remplace PAS la review humaine sur PR |
| Préservation commit `43471a2` (NEXT_PUBLIC_BACKEND_URL) sur preprod uniquement | craESN | `/ship` ne doit jamais merger preprod→main, **règle à ajouter dans CLAUDE.md** |

---

## 5. Ajustements craESN CLAUDE.md recommandés (non appliqués)

À ajouter après la section `## Règles de développement` :

```markdown
### Outillage Claude Code (optionnel)

Le projet supporte l'usage conditionnel de gstack, GSD et agents awesome-*.
Voir `../proxmox/docs/TOOLING.md` pour le pipeline complet.

**Règles spécifiques :**
- `/cso` (gstack) ne couvre PAS ConsentGuard. Pour tout accès ESN → données
  salarié, compléter avec le skill custom `consent-guard-audit` qui vérifie :
  - `user.role` ET `resourceOwner.id === user.id` sur chaque endpoint
  - Audit trail loggué sur mutation sensible (partage, blocage, accès)
  - Aucune note privée ESN/Salarié exposée au CLIENT
- `/ship` : JAMAIS merger `preprod → main`. Le Dockerfile frontend preprod
  contient `NEXT_PUBLIC_BACKEND_URL` hardcodé (commit 43471a2) qui ne doit
  pas remonter sur main.
- TDD strict : tout skill/agent qui suggère un fix doit être suivi d'un test
  AVANT merge. `/review` et `/ship` assument tests écrits.
- Design skills gstack (`/design-*`) : utiliser **uniquement** sur branches `ui/*`.
```

**Pas besoin de créer un `consent-guard-audit` custom** : le command `/review-security` existant dans `~/Projects/craESN/.claude/commands/review-security.md` couvre exactement ça (ConsentGuard, ResourceOwnerGuard, RBAC, audit logs, isolation RAG, URLs S3 TTL). Il faut juste l'invoquer à la bonne étape du pipeline.

---

## 6. Plan d'adoption progressif (si validé)

**Phase 0 — Sandbox (1-2 jours)** :
- Cloner gstack/GSD dans dossiers temporaires.
- Tester `/review` et `/ship` sur une branche d'expérimentation (pas de merge).
- Valider la chaîne sur 1 bug fix et 1 petite feature.
- Critère de go/no-go : zéro friction avec TDD + branches/commits craESN.

**Phase 1 — Adoption ciblée (1 sprint)** :
- Installer gstack global (`~/.claude/skills/gstack/`).
- Installer 5 agents Tier 1 dans craESN (`./.claude/agents/`) : `nestjs-expert`, `prisma-expert`, `nextjs-developer`, `vitest-expert`, `security-auditor`.
- Créer le skill `consent-guard-audit` custom.
- Mettre à jour CLAUDE.md avec la section "Outillage Claude Code".

**Phase 2 — GSD sur gros chantier (1 sprint suivant)** :
- Premier `/gsd-new-project` sur un module neuf (ex: module `notifications` v2).
- Collecter retours, ajuster templates de phase/branche.

**Phase 3 — Extension à la carte** :
- Ajouter Tier 2 agents (`postgres-expert`, `owasp-top10-expert`, `refactoring-specialist`) quand le besoin se présente.
- Évaluer GSD v2 (CLI) seulement si les coûts token ou le parallélisme justifient.

---

## 7. Tests d'adoption à faire avant installation

Ces tests sont à exécuter **en dehors** du code craESN (branche d'expérimentation, clone temporaire, ou dossier /tmp). Les 3 rapports agents sont dans `/tmp/gstack-eval/`, `/tmp/gsd-eval/`, `/tmp/gsd-2-eval/`.

1. **gstack `/review`** sur un PR récent craESN déjà mergé : comparer les findings au review humain historique.
2. **gstack `/cso`** sur un endpoint consent-sensitive : vérifier s'il détecte les vraies failles (pas des faux positifs).
3. **gstack `/browse` + `/qa`** sur le flow login : comparer à un run Playwright e2e existant.
4. **GSD `/gsd-new-project`** sur une fake PRD (ex: "module signature électronique") : valider la qualité du ROADMAP généré.
5. **VoltAgent `nestjs-expert`** : demander d'écrire un controller consent-guarded, vérifier qu'il ajoute le guard sans qu'on le demande.

**Critères d'acceptation** (tous doivent être ✅) :
- Pas d'instruction qui contredit CLAUDE.md craESN.
- Tests générés respectent TDD first.
- Branches/commits respectent conventions craESN.
- ConsentGuard n'est jamais omis sur accès ESN → salarié.

---

## 9. RTK et claude-mem — intégration au pipeline

### 9.1 RTK (déjà actif)

**État** : installé v0.34.2, hook PreToolUse actif, mais dormant (0 invocation en 30 jours malgré 1951 Bash commands). Token savings potentiels non exploités : ~56,8K sur 30j.

**Diagnostic à faire après install gstack** :
1. Exécuter `rtk discover` pour voir les missed opportunities.
2. Exécuter une vraie feature via le pipeline (scénario B) pour observer si les git/pnpm/docker sont bien proxifiés.
3. Si `rtk gain` reste à 0 après 1 sprint → investiguer (probablement un skip côté Claude Code sur certains modes).

**Synergie** : orthogonal à gstack/GSD/awesome-*. Compresse les outputs CLI sans interférer avec les skills. Gain estimé : **40-60K tokens/sprint** une fois gstack actif, concentré sur :
- git status / git diff / git log (monorepo Turborepo = très verbose sans compression)
- pnpm install / pnpm test
- docker ps / docker logs (stack 5 containers)
- prisma db pull / vitest / tsc

**Aucune action requise** — keep as-is.

### 9.2 claude-mem (conditionnel)

**État** : non installé. Repo = [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) — plugin Claude Code avec hooks + worker Express (port 37777) + SQLite + Chroma, recherche sémantique cross-session via MCP.

**Valeur pour craESN** : 🟡 partiellement complémentaire à la mémoire native `.claude/projects/.../memory/` :
- 🟢 ajoute recherche sémantique cross-session et capture auto
- 🟡 ajoute overhead (Bun + uv + worker ~50-200MB RAM + latency SessionStart ~2-5s)
- 🔴 risques compliance : capture automatique de prompts peut indexer des données salarié sensibles sans tag `<private>`

**Conditions à valider avant adoption** :
1. Test d'intégration avec RTK (hooks concurrents, port 37777 libre).
2. Discipline de privacy : soit taguer manuellement les prompts sensibles `<private>`, soit configurer des regex auto-strip (emails, keywords salaire, IDs salariés).

**Décision actuelle** : **attendre** fin de Phase 1 gstack pour évaluer si la mémoire native suffit ou si claude-mem apporte une valeur incrémentale justifiant le risque compliance. À re-évaluer dans 2-3 sprints.

---

## 10. Références

- gstack : https://github.com/garrytan/gstack — 39 skills, setup en 1 cmd, Chromium persistent.
- GSD v1 : https://github.com/gsd-build/get-shit-done — meta-prompting, spec-driven, skills Claude Code.
- GSD v2 : https://github.com/gsd-build/gsd-2 — CLI standalone, Pi SDK, crash recovery.
- VoltAgent subagents : https://github.com/VoltAgent/awesome-claude-code-subagents — 100+ agents spécialisés.
- 0xfurai subagents : extrait pour `nestjs-expert`, `prisma-expert`, `vitest-expert`, `playwright-expert`.
- awesome-claude-code (meta) : https://github.com/hesreallyhim/awesome-claude-code.

**Rapports d'évaluation détaillés** : disponibles dans `/tmp/gstack-eval/`, `/tmp/gsd-eval/`, `/tmp/GSD_ADOPTION_ANALYSIS.md` (générés par agents d'analyse Explore en lecture seule — aucun impact sur le projet craESN).
