from clients.wordpress import wp_request
from database import get_active_site, log_activity

from .inspection import _active_theme

DESIGN_SETTINGS_ALLOWLIST = {
    "title",
    "description",
    "site_logo",
    "site_icon",
    "show_on_front",
    "page_on_front",
    "page_for_posts",
}

SENSITIVE_SETTING_SUFFIXES = ("secret", "secret_key", "api_key", "token")


def _is_sensitive(name):
    lowered = name.lower()
    return any(suffix in lowered for suffix in SENSITIVE_SETTING_SUFFIXES)


def register(mcp):
    @mcp.tool()
    async def get_customizer_settings() -> dict:
        """Return the Customizer-related settings safely exposed by the active site (site identity, homepage)."""
        theme = await _active_theme()
        settings = await wp_request("GET", "settings")

        design_values = {
            "title": settings.get("title"),
            "description": settings.get("description"),
            "url": settings.get("url"),
            "site_logo": settings.get("site_logo"),
            "site_icon": settings.get("site_icon"),
            "show_on_front": settings.get("show_on_front"),
            "page_on_front": settings.get("page_on_front"),
            "page_for_posts": settings.get("page_for_posts"),
            "posts_per_page": settings.get("posts_per_page"),
        }
        writable = [name for name in DESIGN_SETTINGS_ALLOWLIST if name in settings]

        return {
            "theme": {
                "name": theme.get("name"),
                "stylesheet": theme.get("stylesheet"),
                "version": theme.get("version"),
                "is_block_theme": theme.get("is_block_theme") is True,
            },
            "customizer_available": True,
            "available_customizer_settings": design_values,
            "writable_settings_via_rest": writable,
            "all_settings_api_keys": sorted(settings.keys()),
            "theme_mods_exposed": False,
            "note": (
                "Kadence stores the majority of its design configuration (colors, typography, header/footer builder, "
                "layout, buttons, sidebar) in theme_mods/theme options that WordPress does not expose through its "
                "REST API. Only Settings-API options registered with show_in_rest are safe to read and write here. "
                "Sensitive values (API keys, secrets, tokens) are never returned."
            ),
        }

    @mcp.tool()
    async def update_customizer_settings(settings: dict) -> dict:
        """Safely update supported Customizer settings. Only existing, allow-listed design settings are changed."""
        if not isinstance(settings, dict):
            raise ValueError("settings must be a dict of setting-name keys to values.")
        if not settings:
            return {"updated_keys": [], "message": "No settings supplied."}

        current = await wp_request("GET", "settings")

        to_update = {}
        ignored = []
        not_present = []
        for name, value in settings.items():
            if not isinstance(name, str):
                raise ValueError(f"Setting names must be strings, got {type(name).__name__}.")
            if _is_sensitive(name):
                ignored.append({"key": name, "reason": "sensitive setting (secret/token) is never written"})
                continue
            if name not in DESIGN_SETTINGS_ALLOWLIST:
                ignored.append({"key": name, "reason": "not in the safe design-settings allowlist"})
                continue
            if name not in current:
                not_present.append(name)
                continue
            to_update[name] = value

        if not to_update:
            return {
                "updated": {},
                "before": {},
                "ignored": ignored,
                "not_present": not_present,
                "message": "No supported settings to update.",
            }

        before = {name: current.get(name) for name in to_update}
        result = await wp_request("POST", "settings", json=to_update)
        after = {name: result.get(name) for name in to_update}
        site = get_active_site()
        log_activity("customizer", "update", site["id"], ",".join(to_update.keys()), "success", ",".join(to_update.keys()))
        return {
            "updated": {name: {"before": before[name], "after": after[name]} for name in to_update},
            "ignored": ignored,
            "not_present": not_present,
            "message": "Customizer settings updated. Unsupported or missing keys were not modified.",
        }