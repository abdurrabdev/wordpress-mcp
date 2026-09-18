import httpx
from clients.wordpress import wp_request, wp_request_full
from database import get_active_site, log_activity
from config import settings

def register(mcp):
    @mcp.tool()
    async def list_media(per_page: int=20, search: str|None=None) -> list:
        """List media items from the WordPress media library."""
        params={"per_page":max(1,min(per_page,100))}
        if search: params["search"]=search
        return await wp_request("GET","media",params=params)

    @mcp.tool()
    async def get_media(media_id: int) -> dict:
        """Get one media item."""
        return await wp_request("GET",f"media/{media_id}")

    @mcp.tool()
    async def update_media(media_id: int, title: str|None=None, alt_text: str|None=None, caption: str|None=None, description: str|None=None) -> str:
        """Update media metadata, useful for SEO/accessibility."""
        fields={k:v for k,v in {"title":title,"alt_text":alt_text,"caption":caption,"description":description}.items() if v is not None}
        if not fields: return "No changes supplied."
        result=await wp_request("POST",f"media/{media_id}",json=fields)
        site=get_active_site()
        log_activity("media","update",site["id"],f"media:{media_id}","success",",".join(fields.keys()))
        return f"Updated media {result['id']}."

    @mcp.tool()
    async def upload_media(source_url: str, filename: str) -> str:
        """Download a public URL and upload it to the active WordPress media library."""
        async with httpx.AsyncClient(timeout=settings.request_timeout, follow_redirects=True) as client:
            r=await client.get(source_url)
            r.raise_for_status()
            if len(r.content)>settings.max_upload_size:
                raise ValueError("Source file exceeds MAX_UPLOAD_SIZE.")
            content_type=r.headers.get("content-type","application/octet-stream")
        response=await wp_request_full("POST","media",headers={
            "Content-Type":content_type,
            "Content-Disposition":f'attachment; filename="{filename}"'
        },content=r.content)
        if response.status_code >= 400:
            raise RuntimeError(f"Media upload failed: {response.status_code} {response.text[:1000]}")
        media=response.json()
        site=get_active_site()
        log_activity("media","upload",site["id"],f"media:{media['id']}","success",filename)
        return f"Uploaded media {media['id']}: {media['source_url']}"
