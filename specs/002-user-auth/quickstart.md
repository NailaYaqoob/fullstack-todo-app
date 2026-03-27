# Quickstart: User Authentication

**Feature**: `002-user-auth` | **Date**: 2026-02-25

---

## Prerequisites

- Node.js 18+ installed (`node --version`)
- Python 3.11+ installed (`python --version`)
- Neon PostgreSQL project created — connection string available
- Monorepo scaffolded (`frontend/` and `backend/` exist — run `/bootstrap` first)

---

## 1. Environment Variables

### Generate a shared secret (run once):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### backend/.env
```
DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<endpoint>.neon.tech/<db>?sslmode=require
BETTER_AUTH_SECRET=<32-char hex string from above>
```

### frontend/.env.local
```
BETTER_AUTH_SECRET=<SAME secret — must be identical>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=<same connection string>
```

**Critical**: Both services MUST use the identical `BETTER_AUTH_SECRET` or JWT
verification will fail with 401 on every backend request.

---

## 2. Backend Setup

```bash
cd backend
pip install fastapi uvicorn sqlmodel asyncpg "python-jose[cryptography]" python-dotenv
uvicorn main:app --reload --port 8000
```

Expected output: `INFO: Application startup complete.`
Health check: `curl http://localhost:8000/health` → `{"status":"ok"}`

---

## 3. Frontend Setup

```bash
cd frontend
npm install better-auth
npm run dev
```

Expected output: Next.js running on `http://localhost:3000`

---

## 4. Verify Auth Flow

### Sign Up
```bash
curl -s -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}' \
  | python -m json.tool
```
Expected: `200` with `user` object and `token` field.

### Sign In + Extract Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Token: $TOKEN"
```

### Verify JWT on FastAPI
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/health-auth \
  | python -m json.tool
```
Expected: `{"user_id": "...", "email": "test@example.com"}`

*(Note: `/api/health-auth` is a test endpoint — implement during tasks phase)*

### Sign Out
```bash
curl -s -X POST http://localhost:3000/api/auth/sign-out \
  -H "Content-Type: application/json"
```
Expected: `{"success": true}`

---

## 5. Route Protection Verification

1. Open browser → navigate to `http://localhost:3000/dashboard`
   → Should redirect to `http://localhost:3000/login` (FR-011)

2. Sign in via `http://localhost:3000/login`
   → Should redirect to `http://localhost:3000/dashboard`

3. While signed in, navigate to `http://localhost:3000/login`
   → Should redirect to `http://localhost:3000/dashboard` (FR-012)

4. Click sign-out
   → Should redirect to `http://localhost:3000/login`

5. Press browser back button to `/dashboard`
   → Should still redirect to `/login` (FR-010, US4 scenario 3)

---

## 6. Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` on all FastAPI calls | `BETTER_AUTH_SECRET` mismatch | Confirm both `.env` files have identical secret |
| `RuntimeError: BETTER_AUTH_SECRET not set` | Missing env var in backend | Add to `backend/.env` |
| CORS error in browser console | FastAPI CORS misconfigured | Verify `allow_origins` in `main.py` includes `http://localhost:3000` |
| Session not persisting after browser restart | Cookie `SameSite` / domain mismatch | Ensure `BETTER_AUTH_URL` exactly matches the origin |
| `asyncpg.InvalidCatalogNameError` | Wrong database name in `DATABASE_URL` | Verify Neon connection string |
| `ssl required` error | Missing `?sslmode=require` | Append `?sslmode=require` to `DATABASE_URL` |
