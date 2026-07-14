import os
from .helpers import parse_boolean

PASSWORD_LOGIN_ENABLED = parse_boolean(
    os.environ.get("REDASH_PASSWORD_LOGIN_ENABLED", "true")
)

DATE_FORMAT = os.environ.get("REDASH_DATE_FORMAT", "DD/MM/YY")
TIME_FORMAT = os.environ.get("REDASH_TIME_FORMAT", "HH:mm")
INTEGER_FORMAT = os.environ.get("REDASH_INTEGER_FORMAT", "0,0")
FLOAT_FORMAT = os.environ.get("REDASH_FLOAT_FORMAT", "0,0.00")
MULTI_BYTE_SEARCH_ENABLED = parse_boolean(
    os.environ.get("MULTI_BYTE_SEARCH_ENABLED", "false")
)

FEATURE_SHOW_PERMISSIONS_CONTROL = parse_boolean(
    os.environ.get("REDASH_FEATURE_SHOW_PERMISSIONS_CONTROL", "false")
)
SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES = parse_boolean(
    os.environ.get("REDASH_SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES", "false")
)
HIDE_PLOTLY_MODE_BAR = parse_boolean(os.environ.get("HIDE_PLOTLY_MODE_BAR", "false"))
DISABLE_PUBLIC_URLS = parse_boolean(
    os.environ.get("REDASH_DISABLE_PUBLIC_URLS", "false")
)

settings = {
    "auth_password_login_enabled": PASSWORD_LOGIN_ENABLED,
    "date_format": DATE_FORMAT,
    "time_format": TIME_FORMAT,
    "integer_format": INTEGER_FORMAT,
    "float_format": FLOAT_FORMAT,
    "multi_byte_search_enabled": MULTI_BYTE_SEARCH_ENABLED,
    "feature_show_permissions_control": FEATURE_SHOW_PERMISSIONS_CONTROL,
    "send_email_on_failed_scheduled_queries": SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES,
    "hide_plotly_mode_bar": HIDE_PLOTLY_MODE_BAR,
    "disable_public_urls": DISABLE_PUBLIC_URLS,
}
