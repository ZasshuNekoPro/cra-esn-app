# Changelog — ESN CRA App

## [preprod-1.0.0] — 2026-03-25

### Infrastructure
- Dockerfile backend NestJS multi-stage (`apps/backend/Dockerfile`, port 3001)
- Dockerfile frontend Next.js standalone (`apps/frontend/Dockerfile`, port 3100)
- `next.config.js` : `output: 'standalone'` activé (image ~200 MB vs ~1 GB)
- `docker-compose.prod.yml` pour test local du stack complet
- `prisma migrate deploy` automatique au démarrage du backend (CMD du Dockerfile)

### Monitoring
- `GET /api/health` : endpoint public, vérifie la connectivité DB, retourne 200 ou 503
- Support Coolify healthcheck avec délai de démarrage de 60s (migration Prisma)

### Sécurité
- Utilisateurs non-root dans les containers (`nestjs:1001`, `nextjs:1001`)
- CORS et rate limiting déjà en place (existants)
- ThrottlerModule configurable via `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX`

### Administration
- `prisma/seed.prod.ts` : création idempotente du compte ESN_ADMIN depuis env vars
- Script `pnpm seed:prod` (backend et racine)
- Validation : `ADMIN_EMAIL` et `ADMIN_PASSWORD` (min 12 chars) requis

### Documentation
- `.env.production.example` : template commenté de toutes les variables de prod
- `infra/DEPLOY.md` : guide Coolify pas-à-pas (services, env vars, init admin, rollback)

### Notes
- Module users/missions : Phase 2 (CRUD API différé)
- Blocage de compte : Phase 2 (champ `deletedAt` présent, non exposé)
- Branche `preprod` déployée directement via Coolify, ne fusionne pas dans `main`

---

## [0.5.0] — 2026-03-23

### Fixes
- Fix login : `!result?.ok` au lieu de `result?.error` — résistance aux réponses ambiguës de `signIn()`
- Fix DayCell hover : `hover:brightness-95` remplace `hover:bg-gray-50` — préserve la couleur de l'entrée

### Features
- EntryTypeLegend : légende colorée des types d'entrée CRA sous la grille
- Auto-submit CRA DRAFT→SUBMITTED lors de l'envoi d'un rapport mensuel
- Remplacement du bouton "Soumettre" par un message guidant vers `/reports`
