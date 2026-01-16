#!/usr/bin/env python3
"""Setup git hooks"""
import argparse, sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit-msg', action='store_true', help='Add commit message validation')
    parser.add_argument('--pre-commit', action='store_true', default=True, help='Add pre-commit hook')
    args = parser.parse_args()
    
    hooks_dir = Path('.git/hooks')
    if not hooks_dir.exists():
        print("❌ Not a git repository")
        sys.exit(1)
    
    if args.pre_commit:
        hook = hooks_dir / 'pre-commit'
        hook.write_text('#!/bin/sh\nnpm test\n')
        hook.chmod(0o755)
        print("✓ Installed pre-commit hook")
    
    if args.commit_msg:
        hook = hooks_dir / 'commit-msg'
        hook.write_text('#!/bin/sh\ngrep -E "^(feat|fix|docs|style|refactor|test|chore):" "$1"\n')
        hook.chmod(0o755)
        print("✓ Installed commit-msg hook")
    
    print("\n✅ Git hooks setup complete!")
    sys.exit(0)

if __name__ == '__main__':
    main()
