#!/usr/bin/env python3
"""Generate CHANGELOG from git commits"""
import subprocess, sys
from datetime import datetime

def main():
    print("Generating CHANGELOG...\n")
    
    # Get git log
    result = subprocess.run(['git', 'log', '--pretty=format:%s', '--no-merges'], 
                          capture_output=True, text=True)
    
    if result.returncode != 0:
        print("❌ Failed to get git log")
        sys.exit(1)
    
    commits = result.stdout.strip().split('\n')
    
    # Categorize commits
    features = [c for c in commits if c.startswith('feat:')]
    fixes = [c for c in commits if c.startswith('fix:')]
    
    # Generate CHANGELOG
    changelog = f"# Changelog\n\n## [{datetime.now().strftime('%Y-%m-%d')}]\n\n"
    
    if features:
        changelog += "### Features\n"
        for feat in features:
            changelog += f"- {feat[5:]}\n"
        changelog += "\n"
    
    if fixes:
        changelog += "### Bug Fixes\n"
        for fix in fixes:
            changelog += f"- {fix[4:]}\n"
    
    with open('CHANGELOG.md', 'w') as f:
        f.write(changelog)
    
    print(f"✅ CHANGELOG.md generated with {len(features)} features and {len(fixes)} fixes")
    sys.exit(0)

if __name__ == '__main__':
    main()
