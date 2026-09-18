from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path

from auth.admin_auth import (
    CSRF_COOKIE_KEY,
    is_authenticated,
    make_csrf_token,
    validate_csrf,
    verify,
)
from config import settings
from database import (
    list_sites,
    get_site,
    save_site,
    activate_site,
    delete_site,
    get_active_site,
    recent_logs,
)
from clients.wordpress import wp_request

router = APIRouter()

templates = Jinja2Templates(
    directory=str(Path(__file__).parent / "templates")
)


def render_admin_template(request: Request, template_name: str, context: dict, status_code: int = 200):
    csrf_token = request.cookies.get(CSRF_COOKIE_KEY) or make_csrf_token()
    response = templates.TemplateResponse(
        request=request,
        name=template_name,
        context={**context, "csrf_token": csrf_token},
        status_code=status_code,
    )
    response.set_cookie(
        CSRF_COOKIE_KEY,
        csrf_token,
        httponly=True,
        samesite="lax",
        secure=settings.app_env == "production",
    )
    return response


def guard(request: Request):
    if not is_authenticated(request):
        return RedirectResponse(
            "/admin/login",
            status_code=303,
        )
    return None


@router.get("/login", response_class=HTMLResponse)
async def login(request: Request):
    return render_admin_template(
        request,
        "login.html",
        {"error": None},
    )


@router.post("/login")
async def login_post(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    csrf_token: str = Form(...),
):
    if not validate_csrf(request, csrf_token):
        return render_admin_template(
            request,
            "login.html",
            {"error": "Invalid or expired CSRF token."},
            status_code=403,
        )

    if not verify(username, password):
        return render_admin_template(
            request,
            "login.html",
            {"error": "Invalid admin credentials."},
            status_code=401,
        )

    response = RedirectResponse(
        "/admin",
        status_code=303,
    )

    response.set_cookie(
        "mcp_admin_authenticated",
        "1",
        httponly=True,
        samesite="lax",
        secure=settings.app_env == "production",
    )
    response.set_cookie(
        CSRF_COOKIE_KEY,
        csrf_token,
        httponly=True,
        samesite="lax",
        secure=settings.app_env == "production",
    )

    return response


@router.post("/logout")
async def logout(request: Request, csrf_token: str = Form(...)):
    if not validate_csrf(request, csrf_token):
        return RedirectResponse("/admin/login", status_code=303)

    response = RedirectResponse(
        "/admin/login",
        status_code=303,
    )

    response.delete_cookie("mcp_admin_authenticated")
    response.delete_cookie(CSRF_COOKIE_KEY)

    return response


@router.get("", response_class=HTMLResponse)
async def dashboard(request: Request):
    g = guard(request)

    if g:
        return g

    site = get_active_site()

    return render_admin_template(
        request,
        "dashboard.html",
        {
            "site": site,
            "sites": list_sites(),
        },
    )


@router.get("/ai-connections", response_class=HTMLResponse)
async def ai_connections(request: Request):
    g = guard(request)
    if g:
        return g

    base_url = settings.mcp_public_url.rstrip("/")
    mcp_endpoint = f"{base_url}/mcp/sse"

    return render_admin_template(
        request,
        "ai_connections.html",
        {
            "mcp_endpoint": mcp_endpoint,
            "token_configured": bool(settings.mcp_auth_token),
        },
    )


@router.get("/sites", response_class=HTMLResponse)
async def sites(request: Request):
    g = guard(request)

    if g:
        return g

    return render_admin_template(
        request,
        "sites.html",
        {
            "sites": list_sites(),
            "site": None,
            "message": None,
        },
    )


@router.post("/sites/save")
async def save_site_post(
    request: Request,
    site_id: int | None = Form(None),
    name: str = Form(...),
    base_url: str = Form(...),
    wp_username: str = Form(...),
    wp_app_password: str = Form(...),
    wc_consumer_key: str = Form(""),
    wc_consumer_secret: str = Form(""),
    csrf_token: str = Form(...),
):
    g = guard(request)

    if g:
        return g

    if not validate_csrf(request, csrf_token):
        return RedirectResponse("/admin/sites", status_code=403)

    data = {
        "name": name,
        "base_url": base_url,
        "wp_username": wp_username,
        "wp_app_password": wp_app_password,
        "wc_consumer_key": wc_consumer_key,
        "wc_consumer_secret": wc_consumer_secret,
    }

    save_site(data, site_id)

    return RedirectResponse(
        "/admin/sites?saved=1",
        status_code=303,
    )


@router.get("/sites/new", response_class=HTMLResponse)
async def new_site(request: Request):
    g = guard(request)

    if g:
        return g

    return render_admin_template(
        request,
        "site_form.html",
        {
            "site": None,
            "error": None,
        },
    )


@router.get(
    "/sites/{site_id}/edit",
    response_class=HTMLResponse,
)
async def edit_site(
    request: Request,
    site_id: int,
):
    g = guard(request)

    if g:
        return g

    return render_admin_template(
        request,
        "site_form.html",
        {
            "site": get_site(site_id),
            "error": None,
        },
    )


@router.post("/sites/{site_id}/activate")
async def activate(
    request: Request,
    site_id: int,
    csrf_token: str = Form(...),
):
    g = guard(request)

    if g:
        return g

    if not validate_csrf(request, csrf_token):
        return RedirectResponse("/admin/sites", status_code=403)

    activate_site(site_id)

    return RedirectResponse(
        "/admin/sites",
        status_code=303,
    )


@router.post("/sites/{site_id}/delete")
async def delete(
    request: Request,
    site_id: int,
    csrf_token: str = Form(...),
):
    g = guard(request)

    if g:
        return g

    if not validate_csrf(request, csrf_token):
        return RedirectResponse("/admin/sites", status_code=403)

    delete_site(site_id)

    return RedirectResponse(
        "/admin/sites",
        status_code=303,
    )


@router.post("/sites/{site_id}/test")
async def test_connection(
    request: Request,
    site_id: int,
    csrf_token: str = Form(...),
):
    g = guard(request)

    if g:
        return g

    if not validate_csrf(request, csrf_token):
        return RedirectResponse("/admin/sites", status_code=403)

    # Temporarily activate for the test, then leave it active
    # because the UI explicitly tests the selected site.
    activate_site(site_id)

    try:
        user = await wp_request(
            "GET",
            "users/me",
        )

        msg = (
            "Connected successfully as "
            f"{user.get('name') or user.get('slug') or 'WordPress user'}."
        )

        ok = True

    except Exception as exc:
        msg = f"Connection failed: {exc}"
        ok = False

    return render_admin_template(
        request,
        "sites.html",
        {
            "sites": list_sites(),
            "site": get_active_site(),
            "message": msg,
            "ok": ok,
        },
    )


@router.get("/logs", response_class=HTMLResponse)
async def logs(request: Request):
    g = guard(request)

    if g:
        return g

    return render_admin_template(
        request,
        "logs.html",
        {
            "logs": recent_logs(150),
        },
    )


@router.get(
    "/settings",
    response_class=HTMLResponse,
)
async def settings_page(request: Request):
    g = guard(request)

    if g:
        return g

    return render_admin_template(
        request,
        "settings.html",
        {
            "settings": {
                "APP_ENV": settings.app_env,
                "REQUEST_TIMEOUT": settings.request_timeout,
                "MAX_UPLOAD_SIZE": settings.max_upload_size,
                "MCP_AUTH_TOKEN_SET": bool(
                    settings.mcp_auth_token
                ),
            }
        },
    )