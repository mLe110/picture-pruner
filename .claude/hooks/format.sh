#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Only format file types prettier understands
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md|*.html)
    npx prettier --write "$FILE_PATH" > /dev/null 2>&1
    ;;
esac

exit 0
