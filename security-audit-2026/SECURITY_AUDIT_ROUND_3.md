# AveaOffice Redash Fork — Security Audit Round 3 (Remaining Work)

Date: 2026-07-10  
Scope: `AveaSolutions/redash` @ `9d257109` (`rcm-security-patches`)  
Data source: GitHub Dependabot export `security-audit-2026/dependabot-open-v3.json` (255 open, exported 2026-07-10 ~02:56 UTC)

Round 3 follows Round 2 triage and the remediation commits on `rcm-security-patches` (Cypress removal, dead-code pruning, pytest 9, dompurify 3.4.11, SSO auth removal, Tier 2/3 dev dep cleanup). **This document lists only what is still open and what to do next.**

---

## 1. Snapshot vs Round 2

| Metric | Round 2 (v2) | Round 3 (v3) | Δ |
|---|---|---|---|
| **Total open** | 278 | **255** | −23 |
| Development | 144 | 136 | −8 |
| **Non-Development** | 134 | **119** | −15 |
| Non-dev severity | 13 crit · 42 high · 64 med · 15 low | 13 crit · 42 high · 51 med · 13 low | med/low shifted |

**Closed since v2 (23 alerts, 0 new):** 14× dompurify, 2× pytest, 2× ejs, 1× webpack-bundle-analyzer, plus scattered dev transitive (flatted, browserify-sign, picomatch, ip).

Exported artifacts:

- `dependabot-open-v3.json` / `dependabot-non-dev-v3.tsv` / `dependabot-export-meta-v3.json`
- Prior: `dependabot-open-v2.json` (278), `dependabot-open-v1.json` (302)

---

## 2. Still to do — by effort

### 2.1 Bulk dismiss in GitHub UI (~97 non-dev alerts, low effort)

No code changes. Use Round 2 rationale; counts unchanged in v3.

| Bucket | Open (v3) | Action |
|---|---|---|
| **Frontend build toolchain** | 82 | Dismiss: *"Build-time only; not shipped in production bundles (Round 1 §2.3)."* |
| **Python held by design** | 15 | Dismiss: *"Deliberately held; documented in Round 1 §5 / Round 2 §2.1."* |

Packages in the Python bucket: `werkzeug`/`Werkzeug` (6), `urllib3` (5), `requests` (3), `flask` (1).

---

### 2.2 dompurify — verify & close (~14 non-dev alerts, low effort)

**Status:** Code is on **`dompurify@3.4.11`** (root + viz-lib, commit `9d257109`). GitHub closed 14 dompurify alerts since v2 but **14 remain**.

Remaining advisories list `first_patched_version` ≤ **3.4.11** (e.g. GHSA-cmwh-pvxp-8882 → 3.4.11). Lockfile matches; alerts are likely **stale pending Dependabot rescan** or need manual **Dismiss → Fix applied**.

**Next steps:**

1. Confirm default branch lockfiles show `3.4.11` on GitHub (not just local).
2. Re-export in 24–48h; if still open, bulk-dismiss with *"Fixed in dompurify 3.4.11 (AO-19387, 9d257109)."*
3. If any advisory requires **> 3.4.11**, bump to latest 3.4.x patch and re-test (`npm test`, viz-lib tests, `npm run build`).

---

### 2.3 Frontend runtime — dismiss or small follow-ups (4 non-dev alerts)

| Package | Open | Recommendation |
|---|---|---|
| **bootstrap** | 2 | **Dismiss.** LESS/CSS only; Bootstrap JS tooltip/popover plugins not loaded. No fix in 3.x. |
| **markdown** | 1 | **Dismiss** (ReDoS, auth-only authors, output sanitized via DOMPurify). Optional later: replace `markdown@0.5.0` with `marked` (~0.5 day). |
| **debug** | 1 | **Dismiss.** Lockfile on `debug@3.2.7` (patched for GHSA-gxpj-cx7g-858c). Client-only namespaced logging. |

---

### 2.4 Plotly transitive — confirm & dismiss (4 non-dev alerts)

| Package | Open | Notes |
|---|---|---|
| `minimist` | 2 | Via `plotly.js` → glslify build chain |
| `path-parse` | 2 | Same chain |

**Next step:** Confirm not reachable in browser bundle (build-time shader tooling). Then dismiss: *"Plotly.js transitive build dependency; not shipped / not user-reachable."*

---

### 2.5 Real code work — ticketed

| Work | Open alerts addressed | Effort | Ticket |
|---|---|---|---|
| **Replace `advocate` with `requests` SSRF-safe pattern** | 8 Python (`urllib3`, `requests`, unblocks bumps) | 1–2 days | New under AO-19381 |
| **Webpack 4 → 5** | ~100+ dev + many build-toolchain non-dev | ~4–6 days | New under AO-19381 |
| **Flask 3 / Werkzeug 3 / SQLAlchemy** | Remaining Python holds long-term | Major | Track upstream |

`advocate` is the highest-value **runtime** Python item still requiring code.

---

### 2.6 Dev-scope alerts (136 open) — not bulk-dismissable

Top dev packages in v3: `handlebars`, `tar`, `node-forge`, `elliptic`, `ws`, `url-parse`, `webpack-dev-server`, etc.

**Path:** Webpack 5 migration (§2.5) clears most. Until then, dev alerts are accepted residual risk from the legacy toolchain (same as Round 2 §2.3 for non-dev build deps).

Optional low-priority prune (see `REMOVAL_CANDIDATES.md` Tier 1): GitHub issue/PR templates — **0 Dependabot impact**.

---

### 2.7 Process checklist

- [ ] Push any unpushed commits on `rcm-security-patches` (branch synced at export time).
- [ ] Execute §2.1 bulk dismissals (~97 alerts) in [Dependabot UI](https://github.com/AveaSolutions/redash/security/dependabot).
- [ ] Execute §2.2 dompurify verify/dismiss (~14 alerts).
- [ ] Execute §2.3–§2.4 dismissals (~8 alerts).
- [ ] Re-export as **v4** after dismissals; target **~150 total open** (mostly dev-scope webpack chain).
- [ ] Open ticket for `advocate` replacement; schedule Webpack 5 after AO-19387/AO-19388 closeout.

---

## 3. Priority order

1. **Bulk dismiss** build-toolchain + Python holds (~97) — largest immediate UI noise reduction  
2. **dompurify** stale-alert cleanup (~14) — should drop to 0 after dismiss/rescan  
3. **Dismiss** bootstrap / markdown / debug / plotly (~8) — documented low risk  
4. **`advocate` → `requests`** — only remaining meaningful runtime Python fix  
5. **Webpack 5** — dev alert debt and long-term toolchain hygiene  
6. **Flask 3** — defer; upstream-sized effort  

---

## 4. References

- Round 2 triage: `security-audit-2026/SECURITY_AUDIT_ROUND_2.md`
- Removal progress: `security-audit-2026/REMOVAL_CANDIDATES.md`
- Epic: [AO-19381](https://kipusystems.atlassian.net/browse/AO-19381)
- Dependabot: [AveaSolutions/redash](https://github.com/AveaSolutions/redash/security/dependabot)
