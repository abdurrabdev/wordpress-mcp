from .pages import register as register_pages
from .posts import register as register_posts
from .media import register as register_media
from .products import register as register_products
from .categories import register as register_categories
from .site import register as register_site
from .yoast import register as register_yoast
from .inspection import register as register_inspection
from .theme import register as register_theme
from .customizer import register as register_customizer
from .menus import register as register_menus
from .templates import register as register_templates

def register_all_tools(mcp):
    for fn in (
        register_pages, register_posts, register_media, register_products,
        register_categories, register_site, register_yoast, register_inspection,
        register_theme, register_customizer, register_menus, register_templates
    ):
        fn(mcp)