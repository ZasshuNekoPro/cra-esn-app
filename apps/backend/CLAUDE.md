# Backend — NestJS Context

## Structure des modules
Chaque module suit le pattern NestJS standard :
`module.ts / controller.ts / service.ts / dto/ / entities/`

## Prisma
- Schéma : `src/database/schema.prisma`
- Migrations : `pnpm db:migrate` (jamais de `db push` en production)
- Types générés dans `packages/shared-types/prisma`

## Endpoints critiques à couvrir par des tests
- `POST /cra/:id/submit` → workflow signature
- `GET /projects/:id/weather-history` → historique météo
- `POST /consent/request` → demande d'accès ESN
- `POST /rag/query` → requête RAG salarié

## Tests
```bash
pnpm --filter backend test        # unit
pnpm --filter backend test:e2e    # e2e avec DB de test
```

## Guards obligatoires sur chaque route
- `@UseGuards(JwtAuthGuard, RolesGuard)` → toutes les routes authentifiées
- `@UseGuards(ConsentGuard)` → routes ESN accédant aux données salarié
- `@UseGuards(ResourceOwnerGuard)` → routes salarié sur ses propres ressources
