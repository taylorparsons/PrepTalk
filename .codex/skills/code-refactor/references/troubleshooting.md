# Troubleshooting Guide

Common issues when refactoring code and how to solve them.

## Issue: Tests Break After Refactoring

### Symptoms
- Tests that previously passed now fail
- Error messages about missing functions/classes
- Assertion failures on expected values

### Diagnosis
```bash
# Run tests to see what broke
pytest -v

# Check git diff to see what changed
git diff
```

### Solutions

**Solution 1: Revert and Take Smaller Steps**
```bash
git checkout -- .
# Start over with smaller, incremental changes
```

**Solution 2: Update Test Imports**
```python
# Before refactoring
from mymodule import old_function

# After extracting to new module
from mymodule.new_location import old_function
```

**Solution 3: Fix Test Assumptions**
```python
# Test might be too tightly coupled to implementation
# Before (brittle)
def test_process():
    result = process_data()
    assert result.internal_cache == expected  # Testing internals!

# After (robust)
def test_process():
    result = process_data()
    assert result.output == expected  # Testing behavior
```

### Prevention
- Run tests after every small change
- Commit working states frequently
- Write tests that check behavior, not implementation

---

## Issue: Refactoring Changed Behavior

### Symptoms
- Tests pass but production behaves differently
- Different output for same input
- Edge cases now fail

### Diagnosis
```python
# Add debug logging to compare before/after
import logging

logging.debug(f"Before refactor would return: {old_value}")
logging.debug(f"After refactor returns: {new_value}")
```

### Solutions

**Solution 1: Use Characterization Tests**
```python
# Capture old behavior first
def test_legacy_behavior():
    """This documents what the old code actually did"""
    result = legacy_function(weird_input)
    assert result == actual_old_output  # Not ideal output!
```

**Solution 2: Run Both Implementations in Parallel**
```python
def process_data(data, use_new=False):
    old_result = old_implementation(data)
    new_result = new_implementation(data)
    
    if old_result != new_result:
        log_difference(data, old_result, new_result)
    
    return new_result if use_new else old_result
```

**Solution 3: Restore from Backup**
```bash
# If you used --in-place with refactor_code.py
cp myfile.py.bak myfile.py
```

### Prevention
- Write comprehensive tests before refactoring
- Use version control (commit before refactoring)
- Refactor structure, not behavior
- Test with production-like data

---

## Issue: Don't Know Where to Start

### Symptoms
- Large codebase, unclear what needs refactoring
- Analysis paralysis
- Every file seems to need work

### Solutions

**Solution 1: Run the Analyzer**
```bash
# Identify concrete problems
python scripts/analyze_code.py myproject/ --recursive

# Focus on Critical and High priority issues first
```

**Solution 2: Use the Pain-Driven Approach**
- Which files do you modify most often?
- Which files have the most bugs?
- Which files take longest to understand?
- Start there.

**Solution 3: Follow the Scout Rule**
Don't refactor everything at once. Just improve code you're already touching:
```python
# While fixing a bug, also improve the code
def fix_bug_and_improve():
    # Fix the bug
    # THEN also: rename variables, add docstrings, extract magic numbers
    pass
```

### Prevention
- Keep a "technical debt" list
- Track problematic files
- Allocate 20% of sprint time to refactoring

---

## Issue: Refactoring Takes Too Long

### Symptoms
- Been refactoring for hours/days
- Still not done
- Scope keeps expanding

### Solutions

**Solution 1: Time-Box It**
```bash
# Set a timer
timer 2h

# Only refactor until timer expires
# Then commit what you have and move on
```

**Solution 2: Create a Branch**
```bash
git checkout -b refactor-user-module

# Work on branch, don't merge until complete
# But don't let branch live more than 2 days
```

**Solution 3: Reduce Scope**
```python
# Don't refactor this entire class
class HugeClass:
    def method_you_need(self):  # Only refactor THIS
        pass
    
    def other_method(self):  # Leave THIS alone
        pass
```

### Prevention
- Define clear refactoring goals upfront
- Set time limits
- Focus on one pattern at a time
- Accept "better" instead of demanding "perfect"

---

## Issue: Can't Refactor Safely (No Tests)

### Symptoms
- No test suite exists
- Tests exist but don't cover this code
- Too risky to refactor

### Solutions

**Solution 1: Write Tests First**
```python
# Characterization tests document current behavior
def test_current_behavior():
    """Test what code ACTUALLY does (not what it should do)"""
    result = untested_function(input)
    assert result == actual_current_output
```

**Solution 2: Use Approval Testing**
```python
# For complex outputs, save and compare
def test_report_generation():
    report = generate_report(sample_data)
    # First run: manually verify and approve
    # Subsequent runs: compare to approved version
    verify(report)
```

**Solution 3: Add Logging**
```python
# If you can't write tests, at least log behavior
import logging

def legacy_function(data):
    logging.info(f"Input: {data}")
    result = do_complex_stuff(data)
    logging.info(f"Output: {result}")
    return result
```

### Prevention
- Always write tests alongside code
- Never skip testing "because it's simple"
- Make tests a requirement for all PRs

---

## Issue: Code Analyzer Shows False Positives

### Symptoms
- analyze_code.py flags "long" functions that are actually fine
- Warnings about code that doesn't need refactoring

### Solutions

**Solution 1: Use Judgment**
Not every "long" function needs refactoring. Ask:
- Is it actually hard to understand?
- Does it have clear sections?
- Is it tested well?
- Does it change frequently?

If answers are "no", ignore the warning.

**Solution 2: Adjust Thresholds**
```python
# In analyze_code.py, modify these:
MAX_FUNCTION_LENGTH = 50  # Increase if needed
MAX_PARAMS = 5            # Adjust based on your codebase
MAX_NESTING = 3           # Change if your code is naturally nested
```

**Solution 3: Focus on High Priority**
```bash
# Only look at Critical and High issues
python scripts/analyze_code.py myfile.py | grep -E "(Critical|High)"
```

### Prevention
- Tune analyzer to your codebase
- Don't blindly follow rules
- Use analyzer as a guide, not gospel

---

## Issue: Automated Refactoring Broke Code

### Symptoms
- Used refactor_code.py
- Code now has syntax errors or wrong behavior

### Solutions

**Solution 1: Restore Backup**
```bash
# refactor_code.py creates .bak files
cp myfile.py.bak myfile.py
```

**Solution 2: Review Changes**
```bash
# See what actually changed
git diff myfile.py

# Or compare to backup
diff myfile.py.bak myfile.py
```

**Solution 3: Run Tests**
```bash
# Identify exactly what broke
pytest -v myfile_test.py
```

### Prevention
- Always run tests after automated refactoring
- Use `--dry-run` mode first to preview changes
- Start with one file to test the tool
- Keep backups (tool does this automatically)

---

## Issue: Merge Conflicts After Refactoring

### Symptoms
- Refactored on a branch
- Can't merge back due to conflicts
- Other developers changed the same files

### Solutions

**Solution 1: Rebase Frequently**
```bash
# While refactoring, keep syncing with main
git fetch origin
git rebase origin/main

# Fix conflicts incrementally
```

**Solution 2: Communicate**
- Tell team you're refactoring a module
- Ask them to avoid those files temporarily
- Coordinate in standup/Slack

**Solution 3: Use Smaller PRs**
```bash
# Instead of one huge refactoring PR
# Do multiple small ones
git checkout -b refactor-validation
# Refactor just validation module
# Merge quickly

git checkout -b refactor-database  
# Refactor just database module
# Merge quickly
```

### Prevention
- Refactor frequently in small batches
- Don't let refactoring branches live long
- Communicate with team
- Rebase daily if branch is long-lived

---

## Issue: Not Sure Which Pattern to Apply

### Symptoms
- Code smells identified but unclear how to fix
- Multiple refactoring patterns seem applicable

### Solutions

**Solution 1: Consult the Patterns Guide**
```bash
# Open the patterns reference
cat references/patterns.md | less

# Find the section matching your code smell
```

**Solution 2: Use the Decision Tree**
```
What's the problem?
├─ Function too long → Extract Method
├─ Too many parameters → Parameter Object  
├─ Class too large → Extract Class
├─ Deep nesting → Guard Clauses
├─ Type-based conditionals → Polymorphism
└─ Magic numbers → Named Constants
```

**Solution 3: Try the Simplest First**
When in doubt:
1. Extract Method (simplest)
2. Rename Variables (safe)
3. Extract Constants (low risk)
4. Move Method (if needed)

### Prevention
- Study patterns.md before starting
- Keep patterns.md open while refactoring
- Learn one pattern at a time

---

## Issue: Refactoring Decreased Performance

### Symptoms
- Code is cleaner but slower
- Tests take longer to run
- Production metrics show degradation

### Solutions

**Solution 1: Profile First**
```python
import cProfile

def profile_it():
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Your refactored code here
    result = refactored_function()
    
    profiler.disable()
    profiler.print_stats(sort='cumulative')
    return result
```

**Solution 2: Optimize Hot Paths Only**
```python
# Keep clean code for 95% of cases
def process_items(items):
    if len(items) > 1000:  # Hot path
        return optimized_batch_process(items)
    else:  # Clean, readable code for normal case
        return [process_single_item(item) for item in items]
```

**Solution 3: Measure Impact**
```bash
# Before refactoring
time python myscript.py
# 2.5 seconds

# After refactoring
time python myscript.py  
# 3.1 seconds

# If < 20% slower, probably acceptable
# If > 20% slower, optimize or revert
```

### Prevention
- Profile before and after refactoring
- Don't optimize prematurely
- Keep performance tests in CI
- Accept slight slowdown for maintainability

---

## Quick Troubleshooting Checklist

When refactoring goes wrong:

1. **Can you revert?**
   - `git checkout -- .` or restore from `.bak`

2. **Do tests pass?**
   - `pytest -v`
   - If no, fix tests or code

3. **Did behavior change?**
   - Compare outputs before/after
   - Check logs

4. **Is it performance?**
   - Profile the code
   - Focus optimization on hot paths

5. **Are you stuck?**
   - Take a break
   - Ask for code review
   - Revert and try smaller steps

6. **Need help?**
   - Read `references/patterns.md`
   - Read `references/best_practices.md`
   - Read `references/advanced_topics.md`

## When to Ask for Help

Don't struggle alone. Ask for help when:
- Stuck for more than 30 minutes
- Broke tests and can't figure out why
- Unsure which pattern to apply
- Refactoring keeps expanding in scope
- Performance degraded significantly
- Need code review before merging

Remember: **It's better to ask for help than to merge broken code.**
