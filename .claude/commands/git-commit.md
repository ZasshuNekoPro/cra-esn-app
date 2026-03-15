# Commande : commit guidé

## Déclencheur
Quand l'utilisateur tape : /git-commit

## Protocole
1. Exécuter : pnpm test — vérifier que tous les tests passent
2. Exécuter : pnpm typecheck — vérifier zéro erreur TypeScript
3. Exécuter : pnpm lint — vérifier zéro erreur de style
4. Si tout est vert : git add -A
5. Analyser les fichiers modifiés pour déduire le scope du commit
6. Proposer un message au format Conventional Commits
7. Attendre confirmation avant d'exécuter git commit
8. Mettre à jour docs/tasks/CURRENT_TASK.md (cocher les cases)

## En cas d'échec des checks
- Ne pas committer
- Afficher les erreurs
- Proposer les corrections
