from flask import send_file
from flask_login import login_required
from werkzeug.utils import safe_join

from redash import settings
from redash.handlers import routes
from redash.handlers.base import org_scoped_rule
from redash.security import csp_allows_embeding


def render_index():
    full_path = safe_join(settings.STATIC_ASSETS_PATH, "index.html")
    return send_file(full_path, **dict(max_age=0, conditional=True))


@routes.route(org_scoped_rule("/dashboard/<slug>"), methods=["GET"])
@login_required
@csp_allows_embeding
def dashboard(slug, org_slug=None):
    return render_index()


@routes.route(org_scoped_rule("/<path:path>"))
@routes.route(org_scoped_rule("/"))
@login_required
def index(**kwargs):
    return render_index()
