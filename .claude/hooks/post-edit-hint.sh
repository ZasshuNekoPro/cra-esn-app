#!/usr/bin/env bash
# Rappel de qualité léger — non bloquant (exit 0 toujours)
INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" \
  2>/dev/null || echo "")

if [[ "$FILE" == *.ts ]] || [[ "$FILE" == *.tsx ]]; then
  echo "💡 [qualité] Après modification TypeScript :"
  echo "   pnpm typecheck   → vérifier les types"
  echo "   pnpm test        → vérifier les tests"
  echo "   pnpm lint        → vérifier le style"
fi
exit 0
