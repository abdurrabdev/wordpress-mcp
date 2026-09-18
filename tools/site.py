from clients.wordpress import wp_request

def register(mcp):
    @mcp.tool()
    async def get_site_info() -> dict:
        """Get basic WordPress REST API/site information."""
        return await wp_request("GET", "types")

    @mcp.tool()
    async def get_current_user() -> dict:
        """Return the authenticated WordPress user. Useful for connection verification."""
        return await wp_request("GET", "users/me")
