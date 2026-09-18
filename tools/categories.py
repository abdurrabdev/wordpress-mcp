from clients.woocommerce import wc_request
from database import get_active_site, log_activity

def register(mcp):
    @mcp.tool()
    async def list_product_categories(per_page:int=100, search:str|None=None) -> list:
        """List WooCommerce product categories."""
        params={"per_page":max(1,min(per_page,100))}
        if search: params["search"]=search
        return await wc_request("GET","products/categories",params=params)

    @mcp.tool()
    async def get_product_category(category_id:int) -> dict:
        """Get a WooCommerce product category."""
        return await wc_request("GET",f"products/categories/{category_id}")

    @mcp.tool()
    async def create_product_category(name:str, description:str="", slug:str="") -> str:
        """Create a WooCommerce product category."""
        data={"name":name,"description":description}
        if slug: data["slug"]=slug
        result=await wc_request("POST","products/categories",json=data)
        site=get_active_site()
        log_activity("categories","create",site["id"],f"category:{result['id']}","success")
        return f"Created category {result['id']}: {result['name']}"

    @mcp.tool()
    async def update_product_category(category_id:int, name:str|None=None, description:str|None=None, slug:str|None=None) -> str:
        """Update a WooCommerce product category."""
        data={k:v for k,v in {"name":name,"description":description,"slug":slug}.items() if v is not None}
        if not data: return "No changes supplied."
        result=await wc_request("PUT",f"products/categories/{category_id}",json=data)
        site=get_active_site()
        log_activity("categories","update",site["id"],f"category:{category_id}","success",",".join(data.keys()))
        return f"Updated category {result['id']}: {result['name']}"
