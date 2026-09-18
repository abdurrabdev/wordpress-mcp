from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse, RedirectResponse
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from admin.routes import router as admin_router
from auth.mcp_auth import validate_mcp_auth
from database import init_db
from tools import register_all_tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


mcp = FastMCP(
    "xhunta-wordpress-mcp",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[
            "wordpress-mcp.fastapicloud.dev",
            "wordpress-mcp.fastapicloud.dev:*",
        ],
        allowed_origins=[
            "https://wordpress-mcp.fastapicloud.dev",
            "https://localhost:8000",
        ],
    ),
)
register_all_tools(mcp)

app = FastAPI(
    title="Xhunta WordPress MCP",
    version="1.0.0",
    lifespan=lifespan,
)


class MCPAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path.startswith("/mcp"):
            headers = {k.decode("latin1").lower(): v.decode("latin1") for k, v in scope.get("headers", [])}
            ok, status_code, payload = validate_mcp_auth(headers)
            if not ok:
                response = JSONResponse(payload, status_code=status_code)
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)


app.add_middleware(MCPAuthMiddleware)

# MCP SSE transport. Clients normally connect to /mcp/sse.
app.mount("/mcp", mcp.sse_app())

app.include_router(admin_router, prefix="/admin")


@app.get("/")
async def root():
    return RedirectResponse("/admin")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "xhunta-wordpress-mcp"}
