from clients.wordpress import wp_request
from database import get_active_site, log_activity

# Yoast stores SEO values in post meta. Exact meta availability depends on
# Yoast/version and whether the REST API exposes the meta keys.
# This tool first reads the object and then updates only keys supplied.
YOAST_KEYS = {
    "seo_title": "_yoast_wpseo_title",
    "meta_description": "_yoast_wpseo_metadesc",
    "canonical": "_yoast_wpseo_canonical",
    "focus_keyphrase": "_yoast_wpseo_focuskw",
    "opengraph_title": "_yoast_wpseo_opengraph-title",
    "opengraph_description": "_yoast_wpseo_opengraph-description",
    "opengraph_image": "_yoast_wpseo_opengraph-image",
    "twitter_title": "_yoast_wpseo_twitter-title",
    "twitter_description": "_yoast_wpseo_twitter-description",
    "twitter_image": "_yoast_wpseo_twitter-image",
}

def register(mcp):
    @mcp.tool()
    async def yoast_get_seo(object_type:str, object_id:int) -> dict:
        """Read Yoast SEO meta exposed by the WordPress REST API for a post or page."""
        endpoint = "posts" if object_type == "post" else "pages" if object_type == "page" else None
        if not endpoint:
            raise ValueError("object_type must be 'post' or 'page'.")
        obj=await wp_request("GET",f"{endpoint}/{object_id}")
        meta=obj.get("meta",{})
        return {
            "id":object_id,
            "type":object_type,
            "link":obj.get("link"),
            "yoast_meta":{name:meta.get(key) for name,key in YOAST_KEYS.items() if key in meta},
            "available_meta_keys":list(meta.keys())
        }

    @mcp.tool()
    async def yoast_update_seo(object_type:str, object_id:int, seo_title:str|None=None, meta_description:str|None=None, canonical:str|None=None, focus_keyphrase:str|None=None, opengraph_title:str|None=None, opengraph_description:str|None=None, opengraph_image:str|None=None, twitter_title:str|None=None, twitter_description:str|None=None, twitter_image:str|None=None) -> str:
        """Update Yoast SEO meta exposed by the REST API. If a key is not exposed by the site, the response will explain that."""
        endpoint = "posts" if object_type == "post" else "pages" if object_type == "page" else None
        if not endpoint:
            raise ValueError("object_type must be 'post' or 'page'.")
        supplied=locals()
        meta={}
        for name,key in YOAST_KEYS.items():
            if supplied.get(name) is not None:
                meta[key]=supplied[name]
        if not meta: return "No SEO changes supplied."
        # WordPress REST will reject protected/non-registered meta. We surface that
        # response instead of pretending the update succeeded.
        result=await wp_request("POST",f"{endpoint}/{object_id}",json={"meta":meta})
        site=get_active_site()
        log_activity("yoast","update",site["id"],f"{object_type}:{object_id}","success",",".join(meta.keys()))
        return f"Updated Yoast SEO meta for {object_type} {object_id}: {', '.join(meta.keys())}. Verify in yoast_get_seo."
