---
name: kipu-jira-ao-tickets
description: >-
  Create and update AveaOffice (AO) Jira tickets for Redash security and tech-debt
  work with Jeremy Deal's default metadata. Use when the user asks to create a Jira
  ticket, story, or task under AO-19381 or similar AO Redash work without repeating
  assignee, sprint, epic, or component details.
---

# Kipu AO Jira Ticket Defaults

Apply these defaults whenever Jeremy asks to create an AO ticket for Redash / security-audit work unless he overrides a field in the same message.

## Default metadata

| Field | Value |
|-------|-------|
| Project | `AO` (AveaOffice) |
| Issue type | `Tech Debt` |
| Parent epic | `AO-19381` — Redash: Resolve Dependabot Security Alerts |
| Assignee | Jeremy Deal (`5e3b4716c2f3370c861d3ded`) |
| Sprint | AO Sprint 260 — ID `16389` (`customfield_10006`) |
| Story points | `customfield_10004` — see sizing below |
| Priority | P3 |
| Components | Reporting + Security |
| Initial status | **In Progress** (transition `461` after create) |

## Story point sizing (Redash security work)

| Points | When |
|--------|------|
| 3 | Single-scope delete or one-package bump; low cross-file risk |
| 5 | Multi-file prune, auth/feature removal, or frontend + backend touch |
| 8 | Broad dependency upgrades, Dockerfile changes, or risky behavior change |

If unsure between two sizes, pick the lower one and note follow-up scope in the description.

## Create workflow

1. Read this skill (do not ask Jeremy to repeat epic/sprint/assignee).
2. Draft summary prefixed with `Redash:` when the work is in AveaSolutions/redash.
3. Write description with: Summary, Motivation (link AO-19381), Scope, Acceptance criteria, `**Parent epic:** AO-19381`.
4. Create via Atlassian MCP `createJiraIssue`:
   - `projectKey`: `AO`
   - `issueTypeName`: `Tech Debt`
   - `assignee_account_id`: `5e3b4716c2f3370c861d3ded`
   - `additional_fields.parent`: `{"key": "AO-19381"}`
   - `additional_fields.components`: `[{"name": "Reporting"}, {"name": "Security"}]`
   - `additional_fields.priority`: `{"name": "P3"}`
5. `editJiraIssue` — set sprint and story points:
   - `customfield_10006`: `16389`
   - `customfield_10004`: chosen points
6. `transitionJiraIssue` — transition `461` → In Progress (unless user asked for a different status).
7. Return the ticket URL: `https://kipusystems.atlassian.net/browse/{KEY}`.

## Description template

```markdown
## Summary

[One sentence — what and why]

## Motivation

Part of AO-19381 Dependabot / security remediation. [Link security-audit-2026/ docs if relevant]

## Scope

- [Concrete files, packages, or behaviors]

## Acceptance criteria

- [Testable outcomes]
- Frontend lint, unit tests, backend tests, and production build pass (see project verify-before-done rule)

**Parent epic:** AO-19381
```

## Related tickets (context)

| Key | Summary |
|-----|---------|
| AO-19381 | Epic — Dependabot security alerts |
| AO-19386 | Remove Cypress/Percy e2e stack |
| AO-19387 | Frontend runtime CVEs + pytest bump |
| AO-19388 | Prune dead code and upstream leftovers |
| AO-19389 | Remove unused SSO auth methods |

## Overrides

Honor explicit user overrides in the same request (different epic, sprint, assignee, status, or points). Only ask when a required field is missing and cannot be inferred.
