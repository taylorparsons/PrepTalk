# Refactoring Plan Template

**Date:** [YYYY-MM-DD]  
**Author:** [Your Name]  
**Code Location:** [File path or module name]  
**Estimated Time:** [Hours/Days]

---

## 1. Current State Analysis

### What code are we refactoring?
[Describe the specific files, classes, functions that need refactoring]

### What problems exist?
[List specific code smells and issues found]
- [ ] Long functions (>50 lines)
- [ ] Too many parameters (>5)
- [ ] Deep nesting (>3 levels)
- [ ] Duplicate code
- [ ] Large classes (>15 methods)
- [ ] Magic numbers/strings
- [ ] Poor naming
- [ ] Missing tests
- [ ] Other: ___________

### Why are we refactoring?
[State the business/technical justification]
- Making code easier to maintain
- Fixing bugs related to code structure
- Preparing for new feature
- Reducing technical debt
- Improving performance
- Other: ___________

---

## 2. Safety Checklist

### Before Starting

- [ ] **Tests exist and pass** - Run: `pytest -v`
- [ ] **Code is committed** - Run: `git status` (should be clean)
- [ ] **Create feature branch** - Run: `git checkout -b refactor-[name]`
- [ ] **Understand the code** - Read through and document what it does
- [ ] **Backup plan exists** - Know how to revert if things go wrong

### Test Coverage Status

Current test coverage: ____%  
Missing tests for:
- [ ] Function: ___________
- [ ] Function: ___________
- [ ] Edge case: ___________

**Action:** Write missing tests BEFORE refactoring

---

## 3. Refactoring Goals

### Primary Goal
[What is the single most important improvement?]

Example: "Extract user validation logic into separate, testable class"

### Success Criteria
How will we know the refactoring succeeded?

- [ ] All tests still pass
- [ ] Code is more readable (subjective but important)
- [ ] Function length reduced by X%
- [ ] Cyclomatic complexity reduced
- [ ] Duplicate code eliminated
- [ ] New tests added for extracted code
- [ ] Code review approved
- [ ] Performance maintained or improved

### Non-Goals
What are we NOT trying to fix?

- Not fixing bug #123 (separate ticket)
- Not adding new features
- Not refactoring module Y (out of scope)

---

## 4. Proposed Changes

### Pattern to Apply
[Which refactoring pattern(s) from patterns.md will you use?]

Primary pattern: **[Extract Method / Extract Class / etc.]**

Reference: `references/patterns.md` section: ___________

### Step-by-Step Plan

#### Step 1: [First change]
**What:** [Describe the change]  
**Why:** [Reason for this step]  
**Risk:** [Low/Medium/High]  
**Estimated Time:** [Minutes/Hours]  
**Rollback Plan:** [How to undo if it fails]

**Before:**
```python
# Paste code snippet showing current state
```

**After:**
```python
# Paste code snippet showing intended state
```

**Tests to run:**
```bash
pytest path/to/test_file.py::test_function_name
```

---

#### Step 2: [Second change]
**What:**  
**Why:**  
**Risk:**  
**Estimated Time:**  
**Rollback Plan:**

**Before:**
```python
# Code snippet
```

**After:**
```python
# Code snippet
```

**Tests to run:**
```bash
# Test commands
```

---

#### Step 3: [Additional steps]
[Continue numbering for each distinct change]

---

## 5. Risk Assessment

### High Risk Areas
[Code that is particularly sensitive or complex]

1. **Risk:** Database queries might behave differently
   - **Mitigation:** Add integration tests before refactoring
   - **Fallback:** Keep old code as commented backup

2. **Risk:** Performance might degrade
   - **Mitigation:** Add performance benchmarks
   - **Fallback:** Profile before and after, revert if >20% slower

### Dependencies
What other code depends on what we're refactoring?

- [ ] Module A imports this
- [ ] Service B calls this API
- [ ] CLI tool uses this function
- [ ] Tests rely on this behavior

**Action:** Search codebase for references:
```bash
grep -r "function_name" .
```

---

## 6. Testing Strategy

### Existing Tests
Which tests already cover this code?

- `test_file.py::TestClass::test_method`
- `test_integration.py::test_workflow`

### New Tests Needed
What new tests will we write?

- [ ] Test extracted method in isolation
- [ ] Test new class independently
- [ ] Integration test for refactored workflow
- [ ] Performance test to verify no regression

### Manual Testing Required
What can't be automatically tested?

- [ ] Test in development environment
- [ ] Verify logs look correct
- [ ] Check UI still works (if applicable)
- [ ] Load test with realistic data

---

## 7. Timeline and Checkpoints

### Estimated Timeline
**Start Date:** [YYYY-MM-DD]  
**Target Completion:** [YYYY-MM-DD]

### Checkpoints

**Checkpoint 1** - [Date]
- [ ] Tests written
- [ ] Step 1 completed
- [ ] Tests still pass
- [ ] Commit: [commit message]

**Checkpoint 2** - [Date]
- [ ] Steps 2-3 completed
- [ ] Tests still pass
- [ ] Commit: [commit message]

**Checkpoint 3** - [Date]
- [ ] All steps completed
- [ ] Documentation updated
- [ ] Code review requested
- [ ] Ready to merge

### Time Limits
**Maximum time to spend:** [X hours/days]

**If exceeded:**
- [ ] Stop and reassess
- [ ] Consider breaking into smaller refactorings
- [ ] Get help from team

---

## 8. Documentation Updates

What documentation needs updating?

- [ ] Update docstrings
- [ ] Update README.md
- [ ] Update API documentation
- [ ] Update architecture diagrams
- [ ] Update CHANGELOG.md

---

## 9. Code Review Checklist

Before requesting review:

- [ ] All tests pass locally
- [ ] No new warnings from linter
- [ ] Code coverage maintained or improved
- [ ] Docstrings updated
- [ ] Self-review completed
- [ ] Branch rebased on main
- [ ] Commit messages are clear

Review focus areas:
- [ ] Logic correctness
- [ ] Test coverage
- [ ] Performance implications
- [ ] Naming clarity
- [ ] Documentation completeness

---

## 10. Rollback Plan

### If Something Goes Wrong

**Immediate Rollback:**
```bash
git reset --hard [last-good-commit-hash]
```

**If Already Merged:**
```bash
git revert [bad-commit-hash]
```

**Partial Rollback:**
- Keep improvements that work
- Revert only problematic changes
- Create new branch to fix issues

### Monitoring After Merge

Watch these metrics for 24-48 hours:
- [ ] Error rates in logs
- [ ] Performance metrics
- [ ] User reports
- [ ] Test failures in CI

---

## 11. Lessons Learned (Complete After)

### What Went Well
[Fill out after completing refactoring]

### What Could Be Improved
[What would you do differently?]

### Unexpected Challenges
[What surprised you?]

### Time Actual vs Estimated
Estimated: ___ hours  
Actual: ___ hours  
Difference: ___

---

## 12. Sign-Off

### Pre-Start Approval
- [ ] Plan reviewed by team
- [ ] Risks acknowledged
- [ ] Time estimate approved

**Approved by:** ___________  
**Date:** ___________

### Completion Sign-Off
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Tests passing in CI
- [ ] Documentation updated
- [ ] Ready to merge

**Completed by:** ___________  
**Date:** ___________  
**Merge commit:** ___________

---

## Notes and Observations

[Free-form notes during refactoring]

- Note 1: Found additional code smell in X
- Note 2: Tests revealed bug in Y
- Note 3: Performance improved by Z%

---

## References

- `references/patterns.md` - Refactoring patterns
- `references/best_practices.md` - Refactoring guidelines
- `references/advanced_topics.md` - Complex scenarios
- `references/troubleshooting.md` - Common issues

**Related Tickets/Issues:**
- Issue #___
- PR #___
