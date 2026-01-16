# FastAPI Refactoring Patterns

Comprehensive guide to refactoring FastAPI applications for better structure, maintainability, and scalability.

## Pattern: Extract Router from Large Main File

**When to use:** `main.py` has more than 10 endpoints or 200 lines

**Before:**
```python
# main.py (500+ lines)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    id: int
    name: str
    email: str

class Order(BaseModel):
    id: int
    user_id: int
    total: float

@app.get("/users")
async def get_users():
    # User logic
    pass

@app.post("/users")
async def create_user(user: User):
    # User logic
    pass

@app.get("/orders")
async def get_orders():
    # Order logic
    pass

@app.post("/orders")
async def create_order(order: Order):
    # Order logic
    pass

# ... 20 more endpoints
```

**After:**
```python
# main.py (clean and organized)
from fastapi import FastAPI
from app.routers import users, orders

app = FastAPI()

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# app/routers/users.py
from fastapi import APIRouter, HTTPException
from app.models import User
from app.services import user_service

router = APIRouter()

@router.get("/")
async def get_users():
    return await user_service.get_all()

@router.post("/")
async def create_user(user: User):
    return await user_service.create(user)


# app/routers/orders.py
from fastapi import APIRouter
from app.models import Order
from app.services import order_service

router = APIRouter()

@router.get("/")
async def get_orders():
    return await order_service.get_all()

@router.post("/")
async def create_order(order: Order):
    return await order_service.create(order)
```

---

## Pattern: Extract Business Logic to Service Layer

**When to use:** Endpoints contain complex business logic

**Before:**
```python
@app.post("/orders")
async def create_order(order: Order):
    # Validation
    if order.total < 0:
        raise HTTPException(400, "Invalid total")
    
    # Check user exists
    user = await db.get_user(order.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    
    # Calculate tax
    tax = order.total * 0.08
    
    # Apply discount
    discount = 0
    if order.total > 100:
        discount = order.total * 0.1
    
    # Save order
    final_total = order.total - discount + tax
    order.final_total = final_total
    await db.save_order(order)
    
    # Send confirmation email
    await send_email(user.email, f"Order confirmed: ${final_total}")
    
    return order
```

**After:**
```python
# app/routers/orders.py
@router.post("/")
async def create_order(order: Order):
    """Endpoint delegates to service layer."""
    return await order_service.create_order(order)


# app/services/order_service.py
class OrderService:
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
    
    async def create_order(self, order: Order) -> Order:
        """Business logic isolated in service."""
        # Validate
        self._validate_order(order)
        
        # Check dependencies
        user = await self._get_user(order.user_id)
        
        # Calculate amounts
        final_total = self._calculate_final_total(order)
        order.final_total = final_total
        
        # Persist
        await self.db.save_order(order)
        
        # Side effects
        await self.email_service.send_confirmation(user.email, final_total)
        
        return order
    
    def _validate_order(self, order: Order):
        if order.total < 0:
            raise ValueError("Invalid total")
    
    async def _get_user(self, user_id: int):
        user = await self.db.get_user(user_id)
        if not user:
            raise ValueError("User not found")
        return user
    
    def _calculate_final_total(self, order: Order) -> float:
        tax = order.total * 0.08
        discount = order.total * 0.1 if order.total > 100 else 0
        return order.total - discount + tax


# Initialize service
order_service = OrderService(db=database, email_service=email)
```

---

## Pattern: Dependency Injection for Database Connections

**When to use:** Multiple endpoints need database access

**Before:**
```python
# Global database connection (not ideal)
db = Database("sqlite:///app.db")

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return await db.query("SELECT * FROM users WHERE id = ?", user_id)

@app.post("/users")
async def create_user(user: User):
    await db.execute("INSERT INTO users ...", user.dict())
    return user
```

**After:**
```python
from fastapi import Depends
from sqlalchemy.orm import Session

# Dependency function
async def get_db() -> AsyncGenerator[Session, None]:
    """Yields database session, ensures cleanup."""
    async with async_session() as session:
        yield session

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Database injected via Depends."""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()

@app.post("/users")
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Each endpoint gets its own session."""
    db_user = User(**user.dict())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
```

---

## Pattern: Refactor Repeated Validation to Dependencies

**When to use:** Multiple endpoints need same validation logic

**Before:**
```python
@app.get("/admin/users")
async def get_users(api_key: str):
    if api_key != "secret_key":
        raise HTTPException(401, "Unauthorized")
    return await db.get_users()

@app.post("/admin/users")
async def create_user(api_key: str, user: User):
    if api_key != "secret_key":
        raise HTTPException(401, "Unauthorized")
    return await db.create_user(user)

@app.delete("/admin/users/{user_id}")
async def delete_user(api_key: str, user_id: int):
    if api_key != "secret_key":
        raise HTTPException(401, "Unauthorized")
    return await db.delete_user(user_id)
```

**After:**
```python
from fastapi import Depends, Header, HTTPException

# Dependency for auth validation
async def verify_api_key(x_api_key: str = Header(...)):
    """Reusable auth dependency."""
    if x_api_key != "secret_key":
        raise HTTPException(401, "Unauthorized")
    return x_api_key

@app.get("/admin/users", dependencies=[Depends(verify_api_key)])
async def get_users():
    """Auth handled by dependency."""
    return await db.get_users()

@app.post("/admin/users")
async def create_user(
    user: User, 
    api_key: str = Depends(verify_api_key)
):
    """Can also use returned value if needed."""
    return await db.create_user(user)

@app.delete("/admin/users/{user_id}", dependencies=[Depends(verify_api_key)])
async def delete_user(user_id: int):
    return await db.delete_user(user_id)
```

---

## Pattern: Extract Pydantic Models to Separate Module

**When to use:** Models are used across multiple files

**Before:**
```python
# main.py
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str

class UserCreate(BaseModel):
    name: str
    email: str

class UserUpdate(BaseModel):
    name: Optional[str]
    email: Optional[str]

@app.post("/users")
async def create_user(user: UserCreate):
    # ...
```

**After:**
```python
# app/models/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserBase(BaseModel):
    """Shared user properties."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr

class UserCreate(UserBase):
    """Schema for creating users."""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """Schema for updating users (all optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None

class UserResponse(UserBase):
    """Schema for user responses."""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True  # For SQLAlchemy compatibility


# app/routers/users.py
from app.models.user import UserCreate, UserResponse

@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate):
    # ...
```

---

## Pattern: Background Tasks for Async Side Effects

**When to use:** Endpoint needs to trigger slow operations (emails, logging, cleanup)

**Before:**
```python
@app.post("/orders")
async def create_order(order: Order):
    # Save order
    await db.save_order(order)
    
    # Send email (blocks response)
    await send_confirmation_email(order.user.email)  # Slow!
    
    # Log analytics (blocks response)
    await log_to_analytics(order)  # Slow!
    
    return order  # User waits for everything
```

**After:**
```python
from fastapi import BackgroundTasks

@app.post("/orders")
async def create_order(order: Order, background_tasks: BackgroundTasks):
    # Save order
    await db.save_order(order)
    
    # Queue background tasks (non-blocking)
    background_tasks.add_task(send_confirmation_email, order.user.email)
    background_tasks.add_task(log_to_analytics, order)
    
    return order  # User gets immediate response
```

---

## Pattern: Global Exception Handlers

**When to use:** Multiple endpoints raise similar exceptions

**Before:**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    try:
        user = await db.get_user(user_id)
        if not user:
            raise HTTPException(404, "User not found")
        return user
    except DatabaseError as e:
        raise HTTPException(500, f"Database error: {e}")

@app.get("/orders/{order_id}")
async def get_order(order_id: int):
    try:
        order = await db.get_order(order_id)
        if not order:
            raise HTTPException(404, "Order not found")
        return order
    except DatabaseError as e:
        raise HTTPException(500, f"Database error: {e}")
```

**After:**
```python
from fastapi import Request
from fastapi.responses import JSONResponse

# Custom exceptions
class DatabaseError(Exception):
    pass

class NotFoundError(Exception):
    pass

# Global exception handlers
@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    return JSONResponse(
        status_code=500,
        content={"message": f"Database error: {str(exc)}"}
    )

@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={"message": str(exc)}
    )

# Clean endpoints
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await db.get_user(user_id)
    if not user:
        raise NotFoundError("User not found")
    return user

@app.get("/orders/{order_id}")
async def get_order(order_id: int):
    order = await db.get_order(order_id)
    if not order:
        raise NotFoundError("Order not found")
    return order
```

---

## Pattern: Middleware for Cross-Cutting Concerns

**When to use:** Need logging, timing, or headers on all requests

**Before:**
```python
import time

@app.get("/users")
async def get_users():
    start = time.time()
    result = await db.get_users()
    print(f"Request took {time.time() - start}s")
    return result

@app.get("/orders")
async def get_orders():
    start = time.time()
    result = await db.get_orders()
    print(f"Request took {time.time() - start}s")
    return result
```

**After:**
```python
import time
from fastapi import Request

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Middleware applies to all requests."""
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    response.headers["X-Process-Time"] = str(duration)
    print(f"{request.method} {request.url.path} took {duration}s")
    return response

# Clean endpoints (no timing code)
@app.get("/users")
async def get_users():
    return await db.get_users()

@app.get("/orders")
async def get_orders():
    return await db.get_orders()
```

---

## Pattern: Lifespan Events for Startup/Shutdown

**When to use:** Need to initialize resources (DB pool, cache) or cleanup on shutdown

**Before:**
```python
# Global initialization (runs on import!)
db = Database("sqlite:///app.db")
cache = Cache()

@app.get("/users")
async def get_users():
    return await db.query("SELECT * FROM users")
```

**After:**
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""
    # Startup
    print("Initializing database pool...")
    app.state.db = await Database.connect("sqlite:///app.db")
    app.state.cache = Cache()
    
    yield  # Application runs
    
    # Shutdown
    print("Closing database connections...")
    await app.state.db.close()
    app.state.cache.clear()

app = FastAPI(lifespan=lifespan)

@app.get("/users")
async def get_users(request: Request):
    """Access via request.app.state."""
    return await request.app.state.db.query("SELECT * FROM users")
```

---

## FastAPI Anti-Patterns

❌ **Using `def` instead of `async def` for I/O operations**
```python
@app.get("/users")
def get_users():  # Blocks event loop!
    return db.query("SELECT * FROM users")
```

✅ **Always use `async def` for I/O**
```python
@app.get("/users")
async def get_users():
    return await db.query("SELECT * FROM users")
```

❌ **Raising generic Exception instead of HTTPException**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id < 0:
        raise Exception("Invalid ID")  # Returns 500!
```

✅ **Use HTTPException for client errors**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    if user_id < 0:
        raise HTTPException(400, "Invalid ID")  # Returns 400
```

❌ **Not using response models for validation**
```python
@app.get("/users")
async def get_users():
    users = await db.get_users()
    return users  # Returns anything from DB!
```

✅ **Use response_model for consistency**
```python
@app.get("/users", response_model=List[UserResponse])
async def get_users():
    users = await db.get_users()
    return users  # Validated and serialized
```

---

## Recommended FastAPI Project Structure

```
app/
├── main.py              # FastAPI app initialization
├── routers/             # API endpoints by domain
│   ├── users.py
│   ├── orders.py
│   └── auth.py
├── models/              # Pydantic schemas
│   ├── user.py
│   ├── order.py
│   └── common.py
├── services/            # Business logic
│   ├── user_service.py
│   └── order_service.py
├── database/            # Database models & connection
│   ├── models.py        # SQLAlchemy models
│   └── session.py       # DB session management
├── dependencies/        # Reusable dependencies
│   ├── auth.py
│   └── database.py
├── middleware/          # Custom middleware
│   └── timing.py
└── config.py            # Configuration
```

---

## Quick Refactoring Checklist

- [ ] Endpoints > 20 lines → Extract business logic to service
- [ ] Repeated validation → Create dependency
- [ ] main.py > 200 lines → Split into routers
- [ ] Database access in endpoints → Use dependency injection
- [ ] Slow operations in endpoints → Use BackgroundTasks
- [ ] Try/except in every endpoint → Use global exception handlers
- [ ] Same code in all endpoints → Use middleware
- [ ] Global resource initialization → Use lifespan events
- [ ] Models scattered across files → Centralize in models/
- [ ] No response_model → Add for validation and docs
