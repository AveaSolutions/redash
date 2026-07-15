import logging
import time

from flask import g, has_request_context

from redash import statsd_client
from sqlalchemy.engine import Engine
from sqlalchemy.event import listens_for
from sqlalchemy.orm.util import _ORMJoin
from sqlalchemy.sql.selectable import Alias

metrics_logger = logging.getLogger("metrics")


def _table_name_from_select_element(elt):
    froms = elt.get_final_froms() if hasattr(elt, "get_final_froms") else elt.froms
    t = froms[0]

    if isinstance(t, Alias):
        inner = t.element
        inner_froms = (
            inner.get_final_froms()
            if hasattr(inner, "get_final_froms")
            else getattr(inner, "froms", None)
        )
        if inner_froms:
            t = inner_froms[0]

    while isinstance(t, _ORMJoin):
        t = t.left

    return t.name


@listens_for(Engine, "before_execute")
def before_execute(conn, clauseelement, multiparams, params, execution_options):
    conn.info.setdefault("query_start_time", []).append(time.time())


@listens_for(Engine, "after_execute")
def after_execute(conn, clauseelement, multiparams, params, execution_options, result):
    duration = 1000 * (time.time() - conn.info["query_start_time"].pop(-1))
    action = clauseelement.__class__.__name__

    if action == "Select":
        name = "unknown"
        try:
            name = _table_name_from_select_element(clauseelement)
        except Exception:
            logging.exception("Failed finding table name.")
    elif action in ["Update", "Insert", "Delete"]:
        name = clauseelement.table.name
    else:
        # create/drop tables, sqlalchemy internal schema queries, etc
        return

    action = action.lower()

    statsd_client.timing("db.{}.{}".format(name, action), duration)
    metrics_logger.debug("table=%s query=%s duration=%.2f", name, action, duration)

    if has_request_context():
        g.setdefault("queries_count", 0)
        g.setdefault("queries_duration", 0)
        g.queries_count += 1
        g.queries_duration += duration

    return result
