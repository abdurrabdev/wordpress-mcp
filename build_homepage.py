import asyncio
from clients.wordpress import wp_request

B = "https://xhunta.com"

# ---------- DATASET (all verified real) ----------
CATS = [
    ("AI & Machine Learning", "ai-machine-learning", 0, "wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.50.13-am.webp", "Explore AI and machine learning projects, source code, datasets, diagrams, documentation, and development resources for students, developers, researchers, and technology enthusiasts."),
    ("Diagrams", "diagrams", 2, "wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.42.20-am.webp", "Explore project diagrams for software development, system design, database projects, academic work, research, and technical documentation."),
    ("Graphics & Assets", "graphics-assets", 0, "wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.49.37-am.webp", "Discover digital graphics and assets for websites, applications, presentations, academic projects, software projects, and creative work."),
    ("Presentations", "presentations", 0, "wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.46.30-am.webp", "Browse project presentation templates and downloadable slide resources for academic projects, final-year projects, research, and software development."),
    ("Project Documentation", "project-documentation", 0, "wp-content/uploads/2026/09/rubaitul-azad-bCmonOgEIlw-unsplash.webp", "Find project documentation for software projects, academic projects, final-year projects, research work, and technical development."),
    ("Project Source Code", "project-source-code", 0, "wp-content/uploads/2026/09/pexels-peaky-31343630.webp", "Explore project source code for web development, software engineering, mobile applications, desktop applications, and academic projects."),
    ("Templates", "templates", 0, "wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.48.43-am.webp", "Explore project templates designed to help students, developers, researchers, and professionals organize their work more efficiently."),
    ("Thesis & Research", "thesis-research", 0, "wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.44.07-am.webp", "Discover thesis and research resources for students, researchers, and academics working on university projects, dissertations, and final-year projects."),
]
PRODUCTS = [
    {"name": "The Food Donation System Usecase Diagram", "url": "https://xhunta.com/product/food-donation-system-use-case-diagram/", "img": "wp-content/uploads/2021/11/programing.jpg", "access": "Premium", "price": "BDT 300", "cat": "Diagrams", "desc": "A comprehensive visual representation of the functionalities and interactions within a food donation system. This editable file provides a clear overview of the system's structure."},
    {"name": "Class Diagram Bakery Management System", "url": "https://xhunta.com/product/class-diagram-bakery-management-system/", "img": "wp-content/uploads/2023/01/ds.webp", "access": "Free", "price": "Free", "cat": "Diagrams", "desc": "A ready-to-use class diagram for a bakery management system, ideal for academic submission and system design projects."},
]
POSTS = [
    {"title": "Web based Examination Platform", "url": "https://xhunta.com/web-based-examination-platform/", "date": "May 31, 2023", "excerpt": "Due to its accuracy and speed, the online examination system has quickly gained recognition. Less effort is also required to conduct the test and it helps organizations run assessments efficiently."},
    {"title": "Vehicle Rental System", "url": "https://xhunta.com/vehicle-rental-system/", "date": "May 31, 2023", "excerpt": "The online vehicle rental system lets customers book vehicles online anywhere at any time, helping companies serve customers and keep track of their fleets."},
    {"title": "Tour Hunting Website", "url": "https://xhunta.com/tour-hunting-website/", "date": "May 31, 2023", "excerpt": "Tour Hunting is a website designed to help users select the most appropriate tour for their entertainment needs, letting tourism companies register and list their offers."},
]
SEO_TXT = "Xhunta provides digital projects and resources for students, developers, researchers, and creators. Browse downloadable project source code, software diagrams, thesis and research materials, project documentation, presentation resources, templates, graphics, and other assets that support academic work and technical development. Each resource is intended to help users study project structure, prepare documentation, explain systems clearly, and move faster from idea to implementation."

# ---------- CSS ----------
css = """
:root{--xhm-primary:#2563EB;--xhm-primary-dark:#1D4ED8;--xhm-dark:#111827;--xhm-text:#374151;--xhm-muted:#6B7280;--xhm-bg:#FFFFFF;--xhm-soft:#F8FAFC;--xhm-border:#E5E7EB;--xhm-radius:14px;--xhm-radius-sm:10px;}
.xhm{font-family:'Inter',var(--global-body-font-family,system-ui),sans-serif;color:var(--xhm-text);background:var(--xhm-bg);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
.xhm *,.xhm *::before,.xhm *::after{box-sizing:border-box}
.xhm a{color:inherit}
.xhm img{max-width:100%;height:auto;display:block}
.xhm-container{max-width:1240px;margin-inline:auto;padding-inline:24px}
.xhm-section{padding:72px 0;border-bottom:1px solid var(--xhm-border)}
.xhm-section--soft{background:var(--xhm-soft)}
.xhm-eyebrow{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;color:var(--xhm-primary);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.xhm-eyebrow::before{content:'';width:22px;height:2px;background:var(--xhm-primary);border-radius:2px}
.xhm-h1{font-family:inherit;font-size:clamp(36px,5.2vw,58px);line-height:1.06;font-weight:800;letter-spacing:-.015em;color:var(--xhm-dark);margin:0 0 20px}
.xhm-h2{font-family:inherit;font-size:clamp(28px,3.4vw,38px);line-height:1.12;font-weight:800;letter-spacing:-.01em;color:var(--xhm-dark);margin:0}
.xhm-lead{font-size:clamp(17px,1.6vw,20px);line-height:1.7;color:var(--xhm-text);max-width:640px;margin:0 0 32px}
.xhm-sec-head{max-width:700px}
.xhm-sec-head p{color:var(--xhm-muted);font-size:17px;line-height:1.7;margin:14px 0 0}
.xhm-grid{display:grid;gap:20px}
.xhm-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.xhm-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.xhm-grid-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.xhm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 26px;border-radius:var(--xhm-radius-sm);font-weight:700;font-size:15px;text-decoration:none;transition:background .18s ease,color .18s ease,border-color .18s ease;border:1px solid transparent;cursor:pointer;line-height:1.2}
.xhm-btn-primary{background:var(--xhm-primary);color:#fff}
.xhm-btn-primary:hover{background:var(--xhm-primary-dark);color:#fff}
.xhm-btn-outline{background:#fff;color:var(--xhm-primary);border-color:var(--xhm-border)}
.xhm-btn-outline:hover{border-color:var(--xhm-primary);color:var(--xhm-primary-dark);background:var(--xhm-soft)}
.xhm-hero{background:var(--xhm-soft)}
.xhm-hero-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:56px;align-items:center;padding:88px 0 84px}
.xhm-visual{position:relative;border-radius:var(--xhm-radius);overflow:hidden;box-shadow:0 20px 50px -20px rgba(17,24,39,.25);border:1px solid var(--xhm-border);background:#fff}
.xhm-visual-main{width:100%;height:420px;object-fit:cover}
.xhm-visual-inner{padding:22px 24px}
.xhm-visual-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.xhm-visual-thumb{height:64px;width:100%;object-fit:cover;border-radius:8px;border:1px solid var(--xhm-border)}
.xhm-visual-stat{display:flex;justify-content:space-between;align-items:center;margin-top:16px}
.xhm-visual-stat strong{color:var(--xhm-dark);font-size:15px}
.xhm-visual-stat span{color:var(--xhm-muted);font-size:14px}
.xhm-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid var(--xhm-border);background:#fff;gap:0}
.xhm-strip-item{padding:24px;border-right:1px solid var(--xhm-border);display:flex;gap:14px;align-items:flex-start}
.xhm-strip-item:first-child{border-left:1px solid var(--xhm-border)}
.xhm-strip-ico{width:34px;height:34px;flex:none;border-radius:9px;background:var(--xhm-soft);border:1px solid var(--xhm-border);display:grid;place-items:center}
.xhm-strip-ico svg{width:18px;height:18px;fill:none;stroke:var(--xhm-primary)}
.xhm-strip-item h3{font-size:15px;margin:0 0 3px}
.xhm-strip-item p{margin:0;font-size:13.5px;color:var(--xhm-muted);line-height:1.5}
.xhm-card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--xhm-border);border-radius:var(--xhm-radius);overflow:hidden;text-decoration:none;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}
.xhm-card:hover{border-color:#CBD5E1;box-shadow:0 12px 30px -18px rgba(17,24,39,.18);transform:translateY(-2px)}
.xhm-card-media{width:100%;aspect-ratio:16/10;object-fit:cover}
.xhm-card-body{padding:20px 22px 22px;display:flex;flex-direction:column;gap:8px;flex:1}
.xhm-card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.xhm-card-cat{color:var(--xhm-muted);font-size:13px;font-weight:600}
.xhm-card-count{color:var(--xhm-primary);font-size:12px;font-weight:700;white-space:nowrap}
.xhm-card-desc{color:var(--xhm-muted);font-size:14.5px;line-height:1.6;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.xhm-card-link{margin-top:auto;padding-top:6px;color:var(--xhm-primary);font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:6px}
.xhm-card-link svg{width:14px;height:14px;fill:none;stroke:currentColor;transition:transform .18s ease}
.xhm-card:hover .xhm-card-link svg{transform:translateX(3px)}
.xhm-prod-price{font-size:20px;font-weight:800;color:var(--xhm-dark);margin:0}
.xhm-badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.02em}
.xhm-badge-free{background:#ECFDF5;color:#059669;border:1px solid #A7F3D0}
.xhm-badge-premium{background:var(--xhm-soft);color:var(--xhm-primary);border:1px solid #DBEAFE}
.xhm-why{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.xhm-why-item{border:1px solid var(--xhm-border);border-radius:var(--xhm-radius);padding:26px;background:#fff}
.xhm-why-item svg{width:26px;height:26px;fill:none;stroke:var(--xhm-primary)}
.xhm-why-item h3{font-size:17px;margin:16px 0 8px}
.xhm-why-item p{margin:0;color:var(--xhm-muted);font-size:14.5px;line-height:1.6}
.xhm-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.xhm-step{position:relative;padding:26px;border:1px solid var(--xhm-border);border-radius:var(--xhm-radius);background:#fff}
.xhm-step-num{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--xhm-primary);color:#fff;font-weight:800;font-size:16px;margin-bottom:18px}
.xhm-step h3{font-size:17px;margin:0 0 8px}
.xhm-step p{margin:0;color:var(--xhm-muted);font-size:14.5px;line-height:1.6}
.xhm-post{border:1px solid var(--xhm-border);border-radius:var(--xhm-radius);padding:24px;display:flex;flex-direction:column;background:#fff;text-decoration:none;transition:border-color .18s ease,box-shadow .18s ease}
.xhm-post:hover{border-color:#CBD5E1;box-shadow:0 12px 30px -18px rgba(17,24,39,.18)}
.xhm-post-date{color:var(--xhm-muted);font-size:13px;font-weight:600;margin-bottom:10px}
.xhm-post h3{font-size:18px;line-height:1.35;margin:0 0 10px}
.xhm-post p{margin:0 0 18px;color:var(--xhm-muted);font-size:14.5px;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.xhm-post span{margin-top:auto;color:var(--xhm-primary);font-size:14px;font-weight:700;display:inline-flex;align-items:center;gap:6px}
.xhm-cta{background:var(--xhm-dark);border-radius:calc(var(--xhm-radius) + 6px);padding:64px 32px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.xhm-cta h2{color:#fff;margin:0;font-size:clamp(26px,3vw,36px);line-height:1.15}
.xhm-cta p{color:#A7B3C4;margin:0;max-width:520px;font-size:17px;line-height:1.7}
.xhm-cta .xhm-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.xhm-cta .xhm-btn-primary{background:var(--xhm-primary)}
.xhm-cta .xhm-btn-primary:hover{background:#1E50CE}
.xhm-cta .xhm-btn-outline{background:transparent;color:#fff;border-color:#374151}
.xhm-cta .xhm-btn-outline:hover{background:rgba(255,255,255,.06);border-color:#6B7280;color:#fff}
.xhm-seo{color:var(--xhm-muted);font-size:15px;line-height:1.75;max-width:900px;margin:0}
.xhm-link-arrow{display:inline-flex;align-items:center;gap:6px;color:var(--xhm-primary);font-weight:700;font-size:14px;text-decoration:none}
.xhm-link-arrow svg{width:15px;height:15px;fill:none;stroke:currentColor;transition:transform .18s ease}
.xhm-link-arrow:hover svg{transform:translateX(3px)}
.xhm-sec-top{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:40px;flex-wrap:wrap}
@media (max-width:1024px){.xhm-section{padding:56px 0}.xhm-grid-4,.xhm-grid-3,.xhm-strip,.xhm-why{grid-template-columns:repeat(2,minmax(0,1fr))}.xhm-strip-item:nth-child(2){border-right:none}.xhm-strip-item:nth-child(4){border-right:none}.xhm-hero-grid{grid-template-columns:1fr;gap:32px;padding:64px 0}.xhm-visual-main{height:340px}}
@media (max-width:720px){.xhm-section{padding:48px 0}.xhm-container{padding-inline:20px}.xhm-grid-4,.xhm-grid-3,.xhm-grid-2,.xhm-strip,.xhm-why,.xhm-steps{grid-template-columns:1fr}.xhm-strip-item{border-right:none;border-bottom:1px solid var(--xhm-border);border-left:none}.xhm-strip-item:first-child{border-left:none}.xhm-strip-item:last-child{border-bottom:none}.xhm-hero-grid{padding:48px 0 56px}.xhm-hero h1{font-size:34px}.xhm-cta{padding:48px 20px}.xhm-actions{width:100%}.xhm-actions .xhm-btn{flex:1 1 100%;text-align:center}}
"""


def s(inner):
    return f"<!-- wp:html -->\n{inner}\n<!-- /wp:html -->\n"


def group(cls, inner):
    return f"<!-- wp:group {{\"className\":\"{cls}\"}} -->\n<div class=\"wp-block-group {cls}\">\n{inner}</div>\n<!-- /wp:group -->\n"


def build():
    parts = []
    parts.append(s(f"<style>{css}</style>"))

    # HERO
    hero_right = f"""
<div class="xhm-visual">
  <img class="xhm-visual-main" src="{B}/wp-content/uploads/2021/11/programing.jpg" alt="The Food Donation System Usecase Diagram" loading="eager">
  <div class="xhm-visual-inner">
    <div class="xhm-visual-grid">
      <img class="xhm-visual-thumb" src="{B}/wp-content/uploads/2023/01/ds.webp" alt="Class Diagram Bakery Management System" loading="lazy">
      <img class="xhm-visual-thumb" src="{B}/wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.46.30-am.webp" alt="Presentations" loading="lazy">
      <img class="xhm-visual-thumb" src="{B}/wp-content/uploads/2026/09/pexels-peaky-31343630.webp" alt="Project Source Code" loading="lazy">
      <img class="xhm-visual-thumb" src="{B}/wp-content/uploads/2026/09/Screenshot-2026-09-05-at-9.44.07-am.webp" alt="Thesis and Research" loading="lazy">
    </div>
    <div class="xhm-visual-stat">
      <strong>Curated for students &amp; developers</strong>
      <span>8 categories &middot; 2 products</span>
    </div>
  </div>
</div>
"""
    hero = f"""
<div class="xhm-section xhm-hero"><div class="xhm-container">
  <div class="xhm-hero-grid">
    <div>
      <p class="xhm-eyebrow">Digital resources marketplace</p>
      <h1 class="xhm-h1">Digital Projects and Resources for Students &amp; Developers</h1>
      <p class="xhm-lead">Find downloadable project resources, UML diagrams, thesis materials, templates, presentations, and development files built to help you learn, document, and ship work faster.</p>
      <div class="xhm-actions">
        <a class="xhm-btn xhm-btn-primary" href="{B}/shop/">Browse resources</a>
        <a class="xhm-btn xhm-btn-outline" href="{B}/free-resources/">Free resources</a>
      </div>
    </div>
    {hero_right}
  </div>
</div></div>
"""
    parts.append(group("xhm", hero))

    # VALUE STRIP
    strip_items = """<div class="xhm-strip-item"><div class="xhm-strip-ico"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v4l2.5 2.5"/><path d="M8 12h4l2.5-2.5"/></svg></div><div><h3>Real project files</h3><p>Diagrams, documentation, templates and presentations you can use.</p></div></div>
<div class="xhm-strip-item"><div class="xhm-strip-ico"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div><div><h3>Free &amp; premium</h3><p>Free access levels and premium items clearly marked.</p></div></div>
<div class="xhm-strip-item"><div class="xhm-strip-ico"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div><div><h3>Organized categories</h3><p>Browse by topic to find the resource you need faster.</p></div></div>
<div class="xhm-strip-item"><div class="xhm-strip-ico"><svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 10v6"/></svg></div><div><h3>Student focused</h3><p>Built to support academic work and final-year projects.</p></div></div>"""
    parts.append(s('<div class="xhm-strip">' + strip_items + "</div>"))

    # CATEGORIES
    cat_cards = []
    for name, slug, count, img, desc in CATS:
        count_html = f'<span class="xhm-card-count">{count} resource{"s" if count != 1 else ""}</span>' if count > 0 else '<span class="xhm-card-count">Explore</span>'
        card = f"""<a class="xhm-card" href="{B}/product-category/{slug}/">
      <img class="xhm-card-media" src="{B}/{img}" alt="{name}" loading="lazy">
      <div class="xhm-card-body">
        <div class="xhm-card-top"><h3 style="font-size:16px;font-weight:700;color:#111827;margin:0">{name}</h3>{count_html}</div>
        <p class="xhm-card-desc">{desc[:110]}&hellip;</p>
        <span class="xhm-card-link">Browse category <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
      </div>
    </a>"""
        cat_cards.append(card)
    cat_section = f"""<div class="xhm-section"><div class="xhm-container">
  <div class="xhm-sec-top">
    <div class="xhm-sec-head"><p class="xhm-eyebrow">Browse by topic</p><h2 class="xhm-h2">Featured Categories</h2></div>
    <a class="xhm-link-arrow" href="{B}/categories/">View all categories <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></a>
  </div>
  <div class="xhm-grid xhm-grid-4">{"".join(cat_cards)}</div>
</div></div>"""
    parts.append(group("xhm", cat_section))

    # FEATURED PRODUCTS
    prod_cards = []
    for p in PRODUCTS:
        badge = f'<span class="xhm-badge {"xhm-badge-free" if p["access"] == "Free" else "xhm-badge-premium"}">{p["access"]}</span>'
        card = f"""<a class="xhm-card" href="{p['url']}">
      <img class="xhm-card-media" src="{B}/{p['img']}" alt="{p['name']}" loading="lazy">
      <div class="xhm-card-body">
        <div class="xhm-card-top">{badge}<span class="xhm-card-cat">{p['cat']}</span></div>
        <h3 style="font-size:17px;line-height:1.35;margin:0">{p['name']}</h3>
        <p class="xhm-card-desc" style="-webkit-line-clamp:3">{p['desc'][:150]}&hellip;</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
          <p class="xhm-prod-price">{p['price']}</p>
          <span class="xhm-card-link">View resource <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
        </div>
      </div>
    </a>"""
        prod_cards.append(card)
    prod_section = f"""<div class="xhm-section xhm-section--soft"><div class="xhm-container">
  <div class="xhm-sec-top">
    <div class="xhm-sec-head"><p class="xhm-eyebrow">Fresh in the store</p><h2 class="xhm-h2">Featured Resources</h2></div>
    <a class="xhm-link-arrow" href="{B}/shop/">Browse all resources <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></a>
  </div>
  <div class="xhm-grid xhm-grid-2">{"".join(prod_cards)}</div>
</div></div>"""
    parts.append(group("xhm", prod_section))

    # FREE RESOURCES
    free_cards = [p for p in PRODUCTS if p["access"] == "Free"]
    free_cards_html = "".join(f"""<a class="xhm-card" href="{p['url']}">
  <img class="xhm-card-media" src="{B}/{p['img']}" alt="{p['name']}" loading="lazy">
  <div class="xhm-card-body">
    <div class="xhm-card-top"><span class="xhm-badge xhm-badge-free">Free</span><span class="xhm-card-cat">{p['cat']}</span></div>
    <h3 style="font-size:17px;line-height:1.35;margin:0">{p['name']}</h3>
    <p class="xhm-card-desc" style="-webkit-line-clamp:3">{p['desc'][:150]}&hellip;</p>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
      <p class="xhm-prod-price">Free</p>
      <span class="xhm-card-link">View resource <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
    </div>
  </div>
</a>""" for p in free_cards)
    free_section = f"""<div class="xhm-section"><div class="xhm-container">
  <div class="xhm-sec-top">
    <div class="xhm-sec-head"><p class="xhm-eyebrow">No cost resources</p><h2 class="xhm-h2">Free Resources</h2></div>
    <a class="xhm-link-arrow" href="{B}/free-resources/">Explore all free resources <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></a>
  </div>
  <div class="xhm-grid xhm-grid-2">{free_cards_html or '<p style="color:var(--xhm-muted)">Free resources appear here as they are published.</p>'}</div>
</div></div>"""
    parts.append(group("xhm", free_section))

    # WHY XHUNTA
    why_sh = '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>'
    why_ic = '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.5 7.5"/><path d="M15.5 3H21v5.5"/><path d="M21 3l-8 8"/><path d="M3 21l7.5-7.5"/><path d="M15.5 21H21v-5.5"/></svg>'
    why_badge = '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 13l1.5 8-5-3-5 3 1.5-8"/></svg>'
    why_build = '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    why_items = [
        ("Well documented", why_ic, "Diagrams and documentation help you understand structure and present systems clearly."),
        ("Access levels", why_badge, "Free and premium resources are labeled so you always know what you are getting."),
        ("Made to ship", why_build, "Templates and files let you move from idea to implementation faster."),
        ("Built to learn", why_sh, "Academic-friendly resources designed for students and researchers."),
    ]
    why_html = "".join(f'<div class="xhm-why-item">{ico}<h3>{t}</h3><p>{d}</p></div>' for t, ico, d in why_items)
    why_section = f"""<div class="xhm-section xhm-section--soft"><div class="xhm-container">
  <div class="xhm-sec-head"><p class="xhm-eyebrow">Why Xhunta</p><h2 class="xhm-h2">Everything you need to build and present projects</h2></div>
  <div class="xhm-why">{why_html}</div>
</div></div>"""
    parts.append(group("xhm", why_section))

    # HOW IT WORKS
    steps = [
        ("Search the store", "Find the category or resource you need across diagrams, documentation, templates, source code and more."),
        ("Pick free or premium", "Every resource shows its access level and price up front, so you can choose what fits your project."),
        ("Download and use", "Get your file right away and apply it to your assignments, research, or development work."),
    ]
    steps_html = "".join(f'<div class="xhm-step"><div class="xhm-step-num">{i}</div><h3>{t}</h3><p>{d}</p></div>' for i, (t, d) in enumerate(steps, 1))
    steps_section = f"""<div class="xhm-section"><div class="xhm-container">
  <div class="xhm-sec-head"><p class="xhm-eyebrow">How it works</p><h2 class="xhm-h2">Three simple steps</h2></div>
  <div class="xhm-steps">{steps_html}</div>
</div></div>"""
    parts.append(group("xhm", steps_section))

    # LATEST FROM XHUNTA
    post_html = "".join(f"""<a class="xhm-post" href="{p['url']}">
  <span class="xhm-post-date">{p['date']} &middot; Project</span>
  <h3>{p['title']}</h3>
  <p>{p['excerpt']}</p>
  <span>Read article <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
</a>""" for p in POSTS)
    post_section = f"""<div class="xhm-section xhm-section--soft"><div class="xhm-container">
  <div class="xhm-sec-top">
    <div class="xhm-sec-head"><p class="xhm-eyebrow">Latest from the blog</p><h2 class="xhm-h2">Latest from Xhunta</h2></div>
    <a class="xhm-link-arrow" href="{B}/blog/">Visit the blog <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></a>
  </div>
  <div class="xhm-grid xhm-grid-3">{post_html}</div>
</div></div>"""
    parts.append(group("xhm", post_section))

    # FINAL CTA
    cta_section = f"""<div class="xhm-section" style="border-bottom:none"><div class="xhm-container">
  <div class="xhm-cta">
    <p class="xhm-eyebrow" style="color:#93C5FD;margin:0 0 6px">Get started</p>
    <h2>Jump into your next project today</h2>
    <p>Browse resources by category, grab a free download, or create an account to access everything Xhunta has to offer.</p>
    <div class="xhm-actions">
      <a class="xhm-btn xhm-btn-primary" href="{B}/shop/">Browse resources</a>
      <a class="xhm-btn xhm-btn-outline" href="{B}/my-account/">Create account</a>
    </div>
  </div>
</div></div>
<p class="xhm-seo" style="max-width:1240px;margin:40px auto 0;padding:0 24px">{SEO_TXT}</p>"""
    parts.append(group("xhm", cta_section))

    return "".join(parts)


async def main():
    content = build()
    print("CONTENT LEN:", len(content))
    with open("/tmp/xh_new_content.html", "w", encoding="utf-8") as f:
        f.write(content)
    result = await wp_request("POST", "pages/1782", json={"content": content})
    print("DEPLOYED:", result["link"], "| title:", result["title"]["rendered"], "| status:", result["status"])


if __name__ == "__main__":
    asyncio.run(main())