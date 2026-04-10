# Senior Backend Engineering Reference

Daily reference toolkit for building production-grade backend systems. Covers REST API design, database optimization, authentication, performance engineering, testing strategy, and security hardening.

## 1. API Development Standards

### RESTful Design Conventions

A properly designed API follows resource-oriented design with consistent verb semantics:

```
GET    /api/v1/users              # List all users (with pagination, filtering, sorting)
GET    /api/v1/users/{id}         # Fetch single user
POST   /api/v1/users              # Create new user
PATCH  /api/v1/users/{id}         # Partial update (update specific fields)
PUT    /api/v1/users/{id}         # Full replacement (all fields required)
DELETE /api/v1/users/{id}         # Soft delete (logical deletion)
```

**Response format standardization (always consistent):**

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 248,
    "has_more": true
  }
}
```

**Error responses (hierarchical codes):**

```json
{
  "success": false,
  "code": 422,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "fields": {
      "email": ["Invalid email format"],
      "age": ["Must be >= 18"]
    }
  },
  "request_id": "req-abc123def456"
}
```

### Request/Response Validation Patterns

**FastAPI example (Python):**

```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional

class CreateUserRequest(BaseModel):
    email: EmailStr  # Built-in email validation
    password: str = Field(..., min_length=12, regex="^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).*$")
    age: int = Field(..., ge=18, le=150)
    phone: Optional[str] = Field(None, regex="^\\+?1?\\d{9,15}$")

    @validator('password')
    def password_entropy(cls, v):
        # Ensure complexity
        if v.count(set(v)) < 4:  # At least 4 character types
            raise ValueError("Password too weak")
        return v

@app.post("/api/v1/users")
async def create_user(req: CreateUserRequest):
    # Pydantic validates before handler execution
    # If invalid → automatic 422 response
    user = await service.create_user(req)
    return {"success": True, "data": user}
```

**Express.js example (Node):**

```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');

app.post('/api/v1/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 })
    .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).*$/),
  body('age').isInt({ min: 18, max: 150 }),
  body('phone').optional().isMobilePhone()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      code: 422,
      error: { type: 'VALIDATION_ERROR', fields: errors.mapped() }
    });
  }
  // Proceed with business logic
});
```

### Error Handling Hierarchy

```
┌─ Validation Layer (422)
│   └─ Invalid input format, constraint violation
│
├─ Authorization Layer (403)
│   └─ User authenticated but lacks permission
│
├─ Business Logic Layer (400/409)
│   ├─ 400: Precondition not met (e.g., insufficient funds)
│   └─ 409: Resource state conflict (e.g., duplicate email)
│
├─ System Layer (500)
│   ├─ 500: Unhandled exception, log immediately with correlation ID
│   ├─ 502: Gateway error (database unavailable)
│   ├─ 503: Service temporarily down
│   └─ 504: Request timeout
│
└─ Client Error (4xx)
    ├─ 400: Bad request
    ├─ 401: Missing or invalid auth
    ├─ 403: Authorized but forbidden
    ├─ 404: Not found
    ├─ 429: Rate limited
    └─ 500: Server error
```

### Middleware Chain Design

Order matters critically. Process in this sequence:

```python
# FastAPI middleware stack (top to bottom = execution order)

app = FastAPI()

# 1. Logging middleware - FIRST to capture all requests
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    request.state.request_id = str(uuid4())
    request.state.start_time = time.time()
    response = await call_next(request)
    duration = time.time() - request.state.start_time
    logger.info("request", extra={
        "request_id": request.state.request_id,
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration_ms": duration * 1000,
        "ip": request.client.host
    })
    return response

# 2. Rate limiting - before auth to prevent auth-bypass attacks
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    key = f"{request.client.host}:{request.url.path}"
    if not rate_limiter.allow(key):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"}
        )
    return await call_next(request)

# 3. CORS - standard security headers
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],  # Specific, never "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600  # Cache preflight 10 minutes
)

# 4. Authentication middleware - validate JWT
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if should_authenticate(request.url.path):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.state.user_id = payload["sub"]
        except jwt.InvalidTokenError:
            return JSONResponse(status_code=401, content={"error": "Invalid token"})
    return await call_next(request)

# 5. Route handlers - business logic
@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: str, request: Request):
    # request.state.user_id available from auth middleware
    # request.state.request_id available from logging middleware
    pass
```

### Rate Limiting Implementation

**Token bucket algorithm (most fair):**

```python
import time
from collections import defaultdict

class TokenBucket:
    def __init__(self, rate: int, capacity: int):
        """
        rate: tokens per second
        capacity: max tokens in bucket
        """
        self.rate = rate
        self.capacity = capacity
        self.buckets = defaultdict(lambda: {"tokens": capacity, "last_refill": time.time()})

    def allow(self, key: str, tokens_required: int = 1) -> bool:
        bucket = self.buckets[key]
        now = time.time()

        # Refill tokens based on elapsed time
        elapsed = now - bucket["last_refill"]
        bucket["tokens"] = min(
            self.capacity,
            bucket["tokens"] + elapsed * self.rate
        )
        bucket["last_refill"] = now

        if bucket["tokens"] >= tokens_required:
            bucket["tokens"] -= tokens_required
            return True
        return False

# Usage
limiter = TokenBucket(rate=10, capacity=100)  # 10 req/sec, burst to 100

# Redis-backed version for distributed systems:
def check_rate_limit_redis(user_id: str, limit: int = 100, window: int = 60):
    """Check if user is within 100 requests per 60 seconds"""
    key = f"rate_limit:{user_id}"
    current = redis.incr(key)
    if current == 1:
        redis.expire(key, window)  # Set expiry on first request
    return current <= limit
```

## 2. Database Engineering

### Query Optimization: EXPLAIN ANALYZE

Before deploying any query, always run EXPLAIN ANALYZE:

```sql
-- Get actual execution plan with timing
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT u.id, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id
ORDER BY order_count DESC
LIMIT 20;
```

Output reveals:
- **Seq Scan**: Indicates missing index
- **Planning Time**: Setup cost
- **Execution Time**: Actual runtime (critical for SLAs)
- **Buffers Hit**: % of data from cache vs disk

**Action items from EXPLAIN:**
- If Seq Scan on WHERE clause: add index
- If Nested Loop on JOIN: consider materialized view
- If Memory spike: increase work_mem or add index

### Index Design Strategy

**B-tree indexes** (default for equality/range):

```sql
-- Single column index
CREATE INDEX idx_users_email ON users(email);  -- O(log n)

-- Composite index (order matters)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);
-- Supports: WHERE user_id = x AND created_at > y
-- Does NOT support: WHERE created_at > y (user_id must be first)

-- Partial index (reduce size, improve selectivity)
CREATE INDEX idx_active_users ON users(email) WHERE deleted_at IS NULL;

-- Covering index (includes extra columns to avoid table lookup)
CREATE INDEX idx_orders_summary ON orders(user_id) INCLUDE (total_amount, created_at);
-- SELECT user_id, total_amount FROM orders WHERE user_id = 123  -- Uses only index
```

**GiST/GIN indexes** (for full-text search, arrays, JSON):

```sql
-- Full-text search
CREATE INDEX idx_documents_search ON documents USING GIN(to_tsvector('english', content));

-- Array operations
CREATE INDEX idx_tags ON articles USING GIN(tags);  -- Supports @> (contains)

-- JSON path queries
CREATE INDEX idx_metadata ON events USING GIN(metadata);
-- SELECT * FROM events WHERE metadata @> '{"status": "active"}'
```

**Index maintenance:**

```sql
-- Identify unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Reindex fragmented index (during maintenance window)
REINDEX INDEX CONCURRENTLY idx_orders_user_date;  -- Non-blocking

-- Analyze statistics for query planner
ANALYZE users;  -- Updates pg_stat_user_tables
```

### Zero-Downtime Migrations

**Pattern: Expand → Migrate → Contract**

```python
# Step 1: Add new column with default (fast, no lock)
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT '';

# Step 2: Backfill in batches (app continues working)
UPDATE users SET phone_number = legacy_phone WHERE phone_number = ''
  AND id <= 100000;  # Process in chunks to avoid locking

# Step 3: Optional: add constraint
ALTER TABLE users ADD CONSTRAINT phone_format CHECK (phone_number ~ '^\+?[0-9]{9,15}$');

# Step 4: Remove old column (safe now)
ALTER TABLE users DROP COLUMN legacy_phone;

# In code: dual-write pattern
class User:
    def save(self):
        # Write to both old and new columns
        db.execute("""
            UPDATE users SET phone_number = %s, legacy_phone = %s
            WHERE id = %s
        """, (self.phone, self.phone, self.id))
```

### Connection Pool Tuning

**Formula for optimal pool size:**

```
pool_size = (core_count * 2) + effective_spindle_count

Example:
- 4-core CPU + 1 SSD = (4 × 2) + 1 = 9 connections
- 16-core CPU + 2 spinning disks = (16 × 2) + 2 = 34 connections

Also set:
- max_overflow = pool_size × 0.5  # Allow temporary burst
- pool_pre_ping = True             # Test connection before use (detects dropped connections)
- pool_recycle = 3600              # Recycle connections after 1 hour (prevents stale connections)
```

**SQLAlchemy configuration:**

```python
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=9,
    max_overflow=4,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False  # Set True to log all SQL (never in production)
)

# Monitor pool status
print(engine.pool.checkedout())  # Connections in use
print(engine.pool.size())        # Total pool size
```

### N+1 Query Detection and Prevention

**Problematic pattern:**

```python
# N+1: 1 query for users + N queries for orders
users = db.query(User).all()  # Query 1
for user in users:
    orders = db.query(Order).filter(Order.user_id == user.id).all()  # Query N

# Fix: Eager loading
users = db.query(User).options(
    selectinload(User.orders)  # Single JOIN query
).all()

# Alternative: Explicit JOIN
from sqlalchemy.orm import contains_eager
users = db.query(User).join(Order).options(
    contains_eager(User.orders)
).all()
```

**Detection in logs:**

```python
# Add instrumentation to catch N+1
class QueryCounter:
    def __init__(self):
        self.queries = []

    def receive_after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        self.queries.append((statement, parameters))

# In tests
counter = QueryCounter()
event.listen(Engine, "after_cursor_execute", counter.receive_after_cursor_execute)

users = get_users()  # Should be 1 query
assert len(counter.queries) <= 2, f"Expected <=2 queries, got {len(counter.queries)}"
```

### Transaction Isolation Levels

**Concurrency vs Isolation tradeoff:**

```sql
-- Read Uncommitted (dangerous - rarely used)
-- Dirty reads: Read other transaction's uncommitted data

-- Read Committed (PostgreSQL default)
-- Prevents: Dirty reads
-- Allows: Non-repeatable reads, phantom reads
-- Use for: Most applications
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read
-- Prevents: Dirty reads, non-repeatable reads
-- Allows: Phantom reads
-- Use for: Report generation, consistency required
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable (strictest)
-- Prevents: All race conditions
-- Slowest, but guarantees correctness
-- Use for: Financial transactions, inventory
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

**Example: Stock inventory with race condition:**

```python
# Unsafe at Read Committed:
async with db.begin():
    stock = await db.query(Product).filter(id == 123).with_for_update().first()
    if stock.quantity >= order_qty:
        stock.quantity -= order_qty  # Another txn may have decremented simultaneously
        await db.flush()

# Safe at Serializable:
try:
    async with db.begin():
        stock = await db.query(Product).filter(id == 123).first()
        if stock.quantity >= order_qty:
            stock.quantity -= order_qty
            await db.flush()
except psycopg2.extensions.TransactionRollbackError:
    # Conflict detected, retry
    pass
```

## 3. Authentication & Authorization

### JWT Implementation (Access + Refresh Token Rotation)

**Token structure:**

```python
import jwt
from datetime import datetime, timedelta

# Access token: Short-lived (15 minutes)
access_token = jwt.encode({
    "sub": user_id,           # Subject (who this token is for)
    "iat": datetime.utcnow(),  # Issued at
    "exp": datetime.utcnow() + timedelta(minutes=15),
    "type": "access",
    "scopes": ["read:profile", "write:orders"]  # Permissions
}, SECRET_KEY, algorithm="HS256")

# Refresh token: Long-lived (30 days), stored in database
refresh_token = jwt.encode({
    "sub": user_id,
    "iat": datetime.utcnow(),
    "exp": datetime.utcnow() + timedelta(days=30),
    "type": "refresh",
    "jti": str(uuid4())  # JWT ID for revocation tracking
}, SECRET_KEY, algorithm="HS256")

# Store refresh token hash in database
db.execute(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
    (user_id, hash_token(refresh_token), datetime.utcnow() + timedelta(days=30))
)
```

**Token refresh endpoint:**

```python
@app.post("/api/v1/auth/refresh")
async def refresh_token(req: RefreshRequest):
    try:
        # Decode without expiry validation (we check DB)
        payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=["HS256"])

        # Verify token still in database and not revoked
        token_record = await db.query(RefreshToken).filter(
            RefreshToken.jti == payload["jti"]
        ).first()

        if not token_record or token_record.revoked_at:
            raise HTTPException(status_code=401, detail="Token revoked")

        # Issue new access token
        new_access = jwt.encode({
            "sub": payload["sub"],
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(minutes=15),
            "type": "access"
        }, SECRET_KEY, algorithm="HS256")

        return {
            "access_token": new_access,
            "token_type": "Bearer",
            "expires_in": 900  # 15 minutes in seconds
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
```

### OAuth2 Server-Side Flow

**Authorization code flow (most secure for SPAs):**

```python
# Step 1: Redirect user to authorization endpoint
@app.get("/oauth/authorize")
async def authorize(
    client_id: str,
    redirect_uri: str,
    scope: str,
    state: str  # CSRF protection
):
    # Validate client_id and redirect_uri against database
    client = await db.query(OAuthClient).filter(
        OAuthClient.client_id == client_id
    ).first()

    if not client or redirect_uri not in client.allowed_redirects:
        raise HTTPException(status_code=400, detail="Invalid client")

    # Store authorization code (10-minute expiry)
    auth_code = secrets.token_urlsafe(32)
    await db.execute(
        "INSERT INTO auth_codes (code, client_id, user_id, scope, expires_at) VALUES (%s, %s, %s, %s, %s)",
        (auth_code, client_id, request.state.user_id, scope,
         datetime.utcnow() + timedelta(minutes=10))
    )

    # Redirect back to client with code
    return RedirectResponse(f"{redirect_uri}?code={auth_code}&state={state}")

# Step 2: Backend exchanges code for token (server-to-server, no JavaScript)
@app.post("/oauth/token")
async def token(req: TokenRequest):
    # Verify code hasn't expired and matches client_id
    auth_code = await db.query(AuthCode).filter(
        AuthCode.code == req.code,
        AuthCode.client_id == req.client_id,
        AuthCode.expires_at > datetime.utcnow()
    ).first()

    if not auth_code:
        raise HTTPException(status_code=400, detail="Invalid code")

    # Issue access token
    access_token = jwt.encode({
        "sub": auth_code.user_id,
        "client_id": auth_code.client_id,
        "scope": auth_code.scope,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }, SECRET_KEY)

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": 3600
    }
```

### Session Management (Stateless vs Stateful)

**Stateless (JWT) - scalability:**
- No server storage needed
- Self-contained (client sends proof on every request)
- Cannot revoke immediately
- Best for: Public APIs, microservices

**Stateful - control:**
- Server maintains session store (Redis)
- Immediate revocation possible
- Server must query session on each request
- Best for: Web apps, user dashboards

**Hybrid pattern:**

```python
class HybridAuth:
    def create_session(user_id: str, browser_fingerprint: str):
        # Session ID stored in Redis with TTL
        session_id = secrets.token_urlsafe(32)
        redis.setex(
            f"session:{session_id}",
            3600,  # 1 hour TTL
            json.dumps({
                "user_id": user_id,
                "fingerprint": browser_fingerprint,
                "created_at": datetime.utcnow().isoformat()
            })
        )

        # Also issue JWT for offline use (shorter-lived)
        jwt_token = jwt.encode({
            "sub": user_id,
            "session_id": session_id,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }, SECRET_KEY)

        return {
            "session_id": session_id,
            "jwt": jwt_token
        }

    def validate_request(request: Request):
        session_id = request.cookies.get("session_id")
        jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "")

        # Check session still exists (if revoked, will be gone)
        session_data = redis.get(f"session:{session_id}")
        if not session_data:
            raise HTTPException(status_code=401)

        # Verify JWT signature
        payload = jwt.decode(jwt_token, SECRET_KEY)
        return payload["sub"]
```

### API Key Management

```python
@app.post("/api/v1/users/api-keys")
async def create_api_key(request: Request):
    key_prefix = "sk_live_"  # Helps identify key type
    key_secret = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(key_secret.encode()).hexdigest()

    # Store only hash in database (never store plaintext)
    api_key = APIKey(
        user_id=request.state.user_id,
        key_prefix=key_prefix,
        key_hash=key_hash,
        name="Production API Key",
        scopes=["read:data", "write:orders"],
        rate_limit_per_minute=60,
        expires_at=datetime.utcnow() + timedelta(days=365)
    )
    db.add(api_key)
    db.commit()

    # Return full key only once (client must save)
    return {
        "api_key": f"{key_prefix}{key_secret}",
        "note": "Save this key in a secure location. You won't be able to see it again."
    }

# Validation middleware
@app.middleware("http")
async def api_key_auth(request: Request, call_next):
    if request.url.path.startswith("/api/v1/"):
        api_key = request.headers.get("X-API-Key", "").replace("sk_live_", "")
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()

        # Check if key exists and not expired
        api_key_record = await db.query(APIKey).filter(
            APIKey.key_hash == key_hash,
            APIKey.expires_at > datetime.utcnow()
        ).first()

        if api_key_record:
            request.state.user_id = api_key_record.user_id
            request.state.api_key_scopes = api_key_record.scopes
        else:
            return JSONResponse(status_code=401, content={"error": "Invalid API key"})

    return await call_next(request)
```

### CORS Configuration Guide

```python
from fastapi.middleware.cors import CORSMiddleware

# NEVER use allow_origins=["*"] with allow_credentials=True
# This is a security vulnerability

app.add_middleware(
    CORSMiddleware,
    # Specific origins only (check against whitelist)
    allow_origins=[
        "https://app.example.com",
        "https://admin.example.com"
    ],
    # Credentials (cookies, auth headers) allowed
    allow_credentials=True,
    # Allowed HTTP methods
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    # Allowed request headers
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    # Allowed response headers (what client can read)
    expose_headers=["X-Total-Count", "X-Request-ID"],
    # Cache preflight requests (2-way handshake reduced)
    max_age=600
)

# If you need to support all origins (public API):
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Critical: must be False with *
    allow_methods=["GET"],    # Restrict to safe methods
    allow_headers=["Content-Type"]
)
```

## 4. Performance Engineering

### Profiling Tools

**Python - cProfile (CPU profiling):**

```python
import cProfile
import pstats
from io import StringIO

pr = cProfile.Profile()
pr.enable()

# Your code here
result = expensive_operation()

pr.disable()
s = StringIO()
ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
ps.print_stats(10)  # Top 10
print(s.getvalue())

# Output:
# function              calls   cumtime   percall
# expensive_func        1       5.234     5.234    <-- This is your bottleneck
```

**Python - py-spy (sampling profiler, production-safe):**

```bash
# Record profiling data while server runs
py-spy record -o profile.svg -- python -m uvicorn src.main:app

# Generate flamegraph
# Flamegraph shows which functions consumed CPU (width = time)
```

**Node.js - clinic.js (comprehensive profiling):**

```bash
# Install: npm install -g clinic

# Profile CPU, memory, event loop
clinic doctor -- node server.js

# Interactive HTML report shows:
# - CPU hotspots
# - Memory leaks (increasing trend)
# - Event loop blocking (long operations on main thread)
```

### Memory Leak Detection

**Python pattern - Growing memory without reclamation:**

```python
import tracemalloc
import gc

tracemalloc.start()

for i in range(1000):
    data = process_request()  # Should be garbage collected
    # But if reference held somewhere, memory grows

current, peak = tracemalloc.get_traced_memory()
print(f"Current: {current / 1e6:.1f}MB, Peak: {peak / 1e6:.1f}MB")

# Detailed snapshot
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)

# Force garbage collection and check
gc.collect()
current_after_gc, _ = tracemalloc.get_traced_memory()
print(f"After GC: {current_after_gc / 1e6:.1f}MB")

# If memory still high → leak exists
```

**Circular reference detection:**

```python
import sys

class CachedData:
    def __init__(self):
        self.data = {}
        self.callback = lambda: print(self.data)  # Circular reference

# Object won't be garbage collected immediately
obj = CachedData()
del obj  # Memory not freed because callback holds reference

# Solution: use weakref
import weakref

class CachedData:
    def __init__(self):
        self.data = {}
        self.self_ref = weakref.ref(self)  # Weak reference, doesn't prevent GC
```

### Async/Await Patterns

**FastAPI with asyncio:**

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

# CPU-bound work must run in thread pool
executor = ThreadPoolExecutor(max_workers=4)

@app.get("/api/v1/compute/{value}")
async def compute(value: int):
    # Long computation (would block event loop)
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, heavy_computation, value)
    return {"result": result}

# Concurrent HTTP requests
async def fetch_multiple_apis(urls: list[str]):
    tasks = [fetch_url(url) for url in urls]  # Create tasks but don't await
    results = await asyncio.gather(*tasks)    # Wait for all simultaneously
    return results

async def fetch_url(url: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# Timeout protection
try:
    result = await asyncio.wait_for(slow_operation(), timeout=5.0)
except asyncio.TimeoutError:
    logger.warning("Operation timed out after 5 seconds")
```

**Node.js event loop optimization:**

```javascript
// Bad: Blocking event loop
app.get('/compute/:value', (req, res) => {
    const result = heavyComputation(req.params.value);  // Blocks all requests
    res.json({ result });
});

// Good: Offload to worker thread
const { Worker } = require('worker_threads');

app.get('/compute/:value', (req, res) => {
    const worker = new Worker('./compute-worker.js');
    worker.on('message', (result) => {
        res.json({ result });
    });
    worker.postMessage(req.params.value);
});

// compute-worker.js
const { parentPort } = require('worker_threads');
parentPort.on('message', (value) => {
    const result = heavyComputation(value);
    parentPort.postMessage(result);
});
```

### Worker Process Management

**Gunicorn (Python) configuration:**

```bash
# Optimal worker count: (2 × CPU cores) + 1
# 4-core server: (2 × 4) + 1 = 9 workers

gunicorn \
  --workers 9 \
  --worker-class uvicorn.workers.UvicornWorker \
  --worker-connections 1000 \
  --max-requests 10000 \
  --max-requests-jitter 1000 \
  --timeout 60 \
  --keep-alive 5 \
  src.main:app

# max-requests: Restart worker after N requests (prevents memory leaks from accumulating)
# max-requests-jitter: Randomize restart (prevents all workers restarting simultaneously)
# timeout: Kill worker if it doesn't respond in 60 seconds
```

**PM2 (Node.js) configuration:**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'api',
    script: './src/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '500M',  // Restart if memory exceeds 500MB
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};

// Deploy
// pm2 start ecosystem.config.js
// pm2 save  # Persist across reboots
// pm2 startup  # Auto-start on system boot
```

### Response Compression and Streaming

```python
from fastapi.middleware.gzip import GZIPMiddleware

# Compress responses > 500 bytes
app.add_middleware(GZIPMiddleware, minimum_size=500)

# Streaming large responses (doesn't buffer in memory)
@app.get("/api/v1/export/users")
async def export_users():
    async def generate():
        for user_batch in get_users_in_batches(100):
            for user in user_batch:
                yield f"{json.dumps(user)}\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",  # Newline-delimited JSON
        headers={"Content-Disposition": "attachment; filename=users.jsonl"}
    )

# Backpressure handling
@app.get("/api/v1/data-stream")
async def stream_data():
    async def generate():
        for item in large_dataset:
            await asyncio.sleep(0.01)  # Let buffer drain
            yield f"{json.dumps(item)}\n"
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

## 5. Testing Strategy

### Unit Test Patterns (Arrange-Act-Assert)

```python
import pytest

class TestUserService:
    @pytest.fixture
    def user_service(self):
        # Arrange: Setup
        repository = MockUserRepository()
        email_service = MockEmailService()
        return UserService(repository, email_service)

    def test_create_user_with_valid_email(self, user_service):
        # Arrange
        email = "valid@example.com"

        # Act
        user = user_service.create_user(email)

        # Assert
        assert user.email == email
        assert user.id is not None
        assert user.created_at is not None

    def test_create_user_sends_confirmation_email(self, user_service):
        # Arrange
        email = "new@example.com"

        # Act
        user_service.create_user(email)

        # Assert
        assert user_service.email_service.send_called
        assert "confirmation" in user_service.email_service.last_subject.lower()

    def test_create_user_with_duplicate_email_raises_error(self, user_service):
        # Arrange
        email = "existing@example.com"
        user_service.repository.add(User(email=email))

        # Act & Assert
        with pytest.raises(DuplicateUserError):
            user_service.create_user(email)
```

### Integration Testing with Test Containers

```python
from testcontainers.postgres import PostgresContainer
import pytest

@pytest.fixture(scope="session")
def postgres():
    container = PostgresContainer("postgres:16")
    container.start()
    yield container
    container.stop()

@pytest.fixture
def db_session(postgres):
    # Create fresh schema for each test
    engine = create_engine(postgres.get_connection_url())
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.rollback()
    session.close()

def test_user_creation_persists_to_database(db_session):
    # Arrange
    user = User(email="test@example.com", password_hash="hash123")

    # Act
    db_session.add(user)
    db_session.commit()

    # Assert - Query from fresh session confirms it's in DB
    new_session = sessionmaker(bind=db_session.bind)()
    retrieved_user = new_session.query(User).filter_by(email="test@example.com").first()
    assert retrieved_user is not None
    assert retrieved_user.password_hash == "hash123"
```

### API Contract Testing

```python
import requests

class TestOrderAPI:
    BASE_URL = "http://localhost:8000"

    def test_create_order_returns_expected_fields(self):
        # Act
        response = requests.post(
            f"{self.BASE_URL}/api/v1/orders",
            json={
                "user_id": "user-123",
                "items": [{"product_id": "prod-456", "quantity": 2}]
            }
        )

        # Assert
        assert response.status_code == 201
        data = response.json()

        # Contract: These fields MUST exist
        required_fields = ["id", "user_id", "status", "total_amount", "created_at"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

        # Contract: Types must be correct
        assert isinstance(data["id"], str)
        assert isinstance(data["total_amount"], (int, float))
        assert isinstance(data["status"], str)
        assert data["status"] in ["pending", "confirmed", "shipped", "delivered"]

    def test_get_nonexistent_order_returns_404(self):
        # Act
        response = requests.get(f"{self.BASE_URL}/api/v1/orders/nonexistent")

        # Assert
        assert response.status_code == 404
        assert "not found" in response.json()["error"].lower()
```

### Load Testing with Locust

```python
from locust import HttpUser, task, between

class OrderServiceUser(HttpUser):
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests

    @task(1)
    def list_orders(self):
        # Weight: 1 (runs 1x for every 3x browse_product)
        self.client.get("/api/v1/orders",
                       headers={"Authorization": f"Bearer {self.token}"})

    @task(3)
    def browse_product(self):
        # Weight: 3
        product_id = random.choice(["prod-1", "prod-2", "prod-3"])
        self.client.get(f"/api/v1/products/{product_id}")

    def on_start(self):
        # Setup: authenticate
        response = self.client.post("/api/v1/auth/login", json={
            "email": "loadtest@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]

# Run: locust -f locustfile.py --host=http://localhost:8000 --users 100 --spawn-rate 10
# Spawns 100 users at 10 users/second rate
# Open http://localhost:8089 for web UI
```

### Fixture Management

```python
import pytest
from factory import Factory, Sequence

class UserFactory(Factory):
    class Meta:
        model = User

    id = Sequence(lambda n: f"user-{n}")
    email = Sequence(lambda n: f"user{n}@example.com")
    password_hash = "hash123"

@pytest.fixture
def user(db_session):
    """Single user fixture"""
    user = UserFactory()
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def users(db_session):
    """Multiple users fixture"""
    users = UserFactory.create_batch(10)
    db_session.add_all(users)
    db_session.commit()
    return users

def test_list_users(users, client):
    response = client.get("/api/v1/users")
    assert len(response.json()["data"]) == 10
```

## 6. Logging & Monitoring

### Structured Logging with Correlation IDs

```python
import structlog
import uuid

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    # Generate or extract correlation ID
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id

    # Add to logger context (included in all logs from this request)
    with structlog.contextvars.clear_contextvars():
        structlog.contextvars.bind_contextvars(
            correlation_id=correlation_id,
            request_id=str(uuid.uuid4()),
            path=request.url.path,
            method=request.method
        )

        response = await call_next(request)

        logger.info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=(time.time() - request.state.start_time) * 1000
        )

        return response

# Output:
# {"event": "request_completed", "correlation_id": "abc-123", "status_code": 200, "duration_ms": 45.2}
```

### Log Levels Strategy

```python
logger = structlog.get_logger()

# DEBUG: Detailed info for developers
logger.debug("processing_user", user_id="123", fields_count=5)

# INFO: Important business events
logger.info("user_created", user_id="123", email="user@example.com")

# WARNING: Unexpected but recoverable
logger.warning("database_pool_exhausted", available_connections=0)

# ERROR: Something failed, needs attention
logger.error("order_processing_failed", order_id="456", error="Payment declined", retry_attempt=2)

# CRITICAL: System down, immediate intervention needed
logger.critical("database_unreachable", error="Connection timeout after 30s")
```

### RED Method Metrics

```python
from prometheus_client import Counter, Histogram, Gauge

# Rate: Requests per second
request_counter = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Errors: Error rate percentage
error_counter = Counter(
    'http_errors_total',
    'Total HTTP errors',
    ['endpoint', 'error_type']
)

# Duration: Request latency
request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['endpoint'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0)  # Latency buckets
)

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)

    duration = time.time() - start

    request_counter.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    if response.status_code >= 400:
        error_counter.labels(
            endpoint=request.url.path,
            error_type=get_error_type(response)
        ).inc()

    request_duration.labels(endpoint=request.url.path).observe(duration)

    return response

# Useful dashboards:
# - P50/P95/P99 latency over time (shows degradation)
# - Error rate by endpoint (identifies problem areas)
# - Throughput (requests/sec) (detects anomalies)
```

### Health Check Endpoints

```python
@app.get("/api/v1/health")
async def health_check():
    checks = {}
    all_healthy = True

    # Database connectivity
    try:
        async with db.begin():
            await db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False

    # Redis connectivity
    try:
        await redis.ping()
        checks["redis"] = {"status": "healthy"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False

    # External API dependency
    try:
        async with httpx.AsyncClient() as client:
            response = await asyncio.wait_for(
                client.get("https://api.binance.com/api/v3/ping", timeout=2),
                timeout=3
            )
        checks["binance_api"] = {"status": "healthy" if response.status_code == 200 else "unhealthy"}
    except asyncio.TimeoutError:
        checks["binance_api"] = {"status": "unhealthy", "error": "timeout"}
        all_healthy = False

    status_code = 200 if all_healthy else 503
    return Response(
        status_code=status_code,
        content=json.dumps({
            "status": "healthy" if all_healthy else "unhealthy",
            "checks": checks,
            "timestamp": datetime.utcnow().isoformat()
        })
    )
```

## 7. Security Hardening

### Input Sanitization Checklist

```python
from html import escape
import re
from sqlalchemy import text

def sanitize_user_input(value: str, context: str = "general") -> str:
    """
    Sanitize user input based on context
    """
    if context == "html":
        # HTML: Escape special characters
        return escape(value)

    elif context == "url":
        # URL: Validate format
        if not re.match(r'^https?://', value):
            raise ValueError("Invalid URL")
        return value

    elif context == "email":
        # Email: Validate and normalize
        email = value.strip().lower()
        if "@" not in email or len(email) < 5:
            raise ValueError("Invalid email")
        return email

    elif context == "filename":
        # Filename: Remove path traversal attempts
        filename = value.split("/")[-1].split("\\")[-1]
        if filename.startswith("."):
            raise ValueError("Invalid filename")
        return filename

    elif context == "sql":
        # SQL: Use parameterized queries ONLY (never string concatenation)
        # NEVER do: f"SELECT * FROM users WHERE id = {user_id}"
        # ALWAYS do: await db.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
        pass

    elif context == "json":
        # JSON: Limit depth to prevent DoS
        parsed = json.loads(value)
        assert_json_depth(parsed, max_depth=10)
        return json.dumps(parsed)

    return value.strip()[:1000]  # Generic: trim whitespace, limit length
```

### SQL Injection Prevention

```python
# VULNERABLE - NEVER DO THIS
@app.get("/api/v1/users/{user_id}")
async def get_user_unsafe(user_id: str):
    query = f"SELECT * FROM users WHERE id = '{user_id}'"  # INJECTABLE
    result = await db.execute(text(query))
    return result.first()

# SAFE - Use parameterized queries
@app.get("/api/v1/users/{user_id}")
async def get_user_safe(user_id: str):
    query = text("SELECT * FROM users WHERE id = :user_id")
    result = await db.execute(query, {"user_id": user_id})
    return result.first()

# SAFE - ORM prevents injection automatically
@app.get("/api/v1/users/{user_id}")
async def get_user_orm(user_id: str):
    user = await db.query(User).filter(User.id == user_id).first()
    return user
```

### SSRF Prevention

```python
from urllib.parse import urlparse
import socket

def is_safe_url(url: str) -> bool:
    """Prevent Server-Side Request Forgery attacks"""
    try:
        parsed = urlparse(url)

        # Only allow http/https
        if parsed.scheme not in ["http", "https"]:
            return False

        # Resolve hostname to IP and check against blocklist
        ip = socket.gethostbyname(parsed.hostname)

        # Block private IP ranges
        blocked_ranges = [
            "127.0.0.0/8",      # Loopback
            "10.0.0.0/8",       # Private
            "172.16.0.0/12",    # Private
            "192.168.0.0/16",   # Private
            "169.254.0.0/16",   # Link-local
            "0.0.0.0/8",        # Current network
            "255.255.255.255/32" # Broadcast
        ]

        ip_obj = ipaddress.ip_address(ip)
        for blocked in blocked_ranges:
            if ip_obj in ipaddress.ip_network(blocked):
                return False

        return True
    except Exception:
        return False

# Usage
@app.post("/api/v1/webhooks/notify")
async def notify_webhook(url: str):
    if not is_safe_url(url):
        raise HTTPException(status_code=400, detail="Invalid URL")

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json={"event": "triggered"})
```

### Dependency Vulnerability Scanning

```bash
# Python: Check for known vulnerabilities
pip install safety
safety check

# Node.js: Built-in npm audit
npm audit
npm audit fix  # Auto-fix where possible

# GitHub: Dependabot automatically checks and creates PRs

# Programmatic check (Python)
from safety.cli import check_from_file
from pathlib import Path

def scan_dependencies():
    requirements_file = Path("requirements.txt")
    vulnerable = check_from_file(requirements_file)
    if vulnerable:
        logger.critical("vulnerable_dependencies_found", count=len(vulnerable))
        raise RuntimeError(f"Found {len(vulnerable)} vulnerable packages")
```

### Secret Rotation Strategy

```python
import os
from datetime import datetime, timedelta

class SecretManager:
    def __init__(self, vault_client):
        self.vault = vault_client
        self.cache = {}
        self.cache_ttl = timedelta(hours=1)

    async def get_secret(self, secret_name: str) -> str:
        """Get secret with TTL-based caching"""
        cache_key = f"{secret_name}_cached_at"

        # Check if cached and not expired
        if secret_name in self.cache:
            cached_at = self.cache.get(cache_key)
            if cached_at and datetime.utcnow() - cached_at < self.cache_ttl:
                return self.cache[secret_name]

        # Fetch from vault
        secret = await self.vault.read(secret_name)
        self.cache[secret_name] = secret
        self.cache[cache_key] = datetime.utcnow()

        return secret

    async def rotate_secret(self, secret_name: str, new_secret: str):
        """Rotate secret with zero-downtime"""
        # Step 1: Create new secret version
        secret_version = f"{secret_name}:v2"
        await self.vault.write(secret_version, new_secret)

        # Step 2: Update application to accept both old and new
        # (Update .env or config to read from secret_version)

        # Step 3: Wait for all servers to pick up new config
        await asyncio.sleep(300)  # 5 minutes grace period

        # Step 4: Delete old secret version
        await self.vault.delete(secret_name)

        # Step 5: Rename new version to primary
        await self.vault.write(secret_name, new_secret)
        await self.vault.delete(secret_version)

# Usage
@app.on_event("startup")
async def load_secrets():
    app.state.database_password = await secret_manager.get_secret("db_password")
    app.state.jwt_secret = await secret_manager.get_secret("jwt_secret_key")
```

This reference covers production-grade backend practices across all critical domains. Consult specific sections when designing APIs, optimizing databases, hardening security, or implementing testing strategies.
