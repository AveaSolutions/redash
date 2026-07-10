import requests
from requests_hardened import Config
from requests_hardened.client import HTTPSession
from requests_hardened.ip_filter import InvalidIPAddress

from redash import settings

# Backwards-compatible alias used by query runners for SSRF blocks.
UnacceptableAddressException = InvalidIPAddress

_http_config = Config(
    ip_filter_enable=settings.ENFORCE_PRIVATE_ADDRESS_BLOCK,
    ip_filter_allow_loopback_ips=False,
    never_redirect=not settings.REQUESTS_ALLOW_REDIRECTS,
    default_timeout=None,
)


class ConfiguredSession(HTTPSession):
    def __init__(self):
        super().__init__(_http_config)

    def request(self, *args, **kwargs):
        if not settings.REQUESTS_ALLOW_REDIRECTS:
            kwargs.setdefault("allow_redirects", False)
        return super().request(*args, **kwargs)


requests_session = ConfiguredSession()
