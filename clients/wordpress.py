import base64
import httpx
from config import settings
from database import get_active_site

class WordPressError(RuntimeError):
    pass

def _headers(site):
    token = base64.b64encode(f"{site['wp_username']}:{site['wp_app_password']}".encode()).decode()
    return {
        "Authorization": f"Basic {token}",
        "User-Agent": "Xhunta-WordPress-MCP/1.0",
        "Accept": "application/json",
    }

async def wp_request(method, path, **kwargs):
    site = get_active_site()
    if not site:
        raise WordPressError("No active WordPress site is configured.")
    url = f"{site['base_url']}/wp-json/wp/v2/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=True) as client:
            response = await client.request(method, url, headers=_headers(site), **kwargs)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:1000]
        raise WordPressError(f"WordPress API {exc.response.status_code}: {body}") from exc
    except httpx.HTTPError as exc:
        raise WordPressError(f"WordPress connection failed: {exc}") from exc

async def wp_request_full(method, path, **kwargs):
    site = get_active_site()
    if not site:
        raise WordPressError("No active WordPress site is configured.")
    url = f"{site['base_url']}/wp-json/wp/v2/{path.lstrip('/')}"
    async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=True) as client:
        response = await client.request(method, url, headers=_headers(site), **kwargs)
        return response
