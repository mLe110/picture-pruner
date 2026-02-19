#!/bin/bash

# Only lint if source files were modified in the working tree
CHANGED=$(git diff --name-only HEAD -- 'src/' 2>/dev/null)
if [ -z "$CHANGED" ]; then
  exit 0
fi

ESLINT_OUT=$(npx eslint --max-warnings 0 src/ 2>&1)
ESLINT_EXIT=$?

if [ $ESLINT_EXIT -ne 0 ]; then
  jq -n --arg error "$ESLINT_OUT" '{
    "decision": "block",
    "reason": $error
  }'
fi
