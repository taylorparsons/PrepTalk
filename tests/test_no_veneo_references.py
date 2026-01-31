from __future__ import annotations

from pathlib import Path


def _is_excluded(path: Path) -> bool:
    excluded_dirs = {
        ".git",
        ".venv",
        ".pytest_cache",
        ".ruff_cache",
        ".mypy_cache",
        ".codex",
        "__pycache__",
        "node_modules",
        "logs",
        "session_store",
        "test-results",
        "playwright-report",
        "playwright-report-mock",
        "playwright-report-live",
        "coverage",
        "dist",
        "build",
    }
    return any(part in excluded_dirs for part in path.parts)


def test_no_prior_employer_name_references() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    forbidden = "Ve" + "neo"
    violations: list[Path] = []

    for path in repo_root.rglob("*"):
        if path.is_dir() or _is_excluded(path):
            continue
        try:
            contents = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if forbidden in contents:
            violations.append(path.relative_to(repo_root))

    assert not violations, f"Found forbidden references in: {violations}"
