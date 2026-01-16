# Refactoring Best Practices

Guidelines for safe and effective code refactoring.

## The Refactoring Process

### 1. Ensure Tests Exist
Before refactoring, verify comprehensive test coverage exists. If not, write tests first.

**Why:** Tests ensure refactoring doesn't break functionality.

### 2. Make Small Changes
Refactor in small, incremental steps. Commit after each successful change.

**Why:** Easier to identify what broke if tests fail.

### 3. Run Tests Frequently
Run the full test suite after every change.

**Why:** Immediate feedback on whether changes preserved behavior.

### 4. Refactor or Add Features, Not Both
Never refactor and add features in the same commit.

**Why:** Separates concerns and makes debugging easier.

## When to Refactor

### Red-Green-Refactor Cycle
1. **Red:** Write failing test
2. **Green:** Make test pass (any way possible)
3. **Refactor:** Clean up the code

### Signs Code Needs Refactoring

**Immediate refactoring needed:**
- Can't understand code after 30 seconds
- Adding a feature requires changing code in 5+ places
- Tests are brittle and break frequently
- Code has known bugs that keep recurring

**Plan refactoring soon:**
- Functions longer than one screen
- Classes with more than 10-15 methods
- Deeply nested conditionals (3+ levels)
- Duplicate code in multiple places

**Consider refactoring:**
- No docstrings on public interfaces
- Variable names like `x`, `tmp`, `data`
- Magic numbers throughout code
- Comments explaining "what" instead of "why"

## When NOT to Refactor

**Don't refactor when:**
- No tests exist and writing them is impractical
- Code works perfectly and never needs changes
- Near a critical deadline (refactor after)
- The code is in a legacy system about to be replaced
- You don't understand what the code does

**The Two-Commit Rule:** If you can't understand code in two commits of investigation, write tests before refactoring.

## Safety Techniques

### Version Control
Always commit working code before starting refactoring.

```bash
git commit -m "Working state before refactoring"
git checkout -b refactor/improve-user-service
# Refactor...
git commit -m "Refactor: extract user validation logic"
```

### Automated Testing
Maintain test coverage during refactoring:

```bash
# Run tests before
pytest --cov=mymodule tests/

# Refactor code

# Run tests after - coverage should not decrease
pytest --cov=mymodule tests/
```

### IDE Refactoring Tools
Use automated refactoring tools when available:
- Rename variable/function/class
- Extract method
- Inline variable
- Change signature

**Why:** IDE tools update all references automatically.

## Code Quality Metrics

### Cyclomatic Complexity
Measure of code complexity based on decision points.

**Thresholds:**
- 1-10: Simple, easy to test
- 11-20: Moderate complexity
- 21-50: Complex, hard to test
- 50+: Untestable, high risk

**How to reduce:**
- Extract methods
- Use guard clauses
- Replace conditionals with polymorphism

### Lines of Code (LOC)
Function and class size guidelines:

**Functions:**
- Ideal: 5-15 lines
- Acceptable: 15-50 lines
- Refactor: 50+ lines

**Classes:**
- Ideal: 100-300 lines
- Acceptable: 300-500 lines
- Refactor: 500+ lines

### Depth of Inheritance
How many parent classes a class has.

**Guidelines:**
- 0-2: Good
- 3-4: Acceptable
- 5+: Consider composition over inheritance

## Common Pitfalls

### Over-Engineering
**Problem:** Refactoring code to handle scenarios that don't exist.

**Solution:** YAGNI (You Aren't Gonna Need It) - only refactor for current needs.

### Premature Optimization
**Problem:** Refactoring for performance without profiling.

**Solution:** Profile first, optimize only proven bottlenecks.

### Refactoring Without Tests
**Problem:** Changing code without safety net.

**Solution:** Write tests first, or don't refactor yet.

### Big Bang Refactoring
**Problem:** Refactoring entire codebase at once.

**Solution:** Refactor incrementally, one module at a time.

### Changing Behavior
**Problem:** Accidentally changing what code does while refactoring.

**Solution:** Refactoring should only change structure, not behavior.

## Refactoring Strategies

### The Strangler Pattern
Gradually replace old code with new implementation:

1. Write new implementation alongside old
2. Route some traffic to new code
3. Gradually increase traffic to new code
4. Remove old code when 100% migrated

### Branch by Abstraction
Create abstraction layer to allow incremental replacement:

1. Create interface for current implementation
2. Change all callers to use interface
3. Create new implementation of interface
4. Switch to new implementation
5. Remove old implementation

### Parallel Change
Make changes in multiple steps:

1. Add new parameter (with default value)
2. Update all callers to pass new parameter
3. Update implementation to use new parameter
4. Remove default value from new parameter

## Documentation

### What to Document During Refactoring

**Do document:**
- Why refactoring was needed
- Major design decisions
- Public API changes
- Performance impacts

**Don't document:**
- What the code does (code should be self-explanatory)
- Obvious refactorings
- Internal implementation details

### Commit Messages

**Good:**
```
Refactor: Extract user validation into separate function

The process_user function was 80 lines and doing both
validation and processing. Extracted validation logic
to improve readability and testability.
```

**Bad:**
```
Fix code
```

## Performance Considerations

### Profile Before Optimizing
Use profiling tools to identify actual bottlenecks:

```python
import cProfile
cProfile.run('my_function()')
```

### Common Performance Traps

**Premature optimization:**
- Refactoring for performance without measuring
- Solution: Profile first

**Over-abstraction:**
- Too many layers hurts performance
- Solution: Balance abstraction with pragmatism

**Inappropriate data structures:**
- Using list for membership testing
- Solution: Use set or dict when appropriate

## Refactoring Checklist

Before refactoring:
- [ ] Tests exist and pass
- [ ] Code is committed
- [ ] Understand what code does
- [ ] Have a clear refactoring goal

During refactoring:
- [ ] Make small changes
- [ ] Run tests after each change
- [ ] Commit working states
- [ ] Preserve behavior

After refactoring:
- [ ] All tests pass
- [ ] Code is more readable
- [ ] No new warnings or errors
- [ ] Documentation updated
- [ ] Code review requested

## Tools

### Python Refactoring Tools
- **Black:** Auto-format code
- **isort:** Sort imports
- **pylint/flake8:** Detect code smells
- **mypy:** Type checking
- **rope:** Automated refactoring

### Static Analysis
```bash
# Find code smells
pylint mymodule.py

# Check complexity
radon cc mymodule.py -a

# Find security issues
bandit -r mymodule/
```

## Learning Resources

**Books:**
- "Refactoring" by Martin Fowler
- "Working Effectively with Legacy Code" by Michael Feathers
- "Clean Code" by Robert Martin

**Online:**
- refactoring.guru - Visual refactoring catalog
- sourcemaking.com - Code smells and patterns
