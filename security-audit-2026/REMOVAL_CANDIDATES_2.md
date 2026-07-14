# Removal Candidates — Round 2

Date: 2026-07-13  
Scope: `AveaSolutions/redash` @ `rcm-security-patches`  
Context: Post–Round 1 ([`REMOVAL_CANDIDATES.md`](REMOVAL_CANDIDATES.md)), Webpack 5, Jest 28, ESLint 8, `marked`, `dompurify` 3.x, `plotly` 3.x, `requests-hardened`, Node 20 Docker, AO-19407–AO-19412  
Tracking: Extend [AO-19388](https://kipusystems.atlassian.net/browse/AO-19388) or open follow-up under [AO-19381](https://kipusystems.atlassian.net/browse/AO-19381)

Round 1 removed Cypress/Percy, SSO/LDAP, alert destinations, CircleCI, Restyled, and several dev deps. **This pass finds new dead code exposed by those migrations** plus items Round 1 deferred.

**Dependabot context:** **25 open** alerts at time of this sweep (down from 34 after AO-19412).

---

## Progress since Round 1 (reference)

| Change | Ticket | Impact on removal sweep |
|--------|--------|-------------------------|
| Webpack 4 → 5 | AO-19407+ | `raw-loader` replaced by `asset/source`; `watch:app` script is orphaned |
| Jest 24 → 28 | AO-19396 | Enzyme still present — still Tier 5 migration |
| `babel-plugin-transform-builtin-extend` removed | AO-19411 | `babel-traverse@6` chain may be fully gone — verify before dismiss |
| `advocate` → `requests-hardened` | *(done)* | Tier 5 advocate item **closed**; update stale audit docs |
| `markdown` → `marked` | AO-19393 | `markdown` npm dep gone |
| Bootstrap vendored | AO-19394 | npm `bootstrap` gone |
| Nested npm pins | AO-19408, AO-19412 | Security override pins are **not** removal candidates |

---

## Tier 1 — Delete with minimal risk

| Candidate | Location | Why remove | Effort | Dependabot / security |
|-----------|----------|------------|--------|----------------------|
| **`RestrictedPython`** | `requirements.txt:45` | Zero `import RestrictedPython` in any `.py` file. Was for removed Python query runner. | ~15 min | Drops runtime pip dep; was flagged in Sema/poetry exports |
| **`httplib2`** | `requirements.txt:24` | Zero imports. Only kept for `pyparsing` pin comment (httplib2 needs `<3`). | ~15 min | Minor pip cleanup; simplify `pyparsing` comment |
| **Percy CSS (Round 1 miss)** | `client/app/components/ApplicationArea/ApplicationLayout/index.less:67-79`, `client/app/pages/alert/components/Query.less:14-21` | `@media only percy` blocks after AO-19386 Percy removal | ~15 min | None |
| **Cypress/Puppeteer env vars** | `Dockerfile:6-7`, `Makefile:38` | `CYPRESS_INSTALL_BINARY`, `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` — packages removed in AO-19386 | ~10 min | None |
| **GitHub OSS templates** | `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `.github/config.yml`, `.github/support.yml` | Round 1 deferred; upstream contribution boilerplate. Avea uses Azure DevOps + Jira | ~15 min | None |
| **Stale root `SECURITY_AUDIT.md`** | `/SECURITY_AUDIT.md` | Pre-remediation snapshot; duplicates `security-audit-2026/`. References removed `ldap_auth`, `advocate`, Python 3.7 | ~10 min | None — reduces auditor confusion |
| **`CONTRIBUTING.md`** | `/CONTRIBUTING.md` | Upstream OSS contribution guide (`discuss.redash.io`) | ~5 min | None |
| **Upstream release scripts** | `bin/release_manager.py`, `bin/get_changes.py` | Target `getredash/redash` GitHub API; not wired into Makefile/Docker/Azure CI | ~15 min | None |
| **`watch:app` npm script** | `package.json:12` | Webpack 4 flags (`--colors -d`); not used by `start`/`watch` | ~5 min | None |
| **Stale `engines` metadata** | `package.json:32-35` | Still `node ^12` while Docker/dev use Node 20 (`DEV_README.md`) | ~10 min | None (metadata) |
| **OAuth dev-server proxy** | `webpack.config.js:266` (`/oauth`) | SSO/OAuth removed in Round 1 Tier 4 | ~10 min | None |
| **Orphan settings: BigQuery/Kylin** | `redash/settings/__init__.py:356-374` | `BIGQUERY_HTTP_TIMEOUT`, `KYLIN_*` — no query runners reference them | ~15 min | None |
| **`extendedAlertOptions` leak** | `redash/settings/__init__.py:351-352`, `redash/handlers/authentication.py:277` | Sent in `client_config`; zero frontend reads | ~15 min | None |
| **Dead HelpTrigger data-source keys** | `client/app/components/HelpTrigger.jsx:27-36` | `DS_ATHENA`, `DS_BIGQUERY`, `DS_MONGODB`, `DS_GOOGLE_*`, `DS_AXIBASETSD`, `DS_URL` never match fork types (`pg`, `mssql`, `mssql_odbc`, `query_results`) | ~20 min | None |
| **`DS_RESULTS` typo** | `HelpTrigger.jsx:37` | `query_results` runner maps to `DS_QUERY_RESULTS` (if defined) not `DS_RESULTS` — help link never shows | ~10 min | None |
| **Unreachable Databricks UI blurb** | `client/app/components/CreateSourceDialog.jsx:123-129` | `databricks` not in `QUERY_RUNNERS` | ~10 min | None |
| **Ace python/json/yaml modes** | `client/app/components/queries/QueryEditor/ace.js:6-9,25-28` | All fork runners use `syntax = "sql"` only (`redash/query_runner/__init__.py:68`) | ~30 min | Slight ace bundle shrink |
| **`queryFormat` json branch** | `client/app/lib/queryFormat.ts:10`, `queryFormat.test.js` | No data source exposes `syntax: "json"` | ~15 min | None |
| **Stale Dockerfile comment** | `Dockerfile:11` | Says "node:12"; base is `node:20-bullseye` | ~5 min | None |
| **Misleading auth help copy** | `AuthSettings/index.jsx` + `HelpTrigger` `AUTHENTICATION_OPTIONS` | Points to upstream SSO/password docs after SSO removal | ~15 min | Replace copy, don't delete settings page |

---

## Tier 2 — Dev dependencies / tooling

| Candidate | Location | Why remove | Effort | Dependabot / security |
|-----------|----------|------------|--------|----------------------|
| **viz-lib Webpack UMD build** | `viz-lib/webpack.config.js`, `package.json` scripts `build:webpack`/`watch:webpack`, devDeps `webpack`/`webpack-cli` in viz-lib | Client imports `@redash/viz/lib` exclusively (18+ imports); **zero** `@redash/viz/dist` usage. Root `postinstall` runs only `build:babel` | 1–2 hrs | Drops duplicate webpack chain in viz-lib |
| **`@types/babel__traverse`** | `package.json:88` | No direct source usage; transitive via babel-jest only | ~10 min | Minor dev npm |
| **`eslint-plugin-compat`** | `package.json:113`, `client/.eslintrc.js` | `compat/compat` rule explicitly **off** (line 24); extends `plugin:compat/recommended` for no active enforcement | ~30 min | Dev npm — Round 1 kept; re-evaluate |
| **`react-test-renderer`** | `package.json:138` | Single consumer: `ReadOnlyUserProfile.test.js` | ~30 min | Dev npm — fold into enzyme or RTL first |
| **viz-lib `prettier@1.19`** | `viz-lib/package.json:77` | Manual script only; not in CI; ancient major | ~15 min | Dev npm |
| **Move `lodash` to `dependencies`** | `package.json:130` (devDeps) | 100+ runtime imports in `client/` — mis-categorized, not unused | ~10 min | Housekeeping only |

### Intentionally keep (Tier 2 negative list)

| Keep | Why |
|------|-----|
| Security override pins (`ajv`, `minimatch`, `json5`, `ws`, etc.) | AO-19408/19412 Dependabot mitigation — **do not remove** until upstream chains clear |
| `babel-plugin-istanbul` | Jest coverage via `client/.babelrc` test env |
| `enzyme` + `enzyme-adapter-react-16` | 17+ client test files; Tier 5 migration |
| `mockdate` | Jest setup in `client/app/__tests__/mocks.js`, `viz-lib/__tests__/mocks.js` |

---

## Tier 3 — Infrastructure / upstream leftovers

| Candidate | Location | Why remove | Effort | Dependabot |
|-----------|----------|------------|--------|------------|
| **`bin/upgrade`** | `bin/upgrade` | Upstream `/opt/redash` release upgrader + `version.redash.io`; not Avea deploy path | ~30 min | None — confirm ops runbook |
| **`CHANGELOG.md`** | `/CHANGELOG.md` (~1600 lines) | Upstream OSS history back to v0.x | ~15 min | None — archive or truncate |
| **Upstream package metadata** | `package.json:28-41`, `viz-lib/package.json:22-25` | `getredash/redash` repo URL, `redash.io` homepage | ~10 min | None |
| **`docker-compose.yml` comment** | Line 2 | Points to `getredash/setup` | ~5 min | None |

---

## Tier 4 — Product / feature pruning (confirm with Avea)

| Candidate | Location | Why remove | Effort | Risk |
|-----------|----------|------------|--------|------|
| **Databricks stack** ⭐ | Backend: `redash/handlers/databricks.py`, `redash/tasks/databricks.py`, routes `redash/handlers/api.py:154-164`. Frontend: `client/app/services/databricks-data-source.js`, `client/app/components/queries/editor-components/databricks/*`, `editor-components/index.js:11-15` | `QUERY_RUNNERS` hardcoded to pg/mssql/mssql_odbc/query_results only — no `databricks` runner | 2–4 hrs | **Med** — delete routes + UI + tasks together |
| **Version check / phone-home** | `redash/version_check.py`, `redash/tasks/general.py:34-35`, `redash/tasks/schedule.py:86-87`, `client/app/components/ApplicationArea/ApplicationLayout/VersionInfo.jsx`, `bin/upgrade` | POSTs to `https://version.redash.io/api/report` daily when `VERSION_CHECK=true` | 1–2 hrs | **Med** — privacy/product decision |
| **Beacon consent / usage telemetry** | `BeaconConsent.jsx`, `BeaconConsentSettings.jsx`, `authentication.py:264` | Opt-in usage stats bundled with version check | 1–2 hrs | **Med** |
| **HelpTrigger → redash.io iframes** | `HelpTrigger.jsx` (`DOMAIN = "https://redash.io"`) | External docs for removed DS types and SSO; iframe drawer UX | 2–4 hrs | **Med** — replace with internal docs or simplify |
| **`MULTI_ORG`** | `redash/settings/__init__.py:179`, `client/app/multi_org.html`, `webpack.config.js:99-101`, auth handlers | Default `false`; tests enable via `tests/__init__.py` | 4–8 hrs | **High** — confirm Avea single-org |
| **Password login UI** | `PasswordLoginSettings.jsx`, Flask login templates | `AUTH_TYPE` default `api_key`; password+HMAC still in backend for admin? | 4–8 hrs | **High** — confirm kipu-rcm admin flows |
| **`ALLOW_PARAMETERS_IN_EMBEDS` deprecation** | `redash/settings/__init__.py:361-362`, `Home.jsx:29` | Deprecated upstream; banner only | ~1 hr | Low–Med |
| **`EVENT_REPORTING_WEBHOOKS`** | `redash/settings/__init__.py:295-296`, `redash/tasks/general.py:20` | Only if env var set | ~30 min | Med — confirm Avea env |

---

## Tier 5 — Mechanical migration (sheds deps over time)

| Candidate | Location | Approach | Effort | Dependabot |
|-----------|----------|------------|--------|------------|
| **`mock` → `unittest.mock`** | `requirements_dev.txt:2`, **24** files under `tests/` | Python 3.10 stdlib; mechanical import swap | 2–4 hrs | Dev pip |
| **Enzyme → Testing Library** | `package.json` enzyme stack; enzyme in **17+** client tests + viz-lib chart/table editor tests | Large test migration | 1–2 weeks | Major dev npm chain |
| **`core-js@2` via `.babelrc`** | `client/.babelrc:7-8` (`useBuiltIns: "usage", corejs: 2`) | Upgrade to `core-js@3` or drop polyfills if browserslist allows | 4–8 hrs | Dev/build npm |
| **`importlib-metadata==4.13.0`** | `requirements_bundles.txt`, `redash/extensions.py`, `bin/bundle-extensions` | Migrate entry_points API for 5.x+ | 4–8 hrs | Runtime pip |
| **`sql-formatter` git dep** | `package.json:71` | Replace git URL with npm when compatible | 1–2 days | Dev npm |
| ~~**`advocate` → `requests-hardened`**~~ | — | **Done** — `requests-hardened==1.2.2` in `requirements.txt` | — | Closed |

---

## Not removal candidates

| Keep | Why |
|------|-----|
| **Query runners** (pg, mssql, mssql_odbc, query_results) | Hardcoded `QUERY_RUNNERS`; Avea SQL Server + Postgres |
| **Destinations** (email, slack, webhook) | Hardcoded `DESTINATIONS` |
| **`pystache`, `disposable-email-domains`** | `parameterized_query.py`, `handlers/users.py` |
| **`simplejson`, `funcy`, `parsedatetime`, `user-agents`** | Active backend imports |
| **`supervisor`, `supervisor_checks`** | `worker.conf`, `docker-entrypoint`, `redash/cli/rq.py` |
| **`sshtunnel`, `xlsxwriter`, `requests-hardened`** | SSH data sources, Excel export, hardened HTTP |
| **`maxminddb-geolite2`** | `handlers/events.py` geo-IP (stale 2018 DB — upgrade separate) |
| **`marked`, `dompurify`, `plotly.js`, `axios`, `axios-auth-refresh`** | Production runtime |
| **`mustache`, `mousetrap`, `use-media`, `use-debounce`, `path-to-regexp`, `query-string`** | Active client imports |
| **`font-awesome`, `material-design-iconic-font`, vendored bootstrap LESS** | `main.less` / `server.less` |
| **`d3`, `leaflet`, `react-pivottable`, `plotly.js`, viz map assets** | viz-lib renderers |
| **`extensions` / `bin/bundle-extensions`** | Build + periodic jobs; `wide_footer` extension path |
| **`embed`, dashboards, alerts, query_snippets, widgets** | Live API + client pages |
| **Security override pins** | Intentional AO-19408/19412 mitigation |
| **`raw-loader`** | **Removed** in Webpack 5 — uses `asset/source` in `webpack.config.js:157` |
| **Password + API key / HMAC auth** | kipu-rcm auth model after SSO removal |

---

## Suggested execution order

1. **Tier 1 pip orphans** — `RestrictedPython`, `httplib2` (quick security hygiene)
2. **Tier 1 Percy CSS + Cypress/Puppeteer env + OAuth proxy** — cleanup from Round 1 migrations
3. **Tier 4 Databricks full stack** — largest coherent dead-feature delete (~10 files)
4. **Tier 1 docs/CI** — `.github/*`, `CONTRIBUTING.md`, stale `SECURITY_AUDIT.md`, release scripts
5. **Tier 2 viz-lib webpack UMD** — after `npm run build` + tests verify
6. **Tier 1 HelpTrigger dead keys + Ace mode trim + `queryFormat` json**
7. **Tier 4 product decisions** — version check, beacon, redash.io HelpTrigger (privacy/UX)
8. **Tier 5 `mock` → `unittest.mock`** — low-risk mechanical win
9. **Tier 5 Enzyme migration** — schedule as separate project

---

## Verification (per batch)

| Area | Command |
|------|---------|
| Frontend lint | `npm run lint` |
| Frontend tests | `npm test` |
| viz-lib tests | `cd viz-lib && npm test` |
| Production build | `npm run build` |
| Backend tests | `make backend-unit-tests` or `docker compose run --rm server tests` |

---

## Related artifacts

- Round 1: [`REMOVAL_CANDIDATES.md`](REMOVAL_CANDIDATES.md)
- Sema crosswalk: [`SEMA_CROSSWALK.md`](SEMA_CROSSWALK.md)
- Dependabot Round 4: [`SECURITY_AUDIT_ROUND_4.md`](SECURITY_AUDIT_ROUND_4.md)
- Epic: [AO-19381](https://kipusystems.atlassian.net/browse/AO-19381)
