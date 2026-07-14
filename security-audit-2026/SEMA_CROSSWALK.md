# Sema Security Audit × Dependabot Crosswalk (Redash)

Date: 2026-07-13  
Sema source: `SecurityIssues_JustRedash.csv` (file mtime **2026-07-13 15:06 ET**)  
Repo assessed: `AveaSolutions/redash` @ `rcm-security-patches` (local HEAD)  
Dependabot baseline: **34 open** (post–poetry.lock dismiss, Round 4)

---

## Executive summary

The Sema export contains **852 rows** total; **700 apply to `redash`** (group `Kipu RCM-Production-Fork`). The other **152 rows are `kipu-payments`** — out of scope for this Redash fork.

| Lens | Count | Takeaway |
|------|-------|----------|
| Sema redash findings | **700** rows · **143** packages · **321** CVEs | Broad SCA pass (npm + pip) |
| Dependabot open today | **34** | Narrow GitHub-native subset |
| Package overlap | **14** packages in both | Core of remaining work |
| Sema-only packages | **129** | Mostly **already fixed or removed** in current branch |

**Bottom line:** Sema is **not showing a large new vulnerability surface** beyond what Dependabot already tracks. The audit is valuable as a **breadth check**, but **~90% of Sema rows describe packages/versions that are gone or upgraded** on `rcm-security-patches` today. The **actionable remainder** is the same dev-transitive npm chain + held Python stack already in Round 3–4.

---

## 1. Methodology

1. Parsed Sema CSV (`latin-1` encoding; UTF-8 has embedded `0xa0` bytes).
2. Filtered `Repository == redash` (700 rows).
3. Compared package names to **34 open Dependabot** alerts.
4. Verified **current** versions in `package-lock.json`, `viz-lib/package-lock.json`, `requirements.txt`.
5. Classified each of **143 Sema packages** into: `RUNTIME_FIXED`, `LIKELY_FIXED_UPGRADED`, `REMOVED_FROM_TREE`, `NESTED_OLD_VERSION`, `PYTHON_HELD_OR_PINNED`.

Sema rows often cite **specific old versions** (e.g. `axios@0.19.2`) even when `Version Range Requirements` JSON references many historical paths — assessment uses **whether that version still exists in the current lockfiles/requirements**.

---

## 2. Sema vs Dependabot coverage

### 2.1 Scale

| Metric | Sema (redash) | Dependabot (open) |
|--------|---------------|-------------------|
| Finding rows | 700 | 34 |
| Unique packages | 143 | 16 |
| HIGH | 332 | 20 |
| MEDIUM | 341 | 13 |
| LOW | 27 | 1 |
| Manifests | `package-lock.json` (264), `requirements.txt` (69), blank (363) | lockfiles + requirements |

Dependabot does **not** surface most historical/transitive findings Sema reports. Sema is **much broader**; Dependabot is **more conservative** and tracks fewer ecosystems/CVE linkages.

### 2.2 Packages in both (14) — **still relevant**

These overlap and remain open (nested dev or Python hold):

`babel-traverse`, `brace-expansion`, `decode-uri-component`, `flask`, `hosted-git-info`, `js-yaml`, `json5`, `minimatch`, `minimist`, `nth-check`, `path-parse`, `semver`, `serialize-javascript`, `werkzeug`

### 2.3 Dependabot-only (2)

| Package | Notes |
|---------|-------|
| `@babel/runtime` | Sema flags older copies indirectly; Dependabot explicit on 7.26.10 |
| `cross-spawn` | Nested 6.0.5; Sema may bundle under other advisories |

### 2.4 Sema-only top packages (129) — **mostly not new work**

| Package | Sema rows | Current branch status |
|---------|-----------|----------------------|
| **axios** | 74 | **FIXED** — `0.33.0` (root + viz-lib); Sema cites 0.19–0.21 |
| **lodash** | 59 | **FIXED** — `4.18.1`; Sema cites 4.17.20 |
| **handlebars** | 49 | **REMOVED** — not in lockfiles (was dev/template chain) |
| **follow-redirects** | 22 | **FIXED** — `1.16.0` via axios upgrade |
| **postcss** | 21 | **UPGRADED** — `8.5.16` |
| **tar** | 19 | **REMOVED** from current tree |
| **qs** | 17 | **UPGRADED** — `6.15.3` at root; dev transitive |
| **loader-utils** | 15 | **UPGRADED** — `2.0.4`; Sema cites 0.x/1.x |
| **elliptic** | 15 | **REMOVED** |
| **authlib** | 13 | **REMOVED** from `requirements.txt` (SSO auth removal) |
| **node-forge** | 11 | **REMOVED** |
| **debug** | 11 | **MIXED** — `3.2.7` present; older 2.6.9 nested (dev) |
| **express** | 10 | Dev tooling — `5.2.1` via webpack-dev-server chain |
| **dompurify** | 8 | **FIXED** — `3.4.11` (Sema cites 2.x) |
| **cryptography** | 8 | **FIXED** — `48.0.1` (Sema cites 41.x) |
| **pyjwt** | 7 | **REMOVED** from requirements |
| **tough-cookie** | 9 | **UPGRADED** — `4.1.4` |

**Interpretation:** High Sema row counts for axios/lodash/handlebars are **historical noise** — Dependabot already closed many of these after Tier 1/2 remediation. Sema does not appear to have been re-baselined against post-patch lockfiles, or it reports **all CVE × version permutations** in evidence paths.

---

## 3. Findings **NOT** in Dependabot (significant)

These are the meaningful Sema categories **absent from the 34 open Dependabot alerts**:

### 3.1 Fixed runtime — Sema flags, Dependabot closed/absent ✅

| Area | Sema evidence | Current state |
|------|---------------|---------------|
| **axios** (CVE-2025-62718, CVE-2026-42043, …) | 47 HIGH rows on 0.19–0.21 | `0.33.0` |
| **lodash** (CVE-2026-4800, prototype pollution set) | 59 rows on 4.17.20 | `4.18.1` |
| **dompurify** (mXSS / hook advisories) | 8 rows on 2.x | `3.4.11` |
| **plotly.js** | 2.x CVEs | `3.7.0` |
| **PyYAML** | `pyyaml@5.1.2` CVEs | `PyYAML==6.0.1` |
| **RestrictedPython** | `5.0` CVE-2023-37271 | `8.1` |
| **pycrypto** | CVE-2013-7459 | **removed** (Round 1) |
| **authlib / pyjwt** | 13 + 7 pip rows | **not in requirements** (SSO removed) |
| **cryptography** | 41.x CVEs | `48.0.1` |
| **requests / urllib3** | old 2.31 / 1.26 | `2.33.0` / `≥2.2.0` |

**No further action** unless Sema rescans and still sees old versions.

### 3.2 Removed packages — Sema-only, tree clean ✅

70 of 143 Sema packages are **absent** from current lockfiles/requirements, including:

`handlebars`, `tar`, `elliptic`, `node-forge`, `socket.io-parser`, `rollup`, `prismjs`, `karma`, `cypress` chain remnants, `request`, `async`, `hoek`, `immer`, `ramda`, etc.

### 3.3 Still open — Sema + codebase agree ⚠️

| Package | Sema rows | Still in tree | Dependabot? | Exposure |
|---------|-----------|---------------|-------------|----------|
| **js-yaml** | 10 | `3.14.0` in viz-lib | ✅ open | Dev / build |
| **minimist** | 9 | `1.2.5` nested | ✅ open | Dev (loader-utils) |
| **minimatch** | 8 | `3.0.4`, `3.1.5` nested | ✅ open | Dev (jest/eslint) |
| **json5** | 4 | `0.5.1`, `2.1.3` nested | ✅ open | Dev |
| **serialize-javascript** | 9 | `6.0.2` + `7.0.7` | ✅ open | Build |
| **werkzeug** | 10 | `2.3.8` pinned | ✅ open | **Runtime — held** |
| **flask** | 2 | `2.3.2` pinned | ✅ open | **Runtime — held** |
| **babel-traverse** | 1+ | `6.26.0` | ✅ open | Dev, **no patch** |
| **semver** | 5 | `5.7.1` in viz-lib | ✅ open | Dev |
| **nth-check**, **decode-uri-component**, **brace-expansion**, **hosted-git-info**, **path-parse** | 1–2 each | old nested copies | ✅ open | Dev |

**Only Sema finding still present without Dependabot:** `sqlalchemy-searchable@0.10.6` (1 row) — **intentionally pinned** (PG compatibility, Round 1); not a CVE fix path.

### 3.4 Python — Sema pip rows (73)

| Package | Sema rows | Current | Status |
|---------|-----------|---------|--------|
| authlib | 13 | absent | **Removed** — dismiss |
| werkzeug | 10 | `2.3.8` | **Held** — Tier 3 Flask 3 |
| cryptography | 8 | `48.0.1` | **Fixed** |
| pyjwt | 7 | absent | **Removed** |
| requests | 4 | `2.33.0` | **Fixed** |
| jinja2 | 3 | `3.1.6` | **Fixed** |
| pyyaml | 3 | `6.0.1` | **Fixed** |
| restrictedpython | 3 | `8.1` | **Fixed** |
| pycrypto | 2 | absent | **Removed** |
| flask | 2 | `2.3.2` | **Held** |
| sqlalchemy-searchable | 1 | `0.10.6` | **Held by design** |

No net-new Python CVE work beyond Round 3 Tier 3 planning.

---

## 4. Are Sema findings “legit”?

| Category | Legit? | Still an issue on `rcm-security-patches`? |
|----------|--------|-------------------------------------------|
| Historical npm versions (axios 0.19, lodash 4.17.20, dompurify 2.x) | Yes — were real | **No** — upgraded |
| Removed deps (handlebars, tar, authlib, pyjwt, pycrypto) | Yes — were real | **No** — removed |
| Nested dev transitive (minimatch, json5, js-yaml, …) | Yes | **Yes** — dev/build only |
| Werkzeug/Flask CVEs requiring 3.x | Yes | **Accepted hold** |
| `poetry.lock` issues | N/A in Sema CSV | Removed from `master` (Round 4) |
| kipu-payments rows in same CSV | Legit for that repo | **Out of scope** |

**False positives for *current* Redash deploy:** ~**633/700** rows (91%) describe versions or packages **not present** in today's tree. That is not Sema being wrong historically — it is **remediation outpacing the Sema export snapshot**.

---

## 5. npm audit cross-check

Local `npm audit` (root): **76** vulnerabilities (2 critical, 5 high, 69 moderate) — aligns with Sema's dev-transitive story, **broader** than Dependabot's 27 npm alerts.

| Source | npm findings | pip findings |
|--------|--------------|--------------|
| Sema | ~627 rows | ~73 rows |
| Dependabot open | 27 | 7 |
| npm audit | 76 | — |

---

## 6. Recommended actions

### No new emergencies from Sema

1. **Do not reopen** axios/lodash/dompurify/handlebars/authlib work — Sema rows are **stale relative to branch**.
2. **Continue** Tier 2/3 track: nested npm pins, Webpack 5, Flask 3/Werkzeug 3.
3. **Dismiss** Sema-equivalent Python holds with same rationale as Dependabot (Werkzeug/Flask).
4. **Re-run Sema** against `rcm-security-patches` @ latest commit after user triggers scan — expect **large drop** from 700 rows.

### Optional Sema-specific follow-ups (low priority)

| Item | Effort | Notes |
|------|--------|-------|
| Bump viz-lib `js-yaml` nested 3.14.0 → 3.15+ | Low | Clears Sema + Dependabot |
| Pin/dedupe `minimist@1.2.5` via loader-utils | Low | Already attempted Tier 2 |
| Remove `babel-plugin-transform-builtin-extend` | Low | Drops babel-traverse@6 critical |
| Document `sqlalchemy-searchable` pin for auditors | Trivial | 1 Sema row, no Dependabot |

---

## 7. Artifacts

| File | Purpose |
|------|---------|
| `SEMA_CROSSWALK.md` | This document |
| `SEMA_STILL_OPEN.tsv` | Machine-readable short list of still-actionable items |
| `dependabot-open-v6.json` | Dependabot baseline used for comparison |

---

## 8. References

- Round 4 Dependabot triage: `SECURITY_AUDIT_ROUND_4.md`
- Round 3 remaining work: `SECURITY_AUDIT_ROUND_3.md`
- Round 1 remediation plan: `SECURITY_AUDIT_ROUND_1.md`
