from clients.wordpress import wp_request
from database import get_active_site, log_activity
from safety.validation import validate_status

def register(mcp):
    @mcp.tool()
    async def create_post(title: str, content: str, status: str = "draft") -> str:
        """Create a WordPress post. Defaults to draft."""
        validate_status(status)
        result = await wp_request("POST", "posts", json={"title":title,"content":content,"status":status})
        site = get_active_site()
        log_activity("posts","create",site["id"],f"post:{result['id']}","success")
        return f"Created post {result['id']}: {result['link']}"

    @mcp.tool()
    async def update_post(post_id: int, title: str | None=None, content: str | None=None, status: str | None=None) -> str:
        """Update an existing WordPress post."""
        fields = {k:v for k,v in {"title":title,"content":content,"status":status}.items() if v is not None}
        if status: validate_status(status)
        if not fields: return "No changes supplied."
        result = await wp_request("POST", f"posts/{post_id}", json=fields)
        site = get_active_site()
        log_activity("posts","update",site["id"],f"post:{post_id}","success",",".join(fields.keys()))
        return f"Updated post {result['id']}: {result['link']}"

    @mcp.tool()
    async def get_post(post_id: int) -> dict:
        """Fetch a single WordPress post."""
        return await wp_request("GET", f"posts/{post_id}")

    @mcp.tool()
    async def list_posts(per_page: int=10, search: str|None=None) -> list:
        """List recent WordPress posts."""
        params={"per_page":max(1,min(per_page,100))}
        if search: params["search"]=search
        return await wp_request("GET","posts",params=params)
