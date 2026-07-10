# Removal Candidates — AveaOffice Redash Fork

Date: 2026-07-10  
Scope: `AveaSolutions/redash` on `rcm-security-patches`  
Context: Post–AO-19386 Cypress/Percy removal; Dependabot triage ongoing under [AO-19381](https://kipusystems.atlassian.net/browse/AO-19381)  
Tracking ticket: [AO-19388](https://kipusystems.atlassian.net/browse/AO-19388) — Prune dead code and upstream leftovers

This document lists code, config, and dependencies that may be safe to **delete outright** (Cypress-style) versus items that need **product confirmation** or a **migration** instead of a simple removal.

---

## Progress log

| Phase | Ticket | Status | Commit |
|---|---|---|---|
| Cypress + Percy e2e stack | AO-19386 | **Done** | `4d4560e5` |
| Tier 1 — config / dead code | AO-19388 | **Done** | `f50a5dae` |
| Tier 4 — alert destinations (Slack/email/webhook only) | AO-19388 | **Done** | `abc34398` |
| Tier 4 — LDAP auth removal | AO-19388 | **Done** | `abc34398` |
| Tier 4 — unused SSO auth (Google/SAML/remote-user/JWT) | AO-19389 | **Done** | *(this commit)* |
| Tier 2 — `ptpython` / `manage shell` | AO-19388 | **Done** | `e6f10291` |
| Tier 2 — other dev deps / tooling | AO-19388 | Open | — |
| Tier 3 — CircleCI / Restyled | AO-19388 | Needs team confirm | — |

---

## Already removed (reference)

| Item | Ticket | Notes |
|---|---|---|
| Cypress + Percy e2e stack | AO-19386 | `client/cypress/`, `@percy/*`, `@cypress/*`, CircleCI e2e job — **443 npm packages removed** |
| **Tier 1 batch** | AO-19388 | `netlify.toml`, `requirements_oracle_ds.txt`, dead `nyc` config, Percy CSS hooks, `build:old-node-version`, `.github/weekly-digest.yml` |
| **Alert destinations** (HipChat, ChatWork, Mattermost, Hangouts Chat, PagerDuty) | AO-19388 | Modules deleted; `DESTINATIONS` hardcoded to email + Slack + webhook (env vars ignored, same pattern as `QUERY_RUNNERS`); `pypd` dropped from `requirements.txt` |
| **LDAP auth** | AO-19388 | `ldap_auth.py`, settings, templates, UI toggles, and `ldap3` install comment removed |
| **`ptpython` / `manage shell`** | AO-19388 | Removed `manage shell` CLI command, `shell_context_processor`, and `ptpython` from `requirements_dev.txt`; Flask default shell disabled via `add_default_commands=False` |
| 7 stale Dependabot PRs | — | cryptography, jinja2, plotly.js, axios, werkzeug, es5-ext ×2 — superseded by security remediation |
| 3 conflicting Dependabot PRs | — | @babel/traverse, webpack-dev-server, express — closed; tracked in Phase 4 |

---

## Tier 1 — Delete with minimal risk

**Status: complete (AO-19388, `f50a5dae`)**

| Candidate | Location | Why remove | Effort | Dependabot impact |
|---|---|---|---|---|
| ~~**`netlify.toml`**~~ | repo root | Upstream Netlify preview deploy (Node 12, `CYPRESS_INSTALL_BINARY`, proxies to `preview-*.redashapp.com`). Avea does not use this. | ~15 min | None |
| ~~**`requirements_oracle_ds.txt`**~~ | repo root | Orphaned file; nothing references it. Fork ships Postgres + SQL Server only (`requirements_all_ds.txt`). | ~5 min | None |
| ~~**`nyc` config block**~~ | `package.json` | Leftover from Cypress code-coverage. No `nyc` package is installed. | ~5 min | None |
| ~~**Percy CSS hooks**~~ | `ApiKeyForm.jsx`, `QuerySelector.jsx`, `viz-lib/.../Renderer.tsx` | `hide-in-percy` / `data-percy` classes — cosmetic leftovers after Percy removal. | ~15 min | None |
| ~~**`build:old-node-version` script**~~ | `package.json` | OOM workaround for ancient Node. Stack is Node 16. | ~5 min | None |
| ~~**`.github/weekly-digest.yml`**~~ | `.github/` | Upstream OSS bot boilerplate for `getredash/redash`. | ~10 min | None |
| **GitHub issue/PR templates** | `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md` | Upstream contribution templates; optional for a private fork. | ~10 min | None |

---

## Tier 2 — Dev dependencies / tooling (low functional impact)

Packages or deps wired only for local dev ergonomics. Removing them shrinks the lockfile and may shed dev-scope Dependabot alerts.

| Candidate | Location | Why remove | Effort | Dependabot impact |
|---|---|---|---|---|
| **`ptvsd`** | `requirements_dev.txt`, `redash/__init__.py` (`REMOTE_DEBUG`) | Deprecated debugger (replaced by `debugpy`). Opt-in only via env var. | ~30 min | Dev pip (minor) |
| **`webpack-build-notifier`** | `package.json`, `webpack.config.js` | Desktop notifications during webpack watch. Useless in CI, Docker, WSL. | ~30 min | Dev npm (minor) |
| **`webpack-bundle-analyzer`** | `package.json`, `webpack.config.js` | Only used by `npm run analyze` / `analyze:build`. Pulls in `ejs` (Dependabot headache). Remove if team does not use bundle analysis. | ~30 min | Dev npm (`ejs` chain) |
| **`ts-migrate`** | `viz-lib/package.json` | One-time codemod tool. Not referenced by any npm script; only left `// @ts-expect-error ts-migrate(...)` comments in source. | ~30 min | Dev npm |
| **`eslint-plugin-flowtype`** | `package.json` | Installed but unused — no Flow types in codebase, not in `client/.eslintrc.js`. | ~15 min | Dev npm |
| **`coverage`** | `requirements_dev.txt` | Likely redundant with `pytest-cov` (which already pulls in `coverage`). | ~15 min | Dev pip (minor) |

### Also remove when deleting the above

- `webpack.config.js` — `WebpackBuildNotifierPlugin` / `BundleAnalyzerPlugin` requires and plugin entries
- `redash/__init__.py` — `REMOTE_DEBUG` / `ptvsd` block (or swap to `debugpy` if remote debugging is still wanted)

---

## Tier 3 — Infrastructure (confirm with team first)

Larger config surfaces. Same *spirit* as Cypress removal, but needs confirmation that Avea does not rely on them.

| Candidate | Location | Why remove | Effort | Dependabot impact |
|---|---|---|---|---|
| **`.circleci/`** | `.circleci/config.yml` + helpers | Still references `circleci/node:12` and `circleci/python:3.7.0` while app is Python 3.10 / Node 16. Avea CI appears to be Azure DevOps (`Redash-Package` check on PR #90). | 1–2 hrs | None |
| **`.restyled.yaml`** | repo root | Restyled bot config (auto-format PRs). Remove if not using Restyled on this fork. | ~15 min | None |

---

## Tier 4 — Product / feature pruning

| Candidate | Location | Status | Notes |
|---|---|---|---|
| ~~**Alert destinations**~~ | `redash/destinations/`, `redash/settings/__init__.py` | **Removed** | Prod confirmed: Slack / email / webhook only. HipChat, ChatWork, Mattermost, Hangouts Chat, PagerDuty modules deleted. |
| ~~**`pypd`**~~ | `requirements.txt` | **Removed** | Was only used by PagerDuty destination. |
| ~~**LDAP auth**~~ | `redash/authentication/ldap_auth.py`, settings, UI | **Removed** | Never used in Avea environments; previously hard-disabled for GHSA-32fw-wc7f-7qg9. |
| ~~**SSO auth (Google OAuth, SAML, remote-user, JWT login)**~~ | `redash/authentication/`, settings, UI, Dockerfile | **Removed** | kipu-rcm uses API key auth only (`Authorization: Key`). Dropped `Authlib`, `pysaml2`, `PyJWT`, `xmlsec1`. Password + API key/HMAC kept. |

---

## Tier 5 — Mechanical migration (not a simple delete, but sheds deps)

Higher effort; do under AO-19381 rather than as drive-by deletes.

| Candidate | Location | Approach | Effort | Dependabot impact |
|---|---|---|---|---|
| **`mock` → `unittest.mock`** | `requirements_dev.txt`, ~25 test files | Python 3.10 has `unittest.mock` in stdlib. Mechanical import swap. | 2–4 hrs | Dev pip |
| **`babel-eslint` + `eslint-loader`** | `package.json`, `webpack.config.js` | Deprecated; swap to `eslint-webpack-plugin` + `@babel/eslint-parser` during webpack 5 migration. | Part of Phase 4 | Many dev alerts |
| **`advocate` → `requests`** | `requirements.txt`, `redash/utils/requests_session.py` | Replace to unlock `requests` / `urllib3` bumps (15 held-by-design alerts). | 1–2 days | 15 runtime pip |

---

## Not removal candidates

These look old or noisy but are still required.

| Keep | Why |
|---|---|
| **Enzyme + Jest 24** | 180 unit tests depend on them. Removal = migrate to Testing Library (separate project). |
| **`babel-plugin-istanbul`** | Required by Jest test env in `client/.babelrc`. |
| **`babel-plugin-transform-builtin-extend`** | Active in `client/.babelrc` for `Error` subclassing. |
| **`raw-loader`** | Used in `webpack.config.js` for HTML template loading. |
| **`markdown`**, **`bootstrap`** | Shipped in production bundles — triaged under AO-19387, not deletion. |
| **`eslint-plugin-compat`** | Active in `client/.eslintrc.js`. |
| **`mockdate`** | Used in Jest setup (`client/app/__tests__/mocks.js`, `viz-lib/__tests__/mocks.js`). |
| **`sshtunnel`** | SSH tunnel support for data sources. |
| **`xlsxwriter`** | Excel export feature. |
| **Extensions / `bin/bundle-extensions`** | Wired into build and periodic jobs; `wide_footer` extension is live. |
| **`maxminddb-geolite2`** | Geo-IP for event logging (`redash/handlers/events.py`). DB is stale (2018) but functional — upgrade is separate from removal. |

---

## Suggested execution order

1. ~~**Tier 1 batch**~~ — done (`f50a5dae`)
2. ~~**Tier 4 — destinations + LDAP**~~ — done (`abc34398`)
3. ~~**Tier 2 — `ptpython` / `manage shell`**~~ — done *(this commit)*
4. **Tier 2 batch (remaining)** — `ptvsd`, `webpack-build-notifier`, `ts-migrate`, `eslint-plugin-flowtype`; drop `webpack-bundle-analyzer` if `npm run analyze` is unused
5. **Confirm Tier 3** with team — delete `.circleci/` and/or `.restyled.yaml` if unused

---

## Related artifacts

- `security-audit-2026/SECURITY_AUDIT_ROUND_2.md` — Dependabot triage and phased plan
- `security-audit-2026/dependabot-open-v2.json` — latest alert export (278 open, post-Cypress)
- `security-audit-2026/dependabot-non-dev-v2.tsv` — 134 non-dev alerts with triage categories
