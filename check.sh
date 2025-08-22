#!/bin/bash
# Скрипт проверки git-статуса

echo "📂 Текущая папка: $(pwd)"
echo "🔍 Проверка git-статуса..."

if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    git status
else
    echo "❌ Здесь нет git-репозитория"
fi
echo "✅ Проверка завершена"
