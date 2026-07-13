# Config Report Dashboard Slug Inventory (Option B — Step 1)

Date: 2026-07-13  
Ticket: [AO-19409](https://kipusystems.atlassian.net/browse/AO-19409)  
Related: [AO-19410](https://kipusystems.atlassian.net/browse/AO-19410) (Avea Office null-ref on 404)

Scope: read-only inventory of Redash **base template** dashboard slugs used by Avea Office Configuration Reports and operational Redash reports. Compares **prod** vs **beta** so Step 2 seeding can target the exact gap.

---

## Executive summary

**Five Configuration Report base templates exist in prod but are missing from beta.** These match the slugs Whitters hit during QA on 2026-07-10 (confirmed: `payer-mix-report` → 404 in ingress logs).

| Slug | Prod | Beta | Seeding priority |
|------|------|------|------------------|
| `payer-mix-report` | ✅ id 477963 | ❌ missing | **P0** — confirmed 404 in QA |
| `service-billing-profile-report` | ✅ id 472111 | ❌ missing | **P0** — Whitters config report list |
| `billed-rates-report` | ✅ id 471367 | ❌ missing | **P0** |
| `payer-expected-rates-report` | ✅ id 564142 | ❌ missing | **P0** |
| `rendering-provider-profile-report` | ✅ id 478539 | ✅ id 275218 | **Seeded 2026-07-13** |

All other Avea Office `TemplateName` slugs checked below are **present on both** prod and beta with matching IDs.

**Status (2026-07-13):** Steps 2–3 complete — five templates copied prod → beta; legacy API returns **200** for all slugs. Ready for QA retest on `aveaoffice-jeremy`.

---

## Methodology

| Source | What it provides |
|--------|------------------|
| **Prod Postgres** via `kubectl exec -n production deploy/redash-server-prod -- python …` | Authoritative slug → dashboard id, name, archive state |
| **Beta Postgres** via `kubectl exec -n beta deploy/redash-server-beta -- python …` | Same query on beta |
| **Avea Office codebase** (`AveaSolutions/avea-office`, `Avea.Office.Services/Reporting/Redash/Reports/*.cs`) | Canonical `TemplateName` slug per report class |
| **Ingress nginx logs** (30-day retention, `104.42.73.102` = `aveaoffice-jeremy` backend) | Observed legacy API lookups and HTTP status |
| **Public legacy API** (`GET /api/dashboards/{slug}?legacy=true`) | Requires Avea Office API auth in practice; unauthenticated curl returns 404 for all slugs — **not usable for inventory** |

Environments:

| | Prod | Beta |
|---|------|------|
| Redash URL | `https://dashboards.aveadesk.com` | `https://redash-beta.aveadesk.com` |
| Postgres | `avearedash.postgres.database.azure.com` | `redashbeta.postgres.database.azure.com` |
| K8s namespace | `production` | `beta` |

Inventory run: **2026-07-13 ~16:40 UTC**.

---

## 1. Avea Office canonical slugs (`TemplateName`)

Extracted from `AveaSolutions/avea-office` report classes (GitHub API, `main` branch):

| Report class | Template slug | Config report? |
|--------------|---------------|----------------|
| `PayerMixReport` | `payer-mix-report` | **Yes** (Configuration Reports) |
| `ServiceBillingProfileReport` | `service-billing-profile-report` | **Yes** |
| `BilledRatesReport` | `billed-rates-report` | **Yes** |
| `PayerExpectedRatesReport` | `payer-expected-rates-report` | **Yes** |
| `RenderingProviderProfileReport` | `rendering-provider-profile-report` | **Yes** |
| `CombinedARDetailReport` | `ar-details` | No (org operational; auto-forks) |
| `CombinedARReport` | `combined-ar-summary-2` | No |
| `ClaimBillingReport` | *(inherits dashboard base — see note)* | No |
| `ClaimPaymentsReport` | `claim-payments-detail-new` / `claim-payments-summary-new` (dynamic) | No |
| `ClaimSubmissionReport` | *(inherits dashboard base)* | No |
| `ClientShareReport` | *(inherits dashboard base)* | No |
| `InsuranceAdjustmentsReport` | `insurance-adjustments-2-0` | No |
| `PatientDemographicsReport` | `patient-demographics-report` | No |
| `PatientLevelPatientBillableReport` | `patient-billable-report` | No |
| `PatientLevelPatientPaymentsReport` | `patient-payments` | No |
| `URReport` | `u-r-report-2-0` | No |
| `ARWaterfallReport` | `ar-waterfall` | No |
| `ExceptionsToClosingDateReport` | `exceptions-to-closing-date` | No |
| `HealthCheckReport` | `health-check` | No |
| `InvoicingReport` | `invoicing` | No |
| `TransactionReport` | `transaction-report` | No |

The five **Configuration Report** slugs are the entire gap for Avea Office `legacy=true` lookups among registered report types.

---

## 2. Prod vs beta — Avea Office template slugs

| Slug | Prod id / name | Beta id / name | Status |
|------|----------------|----------------|--------|
| `ar-waterfall` | 416 / AR Waterfall | 416 / AR Waterfall | ✅ match |
| `ar-details` | 579 / Combined A/R Details | 579 / AR Details | ✅ match (name differs) |
| `combined-ar-summary-2` | 24595 / Combined AR Summary | 24595 / Combined AR Summary | ✅ match |
| `exceptions-to-closing-date` | 217918 / Exceptions To Closing Date | 217918 / … | ✅ match |
| `health-check` | 47679 / Health Check | 47679 / Health Check | ✅ match |
| `insurance-adjustments-2-0` | 23794 / Insurance Adjustments | 23794 / … | ✅ match |
| `invoicing` | 617 / Invoicing | 617 / Invoicing | ✅ match |
| `patient-demographics-report` | 581 / Patient Demographics Report | 581 / … | ✅ match |
| `patient-billable-report` | 17649 / Patient Billable Report | 17649 / … | ✅ match |
| `patient-payments` | 24647 / Patient Payments Report | 24647 / … | ✅ match |
| **`payer-expected-rates-report`** | **564142 / Payer Expected Rates Report** | **275217 / Payer Expected Rates Report** | ✅ seeded |
| **`payer-mix-report`** | **477963 / Payer Mix Report** | **275214 / Payer Mix Report** | ✅ seeded |
| **`rendering-provider-profile-report`** | **478539 / Rendering Provider Profile Report** | **275218 / Rendering Provider Profile Report** | ✅ seeded |
| **`service-billing-profile-report`** | **472111 / Service Billing Profile Report** | **275215 / Service Billing Profile Report** | ✅ seeded |
| **`billed-rates-report`** | **471367 / Billed Rates Report** | **275216 / Billed Rates Report** | ✅ seeded |
| `transaction-report` | 237036 / Transaction Report | 237036 / … | ✅ match |
| `u-r-report-2-0` | 24065 / U/R Report | 24065 / … | ✅ match |
| `claim-billing-report-2-0` | 19730 / Claim Billing Report | 19730 / … | ✅ match |
| `claim-submission-report-2-0` | 19697 / Claim Submission | 19697 / … | ✅ match |
| `client-share-report` | 17530 / Client Share Report | 17530 / … | ✅ match |
| `claim-payments-detail-new` | 2669 / Claim Payments Detail | 2669 / … | ✅ match |
| `claim-payments-summary-new` | 2652 / Claim Payments Summary | 2652 / … | ✅ match |
| `home-dashboard` | 115 / Home Dashboard | 115 / … | ✅ match |

---

## 3. Missing prod templates — seeding metadata

Each missing template is a **1 widget / 1 query** dashboard on prod, all using data source **id 1 (`AveaOffice`)**:

| Slug | Prod dashboard id | Created (UTC) | Backing query id | Query name |
|------|-------------------|---------------|------------------|------------|
| `payer-mix-report` | 477963 | 2024-12-18 | 1818869 | Payer Mix Report |
| `service-billing-profile-report` | 472111 | 2024-12-04 | 1802328 | Service Billing Profile |
| `billed-rates-report` | 471367 | 2024-12-03 | 1800482 | Billed Rates Report Query |
| `payer-expected-rates-report` | 564142 | 2025-07-16 | 2039488 | Payer Expected Rates Report |
| `rendering-provider-profile-report` | 478539 | 2024-12-19 | 1820515 | Rendering Provider Profile Report |

Beta also has data source **id 1 = `AveaOffice`** (plus dev/QA named sources). After copy, confirm queries still point at the intended beta SQL target (likely `AveaOffice` or org-specific source for `aveaoffice-jeremy`).

Beta data sources (2026-07-13):

```
1  AveaOffice
3  AveaOfficeDev
6  AveaOfficeProduction
7  AveaOfficeStaging1
9  AveaOfficeQA
11 AveaOfficeBen
12 AveaOfficeThiago
13 AveaOfficeJeremy
14 AveaOfficeLewis
15 AveaOfficeYashko
16 AveaOfficeElliott
17 AveaOfficeElliottOdbc
```

---

## 4. Broader base-slug diff (non–org-specific)

Dashboards whose slug does **not** contain `-for-` (base templates only):

| Metric | Prod | Beta |
|--------|------|------|
| Active base dashboards | 76 | 53 |
| Gap (in prod, not beta) | 23 slugs | — |

**Configuration-report gap (AO-19409 scope):**

```
billed-rates-report
payer-expected-rates-report
payer-mix-report
rendering-provider-profile-report
service-billing-profile-report
```

**Other prod-only base slugs (likely out of scope for config-report QA):**

```
claim-edits
claim-payments-all-practices
invoicing_14 … invoicing_27   (12 versioned invoicing dashboards)
payer-expected-rates          (legacy slug without -report suffix)
payer-expected-rates_1
jim-test
test-julio
```

These look like internal/test or superseded invoicing variants — **do not seed unless a specific Avea Office code path references them**.

---

## 5. Ingress evidence (`aveaoffice-jeremy` → beta Redash)

Source: `ingress-nginx` controller logs, client IP `104.42.73.102`, last 30 days.

**Confirmed 404 (2026-07-10 19:39:53 UTC / 3:39 PM ET):**

```
GET /api/dashboards/payer-mix-report?legacy=true → 404
```

**Legacy slugs observed from jeremy backend (unique, last 30 days):**

Operational reports (200 when template exists): `ar-details`, `claim-billing-report-2-0`, `claim-payments-*`, `patient-*`, `u-r-report-2-0`, etc.

Config slug seen: `payer-mix-report` (404). Other four config slugs were not observed in this window — likely not exercised in QA before failure, but all five are missing from beta DB per §2.

---

## 6. Verification checklist (Step 3 — completed 2026-07-13)

After seeding, verify with Avea Office–authenticated calls (same path the app uses):

```http
GET https://redash-beta.aveadesk.com/api/dashboards/{slug}?legacy=true
Authorization: Key <user-api-key>
```

Results (beta, authenticated legacy API):

| Slug | HTTP | Beta dashboard id |
|------|------|-------------------|
| `payer-mix-report` | **200** | 275214 |
| `service-billing-profile-report` | **200** | 275215 |
| `billed-rates-report` | **200** | 275216 |
| `payer-expected-rates-report` | **200** | 275217 |
| `rendering-provider-profile-report` | **200** | 275218 |

ORM check: `Dashboard.get_by_slug_and_org(slug, org)` succeeds for all five (`is_draft=false`, 1 widget each).

**Remaining acceptance:** Whitters / QA retest Configuration Reports on `aveaoffice-jeremy.azurewebsites.net`.

---

## 8. Seeding execution log (Step 2 — completed 2026-07-13)

**Method:** export JSON from prod Redash pod → import via `seed_config_reports_beta.py` on beta pod (ORM create query + visualization + dashboard + widget; data source **id 1 `AveaOffice`**; owner **user id 1**).

| Slug | Action | Beta dashboard id | Beta query id |
|------|--------|-------------------|---------------|
| `payer-mix-report` | created | 275214 | 1186347 |
| `service-billing-profile-report` | created | 275215 | 1186348 |
| `billed-rates-report` | created | 275216 | 1186349 |
| `payer-expected-rates-report` | created | 275217 | 1186350 |
| `rendering-provider-profile-report` | created | 275218 | 1186351 |

Artifacts in this directory:

- `seed_config_reports_beta.py` — idempotent import script (`skipped` if slug already exists)
- `config-report-seed-export.json` — prod export snapshot used for this run (contains prod SQL; do not commit to public repos)

**Re-run from repo root:**

```bash
export KUBECONFIG=/mnt/c/Users/JeremyDeal/.kube/config
POD=$(kubectl get pod -n beta -o name | grep redash-server-beta | head -1 | sed 's|pod/||')

# Export from prod (if re-needed)
kubectl exec -n production deploy/redash-server-prod -- python -c '...' > security-audit-2026/config-report-seed-export.json

kubectl cp security-audit-2026/seed_config_reports_beta.py "beta/${POD}:/app/seed_config_reports_beta.py"
kubectl cp security-audit-2026/config-report-seed-export.json "beta/${POD}:/app/config-report-seed-export.json"
kubectl exec -n beta deploy/redash-server-beta -- sh -c 'cd /app && python seed_config_reports_beta.py < config-report-seed-export.json'
```

---

## 7. Reproduce inventory queries

**Single-slug check (beta example):**

```bash
export KUBECONFIG=/mnt/c/Users/JeremyDeal/.kube/config
kubectl exec -n beta deploy/redash-server-beta -- python -c "
from redash import create_app
from redash.models import Dashboard
app = create_app()
with app.app_context():
    for slug in ['payer-mix-report','service-billing-profile-report']:
        d = Dashboard.query.filter(Dashboard.slug==slug).first()
        print(slug, d.id if d else 'MISSING')
"
```

**Base slug diff:**

```sql
-- Run separately on prod and beta Redash Postgres
SELECT slug, id, name
FROM dashboards
WHERE is_archived = false
  AND slug NOT LIKE '%-for-%'
ORDER BY slug;
```

Diff the two result sets; config-report gap should match §2 unless beta has drifted again.

---

## Appendix: SQL used for `*-report` base template diff

Filter: active dashboards, slug contains `-report`, excludes org forks (`%-for-%`):

```sql
SELECT slug, id, name
FROM dashboards
WHERE is_archived = false
  AND slug LIKE '%-report%'
  AND slug NOT LIKE '%-for-%'
ORDER BY slug;
```

Prod: 18 rows (+ header). Beta: 18 rows (+ header) after 2026-07-13 seeding. Config-report gap closed.
