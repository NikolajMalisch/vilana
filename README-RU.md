# Автоматическое обновление `sitemap.xml`

## Установка

Скопируйте содержимое этой папки в корень репозитория Vilana. Затем один раз выполните в PowerShell из корня проекта:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-sitemap-hook.ps1
```

После этого обычный commit работает так:

```bash
git add .
git commit -m "Update website"
git push
```

Перед созданием commit hook автоматически:

1. определяет изменённые и уже добавленные в staging HTML-файлы;
2. ставит сегодняшнюю дату только соответствующим URL в `sitemap.xml`;
3. для остальных URL сохраняет дату их последнего Git-коммита;
4. автоматически добавляет изменённый `sitemap.xml` в тот же commit.

## Ручной запуск

```bash
python scripts/update_sitemap_lastmod.py
```

Поставить сегодняшнюю дату всем HTML-страницам:

```bash
python scripts/update_sitemap_lastmod.py --all-today
git add sitemap.xml
```

## Важно

- Сначала выполните `git add` для изменённых HTML-файлов, затем `git commit`.
- Скрипт не добавляет и не удаляет URL. Он обновляет только `<lastmod>` существующих записей.
- Новую страницу всё равно нужно один раз вручную добавить в `sitemap.xml` вместе с её `hreflang`-парами.
