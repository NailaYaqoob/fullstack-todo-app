# Fullstack Todo App

A full-stack todo application with user authentication and an AI-powered chatbot for managing tasks through natural language.

## Demo

<video src="https://raw.githubusercontent.com/NailaImran/fullstack-todo-app/003-chatbot/todo-app-demo.mp4" controls width="100%">
</video>

## Features

- **Task Management** — Create, view, update, and delete tasks from a clean dashboard
- **User Authentication** — Sign up and sign in with email/password via Better Auth
- **AI Chatbot** — Conversational interface powered by Claude AI; create, list, and complete tasks using natural language

## Tech Stack

**Frontend**
- Next.js 16 (App Router) + TypeScript
- Better Auth (JWT plugin)
- Tailwind CSS

**Backend**
- FastAPI (Python 3.11)
- SQLModel + asyncpg
- Neon Serverless PostgreSQL

**AI**
- OpenAI Agents SDK (`openai-agents`)
- MCP tools for task operations
- `@openai/chatkit` for the chat UI

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11
- Docker (optional, for Docker Compose setup)

### Environment Variables

Copy the example env files and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

### Run with Docker Compose

```bash
docker-compose up
```

### Run Manually

**Backend**

```bash
cd backend
pip install -r requirements.txt
python run.py
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Deployment

| Service  | Host    | URL                                                         |
|----------|---------|-------------------------------------------------------------|
| Frontend | Vercel  | https://fullstack-todo-app-phi-one.vercel.app               |
| Backend  | Railway | https://fullstack-todo-app-production-0d04.up.railway.app   |
| Database | Neon    | Serverless PostgreSQL (connection string in backend env)    |

### Frontend env vars (set in Vercel → Settings → Environment Variables)

| Variable               | Value                                                       |
|------------------------|-------------------------------------------------------------|
| `NEXT_PUBLIC_API_URL`  | `https://fullstack-todo-app-production-0d04.up.railway.app` |
| `BETTER_AUTH_SECRET`   | Shared secret (must match backend)                          |
| `BETTER_AUTH_URL`      | `https://fullstack-todo-app-phi-one.vercel.app`             |
| `DATABASE_URL`         | Neon Postgres connection string (used by Better Auth)       |

### Backend env vars (set in Railway → Variables)

| Variable              | Value                                                |
|-----------------------|------------------------------------------------------|
| `DATABASE_URL`        | `postgresql+asyncpg://<neon-connection-string>`      |
| `BETTER_AUTH_SECRET`  | Shared secret (must match frontend)                  |
| `FRONTEND_URL`        | `https://fullstack-todo-app-phi-one.vercel.app`      |
| `OPENAI_API_KEY`      | Required for the chatbot agent                       |

### Notes

- The Vercel frontend calls the Railway backend over HTTPS — `NEXT_PUBLIC_API_URL` must be set in Vercel or the deployed app falls back to `http://localhost:8000` and breaks.
- `FRONTEND_URL` on the backend gates CORS (`backend/main.py`); Vercel preview deploys (`*-git-branch.vercel.app`) won't match the production URL and will be blocked.
- `BETTER_AUTH_SECRET` must be identical across frontend and backend, otherwise JWT verification fails with 401.
