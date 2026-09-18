from urllib.parse import quote

from clients.wordpress import wp_request
from database import get_active_site, log_activity

from .inspection import _active_theme


def _validate_template_name(template_name):
    if not isinstance(template_name, str) or not template_name.strip():
        raise ValueError("template_name must be a non-empty string.")
    name = template_name.strip()
    if "/" in name or "\\" in name or ".." in name or name.startswith("."):
        raise ValueError("template_name must be a simple template slug without path separators.")
    return name


def _not_supported(reason, **extra):
    payload = {
        "supported": False,
        "reason": reason,
        **extra,
    }
    return payload


async def _match_template(template_name):
    templates = await wp_request("GET", "templates", params={"per_page": 100})
    for template in templates:
        if template.get("id") == template_name or template.get("slug") == template_name or template.get("name") == template_name:
            return template
    return None


async def _match_template_part(part_name):
    parts = await wp_request("GET", "template-parts", params={"per_page": 100})
    for part in parts:
        if part.get("id") == part_name or part.get("slug") == part_name or part.get("name") == part_name:
            return part
    return None


def register(mcp):
    @mcp.tool()
    async def get_theme_template(template_name: str) -> dict:
        """Return the content of a user-created block template if the site safely supports it."""
        name = _validate_template_name(template_name)
        theme = await _active_theme()
        if not theme.get("is_block_theme"):
            return _not_supported(
                "The active theme is a classic theme (Kadence). Templates that render the site are PHP theme files "
                "that WordPress does not expose through its REST API.",
                operation="get_theme_template",
                template_name=name,
                active_theme=theme.get("stylesheet"),
                requirement="safe template editing here needs a block theme (block template API) or a controlled filesystem mechanism",
            )
        try:
            template = await _match_template(name)
        except Exception as exc:
            return _not_supported("Could not read templates from the WordPress template API.", error=str(exc))
        if template is None:
            return _not_supported(
                f"No template named '{name}' exists as a user-created block template.",
                operation="get_theme_template",
                template_name=name,
                available_templates=[],
            )
        return {
            "supported": True,
            "id": template.get("id"),
            "theme": template.get("theme"),
            "type": template.get("type"),
            "slug": template.get("slug"),
            "status": template.get("status"),
            "has_theme_file": template.get("has_theme_file"),
            "is_custom": True,
            "title": (template.get("title") or {}).get("rendered"),
            "content": (template.get("content") or {}).get("raw"),
        }

    @mcp.tool()
    async def update_theme_template(template_name: str, content: str) -> dict:
        """Update a block template only where the theme architecture and WordPress template API safely permit it."""
        name = _validate_template_name(template_name)
        if not isinstance(content, str):
            raise ValueError("content must be a string.")
        if content.strip() == "":
            raise ValueError("content must not be empty.")

        theme = await _active_theme()
        if not theme.get("is_block_theme"):
            return _not_supported(
                "The active theme is a classic theme (Kadence). Updating templates via the block template API would "
                "not change the templates that actually render the site, and theme file modification is intentionally "
                "not supported to avoid modifying the parent theme.",
                operation="update_theme_template",
                template_name=name,
                content_received=True,
                content_applied=False,
                requirement="a block theme supporting the block template API or a controlled filesystem mechanism",
            )
        template = await _match_template(name)
        if template is None:
            return _not_supported(
                f"No existing template named '{name}' was found to update. Create it only if the block theme "
                "architecture supports it.",
                operation="update_theme_template",
                template_name=name,
                content_applied=False,
            )
        template_id = template["id"]
        encoded = quote(template_id, safe="")
        result = await wp_request("POST", f"templates/{encoded}", json={"content": content})
        site = get_active_site()
        log_activity("templates", "update", site["id"], f"template:{template_id}", "success", name)
        return {
            "supported": True,
            "updated": True,
            "id": result.get("id"),
            "theme": result.get("theme"),
            "title": (result.get("title") or {}).get("rendered"),
            "date_modified": result.get("modified"),
        }

    @mcp.tool()
    async def get_template_parts() -> dict:
        """Return available template parts if the site supports them."""
        theme = await _active_theme()
        available = {
            "supported": theme.get("is_block_theme") is True,
            "is_block_theme": theme.get("is_block_theme") is True,
        }
        try:
            parts = await wp_request("GET", "template-parts", params={"per_page": 100})
        except Exception as exc:
            available["error"] = str(exc)
            return available
        available["parts"] = [
            {
                "id": part.get("id"),
                "slug": part.get("slug"),
                "type": part.get("type"),
                "area": part.get("area"),
                "theme": part.get("theme"),
                "status": part.get("status"),
                "has_theme_file": part.get("has_theme_file"),
            }
            for part in parts
        ]
        available["note"] = (
            "Kadence is a classic theme: block template parts are not used for rendering. Its header/footer are "
            "produced by its own builder stored in theme_mods, which the WordPress REST API does not expose."
        ) if not theme.get("is_block_theme") else (
            "Block theme detected: template parts are editable through the WordPress template API."
        )
        return available

    @mcp.tool()
    async def update_template_part(part_name: str, content: str) -> dict:
        """Update a template part only where the theme architecture and WordPress template API safely permit it."""
        name = _validate_template_name(part_name)
        if not isinstance(content, str):
            raise ValueError("content must be a string.")
        if content.strip() == "":
            raise ValueError("content must not be empty.")

        theme = await _active_theme()
        if not theme.get("is_block_theme"):
            return _not_supported(
                "The active theme is a classic theme (Kadence). Template parts used for rendering are theme files "
                "not exposed through the WordPress REST API; modifying them directly could damage the parent theme.",
                operation="update_template_part",
                part_name=name,
                content_received=True,
                content_applied=False,
                requirement="a block theme supporting the template-part API or a controlled filesystem mechanism",
            )
        part = await _match_template_part(name)
        if part is None:
            return _not_supported(
                f"No template part named '{name}' was found to update.",
                operation="update_template_part",
                part_name=name,
                content_applied=False,
            )
        part_id = part["id"]
        encoded = quote(part_id, safe="")
        result = await wp_request("POST", f"template-parts/{encoded}", json={"content": content})
        site = get_active_site()
        log_activity("templates", "update_part", site["id"], f"template-part:{part_id}", "success", name)
        return {
            "supported": True,
            "updated": True,
            "id": result.get("id"),
            "theme": result.get("theme"),
            "area": result.get("area"),
            "title": (result.get("title") or {}).get("rendered"),
            "date_modified": result.get("modified"),
        }