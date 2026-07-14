# AveaOffice Redash Fork — Security Audit Round 4 (Dependabot rescan triage)

Date: 2026-07-13  
Scope: `AveaSolutions/redash` @ `rcm-security-patches` (default branch)  
Data source: GitHub Dependabot export `security-audit-2026/dependabot-open-v6.json` (125 open, exported after fresh rescan ~2026-07-13 18:14 UTC)

---

## Executive summary

**The jump from ~34 → 125 open alerts is not 91 new vulnerabilities on your deployment branch.** Dependabot re-scanned and reopened/refreshed **91 alerts against `poetry.lock`**, which exists only on the legacy **`master`** branch — not on `rcm-security-patches`, `v10`, or local checkout.

| Bucket | Open alerts | Applies to production / `rcm-security-patches`? |
|--------|-------------|--------------------------------------------------|
| **`poetry.lock` (master only)** | **91** | **No** — fork holdover; deploy uses `requirements.txt` |
| **`requirements.txt` + npm lockfiles** | **34** | **Yes** — these are the real set to track |

**Verdict:** 91 alerts are **legitimate CVEs in a file you don't ship**, but **not actionable** for the Avea v10 fork unless you deploy `master`. The remaining **34 are real Dependabot findings** on manifests you actually use; most are **dev-only npm transitive** (24) or **deliberately held Python** (7).

---

## 1. Why the count jumped

| Export | Total open | Notes |
|--------|------------|-------|
| v5 post–Tier 2 (2026-07-13) | **47** | Branch `rcm-security-patches-2` (local); 40 npm + 7 pip |
| User baseline before rescan | **~34** | Matches non-`poetry.lock` count after rescan |
| **v6 (this audit)** | **125** | **+91** all on `poetry.lock`, all `updated_at` **2026-07-13** |

Dependabot scans **all branches/manifests** in the repo. `master` still contains upstream-style Poetry files:

| Branch | `poetry.lock` | `requirements.txt` | Deployed? |
|--------|---------------|--------------------|-----------|
| **`rcm-security-patches`** (default) | ❌ absent | ✅ present | **Yes** |
| `v10` | ❌ absent | ✅ present | Avea lineage |
| **`master`** | ✅ 354 KB | varies | **No** — legacy mirror |

Sample versions in **`master` `poetry.lock`** vs **`rcm-security-patches` `requirements.txt`**:

| Package | `master` poetry.lock | `requirements.txt` (deploy) |
|---------|---------------------|-----------------------------|
| authlib | 0.15.5 | *(not direct; different stack)* |
| cryptography | 41.0.4 | **48.0.1** |
| urllib3 | 1.26.17 | **≥2.2.0,<3.0** |
| werkzeug | 2.3.6 | **2.3.8** |
| requests | 2.31.0 | **2.33.0** |

The poetry alerts are **real for `master`**, but **stale noise for your fork** — same conclusion as Round 1–3, now amplified by rescan.

---

## 2. `poetry.lock` alerts (91) — recommended action

**Do not treat as new work on `rcm-security-patches`.**

### Option A — Bulk dismiss (fastest)

Dismiss all 91 with reason **“Not used”** / comment:

> `poetry.lock` exists only on legacy `master`. Avea deployment uses `requirements.txt` on `rcm-security-patches`. Versions in poetry.lock are not installed in Docker/production images.

Package concentration (duplicate casing inflates counts):

| Package | Alerts | Notes |
|---------|--------|-------|
| authlib | 10 | Old 0.15.x in poetry.lock |
| cryptography | 9 | 41.0.4 vs 48.0.1 in requirements |
| urllib3 | 8 | 1.26.x vs 2.x in requirements |
| Werkzeug + werkzeug | 7 | Duplicate GHSA entries |
| snowflake-connector-python | 4 | Optional DS; not Avea MSSQL path |
| PyJWT + pyjwt | 4 | Duplicate casing |
| jwcrypto, requests, jinja2, … | 1–3 each | Transitive in poetry.lock |

Severity (poetry only): 3 critical · 34 high · 45 medium · 9 low.

### Option B — Stop the bleed (permanent)

Delete `poetry.lock` and `pyproject.toml` from **`master`** (or archive/delete `master` if unused). Prevents future rescans from reopening the same alerts.

---

## 3. Real alerts on `rcm-security-patches` (34)

### 3.1 By manifest

| Manifest | Open |
|----------|------|
| `package-lock.json` | 21 |
| `viz-lib/package-lock.json` | 6 |
| `requirements.txt` | 7 |

### 3.2 By category

| Category | Count | Legit? | Action |
|----------|-------|--------|--------|
| **Python held by design** (Flask 2.3 / Werkzeug 2.3.8) | 7 | Yes — advisories require 3.x | **Dismiss** (Round 2 §2.1); Tier 3 Flask 3 later |
| **npm nested dev transitive** | 24 | Yes — old copies still in lockfile tree | Pins/overrides or Webpack 5 migration; **not production runtime** |
| **babel-traverse@6** (no patch) | 1 | Yes — dev-only Babel 6 chain | **Dismiss** or remove `babel-plugin-transform-builtin-extend` |
| **serialize-javascript** (6.x nested + 7.x alert) | 2 | Partially fixed — root on **7.0.7**, **6.0.2** still nested | Pin/dedupe nested 6.x or dismiss build-time |

### 3.3 npm — lockfile evidence (nested copies Dependabot still flags)

| Package | Vulnerable copies still in tree | Patched copies also present | Dependabot open |
|---------|--------------------------------|-----------------------------|-----------------|
| minimist | **1.2.5** (via loader-utils) | 1.2.8 | 1 |
| json5 | **0.5.1**, **2.1.3** | 2.2.3 | 4 |
| minimatch | **3.0.4**, **3.1.5** | 9.0.9, 10.2.5 | 4 |
| semver | **5.7.1** (viz-lib) | 7.8.5 | 1 |
| cross-spawn | **6.0.5** | 7.0.6 | 1 |
| @babel/runtime | **7.7.x–7.10.x** | 7.29.7 | 2 |
| js-yaml | **3.14.0** (viz-lib) | 4.3.0 (root) | 4 |
| serialize-javascript | **6.0.2** | **7.0.7** | 2 |
| babel-traverse | **6.26.0** only | — | 1 (critical, no fix) |
| decode-uri-component, nth-check, brace-expansion, hosted-git-info, path-parse | old minors | newer elsewhere | 1 each |

Local `npm audit` (root): **76** findings (2 critical, 5 high, 69 moderate) — broader than Dependabot's 27 npm alerts; same underlying nested-dev issue.

**Production runtime npm** (dompurify, axios, lodash, etc.) is **not** in this 34-alert set — Tier 1/2 work held.

### 3.4 Python — `requirements.txt` (7 alerts)

All are **Werkzeug** (6) + **Flask** (1) advisories whose fixes require **Flask 3 / Werkzeug 3**. Pinned at `Flask==2.3.2`, `werkzeug==2.3.8` by design (Round 1 §3, Round 3 §2.5).

**Legit CVEs, accepted hold** until Tier 3 migration — dismiss with existing rationale.

---

## 4. Are any of the 125 “false positives”?

| Alert set | False positive? | Explanation |
|-----------|-----------------|-------------|
| 91 × `poetry.lock` | **Scope false positive** for Avea deploy | Real CVEs in a **non-shipped** manifest on `master` |
| 7 × Werkzeug/Flask | **Accepted risk**, not mis-detection | Detector correct; fix blocked on major upgrade |
| 24 × npm transitive | **Real but dev-scoped** | Correct GHSA; not reachable in production bundles |
| 1 × babel-traverse | **Real, unfixable** on Babel 6 | Dev-only; no patched version |
| 2 × serialize-javascript | **Real nested 6.x** | Top-level 7.0.7 fixed; nested webpack chain still pulls 6.0.2 |

**None of the 34 are Dependabot mis-identifications.** The inflation is entirely **`poetry.lock` scope**.

---

## 5. Recommended next steps

1. **Today:** Bulk-dismiss **91 `poetry.lock`** alerts (§2 Option A) → UI drops to **34**.
2. **This week:** Dismiss **7 Python** + **1 babel-traverse** with documented rationale → **~26** actionable npm dev alerts.
3. **Optional hygiene:** Remove `poetry.lock` / `pyproject.toml` from `master` (§2 Option B).
4. **Code (unchanged priority):** Tier 3 Flask 3 / Werkzeug 3; Webpack 5 for dev-chain cleanup; `advocate` → `requests-hardened` follow-through.

After step 1–2, **effective open count for your branch ≈ 26 dev npm transitive** — consistent with the ~34 you had before the rescan, not 125 new issues.

---

## 6. Artifacts

| File | Description |
|------|-------------|
| `dependabot-open-v6.json` | Full open alert export (125) |
| `dependabot-export-meta-v6.json` | Summary metadata |
| Prior: `dependabot-open-v5-post-tier2.json` (47 on `rcm-security-patches-2`) |

Re-export after dismissals as **v7**; target **≤34** total open (ideally ~26 after Python/babel dismissals).

---

## 7. References

- Round 3: `SECURITY_AUDIT_ROUND_3.md` (Tier 2, 47-alert baseline)
- Round 2 dismiss buckets: `SECURITY_AUDIT_ROUND_2.md` §2.1
- Epic: [AO-19381](https://kipusystems.atlassian.net/browse/AO-19381)
