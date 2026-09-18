from clients.woocommerce import wc_request
from database import get_active_site, log_activity

def register(mcp):
    @mcp.tool()
    async def list_products(per_page:int=20, search:str|None=None, category:int|None=None) -> list:
        """List WooCommerce products."""
        params={"per_page":max(1,min(per_page,100))}
        if search: params["search"]=search
        if category: params["category"]=category
        return await wc_request("GET","products",params=params)

    @mcp.tool()
    async def get_product(product_id:int) -> dict:
        """Get a WooCommerce product."""
        return await wc_request("GET",f"products/{product_id}")

    @mcp.tool()
    async def create_product(name:str, description:str="", short_description:str="", status:str="draft", regular_price:str="", sku:str="", categories:list[int]|None=None, images:list[str]|None=None) -> str:
        """Create a WooCommerce product. Defaults to draft."""
        data={"name":name,"description":description,"short_description":short_description,"status":status}
        if regular_price: data["regular_price"]=regular_price
        if sku: data["sku"]=sku
        if categories: data["categories"]=[{"id":x} for x in categories]
        if images: data["images"]=[{"src":x} for x in images]
        result=await wc_request("POST","products",json=data)
        site=get_active_site()
        log_activity("products","create",site["id"],f"product:{result['id']}","success")
        return f"Created product {result['id']}: {result.get('permalink','')}"

    @mcp.tool()
    async def update_product(product_id:int, name:str|None=None, description:str|None=None, short_description:str|None=None, status:str|None=None, regular_price:str|None=None, sku:str|None=None, categories:list[int]|None=None, images:list[str]|None=None) -> str:
        """Update only supplied WooCommerce product fields."""
        data={k:v for k,v in {"name":name,"description":description,"short_description":short_description,"status":status,"regular_price":regular_price,"sku":sku}.items() if v is not None}
        if categories is not None: data["categories"]=[{"id":x} for x in categories]
        if images is not None: data["images"]=[{"src":x} for x in images]
        if not data: return "No changes supplied."
        result=await wc_request("PUT",f"products/{product_id}",json=data)
        site=get_active_site()
        log_activity("products","update",site["id"],f"product:{product_id}","success",",".join(data.keys()))
        return f"Updated product {result['id']}: {result.get('permalink','')}"
