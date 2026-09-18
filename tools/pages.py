from clients.wordpress import wp_request
from database import get_active_site, log_activity
from safety.validation import validate_status

def register(mcp):
    @mcp.tool()
    async def list_pages(per_page: int = 20, search: str | None = None) -> list:
        """List WordPress pages. Use before modifying an existing page."""
        params = {"per_page": max(1, min(per_page, 100))}
        if search: params["search"] = search
        return await wp_request("GET", "pages", params=params)

    @mcp.tool()
    async def get_page(page_id: int) -> dict:
        """Get a WordPress page including Gutenberg block HTML."""
        return await wp_request("GET", f"pages/{page_id}")

    @mcp.tool()
    async def create_page(title: str, content: str = "", status: str = "draft") -> str:
        """Create a WordPress page. Defaults to draft for safety."""
        validate_status(status)
        result = await wp_request("POST", "pages", json={"title": title, "content": content, "status": status})
        site = get_active_site()
        log_activity("pages", "create", site["id"], f"page:{result['id']}", "success")
        return f"Created page {result['id']}: {result['link']}"

    @mcp.tool()
    async def update_page(page_id: int, title: str | None = None, content: str | None = None, status: str | None = None) -> str:
        """Update an existing WordPress page. Only supplied fields are changed."""
        fields = {k:v for k,v in {"title":title,"content":content,"status":status}.items() if v is not None}
        if status: validate_status(status)
        if not fields: return "No changes supplied."
        result = await wp_request("POST", f"pages/{page_id}", json=fields)
        site = get_active_site()
        log_activity("pages", "update", site["id"], f"page:{page_id}", "success", ",".join(fields.keys()))
        return f"Updated page {result['id']}: {result['link']}"
