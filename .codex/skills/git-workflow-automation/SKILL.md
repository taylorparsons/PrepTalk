---
name: git-workflow-automation
description: Comprehensive Git workflow, security, and automation toolkit. Implements security auditing, secret scanning, conventional commits, branch protection, and CI/CD automation following GitHub Well-Architected Framework and 2025 industry best practices.
---

# Git Workflow Automation Skill

**Version:** 2.0 (Enhanced November 2025)

Automate git workflows, enforce security best practices, and streamline development processes with comprehensive tooling for modern software development.

---

## 🎯 When to Use This Skill

### Perfect For

- ✅ Setting up new repositories with security best practices
- ✅ Auditing existing repositories for security vulnerabilities
- ✅ Implementing commit message conventions (Conventional Commits)
- ✅ Preventing secret leaks before they happen
- ✅ Automating changelog generation and versioning
- ✅ Creating GitHub Actions workflows
- ✅ Establishing team git standards

### Not Suitable For

- ❌ Git basics (use git documentation for learning git commands)
- ❌ Visual git clients (use GitKraken, SourceTree, etc.)
- ❌ Git hosting (use GitHub, GitLab, Bitbucket)

---

## 🚀 Quick Start Workflows

### Workflow 1: Audit Existing Repository

Perform comprehensive security audit of your repository:

```bash
# Quick security scan
python git-workflow-automation/scripts/audit_repository_security.py --quick

# Full comprehensive audit
python git-workflow-automation/scripts/audit_repository_security.py

# Export results as JSON
python git-workflow-automation/scripts/audit_repository_security.py --json > audit-results.json
```

**What it checks:**
- Secrets in code and git history
- Absolute paths (like `/Users/username/`)
- Build artifacts committed by mistake
- Missing .gitignore patterns
- GitHub security features
- Dependency security

### Workflow 2: Scan for Secrets Before Commit

Prevent accidental secret exposure:

```bash
# Scan staged files (pre-commit)
python git-workflow-automation/scripts/scan_for_secrets.py --staged

# Scan entire repository
python git-workflow-automation/scripts/scan_for_secrets.py --all

# Scan specific directory
python git-workflow-automation/scripts/scan_for_secrets.py --path ./src
```

**Detects:**
- API keys (AWS, Google, Stripe, GitHub)
- Database connection strings
- Private keys and certificates
- JWT tokens
- High-entropy secrets

### Workflow 3: Setup New Repository

Complete security setup for new projects:

```bash
# 1. Create .gitignore
cp git-workflow-automation/templates/.gitignore .

# 2. Setup pre-commit hooks
pip install pre-commit
cp git-workflow-automation/templates/pre-commit-config.yaml .pre-commit-config.yaml
pre-commit install

# 3. Add security policy
cp git-workflow-automation/templates/SECURITY.md .

# 4. Setup GitHub Actions
mkdir -p .github/workflows
cp git-workflow-automation/templates/github-workflow-security.yml .github/workflows/security.yml

# 5. Configure git
git config commit.gpgsign true
git config commit.template .gitmessage
```

### Workflow 4: Implement Conventional Commits

Standardize commit messages across team:

```bash
# 1. Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# 2. Configure commitlint
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# 3. Add commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

# 4. Use commitizen for interactive commits
npm install --save-dev commitizen
git cz
```

---

## 📜 Scripts

### audit_repository_security.py ⭐ NEW

**Comprehensive repository security auditor**

**Usage:**
```bash
# Quick audit (essential checks only)
python scripts/audit_repository_security.py --quick

# Full audit (all checks)
python scripts/audit_repository_security.py

# Audit specific repository
python scripts/audit_repository_security.py --path ~/my-project

# Output as JSON for CI/CD
python scripts/audit_repository_security.py --json
```

**What it audits:**
- Secrets in code and git history
- Absolute file paths
- Build artifacts tracking
- Sensitive file patterns
- .gitignore completeness
- Git configuration security
- GitHub security features
- Dependency files

**Exit codes:**
- `0` - No critical/high issues
- `1` - Critical or high priority issues found

### scan_for_secrets.py ⭐ NEW

**Pre-commit secret scanner**

**Usage:**
```bash
# Scan staged files (default, for pre-commit hook)
python scripts/scan_for_secrets.py

# Scan all files in repository
python scripts/scan_for_secrets.py --all

# Scan specific path
python scripts/scan_for_secrets.py --path ./sensitive-dir
```

**Detection patterns:**
- API keys (generic, AWS, Google, Stripe, GitHub, Slack)
- Private keys (RSA, EC, SSH)
- Database connection strings
- JWT tokens
- High-entropy strings (potential secrets)

**Features:**
- False positive filtering
- Entropy analysis
- Line-level reporting
- File exclusions (.md, tests/, etc.)

### setup_git_hooks.py

**Install and configure git hooks**

**Usage:**
```bash
# Setup pre-commit hook
python scripts/setup_git_hooks.py --pre-commit

# Setup commit message validation
python scripts/setup_git_hooks.py --commit-msg

# Setup both
python scripts/setup_git_hooks.py --pre-commit --commit-msg
```

### generate_changelog.py

**Generate CHANGELOG from git history**

**Usage:**
```bash
# Generate changelog
python scripts/generate_changelog.py

# Generate for specific version
python scripts/generate_changelog.py --version 2.0.0

# Output to file
python scripts/generate_changelog.py --output CHANGELOG.md
```

---

## 📚 Reference Guides

### security_audit_checklist.md ⭐ NEW

**Complete security checklist for Git repositories**

Comprehensive guide covering:
- Critical security checks (2FA, secrets, credentials)
- High priority items (branch protection, scanning)
- Medium priority (documentation, workflows)
- Pre-commit and pre-push checklists
- Initial repository setup guide
- Regular maintenance schedule
- Tools and resources

**Use when:**
- Setting up new repository
- Conducting security review
- Preparing for compliance audit
- Training new team members

### conventional_commits_guide.md ⭐ NEW

**Full guide to Conventional Commits v1.0.0**

Topics covered:
- Commit message structure
- All commit types with examples
- Scope guidelines
- Semantic versioning integration
- Tooling (commitlint, commitizen)
- Team adoption strategies
- Real-world examples

**Use when:**
- Standardizing team commits
- Setting up automated versioning
- Creating changelog automation
- Onboarding new developers

### patterns.md

**Git workflow patterns and best practices**

- Branch naming conventions
- PR process workflows
- Commit strategies
- Merge strategies

### best_practices.md

**Git best practices for teams**

- Atomic commits
- Clear commit messages
- Code review practices
- Branch management

### advanced_topics.md

**Advanced git automation**

- Custom git hooks
- GitHub Actions workflows
- Automated releases
- Monorepo strategies

### troubleshooting.md

**Common git issues and solutions**

- Merge conflicts
- Rewriting history
- Recovering lost commits
- Performance issues

---

## 📋 Templates

### pre-commit-config.yaml ⭐ NEW

**Production-ready pre-commit hook configuration**

Features:
- File integrity checks
- Secret scanning
- Absolute path detection
- Build artifact prevention
- Python code formatting (Black, Flake8)
- Conventional commit validation

**Usage:**
```bash
pip install pre-commit
cp git-workflow-automation/templates/pre-commit-config.yaml .pre-commit-config.yaml
pre-commit install
```

### github-workflow-security.yml ⭐ NEW

**Comprehensive GitHub Actions security workflow**

Includes:
- Repository security audit
- Secret scanning (Gitleaks)
- Dependency review
- CodeQL analysis
- Trivy vulnerability scan
- Python security (Safety, Bandit)
- NPM audit
- PR commenting

**Usage:**
```bash
mkdir -p .github/workflows
cp git-workflow-automation/templates/github-workflow-security.yml .github/workflows/security.yml
git add .github/
git commit -m "ci: add security scanning workflow"
```

### SECURITY.md ⭐ NEW

**Security policy template**

Sections:
- Vulnerability reporting process
- Supported versions
- Security update process
- Best practices for contributors
- OWASP Top 10 prevention
- PR security checklist

### commit_template.txt

**Git commit message template**

### pull_request_template.md

**GitHub PR template**

### github_workflow_template.yml

**Basic GitHub Actions workflow**

---

## 🔍 Decision Trees

### When to Use Which Tool?

```
Need to check repository security?
├─ Quick check → audit_repository_security.py --quick
├─ Full audit → audit_repository_security.py
└─ Continuous → GitHub Actions workflow

Found secrets in code?
├─ Before commit → scan_for_secrets.py --staged
├─ In repository → scan_for_secrets.py --all
└─ In history → git log -S "secret_pattern"

Setting up new repo?
├─ Start here → Follow Workflow 3 above
├─ Add security → Copy SECURITY.md template
└─ Enable automation → Setup pre-commit hooks

Team needs commit standards?
├─ Read → conventional_commits_guide.md
├─ Setup → Install commitlint + commitizen
└─ Enforce → Add to pre-commit hooks
```

---

## ✅ Quality Checklist

### Essentials (Required)

- [ ] `.gitignore` exists with comprehensive patterns
- [ ] No secrets in code or git history
- [ ] No absolute paths in tracked files
- [ ] No build artifacts committed
- [ ] Security audit shows no critical issues

### Best Practices (Recommended)

- [ ] Pre-commit hooks installed and working
- [ ] Conventional commits enforced
- [ ] SECURITY.md policy published
- [ ] GitHub Actions security workflow enabled
- [ ] Branch protection on main/master
- [ ] Dependabot enabled

### Advanced (Nice to Have)

- [ ] GPG commit signing enabled
- [ ] CODEOWNERS file configured
- [ ] Automated changelog generation
- [ ] Semantic versioning automated
- [ ] Security scans in CI/CD

---

## 🚨 Common Pitfalls & Solutions

### Problem: Secrets committed to repository

**Solution:**
```bash
# 1. Remove from current code
git rm --cached .env

# 2. Add to .gitignore
echo ".env" >> .gitignore

# 3. Clean git history (if needed)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 4. Force push (DANGER - coordinate with team)
git push origin --force --all
```

**Prevention:**
- Install pre-commit secret scanning
- Use environment variables
- Never commit `.env` files

### Problem: Build artifacts committed

**Solution:**
```bash
# Remove from git
git rm -r --cached __pycache__/
git rm --cached *.pyc

# Add to .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore

# Commit
git commit -m "chore: remove build artifacts and update gitignore"
```

**Prevention:**
- Copy comprehensive .gitignore template
- Add pre-commit hook to check

### Problem: Inconsistent commit messages

**Solution:**
```bash
# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Add commit-msg hook
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# Use commitizen for help
npm install --save-dev commitizen
git cz  # Interactive commit
```

**Prevention:**
- Follow conventional commits guide
- Use commitizen for all commits
- Enforce with pre-commit hooks

### Problem: Personal paths in code

**Solution:**
```bash
# Find all occurrences
git ls-files | xargs grep -l "/Users/"

# Replace with relative paths
# Use IDE find-and-replace or:
find . -type f -name "*.py" -exec sed -i '' 's|/Users/username/project|.|g' {} +

# Commit
git commit -m "chore: replace absolute paths with relative paths"
```

**Prevention:**
- Run security audit before push
- Add pre-commit check
- Use environment variables for paths

---

## 💡 Pro Tips

### 1. Automate Everything

Set up once, benefit forever:
```bash
# Install all tools
pip install pre-commit
npm install -D commitizen commitlint husky

# Configure once
pre-commit install
git config commit.template .gitmessage

# Enjoy automated checks
```

### 2. Use Git Aliases

Make common tasks easier:
```bash
git config --global alias.audit '!python ~/my-skills/git-workflow-automation/scripts/audit_repository_security.py'
git config --global alias.scan '!python ~/my-skills/git-workflow-automation/scripts/scan_for_secrets.py'
git config --global alias.cz 'cz'

# Now use:
git audit
git scan
git cz
```

### 3. Weekly Security Routine

Add to your Monday morning:
```bash
# 1. Run security audit
git audit

# 2. Update dependencies
npm audit fix  # or pip check

# 3. Review Dependabot PRs

# 4. Check GitHub security alerts
```

### 4. Team Onboarding Checklist

New team member setup:
```bash
# 1. Clone with template
git clone <repo>
cd <repo>

# 2. Install tools
pip install -r requirements.txt
pip install pre-commit
pre-commit install

# 3. Configure git
git config commit.gpgsign true
git config user.email "you@company.com"

# 4. Read security guide
cat SECURITY.md
```

### 5. Emergency Secret Leak Response

If a secret is exposed:
```bash
# 1. Rotate the secret immediately
# 2. Remove from current code
# 3. Clean git history (coordinate with team)
# 4. Force push
# 5. Verify on GitHub
# 6. Document incident
```

---

## 🎓 Learning Path

### Beginner

1. Read `conventional_commits_guide.md`
2. Run `audit_repository_security.py` on your project
3. Setup `.gitignore` from template
4. Install pre-commit hooks

### Intermediate

1. Read `security_audit_checklist.md`
2. Implement conventional commits with commitlint
3. Setup GitHub Actions workflow
4. Enable branch protection

### Advanced

1. Implement automated versioning
2. Create custom security workflows
3. Setup monorepo workflows
4. Implement trunk-based development

---

## 📊 Success Metrics

Track these to measure security improvement:

- **Secret leaks prevented:** Pre-commit hook catches
- **Security audit score:** Critical + High issues count
- **Commit convention compliance:** % of commits following spec
- **Time to fix vulnerabilities:** From detection to resolution
- **Dependabot PR merge rate:** % of security PRs merged

---

## 🔗 Integration Examples

### With CI/CD

```yaml
# .github/workflows/security.yml
name: Security
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python git-workflow-automation/scripts/audit_repository_security.py
```

### With Pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: security-audit
        name: Security Audit
        entry: python git-workflow-automation/scripts/audit_repository_security.py --quick
        language: python
        pass_filenames: false
```

### With Make

```makefile
# Makefile
.PHONY: security-check
security-check:
	python git-workflow-automation/scripts/audit_repository_security.py
	python git-workflow-automation/scripts/scan_for_secrets.py --all
```

---

## 📖 Additional Resources

### External Documentation
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Semantic Versioning](https://semver.org/)

### Community Tools
- [pre-commit framework](https://pre-commit.com/)
- [commitlint](https://commitlint.js.org/)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)

---

**Last Updated:** November 2025
**Version:** 2.0 (Major Enhancement)
**Maintainer:** Core Maintainers

**Changelog:**
- v2.0: Added security audit, secret scanning, comprehensive guides
- v1.0: Initial release with basic git workflow automation
