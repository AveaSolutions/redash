#!/usr/bin/env python
"""Import config-report dashboard templates into beta Redash (AO-19409 Step 2).

Run inside beta Redash pod with export JSON on stdin:
  python seed_config_reports_beta.py < config-report-seed-export.json

Or from repo root via kubectl:
  kubectl exec -i -n beta deploy/redash-server-beta -- python - < security-audit-2026/seed_config_reports_beta.py
  (pipe JSON separately — see CONFIG_REPORT_SLUG_INVENTORY.md)
"""
import json
import sys

from redash import create_app
from redash.models import Dashboard, Query, Visualization, Widget, db, Organization, User

DATA_SOURCE_ID = 1  # AveaOffice on beta
OWNER_USER_ID = 1  # matches existing base templates (e.g. ar-details)


def import_template(item, org, user):
    slug = item["slug"]
    existing = Dashboard.query.filter(Dashboard.slug == slug, Dashboard.org == org).first()
    if existing:
        return {"slug": slug, "status": "skipped", "dashboard_id": existing.id}

    qdata = item["query"]
    query = Query(
        name=qdata["name"],
        description=qdata.get("description"),
        query_text=qdata["query_text"],
        options=qdata.get("options") or {},
        schedule=qdata.get("schedule"),
        is_draft=qdata.get("is_draft", False),
        tags=qdata.get("tags"),
        data_source_id=DATA_SOURCE_ID,
        user=user,
        last_modified_by=user,
        org=org,
    )
    db.session.add(query)
    db.session.flush()

    vdata = item["visualization"]
    visualization = Visualization(
        type=vdata["type"],
        name=vdata["name"],
        description=vdata.get("description"),
        options=vdata.get("options") or "{}",
        query_rel=query,
    )
    db.session.add(visualization)
    db.session.flush()

    ddata = item["dashboard"]
    dashboard = Dashboard(
        name=ddata["name"],
        slug=ddata["slug"],
        layout=ddata.get("layout") or "[]",
        dashboard_filters_enabled=ddata.get("dashboard_filters_enabled", False),
        is_draft=False,
        is_archived=False,
        tags=ddata.get("tags"),
        options=ddata.get("options") or {},
        user=user,
        org=org,
    )
    db.session.add(dashboard)
    db.session.flush()

    wdata = item["widget"]
    widget = Widget(
        visualization=visualization,
        text=wdata.get("text"),
        width=wdata.get("width", 1),
        options=wdata.get("options"),
        dashboard_id=dashboard.id,
    )
    db.session.add(widget)
    db.session.commit()

    return {
        "slug": slug,
        "status": "created",
        "dashboard_id": dashboard.id,
        "query_id": query.id,
        "visualization_id": visualization.id,
        "widget_id": widget.id,
    }


def main():
    payload = json.load(sys.stdin)
    app = create_app()
    results = []
    with app.app_context():
        org = Organization.query.get(1)
        user = User.query.get(OWNER_USER_ID)
        if not org or not user:
            raise SystemExit("org or owner user not found on beta")

        for item in payload:
            try:
                results.append(import_template(item, org, user))
            except Exception as exc:
                db.session.rollback()
                results.append({"slug": item.get("slug"), "status": "error", "error": str(exc)})

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
