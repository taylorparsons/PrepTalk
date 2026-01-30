#!/usr/bin/env python3
"""
Repository Security Audit Tool

Performs comprehensive security audit of a Git repository following
GitHub security best practices and community standards.

Based on research from:
- GitHub Well-Architected Framework
- Mozilla GitHub Security Guidelines
- 2025 GitHub Security Best Practices
"""

import argparse
import subprocess
import sys
import json
from pathlib import Path
from typing import List, Dict, Tuple

class SecurityAuditor:
    """Comprehensive repository security auditor"""

    def __init__(self, repo_path: Path = Path(".")):
        self.repo_path = repo_path
        self.excluded_path_prefixes = (
            ".codex/",
            ".venv/",
            "node_modules/",
            "playwright-report",
            "test-results",
            "logs/",
            "app/session_store/",
            "docs/requests.md"
        )
        self.findings = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": [],
            "info": []
        }
        self.checks_passed = 0
        self.checks_failed = 0

    def run_audit(self, quick: bool = False) -> Dict:
        """Run all security audit checks"""
        print("🔍 Starting Repository Security Audit...\n")

        # Core security checks
        self.check_gitignore_exists()
        self.check_for_secrets_in_history()
        self.check_for_absolute_paths()
        self.check_for_build_artifacts()
        self.check_sensitive_file_patterns()

        if not quick:
            # Additional comprehensive checks
            self.check_git_config()
            self.check_branch_protection_needed()
            self.check_github_security_features()
            self.check_dependency_files()

        self.print_report()
        return self.findings

    def check_gitignore_exists(self):
        """Verify .gitignore exists and has basic patterns"""
        gitignore = self.repo_path / ".gitignore"

        if not gitignore.exists():
            self.add_finding("high", ".gitignore missing",
                           "Create .gitignore to prevent committing sensitive files")
            return

        content = gitignore.read_text()
        required_patterns = [
            ("__pycache__", "Python cache files"),
            (".env", "Environment files"),
            ("*.pyc", "Python bytecode"),
            (".DS_Store", "macOS system files")
        ]

        for pattern, desc in required_patterns:
            if pattern not in content:
                self.add_finding("medium", f"Missing .gitignore pattern: {pattern}",
                               f"Add {pattern} to ignore {desc}")

        self.checks_passed += 1
        print("✓ .gitignore exists")

    def check_for_secrets_in_history(self):
        """Scan for common secret patterns in git history"""
        print("Scanning for secrets in git history...")

        # Common secret patterns (simplified)
        patterns = [
            (r"api[_-]?key", "API keys"),
            (r"secret[_-]?key", "Secret keys"),
            (r"password\s*=", "Hardcoded passwords"),
            (r"token\s*=", "Access tokens"),
            (r"-----BEGIN.*PRIVATE KEY-----", "Private keys"),
        ]

        try:
            # Search git history for patterns
            for pattern, desc in patterns:
                cmd = [
                    "git",
                    "log",
                    "-S",
                    pattern,
                    "--all",
                    "--oneline",
                    "--",
                    ".",
                    ":(exclude).codex",
                    ":(exclude).venv",
                    ":(exclude)node_modules",
                    ":(exclude)playwright-report",
                    ":(exclude)test-results",
                    ":(exclude)logs",
                    ":(exclude)app/session_store"
                ]
                result = subprocess.run(cmd, capture_output=True, text=True,
                                      cwd=self.repo_path)

                if result.stdout.strip():
                    self.add_finding("critical",
                                   f"Potential {desc} in git history",
                                   f"Found commits matching pattern: {pattern}. "
                                   "Review and consider cleaning git history.")

            self.checks_passed += 1
            print("✓ Secret scan completed")
        except Exception as e:
            self.add_finding("info", "Could not scan git history", str(e))

    def check_for_absolute_paths(self):
        """Check for hardcoded absolute paths in tracked files"""
        print("Checking for absolute paths...")

        try:
            # Search for /Users/ and /home/ paths
            cmd = ["git", "ls-files"]
            result = subprocess.run(cmd, capture_output=True, text=True,
                                  cwd=self.repo_path)

            if result.returncode != 0:
                self.add_finding("info", "Not a git repository or error accessing files", "")
                return

            files = result.stdout.strip().split('\n')
            files_with_abs_paths = []

            for file in files:
                if not file:
                    continue
                if file.startswith(self.excluded_path_prefixes):
                    continue
                file_path = self.repo_path / file
                if file_path.suffix in ['.pyc', '.so', '.dll', '.exe']:
                    continue  # Skip binary files

                try:
                    content = file_path.read_text(errors='ignore')
                    if '/Users/' in content or '/home/' in content:
                        files_with_abs_paths.append(file)
                except:
                    continue

            if files_with_abs_paths:
                self.add_finding("high",
                               f"Absolute paths found in {len(files_with_abs_paths)} files",
                               f"Files: {', '.join(files_with_abs_paths[:5])}")
                self.checks_failed += 1
            else:
                self.checks_passed += 1
                print("✓ No absolute paths found")

        except Exception as e:
            self.add_finding("info", "Error checking for absolute paths", str(e))

    def check_for_build_artifacts(self):
        """Check if build artifacts are tracked by git"""
        print("Checking for build artifacts...")

        artifacts = [
            "__pycache__",
            "*.pyc",
            "*.pyo",
            ".DS_Store",
            "node_modules",
            "dist/",
            "build/",
            "*.egg-info"
        ]

        try:
            cmd = ["git", "ls-files"]
            result = subprocess.run(cmd, capture_output=True, text=True,
                                  cwd=self.repo_path)

            tracked_files = result.stdout.strip().split('\n')

            found_artifacts = []
            for file in tracked_files:
                for artifact in artifacts:
                    if artifact.replace("*", "") in file:
                        found_artifacts.append(file)

            if found_artifacts:
                self.add_finding("medium",
                               f"Build artifacts tracked by git ({len(found_artifacts)} files)",
                               f"Remove from git: {', '.join(found_artifacts[:5])}")
                self.checks_failed += 1
            else:
                self.checks_passed += 1
                print("✓ No build artifacts found")

        except Exception as e:
            self.add_finding("info", "Error checking build artifacts", str(e))

    def check_sensitive_file_patterns(self):
        """Check for files that commonly contain sensitive data"""
        print("Checking for sensitive file patterns...")

        sensitive_patterns = [
            (".env", "Environment variables file"),
            ("credentials", "Credentials file"),
            ("secrets", "Secrets file"),
            (".pem", "Private key file"),
            (".key", "Key file"),
            ("id_rsa", "SSH private key")
        ]

        try:
            cmd = ["git", "ls-files"]
            result = subprocess.run(cmd, capture_output=True, text=True,
                                  cwd=self.repo_path)

            tracked_files = result.stdout.strip().split('\n')

            for file in tracked_files:
                if file.startswith(self.excluded_path_prefixes):
                    continue
                for pattern, desc in sensitive_patterns:
                    if pattern in file.lower():
                        self.add_finding("critical",
                                       f"Sensitive file tracked: {file}",
                                       f"{desc} should not be in version control")

            self.checks_passed += 1
            print("✓ Sensitive file check completed")

        except Exception as e:
            self.add_finding("info", "Error checking sensitive files", str(e))

    def check_git_config(self):
        """Check git configuration for security best practices"""
        print("Checking git configuration...")

        # Check if GPG signing is enabled
        try:
            result = subprocess.run(["git", "config", "commit.gpgsign"],
                                  capture_output=True, text=True,
                                  cwd=self.repo_path)

            if result.stdout.strip().lower() != "true":
                self.add_finding("low", "GPG commit signing not enabled",
                               "Enable with: git config --global commit.gpgsign true")
        except:
            pass

        self.checks_passed += 1
        print("✓ Git config check completed")

    def check_branch_protection_needed(self):
        """Check if repository should have branch protection"""
        print("Checking branch protection recommendations...")

        try:
            # Check if this is a GitHub repo
            result = subprocess.run(["git", "remote", "get-url", "origin"],
                                  capture_output=True, text=True,
                                  cwd=self.repo_path)

            if "github.com" in result.stdout:
                self.add_finding("medium", "Enable GitHub branch protection",
                               "For main/master branch: require PR reviews, "
                               "status checks, and restrict force push")
        except:
            pass

        print("✓ Branch protection check completed")

    def check_github_security_features(self):
        """Check for GitHub security features recommendations"""
        print("Checking GitHub security features...")

        security_files = [
            ("SECURITY.md", "Security policy"),
            ("CODEOWNERS", "Code ownership"),
            (".github/dependabot.yml", "Dependabot configuration"),
            (".github/workflows", "GitHub Actions workflows")
        ]

        for file, desc in security_files:
            file_path = self.repo_path / file
            if not file_path.exists():
                self.add_finding("low", f"Missing {desc}: {file}",
                               f"Add {file} to improve repository security")

        print("✓ GitHub security features check completed")

    def check_dependency_files(self):
        """Check dependency files for security"""
        print("Checking dependency files...")

        dep_files = [
            ("requirements.txt", "Python dependencies"),
            ("package.json", "Node.js dependencies"),
            ("Gemfile", "Ruby dependencies"),
            ("go.mod", "Go dependencies")
        ]

        for file, desc in dep_files:
            file_path = self.repo_path / file
            if file_path.exists():
                self.add_finding("info", f"Found {desc}: {file}",
                               "Enable Dependabot or similar tool for security updates")

        print("✓ Dependency check completed")

    def add_finding(self, severity: str, title: str, description: str):
        """Add a security finding"""
        self.findings[severity].append({
            "title": title,
            "description": description
        })

    def print_report(self):
        """Print comprehensive audit report"""
        print("\n" + "="*70)
        print("🔒 SECURITY AUDIT REPORT")
        print("="*70)

        total_findings = sum(len(v) for v in self.findings.values())

        print(f"\n📊 Summary:")
        print(f"   Checks Passed: {self.checks_passed}")
        print(f"   Checks Failed: {self.checks_failed}")
        print(f"   Total Findings: {total_findings}")

        # Print findings by severity
        severity_order = ["critical", "high", "medium", "low", "info"]
        emoji_map = {
            "critical": "🔴",
            "high": "🟠",
            "medium": "🟡",
            "low": "🔵",
            "info": "ℹ️"
        }

        for severity in severity_order:
            findings = self.findings[severity]
            if findings:
                print(f"\n{emoji_map[severity]} {severity.upper()} ({len(findings)}):")
                for finding in findings:
                    print(f"   • {finding['title']}")
                    print(f"     → {finding['description']}")

        print("\n" + "="*70)

        if self.findings["critical"]:
            print("\n⚠️  CRITICAL ISSUES FOUND - Immediate action required!")
            return 1
        elif self.findings["high"]:
            print("\n⚠️  HIGH PRIORITY ISSUES - Should be addressed soon")
            return 1
        else:
            print("\n✅ No critical security issues found")
            return 0


def main():
    parser = argparse.ArgumentParser(
        description="Comprehensive repository security audit tool"
    )
    parser.add_argument(
        "--path",
        default=".",
        help="Path to repository (default: current directory)"
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run quick audit (skip comprehensive checks)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )

    args = parser.parse_args()

    auditor = SecurityAuditor(Path(args.path))
    findings = auditor.run_audit(quick=args.quick)

    if args.json:
        print(json.dumps(findings, indent=2))

    # Exit with appropriate code
    critical_or_high = len(findings["critical"]) + len(findings["high"])
    sys.exit(1 if critical_or_high > 0 else 0)


if __name__ == "__main__":
    main()
