---
name: code-refactor
description: Comprehensive code refactoring assistant for Python. Use when users need to improve code quality, identify refactoring opportunities, apply design patterns, or restructure code. Handles code smell detection, automated refactoring, and provides expert guidance on when and how to refactor safely.
---

# Code Refactoring Skill

Expert assistance for identifying and applying code refactorings to improve code quality, maintainability, and readability.

## When to Use This Skill

Use this skill when the user requests:
- Code quality improvements
- Identifying refactoring opportunities
- Detecting code smells
- Applying design patterns
- Restructuring code for better maintainability
- Simplifying complex code
- Extracting methods or classes
- Improving test coverage before refactoring
- Guidance on safe refactoring practices

## Quick Start Workflow

1. **Analyze** - Use `analyze_code.py` to identify refactoring opportunities
2. **Review patterns** - Reference `patterns.md` for appropriate refactoring pattern
3. **Apply refactoring** - Either use `refactor_code.py` for automated changes or manually refactor
4. **Verify** - Ensure tests pass and behavior is preserved
5. **Document** - Update documentation and commit changes

## Scripts

### analyze_code.py

Comprehensive code analyzer that detects refactoring opportunities using AST analysis.

**What it detects:**
- Long functions (>50 lines)
- Too many parameters (>5 params)
- Deep nesting (>3 levels)
- Missing docstrings
- Bare except clauses
- Large classes (>15 methods)
- Complex loops
- Syntax errors

**Command line usage:**
```bash
# Analyze a single file
python scripts/analyze_code.py mymodule.py

# Analyze a directory
python scripts/analyze_code.py myproject/ --recursive

# Output is both printed and saved to refactoring_report.txt
```

**Output format:**
- Summary with issue counts by severity (Critical, High, Medium, Low)
- Detailed report organized by file
- Line numbers for each issue
- Actionable recommendations

**Python usage:**
```python
from scripts.analyze_code import analyze_file, analyze_directory, generate_report

# Analyze single file
issues = analyze_file('mymodule.py')

# Analyze directory
results = analyze_directory('myproject/', recursive=True)

# Generate formatted report
report = generate_report(results)
print(report)
```

**Severity levels:**
- 🔴 **Critical**: Syntax errors, immediate attention needed
- 🟠 **High**: Security issues, bare except clauses
- 🟡 **Medium**: Long functions, deep nesting, large classes
- 🔵 **Low**: Missing docstrings, minor improvements

### refactor_code.py

Automated refactoring tool that applies safe code transformations.

**What it refactors:**
- `== None` → `is None`
- `!= None` → `is not None`
- `if x: return True else: return False` → `return x`
- Simplifies redundant boolean returns

**Command line usage:**
```bash
# Preview refactorings (saves to new file)
python scripts/refactor_code.py mymodule.py

# Apply in-place (creates .bak backup)
python scripts/refactor_code.py mymodule.py --in-place
```

**Safety features:**
- Creates `.bak` backup file before in-place changes
- Reports all changes made
- Handles syntax errors gracefully
- Preserves code behavior

**Python usage:**
```python
from scripts.refactor_code import refactor_code, refactor_file

# Refactor code string
code = "if x == None: return True"
refactored, changes = refactor_code(code)

# Refactor file
refactor_file('mymodule.py', in_place=True)
```

## Reference Guides

### Refactoring Patterns (references/patterns.md)

Comprehensive catalog of refactoring patterns with before/after examples. Read this when:
- Deciding which refactoring pattern to apply
- Need examples of specific refactoring techniques
- Understanding when to use each pattern
- Learning code smell detection triggers

**Key sections:**
- Extract Method - Break down long functions
- Replace Conditional with Polymorphism - Simplify type-based logic
- Introduce Parameter Object - Reduce parameter lists
- Replace Magic Numbers - Improve code clarity
- Extract Class - Split responsibilities
- Replace Nested Conditionals with Guard Clauses - Reduce nesting
- Decompose Conditional - Simplify complex conditions
- Replace Loop with Comprehension - More Pythonic code
- Code smell detection table with triggers and benefits

### Best Practices (references/best_practices.md)

Expert guidance on safe and effective refactoring. Read this when:
- Planning a refactoring effort
- Unsure whether to refactor now or later
- Need safety techniques for risky refactorings
- Want to avoid common pitfalls
- Understanding when NOT to refactor

**Key sections:**
- The refactoring process (test-driven refactoring)
- When to refactor (and when not to)
- Safety techniques (version control, testing)
- Code quality metrics (complexity, LOC, inheritance depth)
- Common pitfalls (over-engineering, premature optimization)
- Refactoring strategies (Strangler pattern, parallel change)
- Performance considerations
- Comprehensive refactoring checklist

## Common Refactoring Workflows

### Workflow 1: Identify and Fix Code Smells

```bash
# Step 1: Analyze code to find issues
python scripts/analyze_code.py myproject/ --recursive

# Step 2: Review report and prioritize issues
# (Check refactoring_report.txt)

# Step 3: For each high-priority issue, consult patterns.md
# to find the appropriate refactoring pattern

# Step 4: Apply refactorings manually or use refactor_code.py

# Step 5: Run tests to verify behavior preserved
pytest myproject/tests/

# Step 6: Commit changes
git commit -m "Refactor: Extract user validation logic"
```

### Workflow 2: Automated Quick Wins

```bash
# Apply automated refactorings
python scripts/refactor_code.py mymodule.py --in-place

# Review changes
git diff mymodule.py

# Run tests
pytest

# Commit if tests pass
git commit -m "Refactor: Simplify None comparisons"
```

### Workflow 3: Refactor Long Function

When analyze_code.py identifies a long function:

1. **Read the function** - Understand what it does
2. **Write tests** - If missing, add tests first
3. **Identify logical sections** - Look for groups of related operations
4. **Extract methods** - Create new functions for each section
5. **Update main function** - Replace sections with method calls
6. **Run tests** - Verify behavior unchanged
7. **Clean up** - Remove comments that are now obvious

### Workflow 4: Reduce Complexity

When dealing with deep nesting or complex conditionals:

1. **Measure complexity** - Use analyze_code.py
2. **Apply guard clauses** - Early returns for edge cases
3. **Extract conditional logic** - Move to named functions
4. **Use polymorphism** - Replace type checks with strategy pattern
5. **Verify** - Run tests and check complexity again

## Decision Trees

### Should I Refactor This Code?

```
Is there a test suite?
├─ No → Write tests first
└─ Yes
   └─ Is the code causing problems?
      ├─ Yes (bugs, hard to modify) → Refactor now
      └─ No
         └─ Will you need to modify it soon?
            ├─ Yes → Refactor as part of that work
            └─ No → Leave it alone
```

### Which Refactoring Pattern Should I Use?

```
What's the problem?
├─ Function too long → Extract Method
├─ Too many parameters → Parameter Object
├─ Class too large → Extract Class
├─ Deep nesting → Guard Clauses
├─ Type-based conditionals → Polymorphism
├─ Complex conditional → Decompose Conditional
├─ Duplicate code → Extract Method
└─ Magic numbers → Named Constants
```

## Best Practices Summary

### Before Refactoring
- ✅ Ensure tests exist and pass
- ✅ Commit working code
- ✅ Understand what code does
- ✅ Have clear refactoring goal

### During Refactoring
- ✅ Make small, incremental changes
- ✅ Run tests after each change
- ✅ Commit working states frequently
- ✅ Focus on structure, not behavior

### After Refactoring
- ✅ All tests pass
- ✅ Code is more readable
- ✅ Documentation updated
- ✅ Code review completed

### Red Flags - Don't Refactor If:
- ❌ No tests exist (write tests first)
- ❌ You don't understand the code (study it first)
- ❌ Critical deadline approaching (defer)
- ❌ Code is being replaced soon (not worth it)

## Troubleshooting

**Issue:** analyze_code.py shows many false positives

**Solution:** The analyzer uses conservative heuristics. Review each issue and use judgment. Some long functions are legitimately complex.

**Issue:** refactor_code.py changed behavior

**Solution:** The automated refactorings are conservative but not perfect. Always run tests. If behavior changed, restore from `.bak` file.

**Issue:** Don't know which pattern to apply

**Solution:** Read `patterns.md` and find the pattern that matches your code smell. Look at before/after examples.

**Issue:** Refactoring broke tests

**Solution:** Refactoring should preserve behavior. Review changes, ensure tests are correct, and fix the refactoring or revert.

**Issue:** Code is too complex to refactor safely

**Solution:** 
1. Write characterization tests first (tests that document current behavior)
2. Refactor in very small steps
3. Consider the Strangler pattern for gradual replacement
4. Read `best_practices.md` for strategies

## Async/Await Refactoring

This skill now includes comprehensive guidance for refactoring async code:

**When to use async refactoring:**
- Converting blocking I/O to async
- Optimizing concurrent operations
- Handling async exceptions properly
- Implementing async context managers
- Rate limiting async operations

**Quick example:**
```python
# Before (blocking)
def fetch_users(ids):
    return [requests.get(f"/users/{id}").json() for id in ids]

# After (async concurrent)
async def fetch_users(ids):
    async with httpx.AsyncClient() as client:
        tasks = [client.get(f"/users/{id}") for id in ids]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

**Resources:**
- `references/patterns.md` - Complete async refactoring patterns section
- `templates/async_function_template.py` - Ready-to-use async templates

## FastAPI Refactoring

New FastAPI-specific refactoring patterns:

**When to refactor FastAPI code:**
- main.py exceeds 200 lines → Extract routers
- Business logic in endpoints → Move to service layer
- Repeated validation → Create dependencies
- Global resources → Use lifespan events
- Slow operations in endpoints → Use BackgroundTasks

**Quick example:**
```python
# Before (logic in endpoint)
@app.post("/orders")
async def create_order(order: Order):
    # 50 lines of validation, calculation, db ops...
    pass

# After (service layer)
@app.post("/orders")
async def create_order(order: Order):
    return await order_service.create_order(order)
```

**Resources:**
- `references/fastapi_patterns.md` - Complete FastAPI refactoring guide
- Includes: Routers, dependencies, middleware, exception handlers, lifespan events

## Example Queries This Skill Handles

- "Analyze this code for refactoring opportunities"
- "This function is too long, help me break it down"
- "How can I simplify these nested if statements?"
- "Detect code smells in my project"
- "What refactoring pattern should I use here?"
- "Help me extract this repeated code"
- "Is this code ready to refactor?"
- "Apply automated refactorings to this file"
- "How do I safely refactor without breaking things?"

## Integration with Development Workflow

This skill works best when integrated into your normal development process:

1. **Pre-commit hook**: Run analyze_code.py before commits
2. **CI/CD pipeline**: Include code quality checks
3. **Code review**: Reference refactoring patterns in reviews
4. **Sprint planning**: Allocate time for technical debt reduction
5. **Pair programming**: Use patterns as shared vocabulary

## Metrics to Track

Monitor these metrics to measure refactoring impact:

- **Cyclomatic complexity** - Should decrease
- **Function length** - Should decrease  
- **Test coverage** - Should stay same or increase
- **Bug rate** - Should decrease over time
- **Development velocity** - Should increase after initial investment
