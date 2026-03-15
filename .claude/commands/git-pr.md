# Commande : créer une Pull Request

## Déclencheur
Quand l'utilisateur tape : /git-pr

## Protocole
1. Vérifier que la branche courante n'est pas main
2. Exécuter : pnpm test && pnpm typecheck && pnpm lint
3. Lister tous les commits de la branche vs main
4. Rédiger un titre PR au format : "feat(<scope>): <description>"
5. Rédiger un body PR avec :
   - ## Résumé (ce que fait cette PR)
   - ## Modules impactés
   - ## Tests ajoutés
   - ## Checklist (breaking changes, migration DB, variables d'env nouvelles)
6. Exécuter : git push -u origin <branche-courante>
7. Exécuter : gh pr create --title "..." --body "..."
8. Afficher le lien vers la PR créée

## Prérequis
- gh CLI installé et authentifié (gh auth login)
- Remote origin configuré sur le repo GitHub
