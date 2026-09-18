from clients.wordpress import wp_request
from clients.woocommerce import wc_request, WooCommerceError
from database import get_active_site


async def _active_theme():
    themes = await wp_request("GET", "themes")
    for theme in themes:
        if theme.get("status") == "active":
            return theme
    raise RuntimeError("Active theme not found in the WordPress themes REST response.")


async def _is_block_theme():
    return (await _active_theme()).get("is_block_theme") is True


async def _site_settings():
    try:
        return await wp_request("GET", "settings")
    except Exception:
        return {}


def _theme_summary(theme):
    supports = theme.get("theme_supports") or {}
    stylesheet = theme.get("stylesheet", "")
    template = theme.get("template", "")
    is_child = bool(stylesheet and template and stylesheet != template)
    return {
        "name": theme.get("name"),
        "stylesheet": stylesheet,
        "version": theme.get("version"),
        "theme_uri": theme.get("theme_uri"),
        "author": theme.get("author"),
        "is_block_theme": theme.get("is_block_theme") is True,
        "is_child_theme": is_child,
        "parent_theme": template if is_child else None,
        "colors": supports.get("editor-color-palette"),
        "font_sizes": supports.get("editor-font-sizes"),
        "custom_logo_config": supports.get("custom-logo"),
        "responsive_embeds": bool(supports.get("responsive-embeds")),
    }


def register(mcp):
    @mcp.tool()
    async def inspect_site() -> dict:
        """Inspect the active site before making changes. Returns WordPress types and WooCommerce availability."""
        site=get_active_site()
        if not site:
            return {"connected":False,"error":"No active site"}
        result={"site":{"id":site["id"],"name":site["name"],"base_url":site["base_url"]}}
        try:
            result["wordpress_types"]=await wp_request("GET","types")
            result["wordpress_connected"]=True
        except Exception as exc:
            result["wordpress_connected"]=False
            result["wordpress_error"]=str(exc)
        try:
            result["woocommerce_sample"]=await wc_request("GET","products",params={"per_page":1})
            result["woocommerce_connected"]=True
        except Exception as exc:
            result["woocommerce_connected"]=False
            result["woocommerce_error"]=str(exc)
        return result

    @mcp.tool()
    async def inspect_theme() -> dict:
        """Return a structured overview of the active theme, its capabilities and safe editing options."""
        theme = await _active_theme()
        supports = theme.get("theme_supports") or {}
        stylesheet = theme.get("stylesheet", "")
        template = theme.get("template", "")
        is_child = bool(stylesheet and template and stylesheet != template)

        locations = {}
        try:
            raw_locations = await wp_request("GET", "menu-locations")
            locations = {
                slug: {"name": info.get("name"), "description": info.get("description"), "menu_id": info.get("menu")}
                for slug, info in (raw_locations or {}).items()
            }
        except Exception as exc:
            locations = {"error": str(exc)}

        customizer_available = True
        try:
            await wp_request("GET", "settings")
        except Exception:
            customizer_available = False

        template_api = {"is_block_theme": theme.get("is_block_theme") is True}
        try:
            templates = await wp_request("GET", "templates", params={"per_page": 100})
            template_api["route_available"] = True
            template_api["user_created_count"] = len(templates)
        except Exception as exc:
            template_api["route_available"] = False
            template_api["error"] = str(exc)

        warnings = []
        if not theme.get("is_block_theme"):
            warnings.append(
                "The active theme is a classic theme: its PHP templates render the site and are NOT safely "
                "editable through the WordPress REST API. Direct template-file modification is intentionally "
                "not supported to avoid damaging the parent theme."
            )
            warnings.append(
                "The active theme stores most design options in theme_mods/theme options which WordPress does "
                "not expose through REST, so palette/typography/header/footer builder changes are not editable here."
            )
        else:
            warnings.append(
                "Block theme detected: template editing is possible via the block template REST API, but always "
                "inspect before updating and never modify WordPress/WooCommerce core files."
            )
        if template_api.get("route_available") and not theme.get("is_block_theme"):
            warnings.append(
                "The block template REST route exists but only hosts user-created block templates; the classic "
                "theme templates that actually render the site are not part of it."
            )

        return {
            "active_theme": {
                "name": theme.get("name"),
                "stylesheet": stylesheet,
                "version": theme.get("version"),
                "theme_uri": theme.get("theme_uri"),
                "author": theme.get("author"),
                "textdomain": theme.get("textdomain"),
                "screenshot": theme.get("screenshot"),
            },
            "parent_theme": template if is_child else None,
            "child_theme": is_child,
            "theme_version": theme.get("version"),
            "theme_locations": locations,
            "customizer_available": customizer_available,
            "customizer_note": (
                "Only Settings-API options registered with show_in_rest are readable/writable via REST "
                "(site identity, homepage). Theme mods are not exposed."
            ),
            "custom_css_available": False,
            "custom_css_note": (
                "WordPress does not expose the Additional CSS ('wp_custom_css') post type through REST on this "
                "site; the MCP does not write theme files or run shell/WP-CLI commands."
            ),
            "template_api": template_api,
            "design_config": {
                "editor_color_palette": supports.get("editor-color-palette"),
                "editor_font_sizes": supports.get("editor-font-sizes"),
                "custom_logo": supports.get("custom-logo"),
                "block_templates": bool(supports.get("block-templates")),
                "responsive_embeds": bool(supports.get("responsive-embeds")),
            },
            "warnings": warnings,
        }

    @mcp.tool()
    async def inspect_menus() -> dict:
        """Return a complete structured overview of menus, locations, items, hierarchy, URLs and linked objects."""
        menus = await wp_request("GET", "menus", params={"per_page": 100})
        raw_locations = await wp_request("GET", "menu-locations")

        location_map = {
            slug: {
                "name": info.get("name"),
                "description": info.get("description"),
                "menu_id": info.get("menu"),
            }
            for slug, info in (raw_locations or {}).items()
        }

        reference_keys = set()
        assembled = []
        for menu in menus:
            menu_id = menu["id"]
            items = await wp_request("GET", "menu-items", params={"menus": menu_id, "per_page": 100})
            clean_items = []
            for item in items:
                obj = item.get("object")
                object_id = item.get("object_id")
                if obj and object_id:
                    reference_keys.add((obj, object_id))
                clean_items.append({
                    "id": item.get("id"),
                    "title": (item.get("title") or {}).get("rendered"),
                    "url": item.get("url"),
                    "type": item.get("type"),
                    "object": obj,
                    "object_id": object_id,
                    "parent": item.get("parent", 0),
                    "menu_order": item.get("menu_order", 0),
                    "classes": item.get("classes") or [],
                    "target": item.get("target"),
                })
            item_ids = {item["id"] for item in clean_items}
            for item in clean_items:
                item["children"] = [i["id"] for i in clean_items if i.get("parent") == item["id"]]
                item["parent_exists"] = item.get("parent") in item_ids or not item.get("parent")
            assembled.append({
                "id": menu_id,
                "name": menu.get("name"),
                "slug": menu.get("slug"),
                "description": menu.get("description") or "",
                "locations": menu.get("locations") or [],
                "item_count": len(clean_items),
                "root_item_ids": [i["id"] for i in clean_items if not i.get("parent")],
                "items": clean_items,
            })

        resolved = {}
        for obj, object_id in sorted(reference_keys):
            try:
                if obj == "page":
                    obj_data = await wp_request("GET", f"pages/{object_id}")
                    resolved[(obj, object_id)] = {
                        "title": (obj_data.get("title") or {}).get("rendered"),
                        "link": obj_data.get("link"),
                    }
                elif obj == "post":
                    obj_data = await wp_request("GET", f"posts/{object_id}")
                    resolved[(obj, object_id)] = {
                        "title": (obj_data.get("title") or {}).get("rendered"),
                        "link": obj_data.get("link"),
                    }
                elif obj == "product":
                    obj_data = await wc_request("GET", f"products/{object_id}")
                    resolved[(obj, object_id)] = {
                        "title": obj_data.get("name"),
                        "link": obj_data.get("permalink"),
                    }
                elif obj in ("product_cat", "product_category"):
                    obj_data = await wc_request("GET", f"products/categories/{object_id}")
                    resolved[(obj, object_id)] = {
                        "title": obj_data.get("name"),
                        "link": obj_data.get("link"),
                    }
                else:
                    resolved[(obj, object_id)] = {
                        "title": None,
                        "link": None,
                        "note": f"object type '{obj}' is not resolved by this inspection tool",
                    }
            except Exception as exc:
                resolved[(obj, object_id)] = {
                    "title": None,
                    "link": None,
                    "error": str(exc),
                }

        for menu in assembled:
            for item in menu["items"]:
                item["linked"] = resolved.get((item.get("object"), item.get("object_id")))

        return {
            "menus": assembled,
            "locations": location_map,
            "theme_locations": list(location_map.keys()),
        }

    @mcp.tool()
    async def inspect_site_design() -> dict:
        """Return a high-level design inspection of the active site for AI agents planning design changes."""
        theme = await _active_theme()
        settings = await _site_settings()

        menus = []
        locations = {}
        try:
            raw_menus = await wp_request("GET", "menus", params={"per_page": 100})
            menus = [
                {"id": m["id"], "name": m.get("name"), "slug": m.get("slug"), "locations": m.get("locations") or []}
                for m in raw_menus
            ]
            raw_locations = await wp_request("GET", "menu-locations")
            locations = {
                slug: {"name": info.get("name"), "description": info.get("description"), "menu_id": info.get("menu")}
                for slug, info in (raw_locations or {}).items()
            }
        except Exception as exc:
            locations = {"error": str(exc)}

        homepage = None
        page_on_front = settings.get("page_on_front")
        if page_on_front:
            try:
                page = await wp_request("GET", f"pages/{page_on_front}")
                homepage = {
                    "page_id": page_on_front,
                    "title": (page.get("title") or {}).get("rendered"),
                    "link": page.get("link"),
                    "status": page.get("status"),
                }
            except Exception as exc:
                homepage = {"page_id": page_on_front, "error": str(exc)}

        important_pages = []
        try:
            pages = await wp_request("GET", "pages", params={"per_page": 10, "orderby": "menu_order"})
            important_pages = [
                {"id": p["id"], "title": (p.get("title") or {}).get("rendered"), "link": p.get("link"), "status": p.get("status")}
                for p in pages
            ]
        except Exception as exc:
            important_pages = [{"error": str(exc)}]

        shop = {}
        categories = []
        try:
            sample = await wc_request("GET", "products", params={"per_page": 1})
            shop["connected"] = True
            shop["product_count"] = len(sample)
            raw_categories = await wc_request("GET", "products/categories", params={"per_page": 10})
            categories = [
                {"id": c["id"], "name": c.get("name"), "slug": c.get("slug"), "count": c.get("count")}
                for c in raw_categories
            ]
        except Exception as exc:
            shop["connected"] = False
            shop["error"] = str(exc)

        summary = _theme_summary(theme)
        return {
            "active_theme": summary,
            "header": {
                "custom_logo": bool(summary.get("custom_logo_config")),
                "custom_logo_config": summary.get("custom_logo_config"),
                "custom_header_supported": False,
                "note": "Kadence header layout is driven by its header builder stored in theme_mods, which WordPress does not expose via REST.",
            },
            "footer": {
                "note": "Kadence footer layout is driven by its footer builder stored in theme_mods, which WordPress does not expose via REST.",
            },
            "menus": menus,
            "navigation": {
                "locations": locations,
                "menu_names_by_location": {
                    slug: next((m["name"] for m in menus if m["id"] == info.get("menu_id")), None)
                    for slug, info in locations.items()
                    if isinstance(info, dict)
                },
            },
            "custom_css": {
                "available": False,
                "note": "Not exposed via the WordPress REST API; apply via the admin Customizer Additional CSS panel.",
            },
            "customizer": {
                "available": True,
                "rest_exposed_site_identity": {
                    "title": settings.get("title"),
                    "description": settings.get("description"),
                    "site_logo": settings.get("site_logo"),
                    "site_icon": settings.get("site_icon"),
                },
                "note": "Theme mods (palette, typography, header/footer builder) are not exposed via REST.",
            },
            "homepage": {
                "show_on_front": settings.get("show_on_front"),
                "page_on_front": page_on_front,
                "page_for_posts": settings.get("page_for_posts"),
                "resolved": homepage,
            },
            "important_pages": important_pages,
            "woocommerce": {
                **shop,
                "categories": categories,
                "note": "WooCommerce product and category URLs are editable through product/category tools.",
            },
            "typography": {
                "theme_font_sizes": summary.get("font_sizes"),
                "note": "Full Kadence typography configuration lives in theme_mods and is not exposed via REST.",
            },
            "colors": {
                "theme_palette": summary.get("colors"),
                "note": "Full Kadence color configuration lives in theme_mods and is not exposed via REST.",
            },
            "responsive": {
                "responsive_embeds": summary.get("responsive_embeds"),
                "note": "Kadence responsive breakpoints are theme options not exposed via the WordPress REST API.",
            },
            "design_inspection_tools": [
                "get_theme_info",
                "get_customizer_settings",
                "get_navigation_menus",
                "inspect_theme",
                "inspect_menus",
            ],
        }