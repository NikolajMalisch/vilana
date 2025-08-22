#!/usr/bin/env bash
# check_repo.sh — Быстрый аудит git-проекта на большие файлы и LFS
# Использование: ./check_repo.sh [порог_МБ]
# По умолчанию порог = 100 МБ

set -euo pipefail

THRESHOLD_MB="${1:-100}"
THRESHOLD_BYTES=$(( THRESHOLD_MB * 1024 * 1024 ))

sep() { printf "\n%s\n" "----------------------------------------"; }
human() { # bytes -> человекочитаемый вид
    awk 'function human(x){ s="BKMGTPE"; while (x>=1024 && length(s)>1){x/=1024; s=substr(s,2)} return sprintf("%.2f %s", x, substr(s,1,1)) } {print human($1)}'
}

echo "🔎 Проверка репозитория (порог: ${THRESHOLD_MB} MB)"

# 1) Внутри ли мы git-репозитория
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "❌ Здесь нет git-репозитория."
    exit 1
fi

# 2) Краткий статус
sep
echo "📌 Git статус:"
git status -sb || true

# 3) Проверка наличия Git LFS
sep
LFS_OK=false
if command -v git-lfs >/dev/null 2>&1; then
    echo "✅ Git LFS установлен: $(git lfs version)"
    LFS_OK=true
else
    echo "⚠️ Git LFS не установлен. Если нужны большие бинарники — установи: https://git-lfs.github.com"
fi

# 4) Проверка трекинга LFS по .gitattributes
HAS_LFS_ATTR=false
if [ -f .gitattributes ]; then
    if grep -E 'filter=lfs|^(\*|\.)?\.exe' .gitattributes >/dev/null 2>&1; then
    echo "ℹ️  Найдены правила в .gitattributes, возможно используется LFS."
    HAS_LFS_ATTR=true
    else
    echo "ℹ️  .gitattributes есть, но без фильтров LFS для больших файлов."
    fi
    else
    echo "ℹ️  Файл .gitattributes отсутствует."
fi

# 5) Большие файлы в рабочем дереве (включая неотслеживаемые)
sep
echo "🧱 Поиск больших файлов в рабочем дереве (> ${THRESHOLD_MB} MB):"
FOUND_BIG=false
# Учтём Windows Git Bash: stat -c%s для GNU, stat -f%z для BSD/мак. Пробуем оба.
while IFS= read -r -d '' f; do
    size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)
    if [ "$size" -ge "$THRESHOLD_BYTES" ]; then
    FOUND_BIG=true
    echo "$(printf "%s\t" "$size" | human)  $f"
    fi
done < <(find . -type f ! -path "./.git/*" -print0)

if [ "$FOUND_BIG" = false ]; then
    echo "✅ Больших файлов в рабочем дереве не найдено."
fi

# 6) Большие файлы среди отслеживаемых git (индекс/HEAD)
sep
echo "📦 Поиск больших ОТСЛЕЖИВАЕМЫХ файлов (> ${THRESHOLD_MB} MB):"
FOUND_BIG_TRACKED=false
while IFS= read -r -d '' f; do
    size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)
    if [ "$size" -ge "$THRESHOLD_BYTES" ]; then
    FOUND_BIG_TRACKED=true
    echo "$(printf "%s\t" "$size" | human)  $f"
    fi
done < <(git ls-files -z)

if [ "$FOUND_BIG_TRACKED" = false ]; then
    echo "✅ Больших отслеживаемых файлов не найдено."
fi

# 7) Специальная проверка .exe (частая проблема)
sep
echo "🧨 Крупные .exe-файлы (> 1 MB):"
FOUND_EXE=false
while IFS= read -r -d '' f; do
    size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)
  if [ "$size" -ge $((1 * 1024 * 1024)) ]; then
    FOUND_EXE=true
    echo "$(printf "%s\t" "$size" | human)  $f"
    fi
done < <(find . -type f -iname "*.exe" ! -path "./.git/*" -print0)

if [ "$FOUND_EXE" = false ]; then
    echo "✅ Крупных .exe не найдено."
fi

# 8) Рекомендации
sep
PROBLEM=false
    if [ "$FOUND_BIG_TRACKED" = true ]; then
    PROBLEM=true
    echo "❗ Обнаружены большие ОТСЛЕЖИВАЕМЫЕ файлы. GitHub не принимает файлы > 100 MB."
    echo "   Варианты решения:"
    echo "   - Удалить из индекса и добавить в .gitignore:"
    echo "       git rm --cached <path> && echo '<path>' >> .gitignore && git commit -m 'remove large file'"
    echo "   - Или перевести в LFS (и мигрировать историю):"
    echo "       git lfs install"
    echo "       git lfs track '<pattern>'"
    echo "       git add .gitattributes && git commit -m 'Track via LFS'"
    echo "       git lfs migrate import --include='<pattern>'"
    echo "       git push --force-with-lease origin main"
fi

if [ "$FOUND_EXE" = true ] && [ "$LFS_OK" = false ]; then
PROBLEM=true
echo "❗ Найдены .exe, а Git LFS не установлен. Если эти файлы нужно хранить — поставь Git LFS."
fi

if [ "$PROBLEM" = false ]; then
echo "🎉 Проблем не обнаружено. Можно пушить."
fi

sep
echo "🧾 Последние 3 коммита:"
git log --oneline -n 3 || true

echo "✅ Готово."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "✅ Здесь есть git-репозиторий"
    git status -sb || true
else
    echo "❌ Здесь нет git-репозитория"
fi