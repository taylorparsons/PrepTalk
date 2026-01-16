# Repository Security Audit Checklist

Comprehensive security checklist for Git repositories based on GitHub Well-Architected Framework, Mozilla guidelines, and 2025 industry best practices.

---

## 🔴 CRITICAL (Must Fix Immediately)

### Access Control & Authentication

- [ ] **2FA enabled** for all team members with repository access
- [ ] **No secrets in code** - API keys, passwords, tokens not hardcoded
- [ ] **No secrets in git history** - Past commits don't contain exposed secrets
- [ ] **Private keys protected** - `.pem`, `.key`, SSH keys not in repository
- [ ] **.env files ignored** - Environment files in `.gitignore`

### Sensitive Data Protection

- [ ] **No personal paths** - Absolute paths like `/Users/username` removed
- [ ] **No credentials files** - `credentials.json`, `secrets.yml` not tracked
- [ ] **Database connection strings** - Not hardcoded in code
- [ ] **Encryption keys** - Not stored in repository

---

## 🟠 HIGH (Fix Soon)

### Repository Configuration

- [ ] **.gitignore exists** - Comprehensive ignore rules in place
- [ ] **Build artifacts ignored** - `__pycache__`, `.pyc`, `.DS_Store`, `node_modules`
- [ ] **Branch protection enabled** - For `main`/`master` branches
  - Require pull request reviews
  - Require status checks to pass
  - Restrict who can push
  - Prevent force pushes
- [ ] **Signed commits** - GPG signing enabled for production branches
- [ ] **CODEOWNERS file** - Define code ownership for critical paths

### Security Scanning

- [ ] **Dependabot enabled** - Automated dependency updates
- [ ] **Code scanning enabled** - GitHub CodeQL or similar
- [ ] **Secret scanning enabled** - GitHub secret scanning active
- [ ] **Pre-commit hooks** - Local secret scanning before commit

---

## 🟡 MEDIUM (Should Address)

### Documentation & Policies

- [ ] **SECURITY.md exists** - Security policy and vulnerability reporting
- [ ] **LICENSE file** - Clear license terms
- [ ] **README security section** - Security best practices documented
- [ ] **Contributing guidelines** - Security requirements for contributors

### Workflow Automation

- [ ] **GitHub Actions workflows** - CI/CD pipelines configured
  - Security scanning in CI
  - Dependency checks
  - Test coverage requirements
- [ ] **PR templates** - Security checklist in pull requests
- [ ] **Issue templates** - Security vulnerability template

### Dependency Management

- [ ] **Dependency pinning** - Exact versions specified
- [ ] **Regular updates** - Dependencies updated quarterly
- [ ] **Audit logs reviewed** - Regular security audit log reviews
- [ ] **No deprecated dependencies** - All deps actively maintained

---

## 🔵 LOW (Nice to Have)

### Advanced Security

- [ ] **SBOM generation** - Software Bill of Materials tracked
- [ ] **Container scanning** - Docker images scanned for vulnerabilities
- [ ] **Infrastructure as Code scanning** - Terraform/CloudFormation scanned
- [ ] **License compatibility** - Dependencies have compatible licenses

### Compliance & Governance

- [ ] **Compliance documentation** - SOC2, HIPAA, etc. if applicable
- [ ] **Data classification** - Sensitive data identified and labeled
- [ ] **Retention policies** - Git history retention defined
- [ ] **Audit trail** - All changes logged and reviewable

---

## 📋 Pre-Commit Checklist

Run before every commit:

```bash
# 1. Check for secrets
python git-workflow-automation/scripts/scan_for_secrets.py --staged

# 2. Check for personal paths
git diff --cached | grep -E "/Users/|/home/"

# 3. Check for build artifacts
git status | grep -E "__pycache__|\.pyc|\.DS_Store"

# 4. Verify gitignore
git ls-files -i --exclude-standard

# 5. Run security audit (quick mode)
python git-workflow-automation/scripts/audit_repository_security.py --quick
```

---

## 🔍 Pre-Push Checklist

Run before pushing to remote:

```bash
# 1. Full security audit
python git-workflow-automation/scripts/audit_repository_security.py

# 2. Verify no secrets in history
git log -S "api_key" --all --oneline
git log -S "password" --all --oneline

# 3. Check for sensitive files
git ls-files | grep -E "\.env|credentials|secrets|\.pem|\.key"

# 4. Review changed files
git diff origin/main...HEAD --name-only

# 5. Verify commit messages follow conventions
git log --oneline -10
```

---

## 🚀 Initial Repository Setup

When creating a new repository:

### Step 1: Essential Files

```bash
# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.egg-info/
.venv/
venv/

# Environment
.env
.env.local
*.local

# IDE
.vscode/
.idea/
.DS_Store

# Build
dist/
build/
*.pyc

# Secrets
credentials.json
secrets.yml
*.pem
*.key
EOF

# Create SECURITY.md
cat > SECURITY.md << 'EOF'
# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities to [security@example.com]

## Supported Versions

[List supported versions]

## Security Best Practices

[Your security guidelines]
EOF

# Create CODEOWNERS
cat > CODEOWNERS << 'EOF'
* @your-team
/sensitive-dir/ @security-team
EOF
```

### Step 2: Configure Git

```bash
# Enable commit signing
git config commit.gpgsign true

# Set commit template
git config commit.template .gitmessage

# Configure user
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### Step 3: Setup Pre-commit Hooks

```bash
# Install pre-commit framework
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: local
    hooks:
      - id: scan-secrets
        name: Scan for secrets
        entry: python git-workflow-automation/scripts/scan_for_secrets.py
        language: python
        stages: [commit]
      - id: check-absolute-paths
        name: Check for absolute paths
        entry: bash -c 'git diff --cached | grep -E "/Users/|/home/" && exit 1 || exit 0'
        language: system
        stages: [commit]
EOF

# Install hooks
pre-commit install
```

### Step 4: GitHub Configuration

On GitHub repository settings:

1. **Enable Security Features:**
   - Settings → Security → Enable Dependabot alerts
   - Settings → Security → Enable Dependabot security updates
   - Settings → Security → Enable Code scanning (CodeQL)
   - Settings → Security → Enable Secret scanning

2. **Branch Protection Rules:**
   - Settings → Branches → Add rule for `main`
   - Require pull request reviews (1-2 reviewers)
   - Require status checks to pass
   - Require signed commits
   - Include administrators
   - Restrict pushes

3. **Add GitHub Actions Workflow:**

Create `.github/workflows/security.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run security audit
        run: python git-workflow-automation/scripts/audit_repository_security.py

      - name: Scan for secrets
        run: python git-workflow-automation/scripts/scan_for_secrets.py --all
```

---

## 📊 Regular Maintenance Schedule

### Weekly

- [ ] Review Dependabot alerts
- [ ] Check security scanning results
- [ ] Review open pull requests for security

### Monthly

- [ ] Run full security audit
- [ ] Update dependencies
- [ ] Review access permissions
- [ ] Check audit logs

### Quarterly

- [ ] Full security review
- [ ] Update security documentation
- [ ] Review and update CODEOWNERS
- [ ] Security training for team

### Annually

- [ ] Comprehensive security audit
- [ ] Review all workflows and automation
- [ ] Update security policies
- [ ] Compliance review

---

## 🛠️ Tools & Resources

### Recommended Tools

- **gitleaks** - Secret scanning (https://github.com/gitleaks/gitleaks)
- **trufflehog** - Find credentials in git (https://github.com/trufflesecurity/trufflehog)
- **detect-secrets** - Yelp's secret scanner (https://github.com/Yelp/detect-secrets)
- **git-secrets** - AWS secret prevention (https://github.com/awslabs/git-secrets)
- **pre-commit** - Git hook framework (https://pre-commit.com/)

### GitHub Features

- **Dependabot** - Automated dependency updates
- **CodeQL** - Semantic code analysis
- **Secret Scanning** - Detect exposed secrets
- **Security Advisories** - Report vulnerabilities
- **Branch Protection** - Enforce policies

### External Services

- **Snyk** - Dependency vulnerability scanning
- **GitGuardian** - Secret detection and remediation
- **Checkmarx** - Application security testing
- **Veracode** - Security verification

---

## ⚠️ Common Mistakes to Avoid

1. **Committing `.env` files** → Use .gitignore
2. **Hardcoding API keys** → Use environment variables
3. **No branch protection** → Enable for production branches
4. **Ignoring Dependabot alerts** → Review and fix promptly
5. **No pre-commit hooks** → Install local validation
6. **Committing build artifacts** → Add to .gitignore
7. **Personal paths in code** → Use relative paths
8. **No security policy** → Create SECURITY.md
9. **Weak commit messages** → Use conventional commits
10. **Bypassing pre-commit hooks** → Only in emergencies

---

## 📖 Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Mozilla GitHub Security](https://wiki.mozilla.org/GitHub/Repository_Security)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

**Last Updated:** November 2025
**Version:** 2.0
**Maintainer:** Core Maintainers
