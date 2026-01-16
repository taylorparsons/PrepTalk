# Conventional Commits Guide

Complete guide to Conventional Commits specification v1.0.0 with practical examples and best practices.

---

## Overview

Conventional Commits is a specification for adding human and machine-readable meaning to commit messages. It provides an easy set of rules for creating an explicit commit history, making it easier to write automated tools on top of.

### Benefits

- **Automatically generate CHANGELOGs**
- **Automatically determine semantic version bumps**
- **Communicate nature of changes** to teammates, public, and stakeholders
- **Trigger build and publish processes**
- **Make it easier for people to contribute** by understanding commit history

---

## Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Components

1. **type** - The type of change (required)
2. **scope** - The scope of the change (optional)
3. **description** - Short summary (required)
4. **body** - Detailed explanation (optional)
5. **footer** - Breaking changes, references (optional)

---

## Types

### Standard Types

| Type | Description | Semantic Version |
|------|-------------|------------------|
| `feat` | New feature | MINOR (0.x.0) |
| `fix` | Bug fix | PATCH (0.0.x) |
| `BREAKING CHANGE` | Breaking API change | MAJOR (x.0.0) |

### Additional Types (Recommended)

| Type | Description | When to Use |
|------|-------------|-------------|
| `build` | Build system or dependencies | Update package.json, webpack config |
| `chore` | Maintenance tasks | Update .gitignore, scripts |
| `ci` | CI/CD changes | Update GitHub Actions, Travis CI |
| `docs` | Documentation only | Update README, add comments |
| `perf` | Performance improvement | Optimize algorithm, reduce queries |
| `refactor` | Code restructuring | Rename variables, extract methods |
| `style` | Code style/formatting | Fix indentation, add semicolons |
| `test` | Add or update tests | Add unit tests, fix test cases |
| `revert` | Revert previous commit | Undo a change |

---

## Examples

### Basic Examples

#### Feature
```
feat: add user authentication

Implement JWT-based authentication system with login and logout endpoints.
```

#### Bug Fix
```
fix: resolve login button not responding

The login button was not triggering the authentication flow due to
incorrect event handler binding.
```

#### Documentation
```
docs: update API documentation

Add examples for all REST endpoints and clarify error responses.
```

### With Scope

```
feat(api): add pagination to user list endpoint

Add offset and limit query parameters to support paginated results.
```

```
fix(auth): prevent token expiration edge case

Handle race condition when token expires during request processing.
```

### Breaking Changes

#### Method 1: Using `!` after type/scope
```
feat!: remove support for Node 12

BREAKING CHANGE: Drop Node 12 support, minimum version is now Node 14.
```

#### Method 2: Using footer
```
refactor: update API response format

BREAKING CHANGE: API now returns data in `result` field instead of `data`.
Migration guide available in docs/migrations/v2.md
```

### Multi-paragraph Body

```
fix: prevent race condition in cache invalidation

When multiple requests invalidate the cache simultaneously, a race
condition could occur leading to stale data being served.

This fix implements a distributed lock using Redis to ensure only one
invalidation process runs at a time.

Fixes #123
Closes #456
```

### Multiple Footers

```
feat: add OAuth2 integration

Implements OAuth2 authentication flow with support for Google and GitHub.

Reviewed-by: @senior-dev
Refs: #789
Co-authored-by: Taylor Parsons <taylor@example.com>
```

---

## Scope Guidelines

### When to Use Scope

- **Component-based projects**: `feat(header): add navigation menu`
- **Module-based projects**: `fix(auth): resolve token validation`
- **Area of codebase**: `refactor(database): optimize query performance`

### Common Scopes

**Frontend:**
- `ui`, `ux`, `design`
- `components`, `pages`, `layouts`
- `forms`, `validation`
- `routing`, `navigation`

**Backend:**
- `api`, `endpoints`, `routes`
- `database`, `models`, `schema`
- `auth`, `permissions`, `security`
- `services`, `controllers`, `middleware`

**Infrastructure:**
- `ci`, `cd`, `deploy`
- `docker`, `kubernetes`
- `monitoring`, `logging`

**General:**
- `deps`, `dependencies`
- `config`, `settings`
- `tests`, `testing`
- `docs`, `documentation`

### When to Skip Scope

Scope is optional. Skip it when:
- Change affects entire project
- Scope would be too broad to be meaningful
- Project is small and scopes add unnecessary complexity

---

## Description Guidelines

### Best Practices

✅ **DO:**
- Use imperative mood: "add feature" not "added feature"
- Start with lowercase
- No period at the end
- Be concise (50 chars or less recommended)
- Describe WHAT and WHY, not HOW

❌ **DON'T:**
- Use past tense: "added" or "adding"
- Start with uppercase (unless proper noun)
- End with period
- Be vague: "fix bug" or "update code"
- Include implementation details in description

### Good vs Bad Examples

#### ✅ Good
```
feat: add dark mode toggle
fix: resolve memory leak in worker threads
docs: add installation guide
refactor: simplify authentication logic
```

#### ❌ Bad
```
Added a feature  # Past tense
Fix.  # Ends with period, too vague
Updated some files  # Not descriptive
Changed the code in auth.js to use async/await  # Too detailed for description
```

---

## Body Guidelines

### When to Include Body

Include a body when:
- Description alone doesn't explain the change adequately
- Change is non-trivial
- Context or rationale needs explanation
- Multiple related changes in one commit

### Body Best Practices

- Separate from description with blank line
- Wrap at 72 characters
- Explain WHY not HOW (code shows HOW)
- Reference issues and PRs
- Break into paragraphs if needed

### Example

```
feat: implement request rate limiting

Add rate limiting middleware to prevent API abuse. Limits are configured
per endpoint and stored in Redis for distributed deployments.

Default limits:
- Authentication endpoints: 5 req/min
- Data endpoints: 100 req/min
- Search endpoints: 50 req/min

Addresses security concern raised in #456
```

---

## Footer Guidelines

### Common Footers

| Footer | Purpose | Example |
|--------|---------|---------|
| `BREAKING CHANGE:` | Document breaking changes | `BREAKING CHANGE: remove v1 API` |
| `Fixes #123` | Close issue on merge | `Fixes #123, Fixes #456` |
| `Closes #123` | Close PR/issue | `Closes #789` |
| `Refs #123` | Reference without closing | `Refs #456` |
| `Reviewed-by:` | Credit reviewer | `Reviewed-by: @username` |
| `Co-authored-by:` | Credit co-author | `Co-authored-by: Name <email>` |
| `Signed-off-by:` | Developer Certificate of Origin | `Signed-off-by: Name <email>` |

### Multiple Issue References

```
fix: resolve authentication edge cases

Fixes #123
Fixes #456
Closes #789
```

---

## Semantic Versioning Integration

Conventional Commits maps directly to Semantic Versioning:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:` | PATCH (0.0.x) | 1.0.0 → 1.0.1 |
| `feat:` | MINOR (0.x.0) | 1.0.0 → 1.1.0 |
| `BREAKING CHANGE:` | MAJOR (x.0.0) | 1.0.0 → 2.0.0 |
| Other types | No bump | Documentation |

### Automated Versioning Tools

- **standard-version** - Automate versioning and CHANGELOG
- **semantic-release** - Fully automated version management
- **release-please** - GitHub App for release automation

---

## Tooling

### Validation Tools

#### commitlint

Lint commit messages to ensure they follow conventions.

```bash
# Install
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Configure
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# Add to git hook
npm install --save-dev husky
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

#### commitizen

Interactive CLI for creating conventional commits.

```bash
# Install
npm install --save-dev commitizen cz-conventional-changelog

# Initialize
npx commitizen init cz-conventional-changelog --save-dev --save-exact

# Use
git cz  # Instead of git commit
```

### CHANGELOG Generation

#### conventional-changelog

```bash
npm install --save-dev conventional-changelog-cli

# Generate CHANGELOG
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### Automated Releases

#### semantic-release

```bash
npm install --save-dev semantic-release

# Add to .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```

---

## Team Adoption

### Getting Started

1. **Document the decision**
   - Add this guide to your repository
   - Update CONTRIBUTING.md
   - Add examples to PR templates

2. **Set up tooling**
   - Install commitlint
   - Add commitizen for ease of use
   - Configure pre-commit hooks

3. **Train the team**
   - Share this guide
   - Conduct workshop
   - Provide examples

4. **Enforce gradually**
   - Start with warnings
   - Provide feedback on PRs
   - Enable blocking after team is comfortable

### Migration Strategy

```bash
# Start with existing commits
# No need to rewrite history

# Add to new commits going forward
# Use conventional commits from now on

# Consider squash merging PRs
# Ensure PR title follows convention
```

---

## Real-World Examples from Popular Projects

### Angular

```
docs(changelog): update changelog to beta.5
feat(core): add `trackBy` to `*ngFor`
fix(compiler): handle invalid host property names
```

### Vue.js

```
feat(reactivity): add readonly utility
fix(runtime-core): handle edge case in scheduler
refactor(compiler-sfc): simplify hoisting logic
```

### React

```
feat: add useTransition hook
fix: correct priority for continuous updates
chore: update copyright year
```

---

## Advanced Patterns

### Monorepo Commits

```
feat(packages/auth): add OAuth provider
fix(apps/web): resolve routing issue
chore(deps): update all dependencies
```

### Revert Commits

```
revert: feat: add experimental feature

This reverts commit 1234567890abcdef.

Reason: Feature caused performance regression in production.
```

### Merge Commits

```
Merge pull request #123 from user/feature-branch

feat: add user profile page
```

---

## Quick Reference

### Commit Message Template

Create `.gitmessage` in your repository:

```
# <type>[optional scope]: <description>
#
# [optional body]
#
# [optional footer(s)]
#
# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
# Scope: component, module, or area affected
# Description: imperative mood, lowercase, no period
# Body: explain WHY, not HOW
# Footer: BREAKING CHANGE, Fixes #123, Closes #456
```

Configure git to use it:

```bash
git config commit.template .gitmessage
```

---

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md)
- [commitlint Documentation](https://commitlint.js.org/)
- [commitizen Documentation](https://commitizen-tools.github.io/commitizen/)

---

**Last Updated:** November 2025
**Version:** 2.0
**Based On:** Conventional Commits v1.0.0
