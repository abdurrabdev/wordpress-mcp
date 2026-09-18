import secrets
from fastapi import Request
from fastapi.responses import RedirectResponse
from config import settings

SESSION_KEY = "mcp_admin_authenticated"
CSRF_COOKIE_KEY = "mcp_admin_csrf"


def is_authenticated(request: Request) -> bool:
    return request.cookies.get(SESSION_KEY) == "1"


def make_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def validate_csrf(request: Request, submitted_token: str | None) -> bool:
    cookie_token = request.cookies.get(CSRF_COOKIE_KEY)
    if not cookie_token or not submitted_token:
        return False
    return secrets.compare_digest(cookie_token, submitted_token)


def verify(username: str, password: str) -> bool:
    return secrets.compare_digest(username, settings.admin_username) and bool(settings.admin_password) and secrets.compare_digest(password, settings.admin_password)


def require_admin(request: Request):
    if not is_authenticated(request):
        return RedirectResponse("/admin/login", status_code=303)
    return None
