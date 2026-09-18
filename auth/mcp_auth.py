import secrets

from fastapi import Request
from fastapi.responses import JSONResponse

from config import settings


def _extract_mcp_token(headers):
    auth = headers.get("authorization", "").strip()
    supplied = auth
    if auth.lower().startswith("bearer "):
        supplied = auth[7:].strip()
    return auth, supplied


def validate_mcp_auth(headers):
    token = settings.mcp_auth_token.strip()
    if not token:
        return False, 503, {"error": "MCP_AUTH_TOKEN is not configured."}

    auth, supplied = _extract_mcp_token(headers)
    if not supplied or not secrets.compare_digest(supplied, token):
        return False, 401, {
            "error": "Unauthorized MCP request.",
            "debug": {
                "authorization_header_received": bool(auth),
                "received_length": len(auth),
                "expected_length": len(token),
                "starts_with_bearer": auth.lower().startswith("bearer "),
            },
        }

    return True, 200, {}


async def mcp_auth_middleware(request: Request, call_next):
    """Backwards-compatible helper for request-scoped auth checks."""
    if request.url.path.startswith("/mcp"):
        ok, status_code, payload = validate_mcp_auth(dict(request.headers))
        if not ok:
            return JSONResponse(payload, status_code=status_code)

    return await call_next(request)
