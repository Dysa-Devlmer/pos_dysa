# Senior Architect

Enterprise-grade system architecture and design patterns for production systems. Daily reference guide for distributed systems, scalability decisions, and architectural tradeoffs.

## System Design Decision Framework

### Monolith vs Microservices Decision Matrix

| Criteria | Monolith | Microservices |
|----------|----------|---------------|
| **Team Size** | <10 engineers | 10+ engineers (2-pizza teams per service) |
| **Deployment Cadence** | Weekly/Monthly | Daily/Per-service |
| **Data Consistency** | ACID transactions, shared schema | Eventually consistent, Sagas |
| **Operational Complexity** | Single deployment, shared infra | Multiple deployments, distributed ops |
| **Cross-Service Calls** | In-process function calls | Network RPCs (REST/gRPC/async) |
| **Development Speed (Early)** | Fast iteration, no service boundaries | Slow: coordination overhead |
| **Development Speed (Later)** | Slower: tight coupling emerges | Faster: independent teams scale |
| **Database Size** | Single DB scales to 100GB-1TB | Sharded: each service owns DB (<50GB) |
| **Monitoring Complexity** | Single stack trace | Distributed tracing (Jaeger/DataDog) |
| **Resource Efficiency** | High CPU/RAM utilization | Lower: overhead of containers/networking |

**Decision Rule:** Start monolith if <5 teams. Extract to microservices only when:
1. Deployment cycles blocked by unrelated services (service A wants daily deploys, B wants quarterly)
2. Technology diversity required (Python ML + Go microservice)
3. Scaling bottleneck identified in specific domain (auth service handles 50% of traffic)

### SQL vs NoSQL Decision Matrix

| Criteria | PostgreSQL/SQL | MongoDB/Document | DynamoDB/KV | Redis |
|----------|----------------|------------------|-------------|-------|
| **Strong Consistency** | ACID + Transactions | Single-doc ACID only | Conditional writes + transactions (v2024) | NO |
| **Schema Flexibility** | Rigid (migrations required) | Flexible (nested docs) | Flexible | NA |
| **Query Patterns** | Complex joins, aggregations | Document lookups, denormalization | Key-based + range scans | In-memory, TTL |
| **Write Throughput** | 10K-50K ops/sec (write optimized) | 50K-100K ops/sec | 40K ops/sec (on-demand) | 100K+ ops/sec |
| **Data Volume** | 1TB-10TB efficient | 100GB-1TB optimal | 100GB-1TB (partition limit) | 50-100GB (memory) |
| **Geo-Distribution** | Global DB replication (Postgres with WAL shipping) | Multi-region (eventual consistency) | Native multi-region | Cluster replication |
| **Transactions** | ACID across tables | Single-document only | All-or-nothing (2024 update) | Single-key only |
| **Operational Overhead** | High (tuning, vacuums, index mgmt) | Medium (shard rebalancing) | Low (AWS managed) | Low (AOF/RDB persistence) |

**Decision Rule:**
- Use PostgreSQL for financial, user, order data (consistency > speed)
- Use MongoDB for logs, user sessions, user-generated content (flexible schema)
- Use DynamoDB for IoT, real-time analytics, event streaming (managed, multi-region)
- Use Redis as L2 cache or session store ONLY (not primary DB)

### Sync vs Async Communication

| Context | Sync (Request-Response) | Async (Event-Driven) |
|---------|------------------------|----------------------|
| **Customer Registration** | Sync: user waiting at signup form | Async: POST /register → queued email send |
| **Payment Processing** | Sync: user waits for result | Async: webhook from Stripe, process async |
| **Order Fulfillment** | Mixed: order created sync, fulfillment async | Backend generates "OrderCreated" event |
| **Inter-Service Calls** | REST/gRPC when response needed immediately | Message queue when result not needed now |
| **Resilience** | Fails if downstream down | Retries automatically (queue persists) |
| **Latency SLA** | <500ms (sync), <10s acceptable | <5min common, minutes acceptable |

**Async Patterns:**
```
Event → Kafka/RabbitMQ → Service A (email), Service B (analytics), Service C (audit log)
Benefits: Service failures don't block event source. Scale consumers independently.
Tradeoff: Debugging distributed, eventual consistency.
```

### REST vs GraphQL vs gRPC

| Criteria | REST | GraphQL | gRPC |
|----------|------|---------|------|
| **Request** | `/users/123` | `query { user(id:123) { name email } }` | Protobuf binary message |
| **Over-fetching** | Common: GET /users returns all fields | Eliminated: query specifies fields | Eliminated: typed messages |
| **Under-fetching** | Common: need /users/123/posts separately | Eliminated: single query | Eliminated: protobuf nesting |
| **Client Libraries** | Any HTTP client | apollo-client, urql | gRPC client stubs |
| **Caching** | HTTP caching (GET idempotent) | NO native cache invalidation (POST always) | Per-RPC caching configs |
| **Mobile/Slow Networks** | Verbose (JSON overhead) | Slightly better (exact fields) | Excellent (Protobuf binary 3-5x smaller) |
| **Ease of Use** | Simple (curl works) | Moderate (need query parsing) | Complex (need .proto files) |
| **Real-time** | Polling/WebSocket | Subscriptions (server push) | Streaming (bidirectional) |
| **Latency** | 100-500ms (per-call) | 200-500ms (single query) | 10-50ms (binary protocol, HTTP/2) |

**Decision:**
- **REST**: Public APIs, third-party integrations, simple operations
- **GraphQL**: Mobile apps, frontend needing flexible queries, complex nested data
- **gRPC**: Service-to-service (low latency), high throughput (>10K req/s), real-time streams

Example gRPC with Streaming (trading bot tick feed):
```protobuf
service MarketData {
  rpc SubscribeToTicks(TickFilter) returns (stream Tick) {}
}
```

---

## Architecture Patterns with Implementation Guidance

### Event-Driven Architecture

**Message Broker Selection:**

| Broker | Throughput | Persistence | Latency | Multi-Region | Use Case |
|--------|-----------|-------------|---------|--------------|----------|
| **Apache Kafka** | 1M+ msgs/sec | Disk-based, replayable | 50-100ms | Yes (MirrorMaker) | Event sourcing, audit log, data pipeline |
| **RabbitMQ** | 50K msgs/sec | Ack-based, durable queues | 1-5ms | Manual routing | Task queues, work distribution |
| **AWS SNS+SQS** | 100K msgs/sec | AWS managed, 14-day retention | 10-50ms | Native multi-region | AWS-native, webhooks, fan-out |
| **NATS** | 250K+ msgs/sec | In-memory (optional durability) | <1ms | Yes (clusters) | Real-time messaging, microservices |
| **Redis Streams** | 100K msgs/sec | In-memory + AOF | <1ms | Manual (Sentinel) | Real-time feeds, leaderboards |

**Kafka Architecture (for financial events):**
```
[Order Service] → Kafka Topic: "orders" (partitions=10, replication-factor=3)
                                ↓
                    [Event Processor 1] (analytics)
                                ↓
                    [Event Processor 2] (notifications)
                                ↓
                    [Event Processor 3] (compliance)

Guarantees:
- At-least-once delivery (retries on consumer failure)
- Ordering per partition (all Order 123 events go to partition 1)
- Replay capability (offset management)
```

**Consumer Group for Scaling:**
```python
from confluent_kafka import Consumer

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'order-processor-group',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False  # Manual commit for exactly-once
})

consumer.subscribe(['orders'])
while True:
    msg = consumer.poll(timeout=1.0)
    if msg is None:
        continue

    process_order(msg.value())
    consumer.commit(asynchronous=False)  # Sync commit = slower but safer
```

### CQRS + Event Sourcing

**When to use:**
- Financial systems (audit trail required)
- High-cardinality analytics (separate read model)
- Complex domain logic with temporal requirements

**When NOT to use:**
- Simple CRUD apps (over-engineering)
- Eventual consistency not acceptable (<100ms latency)

**Pattern Structure:**
```
Write Side:                          Read Side:
[Command] →                         [Event Store] →
  OrderService.createOrder()          [Projection Builder]
    ↓                                   ↓
  [Event Store]                     [Read Model (Denormalized)]
    ↓                                 OrdersView, UserStatsView
  "OrderCreated"                    (Elasticsearch, Postgres, Redis)
  "PaymentProcessed"
```

**Projection Example (Python):**
```python
class OrderProjection:
    def handle_order_created(self, event):
        # Append to read model
        db.execute("""
            INSERT INTO orders_view (id, user_id, total, status)
            VALUES (%s, %s, %s, %s)
        """, (event.order_id, event.user_id, event.total, 'PENDING'))

    def handle_payment_processed(self, event):
        # Update read model
        db.execute("""
            UPDATE orders_view SET status = 'PAID'
            WHERE id = %s
        """, (event.order_id,))

# Rebuild projections from event log (disaster recovery)
projection = OrderProjection()
for event in event_store.all_events_since(checkpoint):
    projection.handle(event)
```

### Domain-Driven Design Tactical Patterns

**Value Objects (immutable, no identity):**
```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

# Prevents invalid states: Money(-100, 'USD') prevented by validation
```

**Aggregates (consistency boundaries):**
```python
class Order:  # Aggregate Root
    def __init__(self, order_id, user_id):
        self.id = order_id
        self.user_id = user_id
        self.items: List[OrderLine] = []  # Child entities
        self.status = "PENDING"

    def add_item(self, product_id, qty, price):
        # All business logic goes here
        if self.status != "PENDING":
            raise ValueError("Cannot modify completed order")
        if qty <= 0:
            raise ValueError("Quantity must be positive")

        self.items.append(OrderLine(product_id, qty, price))
        self.emit_domain_event(ItemAdded(order_id=self.id, product_id=product_id))

# Load entire aggregate, modify, save atomically
order = order_repo.get_by_id(123)  # Single DB transaction
order.add_item(456, 2, Decimal("99.99"))
order_repo.save(order)  # Atomic
```

**Repository Pattern (access aggregate):**
```python
class OrderRepository:
    def get_by_id(self, order_id: str) -> Order:
        # Load aggregate and all child entities
        row = db.fetchone("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = Order(row['id'], row['user_id'])

        # Rehydrate child entities
        for line in db.fetchall("SELECT * FROM order_lines WHERE order_id = %s", (order_id,)):
            order.items.append(OrderLine(line['product_id'], line['qty'], line['price']))

        return order

    def save(self, order: Order):
        db.execute("UPDATE orders SET status = %s WHERE id = %s",
                   (order.status, order.id))
        # Save only changed items
        for event in order.domain_events:
            self.event_store.append(event)
        order.clear_events()
```

### Saga Pattern for Distributed Transactions

**Choreography vs Orchestration:**

| Approach | Flow | State | When to Use |
|----------|------|-------|------------|
| **Choreography** | Service A emits "Order Created" → Service B listens, emits "Payment Processed" → Service C listens | Implicit (events drive flow) | Simple workflows, <3 steps |
| **Orchestration** | Saga Orchestrator directs: Service A → Service B → Service C | Explicit state machine | Complex workflows, error handling, compensation |

**Orchestration Example (payment flow):**
```python
class PaymentSaga:
    def __init__(self, saga_id, order_id, amount):
        self.saga_id = saga_id
        self.order_id = order_id
        self.amount = amount
        self.state = "PENDING"

    async def execute(self):
        try:
            # Step 1: Reserve inventory
            await inventory_service.reserve(self.order_id)

            # Step 2: Process payment
            transaction_id = await payment_service.charge(self.amount)

            # Step 3: Confirm order
            await order_service.confirm(self.order_id)

            self.state = "COMPLETED"
        except Exception as e:
            # Compensating transactions (rollback)
            await self.compensate(e)

    async def compensate(self, error):
        try:
            await inventory_service.release(self.order_id)
            await payment_service.refund(transaction_id)
        except Exception:
            # Log and alert (manual intervention)
            self.state = "COMPENSATE_FAILED"
            alert_ops()

# Stored in saga_store for durability
saga = PaymentSaga(saga_id="s123", order_id="o456", amount=99.99)
saga_store.save(saga)
await saga.execute()
```

### Hexagonal Architecture (Ports & Adapters)

**Structure:**
```
Domain Layer (core business logic)
    ↑ ↓
Ports Layer (interfaces)
    ↑ ↓
Adapters Layer (implementations)
    - HTTP adapters (FastAPI routes)
    - Database adapters (SQLAlchemy repos)
    - External API adapters (Stripe, AWS)
    - Message queue adapters (Kafka, SQS)
```

**Example: Order Service**
```python
# Domain (business logic, no framework knowledge)
class OrderService:
    def __init__(self, order_repo, payment_gateway):  # Injected deps
        self.order_repo = order_repo
        self.payment_gateway = payment_gateway

    async def create_order(self, user_id, items, payment_method):
        order = Order(user_id=user_id)
        for item in items:
            order.add_item(item['product_id'], item['qty'])

        # Domain logic: validate, apply rules
        if order.total > 10000:
            order.require_approval()

        # Delegate to ports (interfaces)
        payment_result = await self.payment_gateway.charge(order.total, payment_method)
        if not payment_result.success:
            raise PaymentFailedError()

        order.mark_paid()
        await self.order_repo.save(order)
        return order

# Port: OrderRepository interface
class OrderRepository(ABC):
    @abstractmethod
    async def save(self, order: Order): pass

# Adapter: PostgreSQL implementation
class PostgresOrderRepository(OrderRepository):
    async def save(self, order: Order):
        async with db.transaction():
            await db.execute("INSERT INTO orders ...", ...)

# Adapter: HTTP handler (FastAPI)
@app.post("/api/orders")
async def create_order_handler(request: CreateOrderRequest):
    service = OrderService(
        order_repo=PostgresOrderRepository(),
        payment_gateway=StripePaymentGateway()
    )
    order = await service.create_order(
        request.user_id,
        request.items,
        request.payment_method
    )
    return {"order_id": order.id}
```

---

## Scalability Playbook

### Horizontal vs Vertical Scaling Decision Tree

```
START: "Service is slow"
  ├─ Check: CPU/Memory utilization? → >80% CPU?
  │   ├─ YES: Is single-threaded (Python, Node)?
  │   │   ├─ YES: Vertical scaling (bigger machine) won't help → Horizontal
  │   │   └─ NO: Try vertical (double RAM/CPU) FIRST (cheaper, faster)
  │   └─ NO (CPU <50%):
  │       └─ I/O bound (network, disk)?
  │           ├─ YES: Add caching layer (Redis) FIRST, then horizontal
  │           └─ NO: Check database → see DB section
  │
  └─ Check: Database?
      ├─ Connection pool maxed out?
      │   └─ Increase pool size (see formula below)
      ├─ Query latency slow?
      │   └─ Add index, optimize query, shard DB
      └─ Storage >80%?
          └─ Sharding or archive old data
```

### Database Sharding Strategies

**Sharding Key Selection:**

| Shard Key | Hotspot Risk | Rebalancing | Use Case |
|-----------|--------------|------------|----------|
| **User ID (range)** | Low (distributed users) | Hard (range shifts) | Multi-tenant SaaS |
| **User ID (hash)** | Low (hash distributes) | Medium (rehash needed) | User-centric data (orders, posts) |
| **Timestamp (range)** | HIGH (all new data → shard 0) | Easy (roll to new shard) | Time-series (logs, events) |
| **Geographic (region)** | Medium (US >> others) | Easy (move region) | Geo-distributed apps |
| **Account (uuid)** | Low if IDs random | Medium | Financial transactions |

**Range Sharding (Timestamp):**
```python
# Shard by month: shard_id = YYYYMM
shard_id = datetime.now().strftime("%Y%m")  # "202404"
db = get_db_connection(f"shard_{shard_id}")

db.execute("""
    INSERT INTO events (id, timestamp, data)
    VALUES (%s, %s, %s)
""", (event_id, now, event_data))

# Querying: need to query multiple shards for date ranges
for month in date_range("2024-01", "2024-04"):
    results.extend(query(f"shard_{month}", query_sql))
```

**Hash Sharding (User ID):**
```python
def get_shard_id(user_id: str, num_shards: int = 16):
    return hash(user_id) % num_shards

shard_id = get_shard_id(user_id)  # Returns 0-15
db = get_db_connection(f"shard_{shard_id:02d}")

# Rebalancing: if expand to 32 shards:
# ConsistentHash or Rendezvous hashing minimizes data moved
```

### Caching Layer Strategy (L1/L2/CDN)

**Cache Hierarchy:**
```
User Request
    ↓
L1: Browser Cache (index.html, CSS, images) [Expires: 1 hour]
    ↓
L2: CDN Cache (Cloudflare, Akamai) [Expires: 24 hours]
    ↓
L3: Application Cache (Redis, Memcached) [Expires: 5-60 minutes]
    ↓
L4: Database Query Cache (Postgres caching, materialized views)
    ↓
Database
```

**L3 Cache (Redis) Configuration:**
```python
import redis
from functools import wraps

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cached(ttl_seconds=300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Check cache first
            cached_value = r.get(cache_key)
            if cached_value:
                return json.loads(cached_value)

            # Miss: compute and store
            result = func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

@cached(ttl_seconds=600)
def get_user_profile(user_id: str):
    # Database query
    return db.fetchone("SELECT * FROM users WHERE id = %s", (user_id,))
```

**Cache Invalidation Strategies:**
```python
# Strategy 1: TTL (time-based) - simplest
r.setex(f"user:{user_id}", 300, user_data)  # Expire after 5 min

# Strategy 2: Event-based invalidation - accurate
def update_user(user_id, data):
    db.update(f"UPDATE users SET ... WHERE id = {user_id}")
    r.delete(f"user:{user_id}")  # Immediate invalidation
    publish_event("UserUpdated", {"user_id": user_id})

# Strategy 3: Cache versioning - low overhead
def get_user(user_id):
    version = db.fetchone("SELECT version FROM user_versions WHERE id = %s")
    cache_key = f"user:{user_id}:v{version['version']}"
    # Old versions naturally expire from cache
```

### Connection Pooling Formulas

**Optimal Pool Size:**
```
pool_size = ((core_count * 2) + effective_spindle_count)

For typical cloud instance (2 cores, SSD):
pool_size = (2 * 2) + 1 = 5 connections

For high-concurrency (8 cores):
pool_size = (8 * 2) + 1 = 17 connections

Max: Don't exceed 20-30 (each conn consumes ~5MB RAM)
```

**FastAPI + SQLAlchemy Pool Config:**
```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=20,           # Base pool size
    max_overflow=10,        # Temporary overflow connections
    pool_timeout=30,        # Wait 30s for available connection
    pool_recycle=3600,      # Recycle connections after 1 hour
    echo_pool=True          # Log pool events
)

# At peak load: 20 + 10 = 30 concurrent connections
```

### Rate Limiting Algorithms

**Token Bucket (flexible, burst allowed):**
```python
import time
from collections import defaultdict

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = float(capacity)
        self.last_refill = time.time()

    def allow_request(self) -> bool:
        now = time.time()
        elapsed = now - self.last_refill

        # Refill: add tokens based on elapsed time
        self.tokens = min(
            self.capacity,
            self.tokens + (elapsed * self.refill_rate)
        )
        self.last_refill = now

        # Check if request allowed
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

# Per-user rate limiting: 100 req/min, burst 150
limiters = defaultdict(lambda: TokenBucket(capacity=150, refill_rate=100/60))

def check_rate_limit(user_id: str) -> bool:
    return limiters[user_id].allow_request()
```

**Sliding Window (accurate, higher overhead):**
```python
from collections import deque
import time

class SlidingWindow:
    def __init__(self, window_size_seconds: int, max_requests: int):
        self.window_size = window_size_seconds
        self.max_requests = max_requests
        self.requests = deque()  # timestamps

    def allow_request(self) -> bool:
        now = time.time()

        # Remove old requests outside window
        while self.requests and self.requests[0] < now - self.window_size:
            self.requests.popleft()

        # Check if below limit
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        return False

# 100 requests per 60-second window
limiter = SlidingWindow(window_size_seconds=60, max_requests=100)
```

**Distributed Rate Limiting (Redis):**
```python
import redis
import time

r = redis.Redis()

def rate_limit_redis(user_id: str, limit: int = 100, window: int = 60) -> bool:
    key = f"rate_limit:{user_id}"
    current = r.incr(key)

    if current == 1:
        r.expire(key, window)  # First request: set expiry

    return current <= limit

# Usage:
if not rate_limit_redis("user_123"):
    return {"error": "Rate limit exceeded"}, 429
```

---

## API Design Standards

### REST Maturity Model (Richardson)

| Level | Description | Example |
|-------|-------------|---------|
| **0** | RPC (HTTP as transport only) | POST /api with {"method": "getUser", "id": 123} |
| **1** | Resources (URIs for entities) | GET /api/users/123, POST /api/users |
| **2** | HTTP verbs (idempotency, semantics) | PUT /api/users/123 (idempotent), DELETE, GET (cacheable) |
| **3** | Hypermedia (HATEOAS links in response) | Response includes `{"_links": {"next": "/api/users?page=2"}}` |

**Level 2 (Recommended minimum):**
```
GET /api/users           → List all users [cacheable]
POST /api/users          → Create user [202 Accepted with Location header]
GET /api/users/123       → Get user 123 [cacheable]
PUT /api/users/123       → Replace user 123 [idempotent, no Location header]
PATCH /api/users/123     → Partial update [idempotent, JSON Merge Patch]
DELETE /api/users/123    → Delete user 123 [idempotent]
HEAD /api/users          → Headers only (check if exists)
OPTIONS /api/users       → Returns allowed methods
```

### Versioning Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| **URI** | `/api/v1/users`, `/api/v2/users` | Clear, easy routing | URL bloat, duplication |
| **Header** | `Accept: application/vnd.myapp.v2+json` | Clean URIs | Less discoverable |
| **Content Negotiation** | `Accept: application/vnd.myapp-v2+json` | Standard | Confusing |
| **Query Param** | `/api/users?api_version=2` | Works for GET | Cache issues, non-standard |

**URI Versioning Recommended:**
```python
from fastapi import APIRouter

v1_router = APIRouter(prefix="/api/v1")
v2_router = APIRouter(prefix="/api/v2")

@v1_router.get("/users/{user_id}")
async def get_user_v1(user_id: str):
    # Old response format
    return {"user": {"id": user_id, "name": "John"}}

@v2_router.get("/users/{user_id}")
async def get_user_v2(user_id: str):
    # New response format with additional fields
    return {
        "data": {
            "id": user_id,
            "name": "John",
            "email": "john@example.com",
            "metadata": {"created_at": "2024-01-01"}
        },
        "links": {"self": f"/api/v2/users/{user_id}"}
    }

app.include_router(v1_router)
app.include_router(v2_router)

# Sunset v1 after 12 months
# Deprecation headers:
# Deprecation: true
# Sunset: Wed, 15 Jan 2025 23:59:59 GMT
```

### Pagination Patterns

**Offset-based (simple but inefficient for large datasets):**
```
GET /api/users?page=2&limit=50
Response: { items: [...], total: 10000, page: 2, pages: 200 }

Problem: SELECT OFFSET 100000 needs to scan 100K rows (slow)
```

**Cursor-based (efficient, consistent):**
```python
# Request next 50 items after cursor "abc123"
GET /api/users?cursor=abc123&limit=50

# Server returns:
{
    "items": [...50 users...],
    "next_cursor": "def456",  # For next request
    "has_more": True
}

# Implementation:
@app.get("/api/users")
async def list_users(cursor: str = None, limit: int = 50):
    if cursor:
        # Cursor is base64(user_id)
        user_id = base64.b64decode(cursor)
        items = db.execute(
            "SELECT * FROM users WHERE id > %s ORDER BY id LIMIT %s",
            (user_id, limit + 1)  # +1 to check if more exist
        )
    else:
        items = db.execute("SELECT * FROM users ORDER BY id LIMIT %s", (limit + 1,))

    has_more = len(items) > limit
    items = items[:limit]

    next_cursor = None
    if has_more:
        next_cursor = base64.b64encode(items[-1]['id'])

    return {
        "items": items,
        "next_cursor": next_cursor,
        "has_more": has_more
    }
```

### Error Response Format (RFC 7807)

```json
{
    "type": "https://api.example.com/errors/validation-error",
    "title": "Your request has validation errors",
    "status": 422,
    "detail": "The 'email' field is invalid",
    "instance": "/api/users",
    "timestamp": "2024-04-06T12:34:56Z",
    "errors": {
        "email": ["Must be a valid email address"],
        "age": ["Must be >= 18"]
    }
}
```

**FastAPI Implementation:**
```python
from fastapi import HTTPException
from pydantic import BaseModel

class ValidationErrorDetail(BaseModel):
    type: str = "https://api.example.com/errors/validation-error"
    title: str
    status: int
    detail: str
    errors: dict

@app.post("/api/users")
async def create_user(user: CreateUserSchema):
    try:
        # Validation happens in Pydantic
        user_service.create(user)
    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail={
                "type": "https://api.example.com/errors/validation-error",
                "title": "Validation failed",
                "status": 422,
                "detail": str(e),
                "errors": {"email": ["Already exists"]}
            }
        )
```

### Idempotency Keys

**Problem:** Retry on timeout → duplicate orders

**Solution:**
```python
import uuid

# Client generates unique key for request
@app.post("/api/orders")
async def create_order(
    request: CreateOrderRequest,
    idempotency_key: str = Header(None)
):
    if not idempotency_key:
        raise HTTPException(400, "Idempotency-Key required")

    # Check if we've seen this key
    cached = cache.get(f"idempotency:{idempotency_key}")
    if cached:
        return cached  # Idempotent: return previous response

    # Process order
    order = await order_service.create(request)

    # Cache response with TTL (24 hours)
    cache.setex(
        f"idempotency:{idempotency_key}",
        86400,
        order.to_json()
    )

    return order
```

---

## Infrastructure Patterns

### 12-Factor App Compliance Checklist

| Factor | Requirement | Check |
|--------|-------------|-------|
| 1. Codebase | Single codebase tracked in version control | ✓ Git repo with CI/CD |
| 2. Dependencies | Explicit, isolated (package.json, requirements.txt) | ✓ No global installs |
| 3. Config | Environment variables, NOT hardcoded | ✓ `.env`, `os.getenv()` |
| 4. Backing Services | Treat DB/cache as attached resources | ✓ Database URL in env var |
| 5. Build/Run/Release | Strict separation of stages | ✓ CI (build) → Deploy (run) |
| 6. Processes | Stateless, share nothing | ✓ Session in Redis, not memory |
| 7. Port Binding | Self-contained (no separate web server) | ✓ FastAPI, Express included |
| 8. Concurrency | Horizontally scalable process types | ✓ Docker, load balancer |
| 9. Disposability | Fast startup, graceful shutdown | ✓ Health checks, SIGTERM |
| 10. Dev/Prod Parity | Same code in dev and prod | ✓ Docker ensures parity |
| 11. Logs | Stdout only, not log files | ✓ `structlog` to stdout |
| 12. Admin Tasks | Run as one-off processes | ✓ `docker run -it` for migrations |

### Blue/Green vs Canary Deployment

**Blue/Green (all-or-nothing, instant rollback):**
```
Current: Blue (v1.0)  → Traffic 100% to Blue
Deploy: Green (v1.1)  → Test Green (smoke tests)
Switch:               → Traffic 100% to Green (instant)
Rollback:             → Traffic back to Blue (1 sec, if issue)
Keep Blue:            → For next rollback if needed
```

**Canary (gradual, real traffic testing):**
```
Current: v1.0 (100% traffic)
Deploy:  v1.1 (0% traffic, warmup)
Route:   10% → v1.1, 90% → v1.0
Monitor: Error rate, latency of v1.1
Route:   25% → v1.1, 75% → v1.0
Route:   50% → v1.1 (halfway point, assess)
Route:   100% → v1.1 (if no issues detected)
```

**Kubernetes manifests:**
```yaml
# Blue: current deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: v1.0
  template:
    metadata:
      labels:
        app: myapp
        version: v1.0
    spec:
      containers:
      - name: app
        image: myapp:v1.0

---
# Green: new deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: v1.1
  template:
    metadata:
      labels:
        app: myapp
        version: v1.1
    spec:
      containers:
      - name: app
        image: myapp:v1.1

---
# Service routes traffic (patch selector to switch)
apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: myapp
    version: v1.0  # Switch to v1.1 after testing
  ports:
  - port: 80
    targetPort: 8000
```

### Circuit Breaker Pattern

**Problem:** Cascading failures when downstream service fails

```python
from enum import Enum
import time

class CircuitState(Enum):
    CLOSED = "closed"      # Normal: requests pass through
    OPEN = "open"          # Failing: reject requests fast
    HALF_OPEN = "half_open"  # Testing: allow single request

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
                self.failure_count = 0
            else:
                raise Exception("Circuit breaker OPEN")

        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise

    def on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

# Usage:
breaker = CircuitBreaker(failure_threshold=5, timeout=30)

def call_payment_service():
    return breaker.call(payment_api.charge, amount=100)

try:
    result = call_payment_service()
except Exception as e:
    # Fallback: queue payment for retry
    payment_queue.enqueue(order_id, amount)
```

### Retry with Exponential Backoff + Jitter

```python
import random
import time
import asyncio

def exponential_backoff_with_jitter(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter: bool = True
) -> float:
    """
    Calculate delay with exponential backoff and optional jitter.

    attempt 0: 1s + jitter [0-1s] = [0-2s]
    attempt 1: 2s + jitter [0-2s] = [0-4s]
    attempt 2: 4s + jitter [0-4s] = [0-8s]
    attempt 3: 8s + jitter [0-8s] = [0-16s]
    attempt 4: 16s + jitter [0-16s] = [0-32s]
    attempt 5: 32s + jitter [0-32s] = [0-64s]
    attempt 6: 60s (capped) [0-30s jitter]
    """
    delay = min(base_delay * (2 ** attempt), max_delay)

    if jitter:
        jitter_amount = random.uniform(0, delay)
        return jitter_amount

    return delay

# Synchronous retry:
def retry_sync(func, max_attempts=5):
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise

            delay = exponential_backoff_with_jitter(attempt)
            print(f"Attempt {attempt+1} failed, retrying in {delay:.2f}s")
            time.sleep(delay)

# Async retry:
async def retry_async(async_func, max_attempts=5):
    for attempt in range(max_attempts):
        try:
            return await async_func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise

            delay = exponential_backoff_with_jitter(attempt)
            await asyncio.sleep(delay)
```

### Health Check Design

**Liveness (is process alive?):** Responds to `/health/live`
```python
@app.get("/health/live")
async def health_live():
    # Return 200 if process is running
    # Used by: kubelet (restart if fails), orchestrator
    return {"status": "alive"}
```

**Readiness (is service ready for traffic?):** Responds to `/health/ready`
```python
@app.get("/health/ready")
async def health_ready():
    # Check dependencies
    checks = {
        "database": await check_database(),
        "cache": await check_redis(),
        "queue": await check_message_broker()
    }

    if all(checks.values()):
        return {"status": "ready", "checks": checks}, 200
    else:
        return {"status": "not_ready", "checks": checks}, 503

async def check_database():
    try:
        async with db.connect() as conn:
            await conn.execute("SELECT 1")
        return True
    except:
        return False
```

**Startup (dependencies ready?):** Responds to `/health/startup`
```python
@app.get("/health/startup")
async def health_startup():
    # Check migrations complete, config loaded
    if not migrations_applied():
        return {"status": "startup_failed"}, 503
    return {"status": "started"}, 200

# Kubernetes config:
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health/startup
    port: 8000
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30  # 30 * 10s = 300s max startup time
```

---

## Security Architecture

### Zero Trust Model

**Principle:** Never trust, always verify. No implicit trust based on network location.

```
Traditional (Perimeter):
[Firewall] → Inside trusted, outside untrusted

Zero Trust:
Every request: Authenticate (WHO), Authorize (WHAT), Encrypt (HOW)
Device security check → User identity → Resource permission → Logs
```

**Implementation:**
```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthCredentials = Depends(security)):
    """Verify JWT token signature and claims."""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])

        # Check token expiration
        if payload['exp'] < time.time():
            raise HTTPException(401, "Token expired")

        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def check_permission(
    user_payload = Depends(verify_token),
    resource_id: str = None
):
    """Authorize: does user have permission to resource?"""
    user_id = user_payload['sub']
    user_role = user_payload['role']

    # RBAC check
    if user_role == "admin":
        return True

    # ABAC check: attribute-based
    if user_role == "editor" and await owns_resource(user_id, resource_id):
        return True

    raise HTTPException(403, "Forbidden")

@app.get("/api/resources/{resource_id}")
async def get_resource(
    resource_id: str,
    _: bool = Depends(check_permission)
):
    return {"id": resource_id, "data": "..."}
```

### OAuth2/OIDC Flow Selection

| App Type | Flow | Why |
|----------|------|-----|
| **Single Page App (React)** | Authorization Code + PKCE | No backend to store secret |
| **Traditional Web App (Django)** | Authorization Code | Backend stores client_secret securely |
| **Mobile App** | Authorization Code + PKCE | No backend; PKCE adds security |
| **Machine-to-Machine (service account)** | Client Credentials | Services authenticate as themselves |
| **Desktop App** | Device Flow or Authorization Code + PKCE | No localhost binding |
| **CLI Tool** | Device Flow | User logs in on browser, CLI waits |

**Authorization Code + PKCE (recommended for SPAs):**
```python
import secrets
import base64
import hashlib
from urllib.parse import urlencode

# Step 1: Frontend generates code challenge
def generate_pkce():
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip('=')
    return code_verifier, code_challenge

# Frontend:
# code_verifier, code_challenge = generate_pkce()
# localStorage.setItem('code_verifier', code_verifier)
#
# Redirect to:
# https://auth-server/authorize?
#   client_id=my_app
#   redirect_uri=https://myapp.com/callback
#   scope=openid profile email
#   code_challenge={code_challenge}
#   code_challenge_method=S256

# Step 2: Auth server redirects back with code
# https://myapp.com/callback?code=abc123

# Step 3: Frontend exchanges code for token (using verifier)
@app.post("/api/auth/callback")
async def callback(code: str):
    code_verifier = request.headers.get('X-Code-Verifier')

    response = requests.post(
        'https://auth-server/token',
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'client_id': CLIENT_ID,
            'redirect_uri': REDIRECT_URI,
            'code_verifier': code_verifier  # Proves we initiated the flow
        }
    )

    token_data = response.json()
    # Return tokens to frontend
    return {
        "access_token": token_data['access_token'],
        "id_token": token_data['id_token'],
        "refresh_token": token_data['refresh_token']
    }
```

### RBAC vs ABAC vs ReBAC

| Model | Example | Complexity | Use Case |
|-------|---------|-----------|----------|
| **RBAC** | user.role = "admin" → all resources | Low | Simple: admin, editor, viewer |
| **ABAC** | user.dept="eng" AND resource.project="api" | Medium | Complex permissions: department, project, time-based |
| **ReBAC** | User "john" can edit document if Shared(john, doc) | High | Fine-grained: shared docs, team hierarchies |

**ABAC Example (Attribute-Based):**
```python
class PermissionChecker:
    def can_access(self, user, resource, action):
        """
        Evaluate permissions based on user + resource attributes.
        """
        rules = [
            # Admin can do anything
            lambda: user.role == "admin",

            # Owner can edit their own resources
            lambda: user.id == resource.owner_id and action in ["read", "edit", "delete"],

            # Engineer can read/edit team resources during business hours
            lambda: (
                user.role == "engineer"
                and resource.team_id == user.team_id
                and action in ["read", "edit"]
                and is_business_hours()
            ),

            # Managers can read but not delete
            lambda: (
                user.role == "manager"
                and user.department_id == resource.department_id
                and action == "read"
            ),
        ]

        return any(rule() for rule in rules)

# Usage:
if not checker.can_access(user, resource, "edit"):
    raise PermissionDenied()
```

### Secrets Management

**Hierarchy (use one level):**
```
Development:
  → Environment variables in .env file
  → Load via: dotenv.load_dotenv()

Staging/Production:
  → HashiCorp Vault (managed secrets)
  → AWS Secrets Manager (managed secrets)
  → Environment variables (Kubernetes secrets)

NEVER:
  → Hardcoded secrets in code
  → Committed to git
  → Logged or printed
```

**Vault Integration (Python):**
```python
import hvac

vault_client = hvac.Client(url='https://vault.example.com', token=VAULT_TOKEN)

# Read secret
secret = vault_client.secrets.kv.v2.read_secret_version(
    path='myapp/db_password'
)
db_password = secret['data']['data']['password']

# Rotate secret
vault_client.auth.token.renew_self()

# Request new credential
db_creds = vault_client.secrets.database.generate_credentials(
    name='myapp-role'
)
```

---

## Observability Stack

### Three Pillars: Logs, Metrics, Traces

**Logs (what happened?)**
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "order_created",
    order_id="o123",
    user_id="u456",
    amount=99.99,
    timestamp="2024-04-06T12:34:56Z"
)

# Output (JSON for parsing):
# {"event": "order_created", "order_id": "o123", "user_id": "u456", "amount": 99.99, ...}
```

**Metrics (how many/how fast?)**
```python
from prometheus_client import Counter, Histogram, Gauge
import time

# Counters (monotonic increase)
orders_created = Counter('orders_created_total', 'Orders created')
errors_total = Counter('errors_total', 'Total errors', ['error_type'])

# Histograms (distribution)
request_duration = Histogram('request_duration_seconds', 'Request latency')

# Gauges (current value)
active_connections = Gauge('active_connections', 'Active connections')

# Usage:
orders_created.inc()
errors_total.labels(error_type='payment_failed').inc()

with request_duration.time():
    process_order()

active_connections.set(10)
```

**Traces (which request path?)**
```python
from opentelemetry import trace, context
from opentelemetry.exporter.jaeger import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Setup Jaeger exporter
jaeger_exporter = JaegerExporter(
    agent_host_name='localhost',
    agent_port=6831,
)
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

tracer = trace.get_tracer(__name__)

# Create spans
with tracer.start_as_current_span("create_order") as span:
    span.set_attribute("order.id", "o123")

    with tracer.start_as_current_span("validate_order"):
        validate_order(order)

    with tracer.start_as_current_span("call_payment_service"):
        charge_customer(order.amount)

    with tracer.start_as_current_span("update_database"):
        save_order(order)
```

### SLI/SLO/SLA Definitions

| Term | Definition | Example |
|------|-----------|---------|
| **SLI** | Service Level Indicator (measurable metric) | "99.9% of requests complete <500ms" |
| **SLO** | Service Level Objective (internal goal) | "Achieve 99.9% requests <500ms 99.9% of month" |
| **SLA** | Service Level Agreement (contract, penalties) | "99.9% uptime or 10% credit to customer" |

**SLO Calculation:**
```python
def calculate_slo_compliance(successes, total_requests, target=0.999):
    """
    Calculate if SLO met.

    Example: 999,900 successful requests out of 1,000,000
    Compliance: 99.99% (exceeds 99.9% target)
    """
    compliance = successes / total_requests
    return compliance >= target

# Monthly SLO budget: 1 - 0.999 = 0.001 = 0.1% downtime allowed
# 0.1% of 730 hours = 43.8 minutes of downtime allowed per month
allowed_downtime_seconds = 730 * 3600 * 0.001  # 2628 seconds
```

### Alerting Strategy (Symptom-Based, Not Cause-Based)

**Bad (cause-based):**
```
Alert: "CPU >80%"
Problem: Might be normal, misleading
```

**Good (symptom-based):**
```
Alert: "P99 latency >2s for 5 minutes"
Reason: Users experiencing slowness
Action: Page on-call engineer
```

**Symptom-based alerts:**
```yaml
# Prometheus alerts
groups:
- name: myapp
  rules:
  - alert: HighLatency
    expr: histogram_quantile(0.99, request_duration_seconds) > 2
    for: 5m
    annotations:
      summary: "99th percentile latency above 2s"

  - alert: ErrorRateHigh
    expr: (rate(errors_total[5m]) / rate(requests_total[5m])) > 0.05
    for: 5m
    annotations:
      summary: "Error rate above 5%"

  - alert: DatabaseConnPoolExhausted
    expr: pg_stat_activity_count >= 20  # At max pool size
    for: 1m
    annotations:
      summary: "Database connection pool at capacity"
```

---

## Pattern Reference

Save this skill for:
- System design interviews (decision matrices)
- Architecture reviews (tradeoff analysis)
- Scaling decisions (formulas, algorithms)
- Security decisions (authentication flows)
- Deployment strategy (blue/green, canary)
- Observability setup (three pillars)
- Rate limiting (token bucket, sliding window)
