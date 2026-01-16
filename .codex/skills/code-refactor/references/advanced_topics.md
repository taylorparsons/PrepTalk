# Advanced Refactoring Topics

This guide covers complex refactoring scenarios that require deeper understanding and careful execution.

## Large-Scale Refactoring

### The Strangler Fig Pattern

When dealing with legacy systems that are too risky to refactor all at once, use the Strangler Fig pattern:

1. **Identify the boundary** - Choose a clear interface between old and new code
2. **Build alongside** - Create new implementation next to old one
3. **Redirect incrementally** - Route traffic to new code piece by piece
4. **Remove old code** - Only after new code is proven stable

**Example:**

```python
# Step 1: Old monolithic function
def process_order(order_data):
    validate_order(order_data)
    calculate_total(order_data)
    charge_payment(order_data)
    send_confirmation(order_data)
    update_inventory(order_data)
    
# Step 2: New service alongside old
class OrderProcessor:
    def __init__(self):
        self.validator = OrderValidator()
        self.payment = PaymentService()
        
    def process(self, order_data):
        self.validator.validate(order_data)
        # ... new clean implementation
        
# Step 3: Route new orders to new service
def process_order(order_data):
    if should_use_new_processor(order_data):
        return OrderProcessor().process(order_data)
    else:
        # Old implementation as fallback
        validate_order(order_data)
        # ...
```

### Parallel Change (Expand-Contract)

For refactorings that affect many call sites:

1. **Expand** - Add new interface alongside old
2. **Migrate** - Update all callers incrementally
3. **Contract** - Remove old interface once migration complete

**Example:**

```python
# Original
def calculate_price(item, quantity):
    return item.base_price * quantity

# Expand: Add new signature, keep old working
def calculate_price(item, quantity=None, order_context=None):
    if order_context:
        # New implementation
        return order_context.calculate_item_price(item)
    else:
        # Old implementation still works
        return item.base_price * quantity

# Migrate all callers over time
# ...

# Contract: Remove old signature once all callers migrated
def calculate_price(item, order_context):
    return order_context.calculate_item_price(item)
```

## Refactoring Legacy Code Without Tests

This is the most dangerous scenario. Follow this strict protocol:

### 1. Characterization Tests

Write tests that document current behavior (even if wrong):

```python
def test_legacy_behavior():
    """Documents actual behavior, not ideal behavior"""
    result = legacy_function(weird_input)
    # This might be a bug, but it's current behavior
    assert result == unexpected_value
```

### 2. Approval Testing

For complex outputs, use approval testing:

```python
def test_report_generation():
    report = generate_monthly_report(sample_data)
    # Save to file first time, compare thereafter
    verify_approved(report)
```

### 3. Golden Master Testing

Capture current outputs and compare:

```python
# Before refactoring
outputs = []
for input in test_inputs:
    outputs.append(legacy_system.process(input))
save_golden_master(outputs)

# After refactoring
new_outputs = []
for input in test_inputs:
    new_outputs.append(refactored_system.process(input))
assert new_outputs == load_golden_master()
```

## Refactoring Under Pressure

### Time-Boxed Refactoring

When you don't have unlimited time:

1. **Set a timer** - 2 hours maximum
2. **Identify quick wins** - Focus on highest-impact, lowest-risk changes
3. **Leave breadcrumbs** - Add TODO comments for future work
4. **Don't break tests** - If tests start failing, revert

**Quick Win Priorities:**
1. Extract magic numbers to constants
2. Rename confusing variables
3. Add missing docstrings
4. Extract duplicate code
5. Simplify boolean expressions

### The Scout Rule

"Leave the code better than you found it"

When fixing bugs or adding features:

```python
# Before (found this code)
def calc(d):
    if d['t'] == 'A':
        return d['p'] * 0.9
    else:
        return d['p']

# After (improved while fixing bug)
def calculate_price_with_discount(order_data: dict) -> float:
    """Calculate final price applying discounts based on order type.
    
    Args:
        order_data: Dictionary with 'type' and 'price' keys
        
    Returns:
        Final price after discounts
    """
    DISCOUNT_RATE = 0.1
    DISCOUNT_TYPE = 'A'
    
    if order_data['type'] == DISCOUNT_TYPE:
        return order_data['price'] * (1 - DISCOUNT_RATE)
    return order_data['price']
```

## Dealing with God Objects

Large classes with too many responsibilities require special tactics:

### 1. Identify Clusters

Group related methods and data:

```python
class OrderManager:  # God object
    # Cluster 1: Validation
    def validate_order(self): ...
    def check_inventory(self): ...
    
    # Cluster 2: Payment
    def charge_credit_card(self): ...
    def process_refund(self): ...
    
    # Cluster 3: Notification
    def send_email(self): ...
    def send_sms(self): ...
```

### 2. Extract Service Objects

Create focused classes for each cluster:

```python
class OrderValidator:
    def validate(self, order): ...
    def check_inventory(self, order): ...

class PaymentProcessor:
    def charge(self, order): ...
    def refund(self, order): ...
    
class NotificationService:
    def notify(self, order, method): ...
```

### 3. Compose in Original Class

Keep the original class as a facade initially:

```python
class OrderManager:
    def __init__(self):
        self.validator = OrderValidator()
        self.payment = PaymentProcessor()
        self.notifications = NotificationService()
        
    def process_order(self, order):
        self.validator.validate(order)
        self.payment.charge(order)
        self.notifications.notify(order, 'email')
```

## Refactoring Anti-Patterns

### Don't: Big Bang Refactoring

❌ **Bad:** Rewrite everything at once
✅ **Good:** Incremental changes with tests between each step

### Don't: Refactoring Without Tests

❌ **Bad:** Change code structure without safety net
✅ **Good:** Write characterization tests first, then refactor

### Don't: Mixing Refactoring with New Features

❌ **Bad:** Refactor and add features in same commit
✅ **Good:** Refactor first (separate commit), then add feature

### Don't: Premature Abstraction

❌ **Bad:** Create abstractions "for future needs"
✅ **Good:** Wait for duplication (Rule of Three), then abstract

## Performance-Sensitive Refactoring

When refactoring code with performance requirements:

### 1. Measure First

```python
import time
import cProfile

def profile_function(func):
    profiler = cProfile.Profile()
    profiler.enable()
    result = func()
    profiler.disable()
    profiler.print_stats(sort='cumulative')
    return result
```

### 2. Refactor

Make code cleaner without worrying about performance initially.

### 3. Measure Again

Compare before/after performance metrics.

### 4. Optimize Hot Paths

Only optimize the specific parts that matter:

```python
# Before: Clean but slow
def process_items(items):
    return [complex_transformation(item) for item in items]

# After profiling, optimize only the hot path
def process_items(items):
    # Optimization: Batch processing for speed
    batch_size = 1000
    results = []
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        results.extend(fast_batch_transform(batch))
    return results
```

## Refactoring with Dependencies

### Dependency Injection for Testability

Before:

```python
class OrderProcessor:
    def process(self, order):
        db = Database()  # Hard dependency
        payment = PaymentGateway()  # Hard dependency
        db.save(order)
        payment.charge(order)
```

After:

```python
class OrderProcessor:
    def __init__(self, db, payment_gateway):
        self.db = db
        self.payment = payment_gateway
        
    def process(self, order):
        self.db.save(order)
        self.payment.charge(order)

# Now easy to test with mocks
def test_order_processing():
    mock_db = MockDatabase()
    mock_payment = MockPayment()
    processor = OrderProcessor(mock_db, mock_payment)
    processor.process(test_order)
    assert mock_payment.was_charged
```

## Refactoring Patterns for Async Code

### Convert Callback Hell to Async/Await

Before:

```python
def process_order(order_id, callback):
    fetch_order(order_id, lambda order:
        validate_order(order, lambda valid:
            if valid:
                charge_payment(order, lambda result:
                    send_confirmation(order, callback)
                )
        )
    )
```

After:

```python
async def process_order(order_id):
    order = await fetch_order(order_id)
    valid = await validate_order(order)
    if valid:
        await charge_payment(order)
        await send_confirmation(order)
```

## Working with Databases

### Repository Pattern for Database Abstraction

Before:

```python
def get_user(user_id):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cursor.fetchone()
```

After:

```python
class UserRepository:
    def __init__(self, db_connection):
        self.db = db_connection
        
    def find_by_id(self, user_id):
        return self.db.query(User).filter_by(id=user_id).first()
        
    def save(self, user):
        self.db.add(user)
        self.db.commit()

# Easy to swap implementations
class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self.users = {}
    
    def find_by_id(self, user_id):
        return self.users.get(user_id)
```

## Refactoring for Concurrency

### Making Code Thread-Safe

Before:

```python
class Counter:
    def __init__(self):
        self.count = 0
        
    def increment(self):
        self.count += 1  # Not thread-safe
```

After:

```python
import threading

class Counter:
    def __init__(self):
        self.count = 0
        self.lock = threading.Lock()
        
    def increment(self):
        with self.lock:
            self.count += 1  # Thread-safe
```

## Summary

Advanced refactoring requires:
- **Patience** - Take small steps
- **Discipline** - Follow safety practices
- **Measurement** - Verify improvements
- **Pragmatism** - Know when to stop

The most important rule: **Never sacrifice working code for perfect code.**
