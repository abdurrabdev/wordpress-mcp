from clients.wordpress import wp_request

from .inspection import _active_theme


def register(mcp):
    @mcp.tool()
    async def get_theme_info() -> dict:
        """Return information about the active WordPress theme, including parent/child status, palette and template support."""
        theme = await _active_theme()
        stylesheet = theme.get("stylesheet", "")
        template = theme.get("template", "")
        supports = theme.get("theme_supports") or {}
        return {
            "active": theme.get("status") == "active",
            "name": theme.get("name"),
            "stylesheet": stylesheet,
            "template": template,
            "version": theme.get("version"),
            "theme_uri": theme.get("theme_uri"),
            "author": theme.get("author"),
            "author_uri": theme.get("author_uri"),
            "description": theme.get("description"),
            "screenshot": theme.get("screenshot"),
            "textdomain": theme.get("textdomain"),
            "requires_wp": theme.get("requires_wp"),
            "requires_php": theme.get("requires_php"),
            "is_child_theme": bool(stylesheet and template and stylesheet != template),
            "parent_theme": template if (stylesheet and template and stylesheet != template) else None,
            "is_block_theme": theme.get("is_block_theme") is True,
            "default_template_types": theme.get("default_template_types"),
            "default_template_part_areas": theme.get("default_template_part_areas"),
            "supported_features": {
                "custom_logo": bool(supports.get("custom-logo")),
                "custom_logo_config": supports.get("custom-logo"),
                "custom_header": bool(supports.get("custom-header")),
                "custom_background": bool(supports.get("custom-background")),
                "nav_menus": bool(supports.get("nav-menus")),
                "block_templates": bool(supports.get("block-templates")),
                "block_template_parts": bool(supports.get("block-template-parts")),
                "widgets": bool(supports.get("widgets")),
                "responsive_embeds": bool(supports.get("responsive-embeds")),
                "editor_styles": bool(supports.get("editor-styles")),
                "title_tag": bool(supports.get("title-tag")),
                "editor_color_palette": supports.get("editor-color-palette"),
                "editor_font_sizes": supports.get("editor-font-sizes"),
            },
        }

    @mcp.tool()
    async def get_custom_css() -> dict:
        """Return the currently configured WordPress custom (Additional) CSS if it is safely readable."""
        try:
            types = await wp_request("GET", "types")
            exposed = "wp_custom_css" in types
        except Exception as exc:
            return {
                "supported": False,
                "operation": "get_custom_css",
                "reason": f"Could not inspect the WordPress REST API: {exc}",
                "custom_css": None,
            }
        if not exposed:
            return {
                "supported": False,
                "operation": "get_custom_css",
                "reason": (
                    "WordPress does not expose the Additional CSS ('wp_custom_css') post type or "
                    "a custom CSS endpoint through its REST API on this site."
                ),
                "how_to_change_safely": (
                    "Apply CSS from the WordPress admin at Appearance > Customize > Additional CSS, "
                    "or via WP-CLI (`wp custom-css set '...'`), neither of which this MCP exposes."
                ),
                "custom_css": None,
            }
        result = await wp_request("GET", "wp_custom_css")
        return {
            "supported": True,
            "operation": "get_custom_css",
            "custom_css": result.get("content", {}).get("raw") if isinstance(result, dict) else result,
        }

    @mcp.tool()
    async def update_custom_css(css: str) -> dict:
        """Update the site's custom CSS. Returns a structured not-supported result unless the site exposes a safe CSS API."""
        if not isinstance(css, str):
            raise ValueError("css must be a string.")
        if css.strip() == "":
            raise ValueError("css must not be empty. Use get_custom_css first to preserve existing CSS.")
        return {
            "supported": False,
            "operation": "update_custom_css",
            "reason": (
                "WordPress does not provide a safe REST API to write the Additional CSS ('wp_custom_css') "
                "post type on this site. This MCP intentionally does not write theme files or run arbitrary "
                "shell/WP-CLI commands."
            ),
            "how_to_apply_safely": (
                "Apply the new CSS in the WordPress admin at Appearance > Customize > Additional CSS. "
                "For programmatic use, WP-CLI (`wp custom-css set '...'`) is the supported mechanism."
            ),
            "css_received": bool(css),
            "css_applied": False,
        }