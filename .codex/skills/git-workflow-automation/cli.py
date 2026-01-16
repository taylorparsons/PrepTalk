#!/usr/bin/env python3
"""
git-workflow-automation CLI dispatcher

Usage:
  git-workflow-automation audit-security [args...]
  git-workflow-automation scan-secrets [args...]
  git-workflow-automation generate-changelog [args...]
  git-workflow-automation setup-git-hooks [args...]
"""

import sys


def _invoke(main_func, prog, rest):
    sys.argv = [prog] + rest
    return main_func()


def main():
    if len(sys.argv) < 2 or sys.argv[1] in {"-h", "--help"}:
        print(__doc__.strip())
        return 0

    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "audit-security":
        from git_workflow_automation.scripts.audit_repository_security import main as run

        return _invoke(run, "git-workflow-automation audit-security", rest)
    if cmd == "scan-secrets":
        from git_workflow_automation.scripts.scan_for_secrets import main as run

        return _invoke(run, "git-workflow-automation scan-secrets", rest)
    if cmd == "generate-changelog":
        from git_workflow_automation.scripts.generate_changelog import main as run

        return _invoke(run, "git-workflow-automation generate-changelog", rest)
    if cmd == "setup-git-hooks":
        from git_workflow_automation.scripts.setup_git_hooks import main as run

        return _invoke(run, "git-workflow-automation setup-git-hooks", rest)

    print(f"Unknown command: {cmd}\n\n" + __doc__.strip())
    return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

