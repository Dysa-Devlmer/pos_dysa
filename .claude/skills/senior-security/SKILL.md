# Senior Security Engineering

Enterprise-grade application security, threat modeling, and compliance framework for production systems.

## OWASP Top 10 (2021) Vulnerability Checklist

### A01:2021 - Broken Access Control

**Detection Patterns:**
```python
# BAD: Direct object reference without authorization
@app.get("/users/{user_id}")
async def get_user(user_id: int, current_user: User = Depends(get_current_user)):
    return db.query(User).filter(User.id == user_id).first()

# GOOD: Explicit authorization check
@app.get("/users/{user_id}")
async def get_user(user_id: int, current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user
```

**Prevention Checklist:**
- Implement role-based access control (RBAC) with explicit deny by default
- Use resource ownership verification before operations
- Implement attribute-based access control (ABAC) for complex scenarios
- Log all authorization failures with context
- Implement token-based session invalidation on logout

---

### A02:2021 - Cryptographic Failures

**Password Hashing - Correct Implementation:**
```python
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash

hasher = PasswordHasher(
    time_cost=2,           # 2 iterations
    memory_cost=65536,     # 64MB
    parallelism=4,         # 4 threads
    hash_len=32,
    salt_len=16
)

# Hashing
hashed = hasher.hash("user_password")

# Verification
try:
    hasher.verify(hashed, "user_password")
except InvalidHash:
    return HTTPException(status_code=401, detail="Invalid credentials")
```

**API Response Encryption:**
```python
from cryptography.fernet import Fernet

cipher = Fernet(key)

@app.get("/api/sensitive-data")
async def get_sensitive(current_user: User = Depends(get_current_user)):
    data = {"card": "4111-1111-1111-1111", "balance": 5000}
    encrypted = cipher.encrypt(json.dumps(data).encode())
    return {"payload": encrypted.decode()}
```

**Detection of Weak Crypto:**
```bash
# Search for hardcoded keys
grep -r "secret.*=" src/ | grep -v ".env"

# Check for plaintext storage
grep -r "password" src/models/ | grep -v "hash"

# Audit dependency versions
pip show cryptography pycryptodome
```

---

### A03:2021 - Injection

**SQL Injection Prevention (SQLAlchemy):**
```python
# BAD: String interpolation
query = f"SELECT * FROM users WHERE id = {user_id}"

# GOOD: Parameterized queries (SQLAlchemy handles automatically)
user = db.query(User).filter(User.id == user_id).first()

# For raw SQL, use bind parameters
result = db.execute(
    text("SELECT * FROM users WHERE email = :email"),
    {"email": user_email}
)
```

**NoSQL Injection Detection:**
```python
# BAD: Direct MongoDB filter
db.users.find({"username": request.form.get("username")})

# GOOD: Type validation first
from pydantic import EmailStr, Field

class UserQuery(BaseModel):
    username: str = Field(..., min_length=1, max_length=50, pattern="^[a-zA-Z0-9_]+$")

db.users.find({"username": query.username})
```

**Command Injection Prevention:**
```python
import subprocess

# BAD: Shell=True with user input
subprocess.run(f"convert {filename}", shell=True)

# GOOD: List format, no shell
subprocess.run(["convert", filename], shell=False, check=True)
```

**Code Scanning Pattern:**
```bash
# Find SQL concatenation
grep -r "f\".*SELECT\|f'.*SELECT" src/

# Find shell=True usage
grep -r "shell=True" src/

# Find eval/exec usage
grep -r "eval(\|exec(" src/
```

---

### A04:2021 - Insecure Design

**Threat Modeling Canvas:**
```
STRIDE Model Applied:
- Spoofing: Can attackers fake identity? (Implement MFA)
- Tampering: Can attackers modify data in transit? (Use TLS 1.3)
- Repudiation: Can users deny actions? (Implement audit logs)
- Information Disclosure: Can data be exposed? (Encrypt at rest)
- Denial of Service: Can service be degraded? (Rate limiting)
- Elevation of Privilege: Can users escalate? (RBAC enforcement)
```

**Secure Design Pattern - API Gateway:**
```python
from fastapi import FastAPI
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

app = FastAPI()

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# CORS - explicit whitelist
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://trusted-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization"],
    expose_headers=["X-Request-ID"],
    max_age=3600
)

# Rate limit decorator
@app.post("/api/login")
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest):
    # Implementation
    pass
```

---

### A05:2021 - Broken Authentication

**Secure JWT Implementation:**
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET")  # Min 32 characters
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise JWTError("Invalid token")
        return username
    except JWTError:
        return None
```

**MFA Implementation Pattern:**
```python
import pyotp

# Setup TOTP (Time-based One-Time Password)
@app.post("/auth/2fa/setup")
async def setup_2fa(user_id: int):
    secret = pyotp.random_base32()
    qr_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=f"user_{user_id}",
        issuer_name="MyApp"
    )
    return {"qr_uri": qr_uri, "secret": secret}

@app.post("/auth/2fa/verify")
async def verify_2fa(user_id: int, code: str, credentials: Credentials):
    user = db.get_user(user_id)
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code):
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    return create_access_token({"sub": user.username})
```

**Session Fixation Prevention:**
```python
# Regenerate session ID on successful login
@app.post("/auth/login")
async def login(credentials: LoginRequest, request: Request):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401)

    # Invalidate old sessions
    await session_manager.invalidate_user_sessions(user.id)

    # Create new session with secure flags
    access_token = create_access_token({"sub": user.username})
    return JSONResponse(
        content={"access_token": access_token},
        headers={
            "Set-Cookie": f"sessionid={access_token}; Secure; HttpOnly; SameSite=Strict; Path=/"
        }
    )
```

---

### A06:2021 - Sensitive Data Exposure

**Data Classification Framework:**
```
PUBLIC: Marketing materials, public APIs
INTERNAL: Employee records, internal documentation
CONFIDENTIAL: Customer data, API keys, passwords
RESTRICTED: Payment cards, PII, health records
```

**Secure Configuration:**
```python
# .env template with encrypted values
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://app.example.com
LOG_LEVEL=INFO  # Never DEBUG in production
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
CSRF_COOKIE_SECURE=True
```

**PII Redaction Logging:**
```python
import logging
import re

class SensitiveDataFilter(logging.Filter):
    PATTERNS = {
        "email": r"[\w\.-]+@[\w\.-]+\.\w+",
        "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b"
    }

    def filter(self, record):
        message = record.getMessage()
        for pattern_type, pattern in self.PATTERNS.items():
            message = re.sub(pattern, f"[REDACTED-{pattern_type.upper()}]", message)
        record.msg = message
        return True

logging.getLogger().addFilter(SensitiveDataFilter())
```

---

### A07:2021 - Identification and Authentication Failures

**Detailed Audit Logging:**
```python
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)

@app.post("/api/login")
async def login(credentials: LoginRequest, request: Request):
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host

    try:
        user = db.query(User).filter(User.username == credentials.username).first()
        if not user or not pwd_context.verify(credentials.password, user.hashed_password):
            logger.warning(
                "login_failure",
                username=credentials.username,
                ip_address=ip_address,
                user_agent=user_agent,
                reason="invalid_credentials"
            )
            # Add exponential backoff
            await rate_limiter.add_failed_attempt(ip_address)
            raise HTTPException(status_code=401)

        logger.info(
            "login_success",
            user_id=user.id,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        return create_access_token({"sub": user.username})
    except Exception as e:
        logger.error("login_error", error=str(e), ip_address=ip_address)
        raise
```

---

### A08:2021 - Software and Data Integrity Failures

**Dependency Audit Workflow:**
```bash
# Python: Check for vulnerabilities
pip-audit
python -m pip install --upgrade pip pip-audit

# Generate requirements with hashes
pip freeze > requirements.txt
pip install --require-hashes -r requirements.txt

# Scan with Snyk
snyk test --severity-threshold=high

# SBOM (Software Bill of Materials)
cyclonedx-py -o sbom.json
```

**Supply Chain Security:**
```python
# Verify package integrity
import hashlib

def verify_package_hash(package_path: str, expected_hash: str) -> bool:
    sha256 = hashlib.sha256()
    with open(package_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest() == expected_hash
```

**Build Artifact Signing:**
```bash
# Sign Docker image
cosign sign --key cosign.key gcr.io/project/image:tag

# Verify signature
cosign verify --key cosign.pub gcr.io/project/image:tag
```

---

### A09:2021 - Logging and Monitoring Failures

**Production Logging Setup:**
```python
import structlog
from pythonjsonlogger import jsonlogger

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

logger = structlog.get_logger(__name__)

# Event logging
logger.info(
    "user_action",
    user_id=user.id,
    action="DELETE_ACCOUNT",
    timestamp=datetime.utcnow(),
    ip_address=request.client.host
)
```

**Security Monitoring Alerts:**
```python
# Alert thresholds
ALERTS = {
    "failed_logins": {"threshold": 5, "window_minutes": 5},
    "api_rate_limit": {"threshold": 1000, "window_minutes": 1},
    "error_spike": {"threshold": 50, "window_minutes": 5},
    "suspicious_api_calls": {"threshold": 10, "window_minutes": 1}
}
```

---

### A10:2021 - Server-Side Request Forgery (SSRF)

**URL Validation for External Requests:**
```python
from urllib.parse import urlparse
import ipaddress

BLOCKED_HOSTS = {"169.254.169.254", "localhost", "127.0.0.1"}

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname

        # Block private IPs
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback:
            return False

        # Block metadata service
        if hostname in BLOCKED_HOSTS:
            return False

        # Only allow HTTP/HTTPS
        if parsed.scheme not in ["http", "https"]:
            return False

        return True
    except (ValueError, TypeError):
        return False

@app.post("/api/fetch-external")
async def fetch_external(request_body: FetchRequest):
    if not is_safe_url(request_body.url):
        raise HTTPException(status_code=400, detail="Invalid URL")

    async with aiohttp.ClientSession() as session:
        async with session.get(request_body.url, timeout=5) as resp:
            return await resp.json()
```

---

## API Security Checklist

### Input Validation
- Implement whitelist validation, not blacklist
- Validate data type, length, format, and range
- Use Pydantic for automatic validation in FastAPI
- Reject unexpected fields with `extra="forbid"`

### Rate Limiting
```python
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/login")
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest):
    pass

@app.get("/api/users")
@limiter.limit("100/hour")
async def list_users():
    pass
```

### Output Encoding
```python
from html import escape
from json import dumps

# HTML encoding for templates
safe_username = escape(user.username)

# JSON encoding
response = JSONResponse({"data": model.dict()})
```

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://trusted.com"],  # Explicit, no wildcards
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"]
)
```

### CSP Headers
```python
@app.middleware("http")
async def add_csp_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.example.com"
    )
    return response
```

---

## Secret Management

### Environment Variables (.env)
```bash
# .env.example (commit this)
DATABASE_URL=postgresql://user:password@localhost/dbname
JWT_SECRET=<use_strong_random_value>
API_KEY=<your_api_key>

# .env (never commit)
```

### Vault Integration (HashiCorp Vault)
```python
import hvac

client = hvac.Client(
    url=os.getenv("VAULT_ADDR"),
    token=os.getenv("VAULT_TOKEN")
)

def get_secret(path: str, key: str):
    response = client.secrets.kv.read_secret_version(path)
    return response['data']['data'][key]

db_password = get_secret("database/prod", "password")
```

### Secret Rotation
```bash
# Generate new API key
NEW_KEY=$(openssl rand -hex 32)

# Update in vault
vault kv put secret/api API_KEY=$NEW_KEY

# Invalidate old tokens
DELETE FROM api_tokens WHERE created_at < NOW() - INTERVAL '90 days'
```

### Git Secrets Hook
```bash
# Install
brew install git-secrets

# Configure patterns
git secrets --add 'password\s*=\s*["\047][^"]*["\047]'
git secrets --add 'api[_-]?key\s*=\s*["\047][^"]*["\047]'
git secrets --install

# Scan all history
git secrets --scan
```

---

## Infrastructure Security

### Docker Security
```dockerfile
# Use distroless base images
FROM python:3.11-slim AS base

# Non-root user
RUN useradd -m -u 1000 appuser

# Copy application
COPY --chown=appuser:appuser . /app
WORKDIR /app

# Run as non-root
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Multi-stage build
FROM base AS runtime
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0"]
```

### Network Policies (Kubernetes)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

---

## Incident Response Playbook

### 1. Detection & Containment
```
[Intrusion Detected]
├─ Alert triggered: Failed login spike
├─ Immediately: Isolate affected account
├─ Immediately: Revoke all active sessions
├─ Within 1 min: Notify security team
└─ Within 5 min: Begin evidence collection
```

### 2. Investigation
```bash
# Collect logs
docker logs api-container > incident.log

# Query audit table
SELECT * FROM audit_log
WHERE user_id = 123
  AND action IN ('DELETE_ACCOUNT', 'CHANGE_PASSWORD')
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

# Check API keys
SELECT id, user_id, created_at, last_used
FROM api_keys
WHERE user_id = 123;
```

### 3. Eradication
```
- Reset compromised credentials
- Force password reset for affected users
- Revoke all API keys
- Update security group rules
- Patch vulnerability
```

### 4. Recovery
```
- Restore from clean backup
- Reactivate monitoring alerts
- Update incident log
- Schedule post-mortem
```

---

## GDPR Compliance Quick Reference

**Data Handling Requirements:**
- Explicit consent for data collection
- Privacy notice at point of collection
- Right to access (within 30 days)
- Right to deletion ("right to be forgotten")
- Data portability in machine-readable format
- Breach notification within 72 hours

**Implementation Checklist:**
```python
@app.get("/api/users/{user_id}/data")
async def export_user_data(user_id: int, current_user: User = Depends(get_current_user)):
    """GDPR: Right to data portability"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403)

    user_data = db.query(User).filter(User.id == user_id).first()
    return {"data": user_data.dict(exclude={"password_hash"})}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, current_user: User = Depends(get_current_user)):
    """GDPR: Right to erasure"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403)

    db.query(User).filter(User.id == user_id).delete()
    db.commit()

    logger.info("user_deleted", user_id=user_id, reason="gdpr_request")
    return {"status": "deleted"}
```

---

## Security Code Review Patterns

**SQL Injection Detection:**
```bash
grep -rn "query(\|execute(" src/ | grep -v "text(" | grep -v "filter("
```

**XSS Detection (Frontend):**
```bash
grep -rn "innerHTML\|dangerouslySetInnerHTML" frontend/src/
```

**Hardcoded Secrets:**
```bash
grep -rn "password.*=\|secret.*=\|api.key.*=" src/ | grep -v ".env"
grep -rn "Bearer\|token:" . --include="*.py" --include="*.js"
```

---

## Penetration Testing Checklist

- [ ] Test default credentials on all systems
- [ ] Attempt SQL injection on all input fields
- [ ] Test XSS payloads: `<script>alert('xss')</script>`
- [ ] Test CSRF by crafting cross-origin requests
- [ ] Enumerate API endpoints: `/api/admin`, `/api/debug`
- [ ] Test authentication bypass: null bytes, case sensitivity
- [ ] Verify rate limiting is enforced
- [ ] Check for information disclosure in error messages
- [ ] Test privilege escalation by modifying user IDs
- [ ] Analyze API responses for sensitive data leakage
