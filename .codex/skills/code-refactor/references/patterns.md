# Refactoring Patterns Reference

Comprehensive guide to common code refactoring patterns and when to apply them.

## Extract Method

**When to use:** Function is too long or does multiple things

**Before:**
```python
def process_order(order):
    # Validate order
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")
    
    # Calculate discounts
    discount = 0
    if order.total > 100:
        discount = order.total * 0.1
    
    # Apply tax
    tax = (order.total - discount) * 0.08
    
    # Save to database
    db.save(order)
    
    return order.total - discount + tax
```

**After:**
```python
def process_order(order):
    validate_order(order)
    discount = calculate_discount(order)
    tax = calculate_tax(order, discount)
    save_order(order)
    return calculate_final_price(order, discount, tax)

def validate_order(order):
    if not order.items:
        raise ValueError("Empty order")
    if order.total < 0:
        raise ValueError("Negative total")

def calculate_discount(order):
    if order.total > 100:
        return order.total * 0.1
    return 0

def calculate_tax(order, discount):
    return (order.total - discount) * 0.08

def save_order(order):
    db.save(order)

def calculate_final_price(order, discount, tax):
    return order.total - discount + tax
```

## Replace Conditional with Polymorphism

**When to use:** Complex if/elif chains based on type

**Before:**
```python
def calculate_shipping(order, shipping_type):
    if shipping_type == "standard":
        return order.weight * 0.5
    elif shipping_type == "express":
        return order.weight * 1.5 + 10
    elif shipping_type == "overnight":
        return order.weight * 3.0 + 25
    else:
        raise ValueError("Unknown shipping type")
```

**After:**
```python
class ShippingCalculator:
    def calculate(self, order):
        raise NotImplementedError

class StandardShipping(ShippingCalculator):
    def calculate(self, order):
        return order.weight * 0.5

class ExpressShipping(ShippingCalculator):
    def calculate(self, order):
        return order.weight * 1.5 + 10

class OvernightShipping(ShippingCalculator):
    def calculate(self, order):
        return order.weight * 3.0 + 25

# Usage
shipping = StandardShipping()
cost = shipping.calculate(order)
```

## Introduce Parameter Object

**When to use:** Function has too many parameters

**Before:**
```python
def create_user(first_name, last_name, email, phone, address, city, state, zip_code):
    # Implementation
    pass
```

**After:**
```python
from dataclasses import dataclass

@dataclass
class UserInfo:
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    zip_code: str

def create_user(user_info: UserInfo):
    # Implementation
    pass
```

## Replace Magic Numbers with Constants

**When to use:** Unexplained numeric literals in code

**Before:**
```python
def calculate_price(base_price):
    if base_price > 100:
        return base_price * 0.9
    return base_price
```

**After:**
```python
DISCOUNT_THRESHOLD = 100
DISCOUNT_RATE = 0.1

def calculate_price(base_price):
    if base_price > DISCOUNT_THRESHOLD:
        return base_price * (1 - DISCOUNT_RATE)
    return base_price
```

## Extract Class

**When to use:** Class has too many responsibilities

**Before:**
```python
class User:
    def __init__(self, name, email, address, city, state):
        self.name = name
        self.email = email
        self.address = address
        self.city = city
        self.state = state
    
    def send_email(self):
        # Email logic
        pass
    
    def validate_address(self):
        # Address validation
        pass
```

**After:**
```python
class Address:
    def __init__(self, street, city, state):
        self.street = street
        self.city = city
        self.state = state
    
    def validate(self):
        # Address validation
        pass

class User:
    def __init__(self, name, email, address: Address):
        self.name = name
        self.email = email
        self.address = address
    
    def send_email(self):
        # Email logic
        pass
```

## Replace Nested Conditional with Guard Clauses

**When to use:** Deep nesting makes code hard to read

**Before:**
```python
def process_payment(payment):
    if payment is not None:
        if payment.amount > 0:
            if payment.method == "credit_card":
                if payment.card.is_valid():
                    return charge_card(payment)
                else:
                    return "Invalid card"
            else:
                return "Invalid method"
        else:
            return "Invalid amount"
    else:
        return "No payment"
```

**After:**
```python
def process_payment(payment):
    if payment is None:
        return "No payment"
    
    if payment.amount <= 0:
        return "Invalid amount"
    
    if payment.method != "credit_card":
        return "Invalid method"
    
    if not payment.card.is_valid():
        return "Invalid card"
    
    return charge_card(payment)
```

## Decompose Conditional

**When to use:** Complex conditional logic is hard to understand

**Before:**
```python
if (user.is_premium or user.purchases > 10) and not user.is_blocked and user.email_verified:
    # Grant access
    pass
```

**After:**
```python
def user_has_access(user):
    return (
        is_trusted_user(user) and
        not user.is_blocked and
        user.email_verified
    )

def is_trusted_user(user):
    return user.is_premium or user.purchases > 10

if user_has_access(user):
    # Grant access
    pass
```

## Replace Loop with Comprehension

**When to use:** Simple loop that builds a list/dict

**Before:**
```python
results = []
for item in items:
    if item.price > 10:
        results.append(item.name)
```

**After:**
```python
results = [item.name for item in items if item.price > 10]
```

## Replace Type Code with State/Strategy

**When to use:** Behavior changes based on state field

**Before:**
```python
class Order:
    def __init__(self):
        self.status = "pending"  # pending, processing, shipped, delivered
    
    def process(self):
        if self.status == "pending":
            self.status = "processing"
            # Processing logic
        elif self.status == "processing":
            self.status = "shipped"
            # Shipping logic
        # ... etc
```

**After:**
```python
class OrderState:
    def process(self, order):
        raise NotImplementedError

class PendingState(OrderState):
    def process(self, order):
        # Processing logic
        order.set_state(ProcessingState())

class ProcessingState(OrderState):
    def process(self, order):
        # Shipping logic
        order.set_state(ShippedState())

class Order:
    def __init__(self):
        self._state = PendingState()
    
    def set_state(self, state):
        self._state = state
    
    def process(self):
        self._state.process(self)
```

## Consolidate Duplicate Conditional Fragments

**When to use:** Same code appears in all branches

**Before:**
```python
if user.is_admin:
    log_action("admin_access")
    grant_admin_access(user)
else:
    log_action("user_access")
    grant_user_access(user)
```

**After:**
```python
if user.is_admin:
    grant_admin_access(user)
    access_type = "admin_access"
else:
    grant_user_access(user)
    access_type = "user_access"

log_action(access_type)
```

## Refactoring Async Code

**When to use:** Working with async/await patterns, I/O-bound operations, concurrent tasks

### Pattern: Convert Blocking I/O to Async

**Before (Blocking):**
```python
import requests

def fetch_user_data(user_id):
    response = requests.get(f"https://api.example.com/users/{user_id}")
    return response.json()

def process_users(user_ids):
    results = []
    for user_id in user_ids:
        data = fetch_user_data(user_id)  # Blocks on each call
        results.append(data)
    return results
```

**After (Async):**
```python
import httpx
import asyncio

async def fetch_user_data(user_id):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.example.com/users/{user_id}")
        return response.json()

async def process_users(user_ids):
    tasks = [fetch_user_data(user_id) for user_id in user_ids]
    results = await asyncio.gather(*tasks)  # Concurrent execution
    return results

# Usage
asyncio.run(process_users([1, 2, 3, 4, 5]))
```

### Pattern: Extract Async Helper Functions

**Before:**
```python
async def handle_request(request):
    # Validate request
    if not request.data:
        raise ValueError("Empty request")
    
    # Fetch from database
    async with db.connect() as conn:
        user = await conn.fetch_one(
            "SELECT * FROM users WHERE id = ?", 
            request.user_id
        )
    
    # Call external API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.example.com/process",
            json={"user": user, "data": request.data}
        )
    
    # Save result
    async with db.connect() as conn:
        await conn.execute(
            "INSERT INTO results (user_id, result) VALUES (?, ?)",
            request.user_id, response.json()
        )
    
    return response.json()
```

**After:**
```python
async def handle_request(request):
    validate_request(request)
    user = await fetch_user(request.user_id)
    result = await process_with_api(user, request.data)
    await save_result(request.user_id, result)
    return result

def validate_request(request):
    if not request.data:
        raise ValueError("Empty request")

async def fetch_user(user_id):
    async with db.connect() as conn:
        return await conn.fetch_one(
            "SELECT * FROM users WHERE id = ?", 
            user_id
        )

async def process_with_api(user, data):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.example.com/process",
            json={"user": user, "data": data}
        )
        return response.json()

async def save_result(user_id, result):
    async with db.connect() as conn:
        await conn.execute(
            "INSERT INTO results (user_id, result) VALUES (?, ?)",
            user_id, result
        )
```

### Pattern: Async Context Manager for Resource Cleanup

**Before:**
```python
async def process_file(filename):
    file = await open_async(filename)
    try:
        data = await file.read()
        result = await process_data(data)
        return result
    finally:
        await file.close()
```

**After:**
```python
async def process_file(filename):
    async with open_async(filename) as file:
        data = await file.read()
        result = await process_data(data)
        return result

# Or create a custom async context manager
class AsyncResourceManager:
    async def __aenter__(self):
        self.resource = await acquire_resource()
        return self.resource
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.resource.cleanup()

async def use_resource():
    async with AsyncResourceManager() as resource:
        await resource.do_work()
```

### Async Anti-Patterns to Avoid

❌ **Blocking calls in async functions**
```python
async def bad():
    result = requests.get(url)  # Blocks event loop!
    return result
```
✅ **Use async libraries**
```python
async def good():
    async with httpx.AsyncClient() as client:
        result = await client.get(url)
    return result
```

## Refactoring Decorators

**When to use:** Reusing cross-cutting concerns, adding behavior without modifying functions

### Pattern: Extract Common Logic to Decorator

**Before:**
```python
def process_order(order_id):
    start_time = time.time()
    print(f"Processing order {order_id}")
    
    result = _process_order_logic(order_id)
    
    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.2f}s")
    return result

def process_payment(payment_id):
    start_time = time.time()
    print(f"Processing payment {payment_id}")
    
    result = _process_payment_logic(payment_id)
    
    elapsed = time.time() - start_time
    print(f"Completed in {elapsed:.2f}s")
    return result
```

**After:**
```python
import functools
import time

def timing_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        print(f"Processing {func.__name__}")
        
        result = func(*args, **kwargs)
        
        elapsed = time.time() - start_time
        print(f"Completed in {elapsed:.2f}s")
        return result
    return wrapper

@timing_decorator
def process_order(order_id):
    return _process_order_logic(order_id)

@timing_decorator
def process_payment(payment_id):
    return _process_payment_logic(payment_id)
```

### Pattern: Parameterized Decorators

**Before:**
```python
def require_admin(func):
    def wrapper(user, *args, **kwargs):
        if user.role != "admin":
            raise PermissionError("Admin required")
        return func(user, *args, **kwargs)
    return wrapper

def require_premium(func):
    def wrapper(user, *args, **kwargs):
        if user.subscription != "premium":
            raise PermissionError("Premium required")
        return func(user, *args, **kwargs)
    return wrapper
```

**After:**
```python
def require_permission(permission_check):
    """Parameterized decorator for permission checks."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(user, *args, **kwargs):
            if not permission_check(user):
                raise PermissionError(f"{func.__name__} requires special permission")
            return func(user, *args, **kwargs)
        return wrapper
    return decorator

# Usage
@require_permission(lambda u: u.role == "admin")
def admin_action(user):
    pass

@require_permission(lambda u: u.subscription == "premium")
def premium_feature(user):
    pass
```

### Decorator Anti-Patterns

❌ **Not using @functools.wraps**
```python
def bad_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper  # Loses function metadata!
```
✅ **Always use @functools.wraps**
```python
def good_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper  # Preserves metadata
```

## Refactoring FastAPI Routes

**When to use:** Working with FastAPI applications, optimizing API structure, improving maintainability

### Pattern: Extract Router from Large main.py

**Before (Monolithic main.py):**
```python
# main.py - 300+ lines
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/users")
async def list_users():
    # User logic
    pass

@app.post("/users")
async def create_user(user: User):
    # User creation logic
    pass

@app.get("/products")
async def list_products():
    # Product logic
    pass

@app.post("/products")
async def create_product(product: Product):
    # Product creation logic
    pass

# Many more endpoints...
```

**After (Modular routers):**
```python
# main.py
from fastapi import FastAPI
from routers import users, products

app = FastAPI()

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(products.router, prefix="/products", tags=["products"])

# routers/users.py
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("")
async def list_users():
    # User logic
    pass

@router.post("")
async def create_user(user: User):
    # User creation logic
    pass

# routers/products.py
from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def list_products():
    # Product logic
    pass

@router.post("")
async def create_product(product: Product):
    # Product creation logic
    pass
```

### Pattern: Extract Business Logic to Service Layer

**Before (Logic in endpoint):**
```python
@app.post("/orders")
async def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    # Validation
    if order.quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")

    # Check inventory
    product = db.query(Product).filter(Product.id == order.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < order.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Calculate price
    subtotal = product.price * order.quantity
    tax = subtotal * 0.08
    total = subtotal + tax

    # Apply discount
    if order.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == order.coupon_code).first()
        if coupon and coupon.is_valid():
            total = total * (1 - coupon.discount_percent / 100)

    # Create order
    db_order = Order(
        product_id=order.product_id,
        quantity=order.quantity,
        total=total
    )
    db.add(db_order)

    # Update inventory
    product.stock -= order.quantity
    db.commit()
    db.refresh(db_order)

    return db_order
```

**After (Service layer):**
```python
# routers/orders.py
@router.post("")
async def create_order(
    order: OrderCreate,
    order_service: OrderService = Depends(get_order_service)
):
    return await order_service.create_order(order)

# services/order_service.py
class OrderService:
    def __init__(self, db: Session):
        self.db = db

    async def create_order(self, order: OrderCreate) -> Order:
        """Create a new order with validation and business logic."""
        self._validate_order(order)
        product = await self._get_product(order.product_id)
        self._check_inventory(product, order.quantity)

        total = self._calculate_total(product, order)

        db_order = await self._save_order(order, total)
        await self._update_inventory(product, order.quantity)

        return db_order

    def _validate_order(self, order: OrderCreate):
        if order.quantity <= 0:
            raise ValueError("Invalid quantity")

    async def _get_product(self, product_id: int) -> Product:
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Product not found")
        return product

    def _check_inventory(self, product: Product, quantity: int):
        if product.stock < quantity:
            raise ValueError("Insufficient stock")

    def _calculate_total(self, product: Product, order: OrderCreate) -> float:
        subtotal = product.price * order.quantity
        tax = subtotal * 0.08
        total = subtotal + tax

        if order.coupon_code:
            total = self._apply_coupon(total, order.coupon_code)

        return total

    # ... other helper methods
```

### Pattern: Create Reusable Dependencies

**Before (Repeated validation):**
```python
@app.get("/admin/users")
async def get_users(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    # ... logic

@app.get("/admin/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    # ... logic

@app.post("/admin/config")
async def update_config(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    # ... logic
```

**After (Dependency injection):**
```python
# dependencies/auth.py
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current user from token."""
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require user to be admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# routers/admin.py
@router.get("/users")
async def get_users(admin: User = Depends(require_admin)):
    # ... logic - admin access already verified

@router.get("/settings")
async def get_settings(admin: User = Depends(require_admin)):
    # ... logic

@router.post("/config")
async def update_config(admin: User = Depends(require_admin)):
    # ... logic
```

### Pattern: Use Lifespan Events for Resource Management

**Before (Global resources without proper cleanup):**
```python
from fastapi import FastAPI
import redis

app = FastAPI()

# Global connection created at import time
redis_client = redis.Redis(host='localhost', port=6379)

@app.get("/data")
async def get_data():
    return redis_client.get("key")

# No cleanup when app shuts down
```

**After (Lifespan events):**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize resources
    redis_client = await create_redis_pool()
    app.state.redis = redis_client
    print("Redis connection established")

    yield

    # Shutdown: Clean up resources
    await redis_client.close()
    print("Redis connection closed")

app = FastAPI(lifespan=lifespan)

@app.get("/data")
async def get_data():
    return await app.state.redis.get("key")
```

### Pattern: Use BackgroundTasks for Non-Blocking Operations

**Before (Blocking operation):**
```python
@app.post("/orders")
async def create_order(order: OrderCreate):
    # Create order in database
    db_order = await save_order(order)

    # Send confirmation email (blocks response)
    await send_email(order.email, "Order Confirmation", order_details)

    # Generate invoice PDF (blocks response)
    pdf = await generate_invoice_pdf(db_order)

    # Update analytics (blocks response)
    await update_analytics(db_order)

    return db_order  # User waits for everything to complete
```

**After (Background tasks):**
```python
from fastapi import BackgroundTasks

@app.post("/orders")
async def create_order(order: OrderCreate, background_tasks: BackgroundTasks):
    # Create order in database (synchronous)
    db_order = await save_order(order)

    # Queue background tasks (non-blocking)
    background_tasks.add_task(send_email, order.email, "Order Confirmation", order_details)
    background_tasks.add_task(generate_invoice_pdf, db_order)
    background_tasks.add_task(update_analytics, db_order)

    return db_order  # User gets immediate response
```

### FastAPI Anti-Patterns to Avoid

❌ **Mixing business logic with endpoints**
```python
@app.post("/users")
async def create_user(user: UserCreate):
    # 100 lines of validation, calculation, DB operations...
    pass
```
✅ **Separate concerns with service layer**
```python
@app.post("/users")
async def create_user(user: UserCreate, service: UserService = Depends()):
    return await service.create_user(user)
```

❌ **Repeated code across endpoints**
```python
@app.get("/endpoint1")
async def endpoint1():
    if not validate_something():
        raise HTTPException(400)
    # logic

@app.get("/endpoint2")
async def endpoint2():
    if not validate_something():
        raise HTTPException(400)
    # logic
```
✅ **Use dependencies for reusable logic**
```python
async def validate_dependency():
    if not validate_something():
        raise HTTPException(400)

@app.get("/endpoint1")
async def endpoint1(validated: None = Depends(validate_dependency)):
    # logic

@app.get("/endpoint2")
async def endpoint2(validated: None = Depends(validate_dependency)):
    # logic
```

## When to Apply Each Pattern

| Pattern | Trigger | Benefit |
|---------|---------|---------|
| Extract Method | Function > 50 lines | Readability, reusability |
| Extract Class | Class > 15 methods | Single responsibility |
| Replace Conditional | Deep if/elif chains | Maintainability, extensibility |
| Parameter Object | Function > 5 params | Clarity, flexibility |
| Guard Clauses | Nesting depth > 3 | Readability |
| Magic Numbers | Unexplained literals | Maintainability |
| List Comprehension | Simple loops | Conciseness, performance |
| Async I/O | Blocking I/O operations | Concurrency, performance |
| Decorators | Cross-cutting concerns | DRY, separation of concerns |

## Code Smell Detection

**Long Method:** > 50 lines → Extract method
**Long Parameter List:** > 5 parameters → Parameter object
**Large Class:** > 15 methods → Extract class
**Deep Nesting:** > 3 levels → Guard clauses or extract method
**Duplicate Code:** Repeated logic → Extract to function
**Dead Code:** Unused code → Delete it
**Magic Numbers:** Unexplained literals → Named constants
**Complex Conditionals:** Hard to read → Extract to named function
