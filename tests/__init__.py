import datetime
import logging
import os
from contextlib import contextmanager
from unittest import TestCase

from sqlalchemy import text

os.environ["REDASH_REDIS_URL"] = os.environ.get(
    "REDASH_REDIS_URL", "redis://localhost:6379/0"
).replace("/0", "/5")
# Use different url for RQ to avoid DB being cleaned up:
os.environ["RQ_REDIS_URL"] = os.environ.get(
    "REDASH_REDIS_URL", "redis://localhost:6379/0"
).replace("/5", "/6")


# Make sure rate limit is enabled
os.environ["REDASH_RATELIMIT_ENABLED"] = "true"

os.environ["REDASH_ENFORCE_CSRF"] = "false"

from redash import limiter, redis_connection, settings
from redash.app import create_app
from redash.models import db
from redash.utils import json_dumps
from tests.factories import Factory, user_factory

logging.disable(logging.INFO)
logging.getLogger("metrics").setLevel(logging.ERROR)


def authenticate_request(c, user):
    from redash.authentication import login_manager

    with c.application.test_request_context():
        session_id = login_manager._session_identifier_generator()

    with c.session_transaction() as sess:
        sess.clear()
        sess["_user_id"] = user.get_id()
        sess["_fresh"] = True
        sess["_id"] = session_id


@contextmanager
def authenticated_user(c, user=None):
    if not user:
        user = user_factory.create()
        db.session.commit()
    authenticate_request(c, user)

    yield user


def _sync_search_triggers():
    import sqlalchemy as sa
    import sqlalchemy_searchable as ss

    with db.engine.begin() as conn:
        metadata = sa.MetaData(bind=conn)
        queries = sa.Table("queries", metadata, autoload=True)

        # Reflected integer columns use INTEGER, not Integer; register explicitly
        # (see migrations/versions/6b5be7e0a0ef_.py).
        @ss.vectorizer(queries.c.id)
        def integer_vectorizer(column):
            return sa.func.cast(column, sa.Text)

        ss.sync_trigger(
            conn,
            "queries",
            "search_vector",
            ["id", "name", "description", "query"],
            metadata=metadata,
        )


def reset_database():
    """Reset the test database schema.

    SQLAlchemy 1.4 + Flask-SQLAlchemy 3 drop_all() can fail when CASCADE drops
    remove dependent tables before later DROP statements run. A schema reset is
    more reliable for per-test isolation on PostgreSQL.
    """
    db.session.remove()
    db.engine.dispose()
    with db.engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    db.create_all()
    _sync_search_triggers()


class BaseTestCase(TestCase):
    def setUp(self):
        self.app = create_app()
        self.db = db
        self.app.config["TESTING"] = True
        self.app.config["SESSION_PROTECTION"] = None

        def _clear_stale_login_user():
            from flask import g

            g.pop("_login_user", None)

        # Run before Flask-Login's request loader (registered during create_app).
        self.app.before_request_funcs.setdefault(None, []).insert(
            0, _clear_stale_login_user
        )
        limiter.enabled = False
        self.app_ctx = self.app.app_context()
        self.app_ctx.push()
        db.session.close()
        reset_database()
        self.factory = Factory()
        self.client = self.app.test_client()
        os.makedirs(settings.STATIC_ASSETS_PATH, exist_ok=True)
        with open(os.path.join(settings.STATIC_ASSETS_PATH, "index.html"), "w") as f:
            f.write("<html><body></body></html>")

    def tearDown(self):
        db.session.remove()
        db.engine.dispose()
        self.app_ctx.pop()
        redis_connection.flushdb()

    def make_request(
        self,
        method,
        path,
        org=None,
        user=None,
        data=None,
        is_json=True,
        follow_redirects=False,
    ):
        if user is None:
            user = self.factory.user

        if user:
            authenticate_request(self.client, user)

        method_fn = getattr(self.client, method.lower())
        headers = {}

        if data and is_json:
            data = json_dumps(data)

        if is_json:
            content_type = "application/json"
        else:
            content_type = None

        response = method_fn(
            path,
            data=data,
            headers=headers,
            content_type=content_type,
            follow_redirects=follow_redirects,
        )
        return response

    def get_request(self, path, org=None, headers=None, client=None):
        if client is None:
            client = self.client
        return client.get(path, headers=headers)

    def post_request(self, path, data=None, org=None, headers=None):
        return self.client.post(path, data=data, headers=headers)

    def assertResponseEqual(self, expected, actual):
        for k, v in expected.items():
            if isinstance(v, datetime.datetime) or isinstance(
                actual[k], datetime.datetime
            ):
                continue

            if isinstance(v, list):
                continue

            if isinstance(v, dict):
                self.assertResponseEqual(v, actual[k])
                continue

            self.assertEqual(
                v,
                actual[k],
                "{} not equal (expected: {}, actual: {}).".format(k, v, actual[k]),
            )
