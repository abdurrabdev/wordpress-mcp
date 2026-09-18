# Safe default policy.
READ_TOOLS = {
    "get_post", "list_posts", "get_page", "list_pages", "get_media", "list_media",
    "get_product", "list_products", "get_product_category", "list_product_categories",
    "get_site_info", "inspect_site", "yoast_get_seo"
}
WRITE_TOOLS = {
    "create_post", "update_post", "update_page", "create_page",
    "upload_media", "update_media", "update_product", "create_product",
    "create_product_category", "update_product_category", "yoast_update_seo"
}
DANGEROUS_TOOLS = set()
