# CalProject

Full-stack calendar app — Django REST API backend + React (Vite) frontend, deployable to Railway.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed          # load sample data
python manage.py runserver     # http://localhost:8000
```

### Frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173  (proxies /api → localhost:8000)
```

Open http://localhost:5173 in your browser.

## Build frontend for Django serving

Run this to compile the React app into `backend/staticfiles/frontend/`
so Django/whitenoise can serve it from the same origin:

```bash
cd frontend
npm run build
```

Then visit http://localhost:8000 — Django serves the built frontend.

## Seed data

```bash
cd backend
python manage.py seed
```

Creates 3 sample events (today, +3 days, +7 days) and 3 sample todos.

## Railway Deployment

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
3. Add a **PostgreSQL** plugin to the project (Railway auto-injects `DATABASE_URL`).
4. Set these environment variables in the Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `SECRET_KEY` | A long random string |
   | `DEBUG` | `False` |
   | `ALLOWED_HOSTS` | `yourcalapp.up.railway.app` (your Railway domain) |
   | `DATABASE_URL` | Auto-injected by the Postgres plugin |

5. Deploy. Railway uses `railway.toml` — it builds the frontend, installs Python deps,
   runs migrations, collects static files, and starts gunicorn automatically.

## API Reference

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/calendar/?month=YYYY-MM` | Calendar data for a month |
| GET/POST | `/api/events/` | List / create events |
| GET/PUT/DELETE | `/api/events/<id>/` | Retrieve / update / delete event |
| GET/POST | `/api/todos/` | List / create todos |
| GET/PUT/DELETE | `/api/todos/<id>/` | Retrieve / update / delete todo |
| POST | `/api/todos/<id>/done/` | Mark todo done (advances next_due) |
