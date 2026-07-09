# Redash Local Development (Windows + Docker Desktop / WSL2)

This guide covers running Redash locally on **Windows** using **Docker Desktop with the WSL2 backend**. It matches the repo's development `docker-compose.yml` setup: hot-reloading backend, background workers, Postgres, Redis, and a fake mail server.

## Prerequisites

1. **Docker Desktop** installed with the **WSL2 backend** enabled.
2. **WSL2** with a Linux distro (Ubuntu recommended).
3. This repo cloned and accessible from WSL.

### Where to keep the repo

For best performance, clone the repo **inside your WSL filesystem** (e.g. `~/repos/redash`), not under `/mnt/c/...`.

If your repo lives on the Windows drive (e.g. `C:\Users\...\redash`), Docker will still work, but file I/O through the bind mount (`.:/app`) can be noticeably slower.

### Where to run commands

Run all commands from a **WSL terminal** (Ubuntu, etc.) in the repo root:

```bash
cd ~/repos/redash   # or your path, e.g. /mnt/c/Users/JeremyDeal/Desktop/repos/redash
```

`make` targets work in WSL if `make` is installed (`sudo apt install make`). The commands below use `docker compose` directly so you do not need `make`.

---

## Architecture (dev stack)

| Service    | Purpose                                      | Host URL / Port        |
|------------|----------------------------------------------|------------------------|
| `server`   | Flask dev server (auto-reload on Python changes) | http://localhost:5000 |
| `worker`   | RQ worker (auto-reload)                      | —                      |
| `scheduler`| RQ scheduler (auto-reload)                   | —                      |
| `postgres` | Application database                         | `localhost:15432`      |
| `redis`    | Job queue / cache                            | internal only          |
| `email`    | MailDev — captures outbound email           | http://localhost:1080  |

The dev compose file bind-mounts your source into the container (`.:/app`), so code changes on disk are picked up without rebuilding the image.

---

## First-time setup

### 1. Create `.env`

Create a `.env` file in the repo root (it is gitignored). Redash **requires** `REDASH_COOKIE_SECRET`:

```bash
cat > .env <<'EOF'
REDASH_COOKIE_SECRET=REPLACE_WITH_A_RANDOM_SECRET
EOF
```

Generate a secret in WSL:

```bash
openssl rand -base64 32
```

Paste the output into `.env` in place of `REPLACE_WITH_A_RANDOM_SECRET`.

### 2. Build the Docker images

The default compose file skips the frontend build inside the image (`skip_frontend_build: "true"`). Build the dev images:

```bash
docker compose build
```

The first build can take several minutes (Python dependencies, ODBC drivers, etc.).

### 3. Build the frontend

Because the repo is bind-mounted over `/app`, the container serves frontend assets from your **local** `client/dist/` directory, not from whatever was baked into the image. Build the frontend inside the container (recommended on Windows — no local Node install required):

```bash
docker compose run --rm server sh -c "npm ci --unsafe-perm && npm run build"
```

This only needs to be repeated when you change frontend code (or after a clean checkout).

### 4. Start the stack

```bash
docker compose up -d
```

### 5. Initialize the database

Run once on a fresh Postgres volume:

```bash
docker compose run --rm server create_db
```

### 6. Open Redash

Go to **http://localhost:5000** and complete the setup wizard to create your admin account.

Captured emails (invites, alerts, etc.) appear at **http://localhost:1080**.

---

## Recommended command cheat sheet

All commands assume you are in the repo root inside WSL.

### Start / stop

```bash
# Start (rebuild images if Dockerfile/deps changed)
docker compose up -d --build

# Stop containers (keep data volumes)
docker compose down

# Stop and remove containers + networks
docker compose down --remove-orphans
```

### Database

```bash
# First-time schema setup
docker compose run --rm server create_db

# Django-style management CLI
docker compose run --rm server manage --help
```

### Frontend

```bash
# One-off production build (served by Flask at :5000)
docker compose run --rm server sh -c "npm ci --unsafe-perm && npm run build"

# Rebuild after frontend changes (faster if node_modules already exist)
docker compose run --rm server npm run build

# Live rebuild on file changes (run in a separate terminal; leave it running)
docker compose run --rm server npm run watch
```

### Backend shell / debugging

```bash
# Shell inside the server container
docker compose run --rm server bash

# Flask manage.py shell
docker compose run --rm server manage shell

# Redis CLI
docker compose run --rm redis redis-cli -h redis
```

### Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f server
docker compose logs -f worker
```

### Tests

```bash
# Backend unit tests (starts stack, prepares test DB, runs pytest)
docker compose up -d
docker compose exec postgres sh -c 'psql -U postgres -c "select 1;"'   # wait until ready
docker compose run --rm server tests
```

---

## Day-to-day development workflow

1. **Start the stack** (if not already running):

   ```bash
   docker compose up -d
   ```

2. **Backend (Python)** — edit files under `redash/`. The `dev_server`, `dev_worker`, and `dev_scheduler` commands use `watchmedo` to auto-restart on `.py` changes. No container rebuild needed.

3. **Frontend (JS/TS/React)** — edit files under `client/`. Either:
   - Run `docker compose run --rm server npm run watch` in a second terminal, or
   - Run `docker compose run --rm server npm run build` after each change.

4. **Dependency changes**:
   - Python (`requirements*.txt`) → `docker compose build` then `docker compose up -d --build`
   - Node (`package.json` / `package-lock.json`) → `docker compose run --rm server sh -c "npm ci --unsafe-perm && npm run build"`

---

## Optional: faster Docker builds

Skip installing every data-source driver (most local dev does not need them):

```bash
docker compose build --build-arg skip_ds_deps=true
```

To bake the frontend into the image **and** still use the dev compose file, you must still run a local/container frontend build because of the `.:/app` volume mount. For a production-like image build without the bind mount, see `.circleci/docker-compose.cypress.yml`.

---

## Troubleshooting (Windows / WSL2)

### `You must set the REDASH_COOKIE_SECRET environment variable`

Create or fix `.env` in the repo root and restart:

```bash
docker compose down
docker compose up -d
```

### Blank page or missing UI at http://localhost:5000

The frontend was not built. Run:

```bash
docker compose run --rm server sh -c "npm ci --unsafe-perm && npm run build"
docker compose restart server
```

### Port already in use (`5000`, `1080`, or `15432`)

Stop whatever is using the port, or change the host mapping in `docker-compose.yml`.

### Slow file watching / hot reload

Move the repo into the WSL filesystem (`~/repos/...`) instead of `/mnt/c/...`.

### `docker compose` vs `docker-compose`

Docker Desktop supports both. This guide uses `docker compose` (Compose V2). If you prefer the legacy CLI, substitute `docker-compose` — the Makefile uses that form.

### Docker Desktop not using WSL2

In Docker Desktop: **Settings → General → Use the WSL 2 based engine** (enabled), and **Settings → Resources → WSL Integration** — enable your distro.

### Reset everything (destructive)

Removes containers and Postgres data:

```bash
docker compose down -v
docker compose up -d --build
docker compose run --rm server create_db
docker compose run --rm server sh -c "npm ci --unsafe-perm && npm run build"
```

---

## Quick start (copy-paste)

Run once after cloning:

```bash
# 1. Create .env (replace secret with: openssl rand -base64 32)
echo 'REDASH_COOKIE_SECRET=REPLACE_WITH_A_RANDOM_SECRET' > .env

# 2. Build images
docker compose build

# 3. Build frontend
docker compose run --rm server sh -c "npm ci --unsafe-perm && npm run build"

# 4. Start services
docker compose up -d

# 5. Initialize database
docker compose run --rm server create_db
```

Then open **http://localhost:5000**.

For daily use afterward:

```bash
docker compose up -d
```

Optionally, in a second terminal while doing frontend work:

```bash
docker compose run --rm server npm run watch
```
