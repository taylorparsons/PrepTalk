#!/usr/bin/env python3
"""
code-refactor CLI dispatcher

Usage:
  code-refactor analyze [args...]    # run analyzer
  code-refactor refactor [args...]   # run refactor tool
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
    if cmd == "analyze":
        from code_refactor.scripts.analyze_code import main as run

        return _invoke(run, "code-refactor analyze", rest)
    if cmd == "refactor":
        from code_refactor.scripts.refactor_code import main as run

        return _invoke(run, "code-refactor refactor", rest)

    print(f"Unknown command: {cmd}\n\n" + __doc__.strip())
    return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

