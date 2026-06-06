# HaradaMaker

HaradaMaker is split into:

- `frontend/`: Vite TypeScript board app.
- `backend/`: FastAPI API for saved boards and read-only share links.

## Frontend

```sh
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Backend

```sh
cd backend
cp .env.example .env
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

The backend talks to Supabase over HTTPS REST and verifies the user's Supabase
Auth token. It does not need a local Postgres connection string for normal app
usage.

```env
SUPABASE_URL=https://hkjirstlfhcdrkemxywv.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
FRONTEND_ORIGIN=http://localhost:5173
```

## Supabase

The migrations in `backend/supabase/migrations/` create owned boards and
read-only share tokens. They were applied to the connected Supabase project via
MCP, and security advisors were clean after application.
