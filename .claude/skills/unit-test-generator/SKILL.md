# Unit Test Generator Skill

Professional test generation following enterprise standards. Covers unit testing patterns, fixtures, mocking strategies, coverage targets, and TDD workflows.

## Test Pyramid Architecture

Optimal testing distribution by volume:

```
        /\
       /  \  E2E & Manual (10%)
      /____\

     /      \
    /  API   \  Integration (20%)
   /________\

  /          \
 /   Unit     \ Unit Tests (70%)
/______________\
```

**Unit Tests**: Fast, isolated, test single function
**Integration Tests**: Medium speed, test modules together
**E2E Tests**: Slow, test complete user flows

## AAA Testing Model (Arrange-Act-Assert)

All tests follow this structure for clarity and maintainability.

### Python (pytest)

```python
import pytest
from src.calculator import Calculator

class TestCalculator:
    """Calculate operations with edge case handling."""

    def test_addition_positive_numbers(self):
        # ARRANGE: Setup test data and objects
        calculator = Calculator()
        a, b = 2, 3

        # ACT: Perform the action being tested
        result = calculator.add(a, b)

        # ASSERT: Verify the result
        assert result == 5

    def test_addition_with_negative_numbers(self):
        # ARRANGE
        calculator = Calculator()
        a, b = -2, 3

        # ACT
        result = calculator.add(a, b)

        # ASSERT
        assert result == 1

    def test_division_by_zero_raises_error(self):
        # ARRANGE
        calculator = Calculator()

        # ACT & ASSERT (combined for error testing)
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            calculator.divide(10, 0)
```

### TypeScript (Jest/Vitest)

```typescript
import { Calculator } from "./calculator";

describe("Calculator", () => {
  let calculator: Calculator;

  beforeEach(() => {
    // ARRANGE: Setup before each test
    calculator = new Calculator();
  });

  test("should add two positive numbers correctly", () => {
    // ARRANGE
    const a = 2;
    const b = 3;

    // ACT
    const result = calculator.add(a, b);

    // ASSERT
    expect(result).toBe(5);
  });

  test("should add positive and negative numbers", () => {
    // ARRANGE
    const a = -2;
    const b = 3;

    // ACT
    const result = calculator.add(a, b);

    // ASSERT
    expect(result).toBe(1);
  });

  test("should throw error when dividing by zero", () => {
    // ARRANGE & ACT & ASSERT
    expect(() => calculator.divide(10, 0)).toThrow("Cannot divide by zero");
  });
});
```

## Parametrized Tests

Run same test with multiple input sets efficiently.

### Python (pytest.mark.parametrize)

```python
@pytest.mark.parametrize("input_a,input_b,expected", [
    (2, 3, 5),           # Positive numbers
    (-2, 3, 1),          # Mixed signs
    (0, 5, 5),           # Zero
    (100, 200, 300),     # Large numbers
])
def test_addition_multiple_cases(input_a, input_b, expected):
    calculator = Calculator()
    assert calculator.add(input_a, input_b) == expected


@pytest.mark.parametrize("value,expected_type", [
    ("hello", str),
    (123, int),
    (45.67, float),
    (True, bool),
    (None, type(None)),
])
def test_type_detection(value, expected_type):
    assert type(value) == expected_type
```

### TypeScript (test.each)

```typescript
describe.each([
  [2, 3, 5],
  [-2, 3, 1],
  [0, 5, 5],
  [100, 200, 300],
])("Calculator.add(%i, %i) should return %i", (a, b, expected) => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  it("addition test", () => {
    expect(calculator.add(a, b)).toBe(expected);
  });
});
```

## Fixtures and Setup/Teardown

### Python Fixtures

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

@pytest.fixture
def test_database():
    """Create and teardown test database for each test."""
    # SETUP: Create test database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    session = Session(engine)
    yield session  # Test runs here with this session

    # TEARDOWN: Cleanup after test
    session.close()
    engine.dispose()


@pytest.fixture
def sample_user():
    """Provide test user data."""
    return User(
        id=1,
        name="John Doe",
        email="john@example.com",
        is_active=True
    )


class TestUserRepository:
    def test_save_user(self, test_database, sample_user):
        # test_database and sample_user fixtures injected
        repository = UserRepository(test_database)
        repository.save(sample_user)

        result = test_database.query(User).filter_by(id=1).first()
        assert result.email == "john@example.com"
```

### TypeScript Fixtures (Jest)

```typescript
describe("UserRepository", () => {
  let repository: UserRepository;
  let mockDatabase: jest.Mocked<Database>;

  beforeEach(() => {
    // SETUP: Initialize mocks and dependencies
    mockDatabase = {
      query: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    repository = new UserRepository(mockDatabase);
  });

  afterEach(() => {
    // TEARDOWN: Clear mocks
    jest.clearAllMocks();
  });

  test("should save user to database", () => {
    const user = { id: 1, name: "John" };
    repository.save(user);

    expect(mockDatabase.save).toHaveBeenCalledWith(user);
  });
});
```

## Mocking and Spies

### Python Mocking

```python
from unittest.mock import Mock, patch, MagicMock
import pytest

class TestPaymentService:
    @patch("src.payment_service.payment_gateway")
    def test_charge_card_success(self, mock_gateway):
        # Setup mock return value
        mock_gateway.process_charge.return_value = {
            "success": True,
            "transaction_id": "tx-123"
        }

        service = PaymentService()
        result = service.charge_card("4111111111111111", 99.99)

        # Verify the mock was called correctly
        mock_gateway.process_charge.assert_called_once_with(
            "4111111111111111",
            99.99
        )

        assert result["transaction_id"] == "tx-123"


class TestEmailService:
    def test_send_email_with_mock(self):
        # Create a mock object
        mock_smtp = Mock()
        mock_smtp.send_message = Mock(return_value=None)

        service = EmailService(smtp=mock_smtp)
        service.send("user@example.com", "Hello", "Message body")

        # Verify mock interactions
        assert mock_smtp.send_message.called
        assert mock_smtp.send_message.call_count == 1

    @patch.object(EmailService, "send", return_value=True)
    def test_with_method_patch(self, mock_send):
        service = EmailService()
        result = service.send("user@example.com", "Hello", "Body")

        assert result is True
        mock_send.assert_called_once()
```

### TypeScript Mocking (Jest)

```typescript
import { PaymentService } from "./payment-service";
import { PaymentGateway } from "./payment-gateway";

jest.mock("./payment-gateway");

describe("PaymentService", () => {
  let service: PaymentService;
  let mockGateway: jest.Mocked<PaymentGateway>;

  beforeEach(() => {
    // Create mock implementation
    mockGateway = {
      processCharge: jest.fn().mockResolvedValue({
        success: true,
        transactionId: "tx-123"
      }),
      refund: jest.fn(),
    } as any;

    service = new PaymentService(mockGateway);
  });

  test("should process charge and return transaction ID", async () => {
    // ACT
    const result = await service.chargeCard("4111111111111111", 99.99);

    // ASSERT
    expect(result.transactionId).toBe("tx-123");
    expect(mockGateway.processCharge).toHaveBeenCalledWith(
      "4111111111111111",
      99.99
    );
  });

  test("should handle payment gateway errors", async () => {
    // ARRANGE: Mock error scenario
    mockGateway.processCharge.mockRejectedValue(
      new Error("Gateway timeout")
    );

    // ACT & ASSERT
    await expect(
      service.chargeCard("4111111111111111", 99.99)
    ).rejects.toThrow("Gateway timeout");
  });

  test("spy on existing method", () => {
    const spy = jest.spyOn(service, "validateCard");
    spy.mockReturnValue(true);

    service.validateCard("4111111111111111");

    expect(spy).toHaveBeenCalled();
    spy.mockRestore(); // Clean up
  });
});
```

## Edge Cases and Boundary Testing

Always test extreme and unusual inputs.

```python
class TestEmailValidator:
    """Test email validation with edge cases."""

    @pytest.mark.parametrize("email,valid", [
        # Valid emails
        ("simple@example.com", True),
        ("user+tag@example.co.uk", True),
        ("123@example.com", True),

        # Invalid - no @ symbol
        ("invalid.email.com", False),

        # Invalid - missing domain
        ("user@", False),

        # Invalid - empty string
        ("", False),

        # Invalid - only whitespace
        ("   ", False),

        # Invalid - SQL injection attempt
        ("' OR '1'='1'@example.com", False),

        # Invalid - XSS attempt
        ("<script>alert('xss')</script>@example.com", False),

        # Edge case - maximum length
        ("a" * 240 + "@example.com", False),  # Exceeds typical limit

        # Edge case - Unicode characters
        ("user@例え.jp", True),

        # Edge case - subdomain with hyphens
        ("user@mail-server.example.com", True),

        # Edge case - numbers in domain
        ("user@123.456.com", True),
    ])
    def test_email_validation(self, email, valid):
        validator = EmailValidator()
        assert validator.is_valid(email) == valid


class TestNumberParser:
    """Test number parsing edge cases."""

    @pytest.mark.parametrize("input_str,expected,should_error", [
        # Valid cases
        ("123", 123, False),
        ("0", 0, False),
        ("-456", -456, False),
        ("3.14", 3.14, False),

        # Edge cases
        ("", None, True),
        ("   ", None, True),
        ("abc", None, True),
        ("12.34.56", None, True),
        ("1e10", 10000000000, False),  # Scientific notation
        ("+999", 999, False),
        ("0x10", 16, False),  # Hex
    ])
    def test_parse_number(self, input_str, expected, should_error):
        parser = NumberParser()

        if should_error:
            with pytest.raises(ValueError):
                parser.parse(input_str)
        else:
            assert parser.parse(input_str) == expected
```

## Integration Testing

Tests that verify multiple components working together.

### Python Integration Test

```python
import pytest
from httpx import AsyncClient
from fastapi import FastAPI

@pytest.fixture
async def client():
    """Create test client with real app instance."""
    from src.main import app
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


class TestUserAPI:
    @pytest.mark.asyncio
    async def test_create_and_retrieve_user(self, client, test_database):
        """Integration: Create user via API, then retrieve it."""

        # ARRANGE
        user_data = {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "secure_password_123"
        }

        # ACT: Create user
        response = await client.post("/api/users", json=user_data)
        assert response.status_code == 201
        created_user = response.json()

        # ACT: Retrieve user
        response = await client.get(f"/api/users/{created_user['id']}")

        # ASSERT
        assert response.status_code == 200
        retrieved_user = response.json()
        assert retrieved_user["email"] == "jane@example.com"
        assert "password" not in retrieved_user  # Sensitive data stripped
```

### TypeScript Integration Test

```typescript
import request from "supertest";
import { app } from "./app";

describe("User API Integration", () => {
  let userId: number;

  test("POST /api/users creates new user", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "secure_password_123"
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    userId = response.body.id;
  });

  test("GET /api/users/:id retrieves created user", async () => {
    const response = await request(app).get(`/api/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe("jane@example.com");
    expect(response.body).not.toHaveProperty("password");
  });

  test("PUT /api/users/:id updates user", async () => {
    const response = await request(app)
      .put(`/api/users/${userId}`)
      .send({ name: "Jane Smith" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Jane Smith");
  });

  test("DELETE /api/users/:id removes user", async () => {
    const deleteResponse = await request(app).delete(`/api/users/${userId}`);
    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app).get(`/api/users/${userId}`);
    expect(getResponse.status).toBe(404);
  });
});
```

## Test Coverage Targets

### Coverage Metrics

```
Coverage = (Statements executed / Total statements) × 100
```

**Target Breakdown**:
- **Overall**: 80%+ coverage
- **Critical paths** (auth, payments): 95%+
- **Utilities**: 70%+
- **UI components**: 60%+ (harder to test)

### Coverage Tools

```bash
# Python: pytest-cov
pytest --cov=src/ --cov-report=html

# JavaScript: Jest coverage
jest --coverage --coverage-directory=coverage

# Coverage analysis
coverage report --fail-under=80

# Generate badges
coverage-badge -o coverage.svg
```

### Analyzing Coverage Gaps

```python
# coverage.py report shows lines not covered
# Example output:
# src/payment_service.py    87%    line 45, 67-69 (not covered)

# Always investigate uncovered lines:
# 1. Is it dead code? Remove it
# 2. Is it error path? Add test for error scenario
# 3. Is it untestable? Refactor for testability
```

## TDD Workflow (Red-Green-Refactor)

### 1. Red: Write Failing Test

```python
# Write test BEFORE implementation
def test_user_can_update_profile(self):
    user = User(name="John", email="john@example.com")

    user.update_profile(name="Jane", email="jane@example.com")

    assert user.name == "Jane"
    assert user.email == "jane@example.com"
```

Running this test FAILS because `update_profile` doesn't exist.

### 2. Green: Minimal Implementation

```python
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    # Minimal implementation to pass test
    def update_profile(self, name: str, email: str):
        self.name = name
        self.email = email
```

Now the test PASSES.

### 3. Refactor: Improve Code Quality

```python
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def update_profile(self, **updates):
        """Update profile with validation."""
        if "name" in updates:
            if len(updates["name"]) < 1:
                raise ValueError("Name cannot be empty")
            self.name = updates["name"]

        if "email" in updates:
            if "@" not in updates["email"]:
                raise ValueError("Invalid email")
            self.email = updates["email"]
```

Test still PASSES after refactoring.

### TDD Example: Complete Cycle

```python
# Step 1: RED - Test for email validation (will fail)
def test_user_validation_rejects_invalid_email(self):
    with pytest.raises(ValueError, match="Invalid email"):
        User(name="John", email="not-an-email")

# Step 2: GREEN - Minimal implementation
class User:
    def __init__(self, name: str, email: str):
        if "@" not in email:
            raise ValueError("Invalid email")
        self.name = name
        self.email = email

# Step 3: REFACTOR - Extract validation
class EmailValidator:
    @staticmethod
    def validate(email: str) -> bool:
        return "@" in email and "." in email.split("@")[1]

class User:
    def __init__(self, name: str, email: str):
        if not EmailValidator.validate(email):
            raise ValueError("Invalid email")
        self.name = name
        self.email = email

# Test still passes, code is better
```

## Testing Anti-Patterns

### DON'T: Test Implementation Details

```python
# BAD: Testing internal implementation
def test_user_stores_password_hash(self):
    user = User("john", "secure_password")
    assert len(user.password_hash) == 60  # Bcrypt hash length
    assert not user.password_hash == "secure_password"

# GOOD: Test behavior, not implementation
def test_user_password_is_not_stored_plaintext(self):
    user = User("john", "secure_password")
    assert not user.verify_password("wrong_password")
    assert user.verify_password("secure_password")
```

### DON'T: Have Tests with Multiple Assertions on Different Concerns

```python
# BAD: Multiple assertions on different things
def test_user_creation(self):
    user = User("john", "john@example.com")
    assert user.name == "john"           # Concern: name storage
    assert user.email == "john@example.com"  # Concern: email storage
    assert user.created_at is not None   # Concern: timestamp
    assert user.is_active == True        # Concern: active flag

# GOOD: Separate tests for each concern
def test_user_stores_name(self):
    user = User("john", "john@example.com")
    assert user.name == "john"

def test_user_stores_email(self):
    user = User("john", "john@example.com")
    assert user.email == "john@example.com"

def test_user_created_with_timestamp(self):
    user = User("john", "john@example.com")
    assert user.created_at is not None

def test_user_created_as_active(self):
    user = User("john", "john@example.com")
    assert user.is_active is True
```

### DON'T: Use Test Data Builders Incorrectly

```python
# BAD: Magic numbers everywhere
def test_order_calculation(self):
    order = Order(100, 10, 0.1, "CA", 2)
    assert order.total == 123.4  # What do these numbers mean?

# GOOD: Use descriptive builder
class OrderBuilder:
    def __init__(self):
        self.subtotal = 100
        self.tax_rate = 0.1
        self.shipping_cost = 10
        self.state = "CA"
        self.quantity = 2

    def with_subtotal(self, subtotal):
        self.subtotal = subtotal
        return self

    def build(self):
        return Order(
            self.subtotal,
            self.shipping_cost,
            self.tax_rate,
            self.state,
            self.quantity
        )

def test_order_calculation(self):
    order = (
        OrderBuilder()
        .with_subtotal(100)
        .build()
    )
    assert order.total == 123.4  # Clear intent
```

### DON'T: Skip Testing Error Cases

```python
# BAD: Only happy path
def test_login(self):
    user = User.login("john@example.com", "password123")
    assert user.is_authenticated

# GOOD: Test error cases
def test_login_with_correct_credentials(self):
    user = User.login("john@example.com", "password123")
    assert user.is_authenticated

def test_login_with_wrong_password_fails(self):
    with pytest.raises(AuthenticationError):
        User.login("john@example.com", "wrong_password")

def test_login_with_nonexistent_user_fails(self):
    with pytest.raises(UserNotFoundError):
        User.login("nonexistent@example.com", "password123")

def test_login_with_empty_credentials_fails(self):
    with pytest.raises(ValueError):
        User.login("", "")
```

## Test Organization Best Practices

### Arrange Tests Logically

```python
# Group tests by feature
class TestUserAuthentication:
    def test_login_with_valid_credentials(self): pass
    def test_login_with_invalid_credentials(self): pass
    def test_logout_clears_session(self): pass

class TestUserProfile:
    def test_update_profile_name(self): pass
    def test_update_profile_email(self): pass
    def test_profile_validation(self): pass

# Use descriptive names
def test_user_can_login_with_email_and_password(self): pass
def test_login_fails_with_wrong_password(self): pass
def test_login_fails_if_account_disabled(self): pass
```

### Keep Tests DRY

```python
# Use fixtures for common setup
@pytest.fixture
def authenticated_user(test_database):
    user = User(name="John", email="john@example.com")
    test_database.add(user)
    return user

class TestUserOperations:
    def test_user_can_access_profile(self, authenticated_user):
        assert authenticated_user.email == "john@example.com"

    def test_user_can_update_profile(self, authenticated_user):
        authenticated_user.update_profile(name="Jane")
        assert authenticated_user.name == "Jane"
```

---

**Last Updated**: 2026-04-07
**Testing Standards Version**: 3.0
**Supported Frameworks**: pytest, Jest, Vitest
