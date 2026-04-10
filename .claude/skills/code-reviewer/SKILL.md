# Code Reviewer - Enterprise Standard

Production-grade code review framework for TypeScript, Python, JavaScript, React, and FastAPI projects.

## Code Review Checklist by Category

### Logic Errors & Correctness

**Off-by-One Errors:**
```python
# BAD: Loop misses last element
for i in range(len(items)):  # Includes 0 to len-1
    process(items[i])

# BAD: Slice off-by-one
users_batch = users[start:end]  # If end=10, only gets 0-9

# GOOD: Use explicit stop condition or slicing
for item in items:
    process(item)

# GOOD: Be explicit about inclusive/exclusive bounds
users_batch = users[start:end+1]  # Documents intent
```

**Null/None Handling:**
```python
# BAD: Assumes value exists
def get_user_email(user_id: int) -> str:
    user = db.query(User).filter(User.id == user_id).first()
    return user.email  # AttributeError if user is None

# GOOD: Explicit None handling
def get_user_email(user_id: int) -> Optional[str]:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None
    return user.email

# GOOD: Use type hints and let linter catch it
def get_user_email(user_id: int) -> str:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    return user.email
```

**Race Conditions:**
```python
# BAD: Check-then-act race condition
if user.balance >= amount:
    user.balance -= amount  # Another thread might reduce balance between check and update

# GOOD: Atomic operation with SELECT FOR UPDATE
from sqlalchemy import select, func

async with db.begin():
    user = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user.scalar_one()
    if user.balance >= amount:
        user.balance -= amount
        await db.commit()
```

**Array Bounds:**
```typescript
// BAD: Access without bounds check
const value = array[index];

// GOOD: Explicit bounds check
const value = index >= 0 && index < array.length
    ? array[index]
    : defaultValue;
```

### Performance Issues

**N+1 Query Problem:**
```python
# BAD: N+1 queries
users = db.query(User).all()
for user in users:
    orders = db.query(Order).filter(Order.user_id == user.id).all()  # N additional queries

# GOOD: Use eager loading
users = db.query(User).options(
    joinedload(User.orders)
).all()

# GOOD: Explicit join with relationship loading
from sqlalchemy.orm import joinedload
users = db.query(User).options(joinedload(User.orders)).all()

# GOOD: Single aggregation query
from sqlalchemy import func
user_orders = db.query(
    User.id,
    func.count(Order.id).label('order_count')
).join(Order).group_by(User.id).all()
```

**Unnecessary Re-renders (React):**
```typescript
// BAD: Component re-renders on every parent update
const UserList = ({ users }) => {
    return users.map(user => (
        <UserCard key={user.id} user={user} />
    ));
};

// GOOD: Memoize child component
const UserCard = React.memo(({ user }) => (
    <div>{user.name}</div>
));

// BAD: Creating new object on every render
const UserList = ({ users }) => {
    const config = { itemsPerPage: 10 };  // New object each render
    return <Pagination config={config} />;
};

// GOOD: Memoize object
const UserList = ({ users }) => {
    const config = useMemo(() => ({ itemsPerPage: 10 }), []);
    return <Pagination config={config} />;
};

// BAD: Inline function on every render
const UserList = ({ users }) => {
    return <button onClick={() => handleClick(user.id)}>Click</button>;
};

// GOOD: Memoized callback
const handleClick = useCallback((userId) => {
    // Handle click
}, []);
```

**Memory Leaks:**
```typescript
// BAD: EventListener not removed
useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup function
}, []);

// GOOD: Cleanup listener
useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, []);

// BAD: Subscription not unsubscribed
useEffect(() => {
    const subscription = observable.subscribe(handleValue);
    // Missing unsubscribe
}, []);

// GOOD: Unsubscribe in cleanup
useEffect(() => {
    const subscription = observable.subscribe(handleValue);
    return () => subscription.unsubscribe();
}, []);
```

**Unbounded Collections:**
```python
# BAD: Cache without eviction policy
cache = {}
def add_to_cache(key, value):
    cache[key] = value  # Grows indefinitely

# GOOD: Use bounded cache with LRU
from functools import lru_cache

@lru_cache(maxsize=1000)
def expensive_function(arg):
    return compute(arg)
```

### Security Issues

**SQL Injection:**
```python
# BAD: String concatenation
query = f"SELECT * FROM users WHERE email = '{email}'"

# GOOD: Parameterized query
query = "SELECT * FROM users WHERE email = ?"
db.execute(query, (email,))

# GOOD: ORM usage (SQLAlchemy)
user = db.query(User).filter(User.email == email).first()
```

**XSS (Cross-Site Scripting):**
```typescript
// BAD: Directly render user input
const Profile = ({ userBio }) => {
    return <div dangerouslySetInnerHTML={{ __html: userBio }} />;
};

// GOOD: Escape HTML or use safe parser
import DOMPurify from 'dompurify';

const Profile = ({ userBio }) => {
    return <div>{DOMPurify.sanitize(userBio)}</div>;
};

// GOOD: Just render as text
const Profile = ({ userBio }) => {
    return <div>{userBio}</div>;
};
```

**Authentication Bypass:**
```python
# BAD: No permission check
@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    db.query(User).filter(User.id == user_id).delete()
    return {"status": "deleted"}

# GOOD: Verify authorization
@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403)
    db.query(User).filter(User.id == user_id).delete()
    return {"status": "deleted"}
```

**Hardcoded Secrets:**
```python
# BAD: Secret in code
DATABASE_URL = "postgresql://user:password@localhost/db"

# GOOD: Environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
```

### Maintainability & Design

**God Objects (>200 lines):**
```python
# BAD: User model with too many responsibilities
class User(Base):
    __tablename__ = "users"
    id: int
    name: str
    email: str
    password_hash: str

    def validate_password(self): ...
    def send_email(self): ...
    def calculate_subscription_fee(self): ...
    def generate_invoice(self): ...
    def log_activity(self): ...
    # 300+ lines total

# GOOD: Extract responsibilities into services
class UserService:
    def validate_password(self, user: User, password: str): ...

class EmailService:
    def send_email(self, user: User, subject: str, body: str): ...

class BillingService:
    def calculate_subscription_fee(self, user: User): ...
```

**Deep Nesting (>3 levels):**
```python
# BAD: Deep nesting
if user:
    if user.is_active:
        if user.subscription:
            if user.subscription.is_valid:
                if user.can_access_feature:
                    return process_request(user)

# GOOD: Early return / guard clauses
if not user or not user.is_active:
    raise HTTPException(status_code=401)

if not user.subscription or not user.subscription.is_valid:
    raise HTTPException(status_code=403)

if not user.can_access_feature:
    raise HTTPException(status_code=403)

return process_request(user)
```

**Magic Numbers & Strings:**
```python
# BAD: Unexplained numbers
if user.age < 18:
    discount = 0.9

# GOOD: Named constants
MINIMUM_USER_AGE = 18
YOUTH_DISCOUNT_RATE = 0.9

if user.age < MINIMUM_USER_AGE:
    discount = YOUTH_DISCOUNT_RATE
```

**DRY Violations:**
```python
# BAD: Repeated code
def create_user(name, email):
    if not email or "@" not in email:
        raise ValueError("Invalid email")
    if not name or len(name) < 2:
        raise ValueError("Invalid name")
    return User(name=name, email=email)

def update_user(user_id, name, email):
    if not email or "@" not in email:
        raise ValueError("Invalid email")
    if not name or len(name) < 2:
        raise ValueError("Invalid name")
    user = db.get(user_id)
    user.name = name
    user.email = email
    return user

# GOOD: Extract validation
def validate_email(email: str) -> None:
    if not email or "@" not in email:
        raise ValueError("Invalid email")

def validate_name(name: str) -> None:
    if not name or len(name) < 2:
        raise ValueError("Invalid name")

def create_user(name, email):
    validate_email(email)
    validate_name(name)
    return User(name=name, email=email)

def update_user(user_id, name, email):
    validate_email(email)
    validate_name(name)
    user = db.get(user_id)
    user.name = name
    user.email = email
    return user
```

**Inconsistent Error Handling:**
```python
# BAD: Inconsistent error handling
def process_payment(amount):
    try:
        result = payment_gateway.charge(amount)
        return result
    except PaymentError:
        print("Error occurred")  # Loses exception context

def process_refund(transaction_id):
    result = payment_gateway.refund(transaction_id)  # No error handling
    return result

# GOOD: Consistent pattern
def process_payment(amount: float) -> PaymentResult:
    try:
        return payment_gateway.charge(amount)
    except PaymentError as e:
        logger.error(f"Payment failed: {e}", amount=amount)
        raise PaymentProcessingError(f"Failed to process payment: {str(e)}")

def process_refund(transaction_id: str) -> PaymentResult:
    try:
        return payment_gateway.refund(transaction_id)
    except PaymentError as e:
        logger.error(f"Refund failed: {e}", transaction_id=transaction_id)
        raise RefundProcessingError(f"Failed to process refund: {str(e)}")
```

### Testing Issues

**Brittle Tests (Implementation-Dependent):**
```python
# BAD: Tests implementation details
def test_calculate_discount():
    user = User(name="John", age=25)
    discount = user.calculate_discount()  # Tests internal method
    assert discount == 0.1
    assert user.age == 25  # Brittle - tests state that doesn't matter

# GOOD: Tests behavior via public API
def test_youth_users_receive_discount():
    user = User(name="John", age=17)
    result = apply_pricing(user, base_price=100)
    assert result == 90  # Tests behavior, not implementation
```

**Missing Edge Cases:**
```typescript
// BAD: Only tests happy path
test('formats date correctly', () => {
    const result = formatDate(new Date('2026-01-15'));
    expect(result).toBe('01/15/2026');
});

// GOOD: Covers edge cases
test('formats date correctly', () => {
    expect(formatDate(new Date('2026-01-15'))).toBe('01/15/2026');
});

test('handles null date', () => {
    expect(formatDate(null)).toBe('');
});

test('handles invalid date', () => {
    expect(formatDate(new Date('invalid'))).toBe('');
});

test('formats leap year date', () => {
    expect(formatDate(new Date('2024-02-29'))).toBe('02/29/2024');
});
```

**Low Test Coverage for Critical Paths:**
```python
# PAYMENT PROCESSING - High risk, must have 100% coverage
# BAD: Only 60% coverage
# Missing: Invalid amount, concurrent charges, refund after charge

# GOOD: Comprehensive test suite
def test_charge_valid_amount():
    assert charge(amount=100) == True

def test_charge_zero_amount():
    with pytest.raises(ValueError):
        charge(amount=0)

def test_charge_negative_amount():
    with pytest.raises(ValueError):
        charge(amount=-10)

def test_concurrent_charges():
    # Test race condition handling
    pass

def test_refund_after_charge():
    charge_id = charge(amount=100)
    assert refund(charge_id) == True
```

---

## Language-Specific Review Patterns

### Python

**Type Hints Coverage:**
```python
# BAD: No type hints
def calculate_total(items, tax_rate):
    return sum(item.price for item in items) * (1 + tax_rate)

# GOOD: Full type hints
from typing import List

def calculate_total(items: List[Item], tax_rate: float) -> float:
    return sum(item.price for item in items) * (1 + tax_rate)
```

**Async/Await Patterns:**
```python
# BAD: Blocking I/O in async context
async def get_user(user_id: int):
    user = db.query(User).filter(User.id == user_id).first()  # Blocking
    return user

# GOOD: Use async database driver
async def get_user(user_id: int):
    user = await db.query(User).filter(User.id == user_id).first()
    return user
```

**Pydantic v2 Validation:**
```python
# BAD: Manual validation
class CreateUserRequest:
    def __init__(self, name, email):
        if not email or "@" not in email:
            raise ValueError("Invalid email")
        self.name = name
        self.email = email

# GOOD: Pydantic automatic validation
from pydantic import BaseModel, EmailStr, Field

class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr

    model_config = ConfigDict(extra="forbid")
```

### TypeScript

**Type Safety & Strict Mode:**
```typescript
// BAD: Loose typing
function getUser(id) {
    return users[id];
}

// GOOD: Strict types
interface User {
    id: number;
    name: string;
    email: string;
}

function getUser(id: number): User | undefined {
    return users.find(u => u.id === id);
}
```

**Discriminated Unions:**
```typescript
// BAD: String union without type guard
type ApiResponse = "success" | "error";

if (response === "success") {
    console.log(data);  // data may not exist!
}

// GOOD: Discriminated union
type ApiResponse =
    | { status: "success"; data: User[] }
    | { status: "error"; code: string; message: string };

function handleResponse(response: ApiResponse) {
    switch (response.status) {
        case "success":
            console.log(response.data);
            break;
        case "error":
            logger.error(response.message);
            break;
    }
}
```

### React & Hooks

**Hook Rules Violations:**
```typescript
// BAD: Conditional hook call
const MyComponent = ({ shouldFetch }) => {
    if (shouldFetch) {
        useEffect(() => fetchData(), []);  // Breaks hook rules
    }
};

// GOOD: Always call hooks at top level
const MyComponent = ({ shouldFetch }) => {
    useEffect(() => {
        if (shouldFetch) {
            fetchData();
        }
    }, [shouldFetch]);
};

// BAD: Missing dependency
useEffect(() => {
    setUser(findUser(userId));
}, []);  // Should include userId

// GOOD: Complete dependencies
useEffect(() => {
    setUser(findUser(userId));
}, [userId]);
```

**Key Prop Usage:**
```typescript
// BAD: Using array index as key
{users.map((user, index) => (
    <UserCard key={index} user={user} />  // Breaks on reordering
))}

// GOOD: Use stable identifier
{users.map((user) => (
    <UserCard key={user.id} user={user} />
))}
```

---

## Review Communication Guide

### Constructive Feedback Patterns

**Blocking Comments (Prevent merge):**
- Security vulnerability
- Data corruption risk
- Breaking API change without migration
- Unhandled error paths

```
BLOCKING: SQL Injection vulnerability

The user input is interpolated directly into the query:
    query = f"SELECT * FROM users WHERE email = '{email}'"

This allows SQL injection attacks. Use parameterized queries:
    query = "SELECT * FROM users WHERE email = ?"
    db.execute(query, (email,))

See: OWASP A03:2021
```

**Non-Blocking Comments (Nice-to-have):**
- Performance optimization
- Code style inconsistency
- Test coverage gaps
- Naming suggestions

```
SUGGESTION: This N+1 query could cause performance issues with large datasets.

Current:
    for user in users:
        orders = db.query(Order).filter(Order.user_id == user.id).all()

Suggested:
    from sqlalchemy.orm import joinedload
    users = db.query(User).options(joinedload(User.orders)).all()

This reduces from N+1 queries to 1 query.
```

### Praise Patterns

- Highlight good security practices
- Commend thorough test coverage
- Recognize clear, maintainable code
- Appreciate thoughtful refactoring

```
APPROVED: Great refactoring! Extracting the validation into a separate module makes the code much more testable and reusable. The guard clauses also improve readability.
```

---

## PR Review Scoring Rubric

**Scale: 1-5**

| Score | Meaning | Action |
|-------|---------|--------|
| 5 | Excellent - Ship as-is | Approve, merge |
| 4 | Good - Minor suggestions | Approve with comments |
| 3 | Acceptable - Address non-blocking issues | Request changes |
| 2 | Needs work - Blocking issues present | Request major changes |
| 1 | Not ready - Critical problems | Request re-review |

**Scoring Matrix:**

| Category | 5 Points | 4 Points | 3 Points | 2 Points | 1 Point |
|----------|----------|----------|----------|----------|---------|
| **Logic** | No errors detected | Minor edge case | Handles most cases | Missing cases | Fundamentally broken |
| **Security** | Passes all checks | Minor exposure risk | Typical patterns | Known vulnerability | Critical vuln |
| **Performance** | Optimized | No issues expected | Acceptable | May cause issues | Will cause issues |
| **Tests** | 90%+ coverage | 80-90% coverage | 70-80% coverage | <70% coverage | No tests |
| **Maintainability** | Very clear | Clear | Acceptable | Confusing | Unreadable |

---

## PR Review Template

```markdown
## Code Review

**Overall Score: 4/5 - Approve with minor suggestions**

### Logic & Correctness
- [x] No off-by-one errors
- [x] Null/None cases handled
- [ ] Race conditions checked (N/A)
- [x] Array bounds validated

### Security
- [x] Input validation present
- [x] No hardcoded secrets
- [x] SQL injection prevented
- [x] Authorization checks in place

### Performance
- [x] No N+1 queries
- [x] Memoization appropriate
- [x] No memory leaks
- [x] Reasonable complexity

### Testing
- [x] Unit tests present
- [x] Edge cases covered
- [ ] Integration tests needed
- [x] Mock external calls

### Maintainability
- [x] Naming is clear
- [x] Functions are focused
- [x] Code is DRY
- [ ] Consider extracting utility

### Comments
1. **SUGGESTION** - The `calculateTotal` function could be simplified using reduce instead of a loop. Not critical, but more idiomatic.

2. **SUGGESTION** - Add test case for zero-length arrays in the pagination logic.

### Questions
- Why was the async/await pattern chosen here instead of Promise chaining?

### Approved
✓ Ready to merge after addressing non-blocking suggestions
```

---

## Critical Anti-Patterns to Flag

| Pattern | Risk | Example | Fix |
|---------|------|---------|-----|
| No error handling | Data loss | `await fetch(url)` | Try/catch with logging |
| Shared mutable state | Race condition | `class X { list = [] }` | Immutable by default |
| God function | Unmaintainable | 500+ line function | Extract responsibilities |
| Callback hell | Unreadable | `.then().then().then()` | Async/await |
| Global state | Hidden dependencies | `window.globalUser` | Props/context |
| Swallowed exceptions | Hard to debug | `except: pass` | Log and re-raise |

---

## Automated Review Tools

**Python:**
```bash
# Linting
ruff check src/

# Type checking
pyright src/

# Security
bandit -r src/

# Complexity
radon cc src/ -a
```

**TypeScript:**
```bash
# Linting
eslint src/

# Type checking
tsc --noEmit

# Security
npm audit

# Unused code
ts-prune src/
```

---

## Code Review Checklist (Quick Version)

- [ ] Solves the stated problem
- [ ] No security vulnerabilities introduced
- [ ] Follows project style guide
- [ ] Tests are present and meaningful
- [ ] Performance is acceptable
- [ ] Error cases are handled
- [ ] No code duplication
- [ ] Comments explain "why", not "what"
- [ ] Functions are focused and testable
- [ ] Ready for production deployment
