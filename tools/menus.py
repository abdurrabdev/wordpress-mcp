from clients.wordpress import wp_request
from database import get_active_site, log_activity


async def _registered_locations():
    return await wp_request("GET", "menu-locations")


def _location_slugs(locations):
    return list((locations or {}).keys())


def _validate_location(location, locations):
    if location not in locations:
        available = ", ".join(sorted(locations.keys()))
        raise ValueError(f"Unknown navigation location '{location}'. Available locations: {available}")


def register(mcp):
    @mcp.tool()
    async def get_navigation_menus() -> dict:
        """Return all navigation menus including locations, items, item ids, titles, URLs and hierarchy."""
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

        assembled = []
        for menu in menus:
            menu_id = menu["id"]
            items = await wp_request("GET", "menu-items", params={"menus": menu_id, "per_page": 100})
            clean_items = []
            for item in items:
                clean_items.append({
                    "id": item.get("id"),
                    "title": (item.get("title") or {}).get("rendered"),
                    "url": item.get("url"),
                    "type": item.get("type"),
                    "object": item.get("object"),
                    "object_id": item.get("object_id"),
                    "parent": item.get("parent", 0),
                    "menu_order": item.get("menu_order", 0),
                    "classes": item.get("classes") or [],
                    "target": item.get("target"),
                })
            item_ids = {item["id"] for item in clean_items}
            for item in clean_items:
                item["children"] = [i["id"] for i in clean_items if i.get("parent") == item["id"]]
            assembled.append({
                "id": menu_id,
                "name": menu.get("name"),
                "slug": menu.get("slug"),
                "locations": menu.get("locations") or [],
                "description": menu.get("description") or "",
                "item_count": len(clean_items),
                "items": clean_items,
            })

        return {
            "menus": assembled,
            "locations": location_map,
            "theme_locations": list(location_map.keys()),
        }

    @mcp.tool()
    async def create_menu(name: str, location: str | None = None) -> dict:
        """Create a navigation menu. Optionally assign it to a theme location."""
        if not isinstance(name, str) or not name.strip():
            raise ValueError("menu name must be a non-empty string.")
        data = {"name": name.strip()}
        if location:
            locations = await _registered_locations()
            _validate_location(location, locations)
            data["locations"] = [location]
        result = await wp_request("POST", "menus", json=data)
        site = get_active_site()
        log_activity("menus", "create", site["id"], f"menu:{result['id']}", "success", ",".join(data.get("locations") or []))
        return {
            "created": True,
            "menu_id": result["id"],
            "name": result.get("name"),
            "slug": result.get("slug"),
            "locations": result.get("locations") or [],
        }

    @mcp.tool()
    async def update_menu(menu_id: int, name: str | None = None, location: str | None = None) -> dict:
        """Update an existing navigation menu. Only supplied fields are changed and existing locations are preserved."""
        current = await wp_request("GET", f"menus/{menu_id}")

        before = {
            "name": current.get("name"),
            "locations": current.get("locations") or [],
        }
        data = {}
        if name is not None:
            if not isinstance(name, str) or not name.strip():
                raise ValueError("name must be a non-empty string when supplied.")
            data["name"] = name.strip()

        new_locations = None
        if location is not None:
            locations = await _registered_locations()
            _validate_location(location, locations)
            if location not in before["locations"]:
                new_locations = list(before["locations"]) + [location]

        if not data and new_locations is None:
            return {
                "updated": False,
                "menu_id": menu_id,
                "before": before,
                "message": "No changes supplied.",
            }

        changed = list(data.keys())
        if new_locations is not None:
            changed.append("locations")

        payload = dict(data)
        if new_locations is not None:
            payload["locations"] = new_locations
        result = await wp_request("POST", f"menus/{menu_id}", json=payload)

        after = {
            "name": result.get("name"),
            "locations": result.get("locations") or [],
        }
        site = get_active_site()
        log_activity("menus", "update", site["id"], f"menu:{menu_id}", "success", ",".join(sorted(set(changed))))
        return {
            "updated": True,
            "menu_id": menu_id,
            "before": before,
            "after": after,
            "message": "Menu updated. Existing locations not mentioned in the request were preserved.",
        }

    @mcp.tool()
    async def update_menu_item(item_id: int, title: str | None = None, url: str | None = None, parent_id: int | None = None, order: int | None = None, classes: list[str] | None = None) -> dict:
        """Update a single navigation menu item. Only supplied fields are changed."""
        current = await wp_request("GET", f"menu-items/{item_id}")
        before = {
            "title": (current.get("title") or {}).get("raw") or (current.get("title") or {}).get("rendered"),
            "url": current.get("url"),
            "parent": current.get("parent", 0),
            "menu_order": current.get("menu_order", 0),
            "classes": current.get("classes") or [],
        }

        if parent_id is not None:
            if not isinstance(parent_id, int) or parent_id < 0:
                raise ValueError("parent_id must be a non-negative integer.")
            if parent_id == item_id:
                raise ValueError("A menu item cannot be its own parent.")
        if order is not None and (not isinstance(order, int) or order < 0):
            raise ValueError("order must be a non-negative integer.")

        data = {}
        if title is not None:
            if not isinstance(title, str):
                raise ValueError("title must be a string.")
            data["title"] = title
        if url is not None:
            if not isinstance(url, str):
                raise ValueError("url must be a string.")
            data["url"] = url
        if parent_id is not None:
            data["parent"] = parent_id
        if order is not None:
            data["menu_order"] = order
        if classes is not None:
            if not isinstance(classes, list) or not all(isinstance(c, str) for c in classes):
                raise ValueError("classes must be a list of strings.")
            data["classes"] = classes

        if not data:
            return {
                "updated": False,
                "item_id": item_id,
                "before": before,
                "message": "No changes supplied.",
            }

        result = await wp_request("POST", f"menu-items/{item_id}", json=data)
        after = {
            "title": result.get("title", {}).get("raw") or result.get("title", {}).get("rendered"),
            "url": result.get("url"),
            "parent": result.get("parent", 0),
            "menu_order": result.get("menu_order", 0),
            "classes": result.get("classes") or [],
        }
        site = get_active_site()
        log_activity("menus", "update_item", site["id"], f"menu-item:{item_id}", "success", ",".join(data.keys()))
        return {
            "updated": True,
            "item_id": item_id,
            "menu_id": current.get("menus"),
            "before": before,
            "after": after,
        }

    @mcp.tool()
    async def delete_menu_item(item_id: int) -> dict:
        """Delete exactly the specified navigation menu item. The menu itself is never deleted."""
        if not isinstance(item_id, int) or item_id <= 0:
            raise ValueError("item_id must be a positive integer.")
        current = await wp_request("GET", f"menu-items/{item_id}")
        title = (current.get("title") or {}).get("rendered")
        menu_id = current.get("menus")
        result = await wp_request("DELETE", f"menu-items/{item_id}")
        site = get_active_site()
        log_activity("menus", "delete_item", site["id"], f"menu-item:{item_id}", "success", str(menu_id))
        return {
            "deleted": True,
            "item_id": item_id,
            "title": title,
            "menu_id": menu_id,
            "removed_from_menus": True,
            "message": "Only the specified menu item was deleted. The menu and all other items are untouched.",
        }