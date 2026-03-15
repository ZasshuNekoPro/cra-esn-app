#!/usr/bin/env bash
# Rappel de mise à jour du fichier de tâche en cours
TASK_FILE="docs/tasks/CURRENT_TASK.md"
if [[ -f "$TASK_FILE" ]]; then
  echo ""
  echo "📋 Fin de session Claude Code"
  echo "   → Mettre à jour : $TASK_FILE"
  echo "   → Documenter l'état avant /clear (pattern Document & Clear)"
  echo "   → Vérifier que le dernier commit est propre : git status"
fi
exit 0
