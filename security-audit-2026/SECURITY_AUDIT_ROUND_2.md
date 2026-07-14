# AveaOffice Redash Fork — Security Audit Round 2 (Dependabot Triage)

Date: 2026-07-09  
Scope: `AveaSolutions/redash`, post–Round 1 remediation (`aba311bc` merge + `073eff68` follow-up)  
Data source: GitHub Dependabot API export (`security-audit-2026/dependabot-open-v1.json`, 302 open alerts)

Round 1 covered application CVEs, Python runtime deps, and frontend **production** runtime deps.  
Round 2 triages the **remaining open Dependabot alerts** and proposes a phased response.

---

## 1. Executive summary

| Metric | Count |
|---|---|
| **Total open Dependabot alerts** | 302 |
| Development scope | 168 |
| **Non-Development ("runtime") scope** | **134** |
| Non-dev severity | 13 critical · 42 high · 64 medium · 15 low |
| Non-dev ecosystem | 118 npm · 16 pip |

**Key finding:** The 134 non-dev alerts are **legitimate** — Dependabot correctly re-scanned after Round 1.  
However, only **~36** represent meaningfully actionable production risk. The other **~98** are  
documented residual risk (build-toolchain transitive deps + deliberately held Python packages).

Exported artifacts (this directory):

- `security-audit-2026/dependabot-open-v1.json` — full raw export (v1, 302 alerts)
- `security-audit-2026/dependabot-non-dev-v1.tsv` — 134 non-dev alerts with triage category (v1)

---

## 2. Non-development alert triage (134)

### 2.1 Python — held by design (15 alerts) → dismiss/document

| Package | Alerts | Why still open |
|---|---|---|
| `werkzeug` / `Werkzeug` | 6 | Fixes only in 3.x; requires Flask 3 + SQLAlchemy rewrite |
| `urllib3` | 5 | 2.x fixes blocked on `requests` 2.32+ |
| `requests` | 3 | 2.32+ bypasses `advocate` SSRF hooks |
| `flask` | 1 | Same Flask 3 blocker |

Matches Round 1 §5. Legit alerts, deliberate holds. Replacing `advocate` clears 8 of 15.

### 2.2 Frontend runtime — actually shipped (32 alerts) → ticketed work

| Package | Alerts | Severity | Action |
|---|---|---|---|
| **dompurify** | 28 | low (mostly) | Migrate 2.x → 3.2.4+ (breaking; tracked follow-up) |
| **bootstrap** | 2 | medium | Accept risk (LESS-only) or document dismissal |
| **markdown** | 1 | low | Review usage; likely low risk if input is trusted |
| **debug** | 1 | low | Transitive; negligible prod risk |

**dompurify alone is 21% of all non-dev alerts.**

### 2.3 Frontend build toolchain (82 alerts) → bulk dismiss

Packages like `loader-utils`, `serialize-javascript`, `terser`, `elliptic`, `postcss`, `qs`,  
`y18n`, etc. Dependabot tags these as "runtime" because they are transitive deps of production  
`dependencies` (e.g. `@redash/viz` → webpack/babel chain), but they **do not ship in production  
bundles**. Accepted residual risk per Round 1 §2.3.

### 2.4 Plotly transitive (4 alerts) → investigate, likely accept

| Package | Alerts | Notes |
|---|---|---|
| `minimist` | 2 | critical | Via `plotly.js` → `glslify` shader build chain |
| `path-parse` | 2 | medium | Same plotly transitive chain |

Likely not user-reachable in browser context; confirm and document.

### 2.5 Dev Python mis-tagged as runtime (1 alert)

| Package | Manifest | Notes |
|---|---|---|
| `pytest` | `requirements_dev.txt` | GHSA-6w46-j5rx-g56g — see §4.1 |

---

## 3. Recommended path forward

### Phase 1 — Close the noise (low effort)

1. Bulk-dismiss **82 build-toolchain** non-dev alerts: *"Build-time only; not shipped in production bundles (Round 1 §2.3)."*
2. Bulk-dismiss **15 Python held-by-design** alerts: *"Deliberately held; documented in Round 1 §5."*
3. **Bump pytest** to 9.0.3+ and re-run backend tests (see §4.1 — easy win, corrected from initial dismiss recommendation).
4. Dismiss remaining **pytest** alert if still open after bump.

**Estimated dismissals after Phase 1:** ~97 alerts, plus 1 fixed.

### Phase 2 — Real runtime work (ticketed)

1. **dompurify 3.x migration** — highest-value frontend item (28 alerts)
2. **Replace `advocate`** — unlocks `requests`/`urllib3` bumps (8 Python alerts)
3. Evaluate **bootstrap** + **markdown** — likely document-and-dismiss

### Phase 3 — Remove unused Cypress/Percy stack (see §4.3)

High alert-reduction ROI for dev-scope noise. Does **not** fix non-dev build-toolchain alerts.

### Phase 4 — Webpack 4 → 5 (see §4.2)

Clears a large share of remaining dev alerts and many build-toolchain non-dev alerts.  
Medium-hard effort; feasible given prior RCM experience.

### Phase 5 — Long-term

- Flask 3 / Werkzeug 3 / SQLAlchemy migration (track upstream Redash)
- Resume Dependabot selectively after Phase 1 dismissals

---

## 4. Q&A (Round 2)

### 4.1 Why not just fix the pytest alert in Phase 1?

**We should.** The initial "dismiss" recommendation was too conservative.

| Field | Value |
|---|---|
| Current pin | `pytest==7.4.0` (`requirements_dev.txt`) |
| Advisory | GHSA-6w46-j5rx-g56g / CVE-2025-71176 |
| Fixed in | **pytest 9.0.3+** |
| Severity | Medium (CVSS 6.8) |
| Risk | Local `/tmp/pytest-of-{user}` dir hijack on shared UNIX hosts |

This is **not** a patch-level bump (`7.4.0 → 7.4.4` does not fix it). It is a **major upgrade  
(7 → 9)**, so verification means running the full backend suite (`732` tests), not just  
`pip install`.

**Why it's still Phase 1 appropriate:**

- Dev-only dep; zero production/runtime impact
- One-line pin change + test run
- Actually **closes** an alert instead of dismissing it
- `pytest-cov==4.1.0` is compatible with pytest 9 (may want `pytest-cov` 5.x while at it)

**Suggested change:**

```text
pytest==9.0.3
pytest-cov==5.0.0   # optional while touching the file
```

Then: `make backend-unit-tests` or equivalent docker test harness.

---

### 4.2 Webpack 4 → 5: what changes, how hard?

**Configs in this fork:**

| File | Complexity |
|---|---|
| `webpack.config.js` (root client) | High — dev server, multiple HTML entries, LESS, proxies, HMR |
| `viz-lib/webpack.config.js` | Low — single UMD entry, basic loaders |

**Breaking changes that will touch this codebase:**

| Area | Webpack 4 (today) | Webpack 5 action |
|---|---|---|
| **Dev server** | `devServer.inline`, `contentBase`, `publicPath` | `devServer.static`, `devServer.historyApiFallback` API changes; webpack-dev-server 3 → 4/5 |
| **Copy plugin** | `new CopyWebpackPlugin([{ from, to }])` | `new CopyWebpackPlugin({ patterns: [...] })` (plugin v9+) |
| **Asset loaders** | `file-loader`, `url-loader`, `raw-loader` | Prefer `asset/resource`, `asset/inline`, `asset/source` |
| **CSS pipeline** | `css-loader` `minimize: true` | `minimize` removed; use `css-minimizer-webpack-plugin` in production |
| **Lint in build** | `eslint-loader` (deprecated) | `eslint-webpack-plugin` |
| **Manifest** | `webpack-manifest-plugin@2` | v4+ API (`WebpackManifestPlugin`) |
| **Mini CSS extract** | v0.4.x | v2.x for webpack 5 |
| **React refresh** | `@pmmmwh/react-refresh-webpack-plugin@0.4` | Bump to 0.5.x (webpack 5 compatible) |
| **Source maps** | `cheap-eval-module-source-map` | Rename/replace (`eval-cheap-module-source-map`) |
| **Polyfills** | implicit Node polyfills | webpack 5 removes auto-polyfills; may need `resolve.fallback` if any dep needs `crypto`/`stream` |
| **viz-lib externals** | regex `/^antd/i` | Still works; verify UMD output |

**Dependency bumps typically required together:**

- `webpack` 4.44 → 5.x
- `webpack-cli` 3 → 4/5
- `webpack-dev-server` 3 → 4.x (root only)
- `copy-webpack-plugin` 4 → 9+
- `mini-css-extract-plugin` 0.4 → 2.x
- `html-webpack-plugin` 3 → 5
- `css-loader` 0.28 → 5.x (+ `less-loader` 4 → 10+)
- `terser-webpack-plugin` (if extracted explicitly)
- `webpack-bundle-analyzer` 2 → 4+

**Effort estimate (developer who has done webpack 5 before, e.g. RCM app):**

| Scope | Estimate |
|---|---|
| viz-lib webpack 5 | 0.5–1 day |
| Root client webpack 5 + dev server | 2–3 days |
| Jest / CI / `npm 6` lockfile validation | 0.5–1 day |
| Production build + smoke test | 0.5 day |
| **Total** | **~4–6 days** focused work |

**Risk areas specific to this fork:**

- `sql-formatter` git dependency — must still install under **npm 6** (Dockerfile already pins npm 6.14.18)
- Custom `scripts/webpack/overrides` hook — verify after migration
- `postinstall` builds viz-lib — ensure babel + webpack both succeed
- Two-stage build: viz-lib babel → root webpack production bundle

**Alert impact:** webpack 4 chain accounts for a large share of both the 168 dev alerts and the 82  
non-dev build-toolchain alerts. A successful migration is the only path to **actually fixing**  
(not dismissing) most of them.

**Recommendation:** Treat as a dedicated ticket after Cypress removal. Sequence: viz-lib first  
(smaller config), then root client. Compare with upstream Redash v26 webpack config for reference.

---

### 4.3 Removing Cypress: alert impact and local test status

#### Would removing Cypress clear alerts?

**Yes — substantially, for Development-scope alerts.**

| Metric | Value |
|---|---|
| Root `npm audit` advisories touching cypress/percy paths | **123 / 234** (~53%) |
| Dependabot **dev** alerts for packages in those chains | **98 / 168** (~58%) |
| Dependabot dev alerts for cypress-**exclusive** packages | **26** |
| viz-lib alerts from cypress | **0** (cypress is root-only) |

**Packages removed with Cypress stack:**

```text
cypress, @cypress/code-coverage, @percy/cypress, @percy/agent,
@testing-library/cypress, eslint-plugin-cypress
```

Plus ~58 integration spec files under `client/cypress/`.

**What Cypress removal does NOT fix:**

- Non-dev build-toolchain alerts (webpack/babel/terser/postcss) — **82 alerts**
- Python held-by-design alerts — **15 alerts**
- dompurify runtime alerts — **28 alerts**
- jest/eslint dev alerts — significant remainder

**Rough Dependabot impact of Cypress removal:**

| Before | After (estimate) |
|---|---|
| 302 open | **~200–210 open** |
| 168 dev | **~70–80 dev** |

High ROI for a stack you don't use. Low risk if e2e is not gating releases.

#### Do Cypress tests pass locally?

**Not verified end-to-end.** Barriers found:

1. **Native WSL run fails immediately** — `npx cypress verify` errors on missing `libnss3.so`  
   (Cypress 5.3.0 expects OS libraries not present in this WSL image).

2. **CI design assumes Docker** — `.circleci/docker-compose.cypress.yml` +  
   `.circleci/Dockerfile.cypress` (`cypress/browsers:node14.0.0-chrome84`). The npm script  
   `npm run cypress` builds and starts a full Redash docker-compose stack before running tests.

3. **CI config is stale vs Round 1** — `.circleci/config.yml` still references `circleci/node:12`,  
   pre-remediation docker build, and Percy tokens for upstream `getredash/redash`. The  
   `frontend-e2e-tests` job is in the workflow but likely **broken** after Python 3.10 / Node 16 /  
   dependency upgrades unless separately maintained.

4. **Percy coupling** — `npm run cypress run-ci` wraps tests in `percy exec`; removing Cypress  
   should also remove `@percy/agent` and `@percy/cypress` (major alert source).

**Conclusion:** Cypress is effectively **unmaintained dead weight** in this fork — not runnable  
natively on dev machines, tied to obsolete CI images, and not used by the team. Safe to remove  
pending confirmation that AveaOffice does not rely on the CircleCI `frontend-e2e-tests` job.

#### Suggested Cypress removal checklist

- [x] Remove devDependencies: `cypress`, `@cypress/code-coverage`, `@percy/cypress`, `@percy/agent`, `@testing-library/cypress`, `eslint-plugin-cypress`
- [x] Delete `client/cypress/`, `cypress.json`, `.circleci/docker-compose.cypress.yml`, `.circleci/Dockerfile.cypress`
- [x] Remove `frontend-e2e-tests` job from `.circleci/config.yml` workflow
- [x] Remove `npm run cypress` script and related `request`/`request-cookies`/`atob` deps
- [x] Regenerate `package-lock.json` with npm 6
- [ ] Re-export Dependabot alerts and confirm ~90–100 dev alert reduction

---

## 5. Priority matrix

| Action | Effort | Alert impact | Prod risk reduction |
|---|---|---|---|
| Phase 1 dismissals (toolchain + Python holds) | Low | ~97 dismissed | None (documentation) |
| pytest 9.0.3 bump | Low | 1 fixed | None (dev only) |
| Remove Cypress/Percy | Low–medium | ~90–100 dev removed | None |
| dompurify 3.x | Medium | ~28 non-dev | **High** |
| Replace advocate → requests/urllib3 bump | Medium | 8 non-dev | **High** |
| Webpack 4 → 5 | Medium–high | ~100+ across dev+non-dev | Low (build-time) |

---

## 6. References

- Round 1: `security-audit-2026/SECURITY_AUDIT_ROUND_1.md`
- Dependabot export commit scanned: `aba311bc`
- Current branch HEAD at time of export: `073eff68`
