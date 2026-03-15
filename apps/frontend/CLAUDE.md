# Frontend — Next.js App Router Context

## Convention routing (App Router)
- `(auth)/` → pages publiques (login, register)
- `(dashboard)/` → pages salarié (role: EMPLOYEE)
- `(esn)/` → pages admin ESN (role: ESN_ADMIN)
- Middleware Next.js protège les routes selon le rôle

## Composants UI
- Base : shadcn/ui — ne pas recréer ce qui existe déjà
- Icône météo projet : `components/projects/WeatherIcon.tsx`
- Toujours utiliser les tokens Tailwind du design system

## État global
- Zustand pour l'état client local (stores/)
- TanStack Query pour le cache des données serveur
- NextAuth.js session pour l'authentification

## Règles composants
- Server Components par défaut
- 'use client' uniquement si hooks React ou événements DOM nécessaires
- Jamais de fetch direct dans les composants → passer par `lib/api/`
- Toujours typer les props avec les types de `packages/shared-types`
