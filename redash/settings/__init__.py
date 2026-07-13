import os
import importlib
import ssl
from funcy import distinct
from flask_talisman import talisman

from .helpers import (
    fix_assets_path,
    array_from_string,
    parse_boolean,
    int_or_none,
    set_from_string,
    add_decode_responses_to_redis_url,
    cast_int_or_default
)
from .organization import DATE_FORMAT, TIME_FORMAT  # noqa

# _REDIS_URL is the unchanged REDIS_URL we get from env vars, to be used later with RQ
_REDIS_URL = os.environ.get(
    "REDASH_REDIS_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0")
)
# This is the one to use for Redash' own connection:
REDIS_URL = add_decode_responses_to_redis_url(_REDIS_URL)
PROXIES_COUNT = int(os.environ.get("REDASH_PROXIES_COUNT", "1"))

STATSD_HOST = os.environ.get("REDASH_STATSD_HOST", "127.0.0.1")
STATSD_PORT = int(os.environ.get("REDASH_STATSD_PORT", "8125"))
STATSD_PREFIX = os.environ.get("REDASH_STATSD_PREFIX", "redash")
STATSD_USE_TAGS = parse_boolean(os.environ.get("REDASH_STATSD_USE_TAGS", "false"))

# Connection settings for Redash's own database (where we store the queries, results, etc)
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "REDASH_DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql:///postgres")
)
SQLALCHEMY_MAX_OVERFLOW = int_or_none(os.environ.get("SQLALCHEMY_MAX_OVERFLOW"))
SQLALCHEMY_POOL_SIZE = int_or_none(os.environ.get("SQLALCHEMY_POOL_SIZE"))
SQLALCHEMY_DISABLE_POOL = parse_boolean(
    os.environ.get("SQLALCHEMY_DISABLE_POOL", "false")
)
SQLALCHEMY_ENABLE_POOL_PRE_PING = parse_boolean(
    os.environ.get("SQLALCHEMY_ENABLE_POOL_PRE_PING", "false")
)
SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_ECHO = False

# Flask-SQLAlchemy 3 reads engine options from config instead of apply_driver_hacks.
from redash.utils import json_dumps  # noqa: E402

SQLALCHEMY_ENGINE_OPTIONS = {"json_serializer": json_dumps}
if SQLALCHEMY_ENABLE_POOL_PRE_PING:
    SQLALCHEMY_ENGINE_OPTIONS["pool_pre_ping"] = True
if SQLALCHEMY_DISABLE_POOL:
    from sqlalchemy.pool import NullPool  # noqa: E402

    SQLALCHEMY_ENGINE_OPTIONS["poolclass"] = NullPool

RQ_REDIS_URL = os.environ.get("RQ_REDIS_URL", _REDIS_URL)

# The following enables periodic job (every 5 minutes) of removing unused query results.
QUERY_RESULTS_CLEANUP_ENABLED = parse_boolean(
    os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_ENABLED", "true")
)
QUERY_RESULTS_CLEANUP_COUNT = int(
    os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_COUNT", "100")
)
QUERY_RESULTS_CLEANUP_MAX_AGE = int(
    os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_MAX_AGE", "7")
)

SCHEMAS_REFRESH_SCHEDULE = int(os.environ.get("REDASH_SCHEMAS_REFRESH_SCHEDULE", 30))

AUTH_TYPE = os.environ.get("REDASH_AUTH_TYPE", "api_key")
INVITATION_TOKEN_MAX_AGE = int(
    os.environ.get("REDASH_INVITATION_TOKEN_MAX_AGE", 60 * 60 * 24 * 7)
)

# The secret key to use in the Flask app for various cryptographic features
SECRET_KEY = os.environ.get("REDASH_COOKIE_SECRET")

if SECRET_KEY is None:
    raise Exception("You must set the REDASH_COOKIE_SECRET environment variable. Visit http://redash.io/help/open-source/admin-guide/secrets for more information.")

# The secret key to use when encrypting data source options
DATASOURCE_SECRET_KEY = os.environ.get("REDASH_SECRET_KEY", SECRET_KEY)

# Whether and how to redirect non-HTTP requests to HTTPS. Disabled by default.
ENFORCE_HTTPS = parse_boolean(os.environ.get("REDASH_ENFORCE_HTTPS", "false"))
ENFORCE_HTTPS_PERMANENT = parse_boolean(
    os.environ.get("REDASH_ENFORCE_HTTPS_PERMANENT", "false")
)
# Whether file downloads are enforced or not.
ENFORCE_FILE_SAVE = parse_boolean(os.environ.get("REDASH_ENFORCE_FILE_SAVE", "true"))

# Whether api calls using the json query runner will block private addresses
ENFORCE_PRIVATE_ADDRESS_BLOCK = parse_boolean(
    os.environ.get("REDASH_ENFORCE_PRIVATE_IP_BLOCK", "true")
)

# Whether to use secure cookies by default.
COOKIES_SECURE = parse_boolean(
    os.environ.get("REDASH_COOKIES_SECURE", str(ENFORCE_HTTPS))
)
# Whether the session cookie is set to secure.
SESSION_COOKIE_SECURE = parse_boolean(
    os.environ.get("REDASH_SESSION_COOKIE_SECURE") or str(COOKIES_SECURE)
)
# Whether the session cookie is set HttpOnly.
SESSION_COOKIE_HTTPONLY = parse_boolean(
    os.environ.get("REDASH_SESSION_COOKIE_HTTPONLY", "true")
)
SESSION_EXPIRY_TIME = int(os.environ.get("REDASH_SESSION_EXPIRY_TIME", 60 * 60 * 6))

# Whether the session cookie is set to secure.
REMEMBER_COOKIE_SECURE = parse_boolean(
    os.environ.get("REDASH_REMEMBER_COOKIE_SECURE") or str(COOKIES_SECURE)
)
# Whether the remember cookie is set HttpOnly.
REMEMBER_COOKIE_HTTPONLY = parse_boolean(
    os.environ.get("REDASH_REMEMBER_COOKIE_HTTPONLY", "true")
)
# The amount of time before the remember cookie expires.
REMEMBER_COOKIE_DURATION = int(
    os.environ.get("REDASH_REMEMBER_COOKIE_DURATION", 60 * 60 * 24 * 31)
)

# Doesn't set X-Frame-Options by default since it's highly dependent
# on the specific deployment.
# See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
# for more information.
FRAME_OPTIONS = os.environ.get("REDASH_FRAME_OPTIONS", "deny")
FRAME_OPTIONS_ALLOW_FROM = os.environ.get("REDASH_FRAME_OPTIONS_ALLOW_FROM", "")

# Whether and how to send Strict-Transport-Security response headers.
# See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
# for more information.
HSTS_ENABLED = parse_boolean(
    os.environ.get("REDASH_HSTS_ENABLED") or str(ENFORCE_HTTPS)
)
HSTS_PRELOAD = parse_boolean(os.environ.get("REDASH_HSTS_PRELOAD", "false"))
HSTS_MAX_AGE = int(os.environ.get("REDASH_HSTS_MAX_AGE", talisman.ONE_YEAR_IN_SECS))
HSTS_INCLUDE_SUBDOMAINS = parse_boolean(
    os.environ.get("REDASH_HSTS_INCLUDE_SUBDOMAINS", "false")
)

# Whether and how to send Content-Security-Policy response headers.
# See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
# for more information.
# Overriding this value via an environment variables requires setting it
# as a string in the general CSP format of a semicolon separated list of
# individual CSP directives, see https://github.com/GoogleCloudPlatform/flask-talisman#example-7
# for more information. E.g.:
CONTENT_SECURITY_POLICY = os.environ.get(
    "REDASH_CONTENT_SECURITY_POLICY",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'; font-src 'self' data:; img-src 'self' http: https: data: blob:; object-src 'none'; frame-ancestors 'none'; frame-src redash.io;",
)
CONTENT_SECURITY_POLICY_REPORT_URI = os.environ.get(
    "REDASH_CONTENT_SECURITY_POLICY_REPORT_URI", ""
)
CONTENT_SECURITY_POLICY_REPORT_ONLY = parse_boolean(
    os.environ.get("REDASH_CONTENT_SECURITY_POLICY_REPORT_ONLY", "false")
)
CONTENT_SECURITY_POLICY_NONCE_IN = array_from_string(
    os.environ.get("REDASH_CONTENT_SECURITY_POLICY_NONCE_IN", "")
)

# Whether and how to send Referrer-Policy response headers. Defaults to
# 'strict-origin-when-cross-origin'.
# See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
# for more information.
REFERRER_POLICY = os.environ.get(
    "REDASH_REFERRER_POLICY", "strict-origin-when-cross-origin"
)
# Whether and how to send Feature-Policy response headers. Defaults to
# an empty value.
# See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
# for more information.
FEATURE_POLICY = os.environ.get("REDASH_REFERRER_POLICY", "")

MULTI_ORG = parse_boolean(os.environ.get("REDASH_MULTI_ORG", "false"))

STATIC_ASSETS_PATH = fix_assets_path(
    os.environ.get("REDASH_STATIC_ASSETS_PATH", "../client/dist/")
)
FLASK_TEMPLATE_PATH = fix_assets_path(
    os.environ.get("REDASH_FLASK_TEMPLATE_PATH", STATIC_ASSETS_PATH)
)
# Time limit (in seconds) for scheduled queries. Set this to -1 to execute without a time limit.
SCHEDULED_QUERY_TIME_LIMIT = int(
    os.environ.get("REDASH_SCHEDULED_QUERY_TIME_LIMIT", -1)
)

# Time limit (in seconds) for adhoc queries. Set this to -1 to execute without a time limit.
ADHOC_QUERY_TIME_LIMIT = int(os.environ.get("REDASH_ADHOC_QUERY_TIME_LIMIT", -1))

JOB_EXPIRY_TIME = int(os.environ.get("REDASH_JOB_EXPIRY_TIME", 3600 * 12))
JOB_DEFAULT_FAILURE_TTL = int(
    os.environ.get("REDASH_JOB_DEFAULT_FAILURE_TTL", 7 * 24 * 60 * 60)
)

LOG_LEVEL = os.environ.get("REDASH_LOG_LEVEL", "INFO")
LOG_STDOUT = parse_boolean(os.environ.get("REDASH_LOG_STDOUT", "false"))
LOG_PREFIX = os.environ.get("REDASH_LOG_PREFIX", "")
LOG_FORMAT = os.environ.get(
    "REDASH_LOG_FORMAT",
    LOG_PREFIX + "[%(asctime)s][PID:%(process)d][%(levelname)s][%(name)s] %(message)s",
)
RQ_WORKER_JOB_LOG_FORMAT = os.environ.get(
    "REDASH_RQ_WORKER_JOB_LOG_FORMAT",
    (
        LOG_PREFIX + "[%(asctime)s][PID:%(process)d][%(levelname)s][%(name)s] "
        "job.func_name=%(job_func_name)s "
        "job.id=%(job_id)s %(message)s"
    ),
)

# Mail settings:
MAIL_SERVER = os.environ.get("REDASH_MAIL_SERVER", "localhost")
MAIL_PORT = int(os.environ.get("REDASH_MAIL_PORT", 25))
MAIL_USE_TLS = parse_boolean(os.environ.get("REDASH_MAIL_USE_TLS", "false"))
MAIL_USE_SSL = parse_boolean(os.environ.get("REDASH_MAIL_USE_SSL", "false"))
MAIL_USERNAME = os.environ.get("REDASH_MAIL_USERNAME", None)
MAIL_PASSWORD = os.environ.get("REDASH_MAIL_PASSWORD", None)
MAIL_DEFAULT_SENDER = os.environ.get("REDASH_MAIL_DEFAULT_SENDER", None)
MAIL_MAX_EMAILS = os.environ.get("REDASH_MAIL_MAX_EMAILS", None)
MAIL_ASCII_ATTACHMENTS = parse_boolean(
    os.environ.get("REDASH_MAIL_ASCII_ATTACHMENTS", "false")
)


def email_server_is_configured():
    return MAIL_DEFAULT_SENDER is not None


HOST = os.environ.get("REDASH_HOST", "")

SEND_FAILURE_EMAIL_INTERVAL = int(
    os.environ.get("REDASH_SEND_FAILURE_EMAIL_INTERVAL", 60)
)
MAX_FAILURE_REPORTS_PER_QUERY = int(
    os.environ.get("REDASH_MAX_FAILURE_REPORTS_PER_QUERY", 100)
)

ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE = os.environ.get(
    "REDASH_ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE", "({state}) {alert_name}"
)

# How many requests are allowed per IP to the login page before
# being throttled?
# See https://flask-limiter.readthedocs.io/en/stable/#rate-limit-string-notation

RATELIMIT_ENABLED = parse_boolean(os.environ.get("REDASH_RATELIMIT_ENABLED", "true"))
THROTTLE_LOGIN_PATTERN = os.environ.get("REDASH_THROTTLE_LOGIN_PATTERN", "50/hour")
LIMITER_STORAGE = os.environ.get("REDASH_LIMITER_STORAGE", REDIS_URL)
THROTTLE_PASS_RESET_PATTERN = os.environ.get("REDASH_THROTTLE_PASS_RESET_PATTERN", "10/hour")

# CORS settings for the Query Result API (and possibly future external APIs).
# In most cases all you need to do is set REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN
# to the calling domain (or domains in a comma separated list).
ACCESS_CONTROL_ALLOW_ORIGIN = set_from_string(
    os.environ.get("REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN", "")
)
ACCESS_CONTROL_ALLOW_CREDENTIALS = parse_boolean(
    os.environ.get("REDASH_CORS_ACCESS_CONTROL_ALLOW_CREDENTIALS", "false")
)
ACCESS_CONTROL_REQUEST_METHOD = os.environ.get(
    "REDASH_CORS_ACCESS_CONTROL_REQUEST_METHOD", "GET, POST, PUT"
)
ACCESS_CONTROL_ALLOW_HEADERS = os.environ.get(
    "REDASH_CORS_ACCESS_CONTROL_ALLOW_HEADERS", "Content-Type"
)

# Query Runners (hardcoded for this fork: Postgres + SQL Server only).
# REDASH_ENABLED_QUERY_RUNNERS and related env vars are intentionally ignored so
# deployment config cannot re-enable removed drivers.
QUERY_RUNNERS = [
    "redash.query_runner.pg",
    "redash.query_runner.mssql",
    "redash.query_runner.mssql_odbc",
    "redash.query_runner.query_results",
]

dynamic_settings = importlib.import_module(
    os.environ.get("REDASH_DYNAMIC_SETTINGS_MODULE", "redash.settings.dynamic_settings")
)

# Destinations (hardcoded for this fork: email + Slack + webhook only).
# REDASH_ENABLED_DESTINATIONS and related env vars are intentionally ignored so
# deployment config cannot re-enable removed destinations.
DESTINATIONS = [
    "redash.destinations.email",
    "redash.destinations.slack",
    "redash.destinations.webhook",
]

EVENT_REPORTING_WEBHOOKS = array_from_string(
    os.environ.get("REDASH_EVENT_REPORTING_WEBHOOKS", "")
)

# Support for Sentry (https://getsentry.com/). Just set your Sentry DSN to enable it:
SENTRY_DSN = os.environ.get("REDASH_SENTRY_DSN", "")
SENTRY_ENVIRONMENT = os.environ.get("REDASH_SENTRY_ENVIRONMENT")

# Client side toggles:
ALLOW_SCRIPTS_IN_USER_INPUT = parse_boolean(
    os.environ.get("REDASH_ALLOW_SCRIPTS_IN_USER_INPUT", "false")
)
DASHBOARD_REFRESH_INTERVALS = list(
    map(
        int,
        array_from_string(
            os.environ.get(
                "REDASH_DASHBOARD_REFRESH_INTERVALS", "60,300,600,1800,3600,43200,86400"
            )
        ),
    )
)
QUERY_REFRESH_INTERVALS = list(
    map(
        int,
        array_from_string(
            os.environ.get(
                "REDASH_QUERY_REFRESH_INTERVALS",
                "60, 300, 600, 900, 1800, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 28800, 32400, 36000, 39600, 43200, 86400, 604800, 1209600, 2592000",
            )
        ),
    )
)
PAGE_SIZE = int(os.environ.get("REDASH_PAGE_SIZE", 20))
PAGE_SIZE_OPTIONS = list(
    map(
        int,
        array_from_string(os.environ.get("REDASH_PAGE_SIZE_OPTIONS", "5,10,20,50,100")),
    )
)
TABLE_CELL_MAX_JSON_SIZE = int(os.environ.get("REDASH_TABLE_CELL_MAX_JSON_SIZE", 50000))

# Features:
VERSION_CHECK = parse_boolean(os.environ.get("REDASH_VERSION_CHECK", "true"))
FEATURE_DISABLE_REFRESH_QUERIES = parse_boolean(
    os.environ.get("REDASH_FEATURE_DISABLE_REFRESH_QUERIES", "false")
)
FEATURE_SHOW_QUERY_RESULTS_COUNT = parse_boolean(
    os.environ.get("REDASH_FEATURE_SHOW_QUERY_RESULTS_COUNT", "true")
)
FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS = parse_boolean(
    os.environ.get("REDASH_FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS", "false")
)
FEATURE_AUTO_PUBLISH_NAMED_QUERIES = parse_boolean(
    os.environ.get("REDASH_FEATURE_AUTO_PUBLISH_NAMED_QUERIES", "true")
)
FEATURE_EXTENDED_ALERT_OPTIONS = parse_boolean(
    os.environ.get("REDASH_FEATURE_EXTENDED_ALERT_OPTIONS", "false")
)

# BigQuery
BIGQUERY_HTTP_TIMEOUT = int(os.environ.get("REDASH_BIGQUERY_HTTP_TIMEOUT", "600"))

# Allow Parameters in Embeds
# WARNING: Deprecated!
# See https://discuss.redash.io/t/support-for-parameters-in-embedded-visualizations/3337 for more details.
ALLOW_PARAMETERS_IN_EMBEDS = parse_boolean(
    os.environ.get("REDASH_ALLOW_PARAMETERS_IN_EMBEDS", "false")
)

# Enhance schema fetching
SCHEMA_RUN_TABLE_SIZE_CALCULATIONS = parse_boolean(
    os.environ.get("REDASH_SCHEMA_RUN_TABLE_SIZE_CALCULATIONS", "false")
)

# kylin
KYLIN_OFFSET = int(os.environ.get("REDASH_KYLIN_OFFSET", 0))
KYLIN_LIMIT = int(os.environ.get("REDASH_KYLIN_LIMIT", 50000))
KYLIN_ACCEPT_PARTIAL = parse_boolean(
    os.environ.get("REDASH_KYLIN_ACCEPT_PARTIAL", "false")
)

# sqlparse
SQLPARSE_FORMAT_OPTIONS = {
    "reindent": parse_boolean(os.environ.get("SQLPARSE_FORMAT_REINDENT", "true")),
    "keyword_case": os.environ.get("SQLPARSE_FORMAT_KEYWORD_CASE", "upper"),
}

# requests
REQUESTS_ALLOW_REDIRECTS = parse_boolean(
    os.environ.get("REDASH_REQUESTS_ALLOW_REDIRECTS", "false")
)

# Enforces CSRF token validation on API requests.
# This is turned off by default to avoid breaking any existing deployments but it is highly recommended to turn this toggle on to prevent CSRF attacks.
ENFORCE_CSRF = parse_boolean(
    os.environ.get("REDASH_ENFORCE_CSRF", "false")
)

# Databricks

CSRF_TIME_LIMIT = int(os.environ.get("REDASH_CSRF_TIME_LIMIT", 3600 * 6))

# Email blocked domains, use delimiter comma to separated multiple domains
BLOCKED_DOMAINS = set_from_string(os.environ.get("REDASH_BLOCKED_DOMAINS", "qq.com"))
