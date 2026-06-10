# AI Interview Platform - Security & Performance Fixes Prompt

## Context
I have an AI Interview Platform (FastAPI backend + React frontend) that I'm deploying to Render free tier (512MB RAM, 0.5 CPU). Before deploying to GitHub and production, I need to fix critical security and performance issues.

**Project Structure:**
- Backend: FastAPI + SQLAlchemy + PostgreSQL (Neon)
- Frontend: React 19 + Vite + TypeScript
- Key features: Auth (JWT), Vision (WebSocket), Speech (Whisper), LLM Evaluation (Groq)

---

## CRITICAL TASKS (Do First - Security Blockers)

### Task 1: Fix Exposed Credentials
**What to do:**
1. Create a new `.env.example` file showing required variables without real secrets
2. Update backend `.gitignore` to include `.env`, `.env.local`, `*.key`, `ai_interview.db`
3. Generate new credentials:
   - New GROQ_API_KEY from Groq console
   - New PostgreSQL password
   - New 32-character SECRET_KEY for JWT
4. Ensure all database/API key references use environment variables only
5. Remove `.env` from git history if it was already committed

**Files to modify:**
- `backend/.gitignore` - Add `.env`, `.env.local`, credentials
- `backend/.env.example` - Create template
- `backend/auth/security.py` - Ensure SECRET_KEY fails loudly if missing
- `backend/main.py` - Ensure all config from env vars

**Example `.env.example`:**
```
SECRET_KEY=your-32-char-random-key-here
DATABASE_URL=postgresql://user:password@host/dbname
GROQ_API_KEY=your-groq-api-key-here
ENVIRONMENT=production
```

---

### Task 2: Fix CORS Configuration
**What to do:**
1. Replace hardcoded localhost origins with environment-based configuration
2. Restrict allowed methods to only `GET, POST, PUT, DELETE`
3. Restrict allowed headers to specific list
4. Support both development and production domains
5. Add your Render frontend domain (`https://your-app.onrender.com`)

**File to modify:** `backend/main.py`

**Changes needed:**
```python
# Before (insecure):
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    # ...
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# After (secure):
import os
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if ENVIRONMENT == "production":
    allowed_origins = [FRONTEND_URL]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

### Task 3: Authenticate WebSocket Connections
**What to do:**
1. Add JWT validation to the `/api/vision/ws` WebSocket endpoint
2. Extract and verify JWT token from query params or headers
3. Reject unauthenticated connections

**File to modify:** `backend/api/vision.py`

**Changes needed:**
- Import JWT validation from `auth/security.py`
- Before `await websocket.accept()`, verify the token
- Raise `WebSocketDisconnect` if token is invalid

**Example:**
```python
from fastapi import WebSocketException
from jose import JWTError, jwt
from auth.security import SECRET_KEY, ALGORITHM

@router.websocket("/ws")
async def vision_websocket(websocket: WebSocket):
    # Extract token from query parameter
    token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    await websocket.accept()
    # ... rest of code
```

---

### Task 4: Prevent Prompt Injection in LLM Calls
**What to do:**
1. Sanitize user input before adding to LLM prompts
2. Use structured prompts that separate system instructions from user data
3. Add input validation for `request.topic` and `request.transcript`

**File to modify:** `backend/api/evaluation.py`

**Changes needed:**
```python
# Add validation helper
def sanitize_input(text: str, max_length: int = 2000) -> str:
    """Remove potentially harmful characters and enforce length limits."""
    if not text or not isinstance(text, str):
        return ""
    text = text.strip()[:max_length]
    # Remove newlines that could break prompt structure
    text = text.replace('\n', ' ').replace('\r', '')
    return text

# Update endpoint to use sanitized input:
@router.post("/analyze")
async def analyze_interview(
    request: EvaluationRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    transcript = sanitize_input(request.transcript, 5000)
    question = sanitize_input(request.question, 1000)
    
    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    
    # Use structured prompt with clear delimiters
    prompt = f"""You are an expert AI technical interviewer. Evaluate the following candidate's interview response.

<QUESTION>{question}</QUESTION>
<TRANSCRIPT>{transcript}</TRANSCRIPT>

Provide your evaluation strictly as a JSON object...
"""
    # ... rest of code
```

---

### Task 5: Fix JWT Secret Key Handling
**What to do:**
1. Make SECRET_KEY required (fail on startup if missing)
2. Generate a strong default for development only
3. Add validation on app startup

**File to modify:** `backend/auth/security.py`

**Changes needed:**
```python
import secrets
import os

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("ENVIRONMENT") == "production":
        raise ValueError("SECRET_KEY must be set in production!")
    # Generate random key for development
    SECRET_KEY = secrets.token_urlsafe(32)
    print("WARNING: Using generated SECRET_KEY for development. Set SECRET_KEY env var for production.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Changed from 7 days to 1 hour
```

---

### Task 6: Add Input Validation & File Size Limits
**What to do:**
1. Set maximum file size for audio uploads (10MB)
2. Validate MIME type, not just extension
3. Add input constraints to Pydantic models

**File to modify:** `backend/api/speech.py`

**Changes needed:**
```python
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size: 10MB"
        )
    
    # Validate file type
    if not file.filename or not file.filename.endswith(('.wav', '.mp3', '.m4a', '.webm', '.ogg')):
        raise HTTPException(status_code=400, detail="Invalid audio file format.")
    
    # Check MIME type
    if file.content_type not in ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg']:
        raise HTTPException(status_code=400, detail="Invalid MIME type.")
    
    # ... rest of code
```

---

## HIGH PRIORITY TASKS (Performance & Production Readiness)

### Task 7: Add Rate Limiting
**What to do:**
1. Install `slowapi` package
2. Apply rate limiting to all API endpoints (10 req/min per user)
3. Especially important for expensive LLM calls

**Installation:**
```
pip install slowapi
```

**File to modify:** `backend/main.py`

**Add at top:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add to routes:
@router.post("/transcribe")
@limiter.limit("10/minute")
async def transcribe_audio(request: Request, file: UploadFile = File(...)):
    # ...
```

---

### Task 8: Fix Production Server Settings
**What to do:**
1. Disable `reload=True` in production
2. Remove debug mode
3. Add proper logging configuration

**File to modify:** `backend/main.py`

**Changes needed:**
```python
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    environment = os.getenv("ENVIRONMENT", "development")
    reload_enabled = environment == "development"
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=reload_enabled,
        log_level="info"
    )
```

---

### Task 9: Configure Database Connection Pooling
**What to do:**
1. Add proper connection pool settings for PostgreSQL
2. Set appropriate pool size for free tier (512MB)
3. Add echo=False for production

**File to modify:** `backend/database/db.py`

**Changes needed:**
```python
import os

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ai_interview.db")

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

# Add connection pooling for production
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connection before using
    echo=os.getenv("ENVIRONMENT") == "development"
)
```

---

### Task 10: Add Response Compression
**What to do:**
1. Add GZipMiddleware to compress all responses
2. Reduces bandwidth usage on free tier

**File to modify:** `backend/main.py`

**Add after other middleware:**
```python
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

---

### Task 11: Add Timeout to External API Calls
**What to do:**
1. Add 15-second timeout to all Groq API calls
2. Add fallback responses if timeout occurs

**Files to modify:** `backend/api/evaluation.py`, `backend/api/speech.py`

**Changes needed:**
```python
from groq import Groq
import httpx

# Configure timeout
timeout = httpx.Timeout(15.0)
client = Groq(api_key=api_key, timeout=timeout)

# Wrap calls in try-except with fallback
try:
    response = client.chat.completions.create(...)
except Exception as e:
    logger.error(f"LLM call failed: {e}")
    # Return sensible fallback
    return {"question": "Could you tell me more about this topic?"}
```

---

### Task 12: Improve Frontend Build Optimization
**What to do:**
1. Ensure production build is optimized
2. Add code splitting and lazy loading
3. Configure proper minification

**File to verify:** `frontend/vite.config.ts`

**Ensure it includes:**
```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

---

### Task 13: Add Database Query Optimization
**What to do:**
1. Fix potential N+1 queries
2. Add eager loading where needed
3. Use `.options(selectinload(...))` for related data

**File to modify:** `backend/api/analytics.py`, `backend/api/evaluation.py`

**Example:**
```python
from sqlalchemy.orm import selectinload

# Before (potential N+1):
user = db.query(User).filter(User.email == email).first()

# After (eager load):
user = db.query(User).options(selectinload(User.analytics)).filter(User.email == email).first()
```

---

### Task 14: Create Production Dockerfile
**What to do:**
1. Create Dockerfile for production deployment
2. Optimize for small size and security

**File to create:** `backend/Dockerfile`

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### Task 15: Add Environment Variables to Render
**What to do:**
1. Set these environment variables in Render dashboard
2. Never commit them to code

**Variables to set in Render:**
```
ENVIRONMENT=production
SECRET_KEY=<32-char-random-string>
DATABASE_URL=postgresql://...
GROQ_API_KEY=gsk_...
FRONTEND_URL=https://your-frontend.onrender.com
PORT=8000
```

---

### Task 16: Add Health Check & Logging
**What to do:**
1. Improve health check to verify database
2. Add proper structured logging

**File to modify:** `backend/main.py`

```python
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute("SELECT 1")
        return {
            "status": "healthy",
            "service": "Core API",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

---

## OPTIONAL (Nice-to-Have) TASKS

### Task 17: Switch Whisper to Groq API (Reduce RAM Usage)
- Instead of loading Whisper locally (500MB RAM), use Groq's Whisper API
- Frees up RAM for handling more concurrent requests

### Task 18: Add Caching Layer
- Cache common interview questions
- Use simple in-memory cache or Redis
- Reduces API calls to Groq

### Task 19: Add Input Validation Middleware
- Centralized request validation
- Content-Type checking
- Request size limits

---

## DEPLOYMENT CHECKLIST

Before pushing to GitHub:
- [ ] Rotate GROQ_API_KEY and database password
- [ ] Remove `.env` from git history
- [ ] Add `.env` to `.gitignore`
- [ ] Create `.env.example`
- [ ] Verify all secrets use environment variables
- [ ] Test with environment variables set

Before deploying to Render:
- [ ] Set all environment variables in Render dashboard
- [ ] Configure health check endpoint
- [ ] Set up proper logging
- [ ] Test CORS with production domain
- [ ] Monitor first deployment logs
- [ ] Set up error tracking (Sentry or similar)

---

## Quick Implementation Order

1. **Task 1** - Fix credentials (MUST DO FIRST)
2. **Task 2** - Fix CORS
3. **Task 3** - Authenticate WebSockets
4. **Task 4** - Prevent prompt injection
5. **Task 5** - Fix JWT secret handling
6. **Task 6** - Add file validation
7. **Task 7** - Add rate limiting
8. **Task 8** - Fix production settings
9. **Task 9** - Database pooling
10. **Task 10** - Response compression
11. **Task 11** - Add timeouts
12. **Task 12-16** - Remaining improvements
13. **Deploy & Monitor**

---

## Testing Commands

```bash
# Test CORS
curl -H "Origin: https://your-domain.com" http://localhost:8000/health

# Test rate limiting
for i in {1..15}; do curl http://localhost:8000/api/speech/transcribe; done

# Test authentication
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/analytics/save

# Test health check
curl http://localhost:8000/health
```
