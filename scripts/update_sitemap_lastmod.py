#!/usr/bin/env python3
"""Update sitemap.xml <lastmod> values from Git history.

Rules:
- HTML files staged for the current commit receive today's date.
- Unchanged HTML files use the date of their latest Git commit.
- Only existing sitemap entries are updated; URLs are never added or removed.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import date
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlparse

SITEMAP = Path("sitemap.xml")
URL_BLOCK_RE = re.compile(r"<url>.*?</url>", re.DOTALL)
LOC_RE = re.compile(r"<loc>\s*(.*?)\s*</loc>")
LASTMOD_RE = re.compile(r"(<lastmod>)\s*\d{4}-\d{2}-\d{2}\s*(</lastmod>)")


def run_git(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args],
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    return result.stdout.strip()


def normalize_git_path(value: str) -> str:
    return PurePosixPath(value.replace("\\", "/")).as_posix()


def url_to_repo_file(url: str) -> str:
    path = unquote(urlparse(url).path)
    if path == "/":
        return "index.html"
    if path.endswith("/"):
        return normalize_git_path(path.lstrip("/") + "index.html")
    return normalize_git_path(path.lstrip("/"))


def staged_html_files() -> set[str]:
    output = run_git(
        "diff", "--cached", "--name-only", "--diff-filter=ACMR", "--", "*.html",
        check=False,
    )
    return {normalize_git_path(line) for line in output.splitlines() if line.strip()}


def last_git_date(file_path: str) -> str | None:
    output = run_git("log", "-1", "--format=%cs", "--", file_path, check=False)
    return output or None


def update_block(block: str, staged: set[str], today: str) -> tuple[str, bool]:
    loc_match = LOC_RE.search(block)
    if not loc_match:
        return block, False

    repo_file = url_to_repo_file(loc_match.group(1))
    if not Path(repo_file).is_file():
        print(f"WARN: no local file for {loc_match.group(1)} -> {repo_file}", file=sys.stderr)
        return block, False

    wanted_date = today if repo_file in staged else last_git_date(repo_file)
    if not wanted_date:
        wanted_date = today

    if LASTMOD_RE.search(block):
        updated = LASTMOD_RE.sub(rf"\g<1>{wanted_date}\g<2>", block, count=1)
    else:
        updated = LOC_RE.sub(
            lambda match: f"{match.group(0)}\n    <lastmod>{wanted_date}</lastmod>",
            block,
            count=1,
        )
    return updated, updated != block


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--all-today",
        action="store_true",
        help="Set all existing sitemap HTML entries to today's date.",
    )
    args = parser.parse_args()

    if not SITEMAP.is_file():
        print("ERROR: sitemap.xml not found in repository root.", file=sys.stderr)
        return 1

    try:
        run_git("rev-parse", "--show-toplevel")
    except subprocess.CalledProcessError:
        print("ERROR: run this script inside a Git repository.", file=sys.stderr)
        return 1

    today = date.today().isoformat()
    staged = staged_html_files()
    if args.all_today:
        staged = {
            normalize_git_path(path)
            for path in run_git("ls-files", "*.html", check=False).splitlines()
            if path.strip()
        }

    original = SITEMAP.read_text(encoding="utf-8")
    changed_count = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal changed_count
        updated, changed = update_block(match.group(0), staged, today)
        changed_count += int(changed)
        return updated

    updated = URL_BLOCK_RE.sub(replace, original)
    if updated != original:
        SITEMAP.write_text(updated, encoding="utf-8", newline="\n")
        print(f"Updated {changed_count} sitemap entr{'y' if changed_count == 1 else 'ies'}.")
    else:
        print("sitemap.xml is already up to date.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
