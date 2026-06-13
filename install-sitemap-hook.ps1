$ErrorActionPreference = "Stop"

git rev-parse --is-inside-work-tree | Out-Null
git config core.hooksPath .githooks

git update-index --chmod=+x .githooks/pre-commit

Write-Host "Sitemap hook installed." -ForegroundColor Green
Write-Host "From now on, changed HTML pages receive a new lastmod date during git commit."
