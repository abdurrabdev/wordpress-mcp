from curl_cffi import requests

from config import settings
from database import get_active_site


class WooCommerceError(RuntimeError):
    pass


async def wc_request(method, path, **kwargs):
    site = get_active_site()

    if not site:
        raise WooCommerceError("No active WordPress site is configured.")

    key = site.get("wc_consumer_key") or settings.wc_consumer_key
    secret = site.get("wc_consumer_secret") or settings.wc_consumer_secret

    if not key or not secret:
        raise WooCommerceError(
            "WooCommerce API credentials are not configured for the active site."
        )

    url = f"{site['base_url']}/wp-json/wc/v3/{path.lstrip('/')}"

    params = kwargs.pop("params", {}) or {}

    params = {
        **params,
        "consumer_key": key,
        "consumer_secret": secret,
    }

    try:
        response = requests.request(
            method=method,
            url=url,
            params=params,
            timeout=settings.request_timeout,
            impersonate="chrome",
            allow_redirects=True,
            **kwargs,
        )

        response.raise_for_status()

        return response.json()

    except requests.HTTPError as exc:
        raise WooCommerceError(
            f"WooCommerce API {exc.response.status_code}: "
            f"{exc.response.text[:1000]}"
        ) from exc

    except Exception as exc:
        raise WooCommerceError(
            f"WooCommerce connection failed: {exc}"
        ) from exc