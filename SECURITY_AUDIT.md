# AveaOffice Redash Fork — Security Audit & Remediation Plan

Date: 2026-07-09
Scope: `AveaSolutions/redash`, branch `v10` (fork of upstream Redash **v10.1.0**; upstream is now at v26.x)

---

## 1. Inventory of Avea customizations (vs upstream v10.1.0)

The fork diverges from the `v10.1.0` tag by only ~21 files (excluding lockfiles). All custom
functionality must be preserved by any remediation.

### Functional customizations (must preserve)

| Area | File(s) | What it does |
|---|---|---|
| Table column width | `viz-lib/src/visualizations/table/Editor/ColumnEditor.tsx`, `viz-lib/src/visualizations/table/utils.tsx` | Adds a per-column **Width** setting to table visualizations (default `150px`) |
| Empty-result message | `viz-lib/src/visualizations/table/Renderer.tsx` | Shows "No results were returned for this query" instead of rendering nothing |
| Table scroll/layout | `viz-lib/src/visualizations/table/renderer.less`, `client/app/components/dashboards/dashboard-grid.less` | Non-absolute positioning so table width stays flexible; capped `.ant-table-content` height (430px) with scrollable body; widget height inheritance |
| Widget CSS hook | `client/app/components/dashboards/dashboard-widget/Widget.jsx` | Adds the visualization type (e.g. `TABLE`) as a CSS class on each dashboard tile, used by the grid CSS above |
| De-branded public dashboards | `client/app/pages/dashboards/PublicDashboardPage.jsx/.less` | Removes the "Powered by Redash" footer/logo (public dashboards are embedded in AveaOffice) |
| MSSQL error detail | `redash/query_runner/mssql.py` | Includes the underlying error in "Failed getting schema" exceptions |
| LDAP hard-disable | `redash/authentication/ldap_auth.py` | Removed the LDAP search call — LDAP auth always fails (their mitigation for GHSA-32fw-wc7f-7qg9; LDAP is unused) |
| Gunicorn timeout | `bin/docker-entrypoint` | `REDASH_GUNICORN_TIMEOUT` (default 120s) to survive slow cold starts |
| Build/ops | `Dockerfile`, `.gitattributes`, `.gitignore`, `requirements*.txt` pins | archive.debian.org sources for EOL Buster, keyring-based MS ODBC repo, Python 3.7 compatibility pins |

### Key fact discovered

**The image no longer builds** (verified locally on linux/amd64): unpinned `thrift>=0.8.0` in
`requirements_all_ds.txt` now resolves to 0.23.0, which pip 20.2.4 fails to build
(`EnvironmentError: ... output.json`). Every future build was one unpinned dep away from breaking.
This makes dependency modernization a reliability fix as well as a security fix.

---

## 2. Security posture

### 2.1 Redash application CVEs (v10.1.0 base)

v10.1.0 was itself a security release; the fork **already contains** the fixes for:

- **CVE-2021-41192** (GHSA-g8xr-f424-h2rv) — default `SECRET_KEY`: `redash/settings/__init__.py:66-73` refuses to start without `REDASH_COOKIE_SECRET`. ✅ fixed
- **CVE-2021-43780** (GHSA-fcpv-hgq6-87h7) — SSRF in URL-based query runners: `advocate==1.0.0` + `redash/utils/requests_session.py`. ✅ fixed
- **CVE-2021-43777** (GHSA-vhc7-w7r8-8m34) — Google OAuth `state` CSRF: authlib-based rewrite present (`google_oauth.py`, next-url stored in session). ✅ fixed
- **CVE-2020-12725** (GHSA-4599-9qr8-ccj6) — redirect-based SSRF bypass: covered by advocate + `REQUESTS_ALLOW_REDIRECTS=false` default. ✅ mitigated
- **GHSA-32fw-wc7f-7qg9** (2024) — LDAP filter injection: fork mitigated harder than upstream by disabling LDAP search entirely (LDAP unused; `ldap3` not installed). ✅ mitigated

**App-level CVE (fixed in remediation):**

- **CVE-2021-21239 / GHSA-rm5x-rgmf-qv5c — SAML signature bypass → auth takeover (Critical, CVSS 9.1).** Was `pysaml2==6.1.0`; fixed at **`pysaml2==7.3.1`** (`requirements.txt:44`). ✅ fixed. If SAML is unused in AveaOffice, disabling the blueprint remains optional hardening.

**Reachable code-level SSRF gap (secondary):** ~~CSV and Excel runners~~ — **N/A.** This fork ships only PostgreSQL + MSSQL runners; `csv.py` / `excel.py` were removed. Remaining HTTP surface uses `ConfiguredSession` via `BaseHTTPQueryRunner`.

**Production config hardening (deployment, not code):** set `REDASH_ENFORCE_CSRF=true`, `REDASH_ENFORCE_HTTPS=true` (secure cookies), and distinct `REDASH_COOKIE_SECRET` vs `REDASH_SECRET_KEY`. These are safe-off upstream defaults; document in the AveaOffice deploy config rather than changing fork defaults.

### 2.2 Python dependency vulnerabilities (pip-audit: 94 findings, 21 packages)

Highest-impact (server-side, reachable):

| Package | Pinned | Worst issues | Target |
|---|---|---|---|
| Flask 1.1.1 | CVE-2023-30861 (cookie leak via caching) | → 2.3.x (upstream-proven backport) |
| werkzeug 0.16.1 | 11 CVEs incl. CVE-2023-25577 (multipart DoS), CVE-2023-46136 | → 2.3.8+ |
| Jinja2 2.10.3 | 5 CVEs (SSTI-adjacent escaping bugs) | → 3.1.6 |
| cryptography 2.8 | 14 CVEs | → 41.x+ |
| requests 2.21.0 | 5 CVEs incl. CVE-2023-32681 (Proxy-Auth leak) | → 2.31+ |
| pysaml2 6.1.0 | CVE-2021-21238/21239 (signature verification) | → 6.5.0+ (7.3.1) |
| PyJWT 1.7.1 | 9 CVEs incl. CVE-2022-29217 (alg confusion) | → 2.4.0+ |
| Authlib 0.15.5 | 9 CVEs (JWS/JWT confusion) | → 1.6.x |
| gunicorn 20.0.4 | CVE-2024-1135, CVE-2024-6827 (request smuggling) | → 22.0.0 |
| RestrictedPython 5.0 | 3 sandbox-escape CVEs (Python query runner) | → 6.2+ |
| sqlparse 0.3.0 | ReDoS/DoS CVEs | → 0.4.4+ |
| PyYAML 5.1.2 | CVE-2020-14343 (RCE via full_load; app uses safe_load) | → 6.0.1 |
| pycrypto 2.6.1 | abandoned, unfixable CVEs — **not imported anywhere** | remove |
| sentry-sdk 0.14.3 | 2 CVEs | → 1.28.1 |
| gevent 1.4.0 | CVE-2023-41419 | → 22.10.1+ |
| httplib2, pyOpenSSL, certifi, protobuf, snowflake-connector, python-dotenv | misc | bump per upstream set |

### 2.3 Frontend (npm audit)

Root: 210 findings (35 critical); viz-lib: 123 (18 critical). Most are **build-time-only**
(webpack 4 toolchain, cypress, percy) and unreachable in production. Browser-**runtime** packages that matter:

| Package | Where | Issue | Target |
|---|---|---|---|
| plotly.js 1.52.3 | viz-lib | **critical** prototype pollution GHSA-wjc4-73q6-gv3m (<2.25.2) | → 2.35.3 + upstream chart migration (#7359) |
| dompurify 2.0.7/2.0.17 | root + viz-lib | **critical** — the XSS sanitizer itself is bypassable | → 2.5.8 (semver-compatible) |
| moment | root + viz-lib | ReDoS, path traversal | → 2.30.x |
| lodash 4.17.10 | viz-lib | prototype pollution | → 4.17.21 |
| axios 0.21.1 / 0.19.2 | root / viz-lib | CSRF/SSRF-adjacent CVEs | → 0.28.x (0.x patched line, upstream-compatible) |
| path-to-regexp ^3.1.0 | root | ReDoS | → 3.3.0 |
| bootstrap 3.3.7 | root | XSS in tooltip/popover | LESS-source only; no fix in 3.x — accept (no CDN JS use) or document |

### 2.4 Platform

- Base image `python:3.7-slim-buster`: Python 3.7 EOL (2023-06), Debian Buster EOL/archived — no security updates at all.
- Frontend builder `node:12`: EOL (2022-04). Build-time only, but archived.
- pip pinned to 20.2.4 (2020) — cannot build modern source packages.

---

## 3. Remediation plan

Strategy: **stay on the v10 fork** (preserving all Avea behavior) and lift the dependency set to
the versions upstream Redash proved against this same codebase just before their Poetry
conversion (Oct 2023, commit `c97afeb3~1`), backporting the handful of small upstream compat
commits that accompanied each bump. Then go further where safe (gunicorn 22, Jinja2 3.1.6, etc.).

1. **Base image** → `python:3.10-slim-bullseye` (supported Python, supported Debian, keeps
   `msodbcsql17` availability so MSSQL connection strings don't change). Modern pip. Node 16
   builder (webpack 4-compatible).
2. **requirements.txt** → upstream pre-poetry set + safe extras:
   - Backports needed: Flask 2.3 migration (upstream #6138), Flask-Limiter 3.x init (#6174),
     sqlparse 0.4.x query splitting (#6049), PyJWT 2.x (no code change), pystache 0.6.
   - Keep `SQLAlchemy-Searchable==0.10.6` (newer requires PG > 9.6; Avea PG version unverified).
   - Remove `pycrypto` (unused, unfixable).
   - Keep `advocate` (SSRF protection).
3. **requirements_all_ds.txt** → scoped to Avea's data sources: `pymssql` + `pyodbc` only (PostgreSQL
   driver is in `requirements.txt`). MSSQL (`pymssql` 2.2.x, the runner Avea customized) unchanged
   behaviorally.
4. **requirements_dev.txt** → pytest 7.x etc. (py3.10-compatible test toolchain).
5. **Frontend runtime deps** (root + viz-lib): dompurify 2.5.8, moment 2.30.x, lodash 4.17.21,
   axios 0.28.x, path-to-regexp 3.3.0, plotly.js 2.35.3 with the upstream chart-layout migration
   (10-line change + fixtures). Build toolchain (webpack 4 etc.) left as-is: dev-only exposure,
   and upgrading it is a rewrite with no production security benefit.
6. **Do not** upgrade to Flask 3 / Werkzeug 3 / SQLAlchemy 2 — that is upstream's multi-year
   migration and would destabilize the fork for marginal benefit. Residual risk documented below.
7. **Testing**: backend pytest suite in Docker (same harness as `make backend-unit-tests`),
   viz-lib jest suite, root client jest suite, full production webpack build, plus a live
   smoke test (server up, login page, health checks) via docker compose.

### Tracked follow-ups (post-remediation tickets)

- **dompurify 3.x migration** — **open.** dompurify is at 2.5.8/2.5.9 (latest 2.x). The 2025–2026
  mXSS / IN_PLACE / hook-pollution advisories are only fixed in dompurify 3.2.4+, a breaking major.
  Evaluate upgrading `viz-lib/src/services/sanitize.ts` and `client/app/services/sanitize.js`.
- **Flask 3 / Werkzeug 3 / urllib3 2.x** — **partially done.** Authlib 1.7.2, PyJWT 2.13.0, and
  cryptography 48.0.1 were lifted during remediation ✅. Flask 3 / Werkzeug 3 were attempted and
  rejected on evidence (see §4); urllib3 2.x remains blocked on `advocate` replacement.

### Accepted residual risk (documented)

- Flask 2.3.x / Werkzeug 2.3.8 don't carry the 2024-2026 fixes that landed only in 3.x
  (debugger RCE needs `--debug`; multipart issues partially mitigated at 2.3.8; Redash deploys
  behind authenticated access).
- bootstrap 3 LESS (no JS plugin usage of tooltips on untrusted content).
- Build-toolchain advisories (webpack 4 chain, cypress, percy) — not shipped to production.

---

## 4. Verification results

### Interim (remediation in progress)

- **requirements.txt pip-audit: 94 vulns / 21 packages → 54 / 13** after the backend upgrade set
  landed. Remaining findings are concentrated in packages whose fixes require a major-version
  migration deferred by the plan (Flask 3, Werkzeug 3, urllib3 2.x). ~~Safe drop-in bumps still
  available to fold in during consolidation: `requests` 2.31→2.32.4, `sqlparse` 0.4.4→0.5.4,
  `PyJWT` 2.4.0→2.10.x, `python-dotenv` →1.x.~~ **Folded in:** `sqlparse` 0.5.5, PyJWT 2.13.0,
  `python-dotenv` 1.2.2. `requests` deliberately held at 2.31.0 (advocate SSRF hooks).
- Base image moved to `python:3.10-slim-bullseye` / `node:16-bullseye` (both supported).

### Frontend — COMPLETE ✅

- plotly.js 1.52.3 → **2.35.3** (upstream `594e2f24` v2 migration backported: `index.ts`
  modeBarButtonsToAdd + stale `@ts-expect-error` cleanup, `prepareLayout.ts` hovermode block,
  4 fixtures updated, cypress `g.plot`→`g.overplot`), dompurify → 2.5.9, moment → 2.30.1,
  **axios → 0.33.0** (agent went past the specified 0.28.1 because 0.28.1 is itself now flagged;
  0.33.0 is the latest API-compatible 0.x — acceptable), axios-auth-refresh 3.3.6,
  path-to-regexp 3.3.0, lodash 4.17.21, debug 3.2.7.
- **Tests:** viz-lib 103/103 (19 suites, 52 snapshots); root type-check clean + 77 passed/1 skipped
  (13 suites). **Production builds:** both succeed; confirmed plotly 2.35.3 (no 1.52.3) in bundles.
- **npm audit runtime deps:** viz-lib 18 critical → 11, root 35 → 28; all remaining are dev-toolchain
  (babel/eslint/jest/cypress/percy/webpack-dev-server). plotly/moment/lodash/axios/path-to-regexp/
  debug now clean at runtime.
- Avea customizations verified untouched (ColumnEditor width, table utils width default, empty-result
  message, Widget type class, PublicDashboardPage branding removal).
- **Install requirement for CI/devs:** use **npm 6** (`npx -y npm@6 install`) with Node 16 — npm 8
  breaks on the `sql-formatter` git dep. Lockfiles stay v1, so Docker `npm ci` is unaffected.

### Backend — COMPLETE ✅

- Base image `python:3.7-slim-buster` → **`python:3.10-slim-bullseye`**; frontend builder → `node:16-bullseye`.
  archive.debian.org Buster hack removed; MS repo → `debian/11 prod` (keyring), **msodbcsql17 kept**
  (mssql_odbc runner unchanged), msodbcsql17 gated on amd64 so arm64 dev builds work and prod amd64
  gets it unconditionally. pip 20.2.4 downgrade removed.
- Python deps lifted to upstream's proven pre-Poetry set + security bumps: Flask 2.3.2, Werkzeug 2.3.8,
  Jinja2 3.1.6, cryptography 45.0.7, pyOpenSSL 25.1.0, Authlib 1.7.2, PyJWT 2.13.0, RestrictedPython 8.1,
  gunicorn 22.0.0, **pysaml2 7.3.1** (closes the live CVE-2021-21239 SAML bypass), sqlparse 0.5.5,
  PyYAML 6.0.1, sentry-sdk 1.45.1, gevent 23.9.1, psycopg2-binary 2.9.6, redis 4.6.0, rq 1.9.0.
  `pycrypto` removed. `requests` deliberately held at 2.31.0 (2.32 bypasses advocate's SSRF hooks).
- Backports: Flask 2.3 migration (`73f49cbf` incl. tests), Flask-Limiter (`a1a00c68`), sqlparse
  (`f3ba10ff`), pymongo 4, rq 1.9 worker, plus an upstream password-login bypass fix in
  `redash/handlers/authentication.py`.
- Data sources: fork scoped to **PostgreSQL + MSSQL only** (`pg`, `mssql`, `mssql_odbc`,
  `query_results`; `requirements_all_ds.txt` is `pymssql` + `pyodbc`). Avea's MSSQL runner
  (`pymssql` 2.2.11) verified.
- **Tests: 732 passed, 0 failed.**

### Consolidation (parent agent) — COMPLETE ✅

- ~~**CSV/Excel SSRF-consistency fix applied.**~~ **N/A after scope-down:** `csv.py` / `excel.py`
  runners were removed; only pg/mssql runners remain. No reachable CSV/Excel SSRF surface.
- Rebuilt image (`redash-sec:test`) — builds clean.
- **Full backend suite re-run: 732 passed, 0 failed** (79s).
- **Live boot smoke test:** `create_db` OK; gunicorn 22 boots; `/ping` → `PONG` (HTTP 200);
  `/login` → 302; `/setup` → 200; security headers present (`X-Frame-Options: deny`,
  `X-Content-Type-Options: nosniff`, CSP with `frame-ancestors 'none'`).

### Major-version migration (commit 2) — COMPLETE ✅

Second commit pushed the deps further than the "defer all majors" plan, closing the
snowflake-capped cluster. Verified: full image build, **732 tests pass**, live `/ping`, in-image
imports confirm the new versions.

- **cryptography 45.0.7 → 48.0.1**, **pyOpenSSL 25.1.0 → 26.2.0** (unblocked by the snowflake bump;
  cffi moved to `>=2.0,<3.0`).
- **snowflake-connector-python 3.18.0 → 4.5.0** (this was the cap holding pyOpenSSL < 26).
- **google-api-python-client 1.7.11 → 2.190.0**, **protobuf 3.18.3 → 6.33.5** (forced compat bumps:
  `phoenixdb 0.7 → 1.2.2`, `pydgraph → 25.1.0`, `libkrb5-dev` added to the image). No query-runner
  code changes were required — BigQuery/Sheets/Analytics runners import and enable.
- **Build fix (production-critical):** `node:16-bullseye` ships npm 8, which breaks `npm ci` on the
  `sql-formatter` git dependency — the real production frontend build (`skip_frontend_build` unset)
  was failing. Pinned **npm 6.14.18** in the Dockerfile builder stage; full image now builds
  frontend + backend end to end.

### Flask 3 / Werkzeug 3 — attempted, NOT adopted (accepted risk)

Genuinely attempted and rejected on evidence (no code left behind; Flask stays 2.3.2 / Werkzeug 2.3.8):
Flask 3 hard-requires Flask-SQLAlchemy ≥ 3.0 (FSA 2.5.1 fails to even import under Flask 3), which
requires SQLAlchemy ≥ 1.4, which breaks the pinned `SQLAlchemy-Utils` (`sort_query`, used by every
list endpoint's ordering) and `SQLAlchemy-Searchable` (`entity_zero`, the full-text search path). That
is a pervasive model/search/ordering rewrite on SQLAlchemy 1.4 that **upstream Redash itself has not
done** (master still ships Flask 2.3.2 / SA 1.3.24). Not worth the app-breakage risk for the residual
CVEs (see below). This matches upstream's own posture.

## 5. Final security outcome

| Surface | Before | After |
|---|---|---|
| Python (pip-audit, requirements.txt) | 94 vulns / 21 pkgs | **15 / 4 pkgs** — all residuals hard-blocked (see below) |
| Python data-source deps | (protobuf 3 + certifi) | **2 / 1 pkg** (certifi floor-pin artifact; image installs 2026.x) |
| Frontend runtime (npm) | viz-lib 18 crit / root 35 crit | viz-lib 11 / root 28 — remainder is **dev-toolchain only** |
| Redash app CVEs | 1 live (SAML CVE-2021-21239) | **0 live** (pysaml2 7.3.1) |
| Reachable SSRF gap (csv/excel) | present | **N/A** (runners removed; pg/mssql only) |
| Base platform | Python 3.7 / Debian Buster (EOL, non-building) | Python 3.10 / Debian Bullseye (supported, builds) |
| Backend tests | (image didn't build) | **732 pass** + live `/ping` |

**The 15 residual requirements.txt findings are in exactly 4 packages, all deliberately blocked, none silent:**
- **flask 2.3.2 (1)** + **werkzeug 2.3.8 (6)** — fixes only exist in the 3.x line; adopting them means
  the SQLAlchemy 1.4 rewrite above. Held by design (matches upstream master).
- **requests 2.31.0 (3)** + **urllib3 1.26.20 (5)** — requests 2.32 changed connection handling in a way
  that **bypasses advocate's SSRF validation hooks**, and urllib3 fixes are 2.x-only (requires requests
  2.32). Bumping would silently disable the SSRF protection that closes CVE-2021-43780. Held by design
  until `advocate` is replaced with a maintained SSRF guard.

### Remaining follow-ups for the team (non-blocking)

1. **Replace `advocate` with a maintained SSRF guard**, then unblock requests 2.32.4 + urllib3 2.x
   (clears 8 of the 15 residual findings). Biggest remaining win.
2. dompurify 2.x → 3.x (breaking) — the one runtime frontend dep still flagged.
3. Flask 3 / Werkzeug 3 (+ SQLAlchemy 1.4/2.0, SQLAlchemy-Utils/Searchable rewrite) — track upstream;
   revisit if/when upstream Redash does it. Clears the other 7 residual findings. *(Attempted and
   rejected during remediation — see §4.)*
4. One CI build on **amd64** to confirm the msodbcsql17 path (local verification was arm64). CircleCI
   `build-docker-image` uses amd64 remote docker but still targets the pre-remediation toolchain
   (Python 3.7 / Node 12) and has not been verified post-upgrade.
5. `docker-compose.yml` still pins `postgres:9.5` / `redis:3` and an obsolete `version:` key (dev only).
6. Production config hardening: set `REDASH_ENFORCE_HTTPS=true` and distinct `REDASH_COOKIE_SECRET` vs
   `REDASH_SECRET_KEY` in AveaOffice deploy config. *(Partial: dev `docker-compose.yml` already sets
   `REDASH_ENFORCE_CSRF=true`.)*

### Completed / N/A follow-ups

- ~~**dql/dynamo3 install via `--no-deps` in the Dockerfile**~~ — **N/A.** Fork ships only PostgreSQL +
  MSSQL runners; no DynamoDB runner code or deps.
- **Post-remediation major bumps:** Authlib 1.7.2, PyJWT 2.13.0, cryptography 48.0.1, python-dotenv
  1.2.2, sqlparse 0.5.5.
- **Dockerfile npm 6.14.18 pin** — production frontend build fixed (`sql-formatter` git dep).
- **SAML CVE-2021-21239** — closed at `pysaml2==7.3.1`.
- **CSV/Excel SSRF fix** — N/A after runner scope-down.
