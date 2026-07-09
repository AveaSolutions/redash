# Redash Local Development (Windows + Docker Desktop / WSL2)

This guide covers running Redash locally on **Windows** using **Docker Desktop with the WSL2 backend**. It matches the repo's development `docker-compose.yml` setup: hot-reloading backend, background workers, Postgres, Redis, and a fake mail server.

**Backend runs in Docker. Frontend builds on your WSL machine** (via `make` or `npm`). The `server` container is Python-only and does not include Node/npm.

## Prerequisites

1. **Docker Desktop** installed with the **WSL2 backend** enabled.
2. **WSL2** with a Linux distro (Ubuntu recommended).
3. This repo cloned and accessible from WSL.
4. **`make`** in WSL: `sudo apt install make`
5. **Node.js 12** in WSL via [nvm](https://github.com/nvm-sh/nvm) (required for frontend builds).

### Where to keep the repo

For best performance, clone the repo **inside your WSL filesystem** (e.g. `~/repos/redash`), not under `/mnt/c/...`.

If your repo lives on the Windows drive (e.g. `C:\Users\...\redash`), Docker will still work, but file I/O through the bind mount (`.:/app`) can be noticeably slower.

### Where to run commands

Run **all** commands from a **WSL terminal** (Ubuntu, etc.) in the repo root — not PowerShell or CMD:

```bash
cd ~/repos/redash   # or your path, e.g. /mnt/c/Users/JeremyDeal/Desktop/repos/redash
```

### Node.js setup (WSL only)

Redash requires **Node 12** and **npm 6** (see `package.json`). Do **not** use Windows Node from `/mnt/c/Program Files/nodejs/` — it is the wrong version and breaks WSL builds (UNC path errors, platform mismatches).

Install nvm and Node 12 once in WSL:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# restart your shell, then:
nvm install 12
nvm use 12
nvm alias default 12
```

Before any frontend work, confirm you are on Linux Node:

```bash
source ~/.bashrc
nvm use 12
which npm node
# Expected: ~/.nvm/versions/node/v12.22.12/bin/npm
node --version   # v12.22.12
npm --version    # 6.x
```

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

The dev compose file bind-mounts your source into the container (`.:/app`), so code changes on disk are picked up without rebuilding the image. Frontend assets are served from your local `client/dist/` directory (built on the host).

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

### 3. Install frontend dependencies and build

Because the repo is bind-mounted over `/app`, the container serves frontend assets from your **local** `client/dist/` directory, not from whatever was baked into the image. Build the frontend on the host with Node 12:

```bash
nvm use 12
npm ci --unsafe-perm
make build
```

`make build` runs `bin/bundle-extensions` in Docker (usually a no-op), then `npm run build` locally. Repeat `make build` when you change frontend code; re-run `npm ci --unsafe-perm` only after `package.json` / `package-lock.json` changes.

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

All commands assume you are in the repo root inside WSL with `nvm use 12` active.

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
make build

# Rebuild after frontend changes (faster if node_modules already exist)
npm run build

# Live rebuild on file changes (run in a separate terminal; leave it running)
make watch

# Dev server with hot reload (alternative to make watch)
make start
```

Equivalent without `make`:

```bash
npm run bundle          # or: docker compose run --rm server bin/bundle-extensions
npm ci --unsafe-perm     # once, or after lockfile changes
npm run build
npm run watch
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

3. **Frontend (JS/TS/React)** — edit files under `client/`. In a second WSL terminal with Node 12 active, either:
   - Run `make watch` (rebuild on file changes), or
   - Run `make build` / `npm run build` after each change.

4. **Dependency changes**:
   - Python (`requirements*.txt`) → `docker compose build` then `docker compose up -d --build`
   - Node (`package.json` / `package-lock.json`) → `npm ci --unsafe-perm && make build`

---

## Optional: faster Docker builds

This fork installs only PostgreSQL and SQL Server data-source drivers by default, so a normal `docker compose build` is already lean. To skip even those two drivers (e.g. if you only need the app DB and will add drivers later):

```bash
docker compose build --build-arg skip_ds_deps=true
```

To bake the frontend into the image **and** still use the dev compose file, you must still run a local frontend build because of the `.:/app` volume mount. For a production-like image build without the bind mount, see `.circleci/docker-compose.cypress.yml`.

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
nvm use 12
make build
docker compose restart server
```

### `sh: npm: not found` inside the server container

Expected. The `server` image is Python-only; Node is used only during the multi-stage Docker build. Run frontend commands on the host with Node 12 (`make build`, `npm run build`, etc.).

### `EBADENGINE`, `fsevents` platform errors, or `ENOENT ... C:\Windows\package.json`

You are using **Windows npm** from WSL instead of Linux Node via nvm. Fix:

```bash
source ~/.bashrc
nvm use 12
which npm   # must NOT be /mnt/c/Program Files/nodejs/npm
rm -rf node_modules viz-lib/node_modules
npm ci --unsafe-perm
make build
```

Always run frontend commands from a **WSL terminal**, not PowerShell or CMD.

### Port already in use (`5000`, `1080`, or `15432`)

Stop whatever is using the port, or change the host mapping in `docker-compose.yml`.

### `docker compose build` fails on pip / `requirements_all_ds.txt`

This fork only installs PostgreSQL and SQL Server drivers in `requirements_all_ds.txt`. If the build still fails, try a clean rebuild:

```bash
docker compose build --no-cache
```

To skip data-source drivers entirely:

```bash
docker compose build --build-arg skip_ds_deps=true
```

### Slow file watching / hot reload

Move the repo into the WSL filesystem (`~/repos/...`) instead of `/mnt/c/...`.

### `docker compose` vs `docker-compose`

Docker Desktop supports both. This guide uses `docker compose` (Compose V2). The Makefile uses `docker-compose` — either works.

### Docker Desktop not using WSL2

In Docker Desktop: **Settings → General → Use the WSL 2 based engine** (enabled), and **Settings → Resources → WSL Integration** — enable your distro.

### Reset everything (destructive)

Removes containers and Postgres data:

```bash
docker compose down -v
docker compose build
nvm use 12
npm ci --unsafe-perm
make build
docker compose up -d
docker compose run --rm server create_db
```

---

## Quick start (copy-paste)

Run once after cloning (in a WSL terminal):

```bash
# 0. Install Node 12 via nvm (see "Node.js setup" above if not done yet)
nvm use 12

# 1. Create .env (replace secret with: openssl rand -base64 32)
echo 'REDASH_COOKIE_SECRET=REPLACE_WITH_A_RANDOM_SECRET' > .env

# 2. Build Docker images
docker compose build

# 3. Install frontend deps and build
npm ci --unsafe-perm
make build

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

Optionally, in a second WSL terminal while doing frontend work:

```bash
nvm use 12
make watch
```
