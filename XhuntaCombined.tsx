import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

type PageMode = "home" | "shop" | "free" | "categories" | "product" | "blog" | "post" | "account" | "cart" | "checkout" | "login" | "register" | "about" | "contact" | "privacy" | "terms"
interface Props { page: PageMode; wpBaseUrl: string }

type Product = { id:number; name:string; slug:string; summary?:string; short_description?:string; description?:string; price_html?:string; on_sale?:boolean; average_rating?:string; rating_count?:number; review_count?:number; is_purchasable?:boolean; is_in_stock?:boolean; is_on_backorder?:boolean; type?:string; sku?:string; add_to_cart?:{url?:string;text?:string;description?:string}; prices?:{price:string; regular_price?:string; sale_price?:string; currency_code:string; currency_symbol:string; currency_minor_unit?:number; currency_decimal_separator?:string; currency_thousand_separator?:string; currency_prefix?:string; currency_suffix?:string}; images?:{id?:number; src:string; thumbnail?:string; alt?:string; name?:string}[]; categories?:{id:number; name:string; slug:string; link?:string}[]; attributes?:{id?:number; name:string; taxonomy?:string; terms?:{id?:number; name:string; slug?:string}[]}[]; permalink?:string }
type Category = { id:number; name:string; slug:string; description?:string; count?:number; image?:{src:string; thumbnail?:string; alt?:string}; parent?:number }
type Post = { id:number; slug:string; link:string; date:string; title:{rendered:string}; excerpt:{rendered:string}; content?:{rendered:string}; categories?:number[]; _embedded?:any }

const P = { primary:"#2563EB", dark:"#111827", text:"#374151", muted:"#6B7280", bg:"#FFFFFF", soft:"#F8FAFC", border:"#E5E7EB", good:"#166534", goodBg:"#DCFCE7", blueBg:"#DBEAFE" }
const DEFAULT_WP = "https://xhunta.com"
const PRODUCT_BASE = "/product"
const BLOG_POST_BASE = "/blog-post"
const clean = (html = "") => String(html || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, "\u201c").replace(/&#8221;/g, "\u201d").replace(/\s+/g, " ").trim()
const api = (base:string, path:string) => `${base.replace(/\/$/, "")}${path}`
const isFree = (p:Product) => (p.attributes || []).some(a => (a.name || "").toLowerCase() === "access" && (a.terms || []).some(t => (t.name || "").toLowerCase() === "free"))
const getAccess = (p?:Product) => p && isFree(p) ? "Free" : "Premium"
const price = (p?:Product) => {
    if (!p?.prices) return ""
    const minor = p.prices.currency_minor_unit ?? 0
    const amount = Number(p.prices.price || 0) / Math.pow(10, minor)
    return `${p.prices.currency_prefix || p.prices.currency_symbol || ""}${amount.toLocaleString(undefined, { minimumFractionDigits: minor ? 2 : 0, maximumFractionDigits: minor ? 2 : 0 })}${p.prices.currency_suffix || ""}`.trim()
}
const productHref = (p:Product) => `${PRODUCT_BASE}?slug=${encodeURIComponent(p.slug)}`
const postHref = (p:Post) => `${BLOG_POST_BASE}?slug=${encodeURIComponent(p.slug)}`
const shopHref = (extra = "") => `/shop${extra}`
const money = (amount:string|number, t?:{currency_prefix?:string; currency_symbol?:string; currency_minor_unit?:number; currency_suffix?:string}) => {
    const minor = t?.currency_minor_unit ?? 0
    const n = Number(amount || 0) / Math.pow(10, minor)
    const pre = t?.currency_prefix ?? t?.currency_symbol ?? ""
    return `${pre}${n.toLocaleString(undefined, { minimumFractionDigits: minor ? 2 : 0, maximumFractionDigits: minor ? 2 : 0 })}${t?.currency_suffix || ""}`.trim()
}
const currentParam = (key:string) => typeof window === "undefined" ? "" : new URL(window.location.href).searchParams.get(key) || ""
const currentPathSlug = (prefix:string) => {
    if (typeof window === "undefined") return ""
    const path = window.location.pathname.replace(/\/$/, "")
    const cleanPrefix = prefix.replace(/\/$/, "")
    return path.startsWith(cleanPrefix + "/") ? decodeURIComponent(path.slice(cleanPrefix.length + 1)) : ""
}
const qs = (params:Record<string, string | number | undefined>) => {
    const s = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") s.set(k, String(v)) })
    return s.toString()
}
const postTerms = (p:Post, taxonomy = "category") => ((p._embedded?.["wp:term"] || [])[0] || []).filter((t:any) => t.taxonomy === taxonomy)
const postCategory = (p:Post) => { const c = postTerms(p)[0]; return c ? { id: c.id, name: c.name } : null }
const postImage = (p:Post) => p._embedded?.["wp:featuredmedia"]?.[0] as any

function useApi<T>(base:string, path:string, fallback:T) {
    const [data, setData] = React.useState<T>(fallback)
    const [state, setState] = React.useState(base ? "loading" : "empty")
    React.useEffect(() => {
        if (!base) { setState("empty"); return }
        let alive = true
        setState("loading")
        fetch(api(base, path)).then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))).then(j => {
            if (alive) { setData(j); setState(Array.isArray(j) && j.length === 0 ? "empty" : "ready") }
        }).catch(() => alive && setState("error"))
        return () => { alive = false }
    }, [base, path])
    return { data, state }
}

type CartItem = { key:string; id:number; name:string; quantity:number; short_description?:string; permalink?:string; prices?:{price:string; currency_prefix?:string; currency_symbol?:string; currency_minor_unit?:number; currency_suffix?:string}; totals?:{line_total:string}; images?:{thumbnail?:string; src?:string; alt?:string}[] }
type CartTotals = { total_items:string; total_fees:string; total_discount:string; total_shipping:string|null; total_tax:string; total_price:string; currency_code:string; currency_symbol:string; currency_minor_unit:number; currency_prefix:string; currency_suffix:string }
type CartState = { status:"idle"|"loading"|"ready"|"mutating"|"error"; error?:string; items: CartItem[]; items_count: number; totals?: CartTotals; permalink?: string }

const CART_STORAGE = "xhunta.cart.v1"
let cartSingleton: { base: string; nonce: string; state: CartState } | null = null
const cartListeners: Array<(s: CartState) => void> = []
function emitCart(s: CartState) { cartListeners.forEach(l => l(s)) }
function readCartNonce(): string { try { return JSON.parse(localStorage.getItem(CART_STORAGE) || "{}").nonce || "" } catch { return "" } }
function writeCartPersist(s: CartState, nonce: string) {
    try { localStorage.setItem(CART_STORAGE, JSON.stringify({ nonce, items_count: s.items_count, totals: s.totals })) } catch { /* private mode */ }
}

const storeFetch = (base:string, path:string, init?:RequestInit) =>
    fetch(api(base, path), { cache: "no-store", credentials: "include", ...init })

async function cartLoad(base:string): Promise<CartState> {
    let nonce = cartSingleton?.base === base ? cartSingleton.nonce : readCartNonce()
    try {
        const res = await storeFetch(base, "/wp-json/wc/store/v1/cart")
        if (!res.ok) return { status: "error", error: "Cart unavailable (" + res.status + ")", items: [], items_count: 0 }
        const headerNonce = res.headers.get("X-WC-Store-API-Nonce")
        if (headerNonce) nonce = headerNonce
        const j = await res.json()
        const s: CartState = { status: "ready", items: j.items || [], items_count: j.items_count || 0, totals: j.totals, permalink: j.permalink }
        if (cartSingleton?.base === base) cartSingleton.nonce = nonce || cartSingleton.nonce
        writeCartPersist(s, nonce || cartSingleton?.nonce || "")
        return s
    } catch (e:any) {
        return { status: "error", error: (e && e.message) || "Cart unavailable", items: [], items_count: 0 }
    }
}

const storeMutate = async (base:string, path:string, body:any): Promise<{ ok:boolean; error?:string; state?: CartState }> => {
    const nonce = (cartSingleton?.base === base && cartSingleton.nonce) || readCartNonce()
    try {
        const res = await storeFetch(base, path, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(nonce ? { "X-WC-Store-API-Nonce": nonce, "Nonce": nonce } : {}) },
            body: JSON.stringify(body),
        })
        const headerNonce = res.headers.get("X-WC-Store-API-Nonce")
        if (headerNonce && cartSingleton?.base === base) cartSingleton.nonce = headerNonce
        const j = await res.json()
        if (!res.ok) {
            const msg = j?.message || j?.code || ("Request failed (" + res.status + ")")
            return { ok: false, error: msg }
        }
        const s: CartState = { status: "ready", items: j.items || [], items_count: j.items_count || 0, totals: j.totals, permalink: j.permalink }
        if (headerNonce && cartSingleton?.base === base) cartSingleton.nonce = headerNonce
        writeCartPersist(s, (cartSingleton?.base === base && cartSingleton.nonce) || readCartNonce())
        return { ok: true, state: s }
    } catch (e:any) {
        return { ok: false, error: (e && e.message) || "Network error" }
    }
}

function useCartStore(base:string) {
    const [state, setState] = React.useState<CartState>(() =>
        cartSingleton?.base === base ? cartSingleton.state : { status: "idle", items: [], items_count: 0 })
    React.useEffect(() => {
        cartListeners.push(setState)
        return () => { const i = cartListeners.indexOf(setState); if (i >= 0) cartListeners.splice(i, 1) }
    }, [])
    React.useEffect(() => {
        if (!base) return
        if (cartSingleton?.base === base) { setState(cartSingleton.state); return }
        cartSingleton = { base, nonce: readCartNonce(), state: { status: "loading", items: [], items_count: 0 } }
        setState(cartSingleton.state)
        cartLoad(base).then(s => { cartSingleton!.base = base; cartSingleton!.state = s; emitCart(s) })
    }, [base])
    const refresh = React.useCallback(() => { cartLoad(base).then(s => { if (cartSingleton) { cartSingleton.state = s } emitCart(s) }) }, [base])
    const mutate = React.useCallback(async (path:string, body:any) => {
        if (cartSingleton?.base === base && cartSingleton.state.status !== "mutating") {
            cartSingleton.state = { ...cartSingleton.state, status: "mutating" }
            emitCart(cartSingleton.state)
        }
        const r = await storeMutate(base, path, body)
        if (r.ok && r.state) { cartSingleton!.state = r.state; setState(r.state); emitCart(r.state) }
        else if (!r.ok) { const errS: CartState = { status: "error", error: r.error, items: cartSingleton?.state.items || [], items_count: cartSingleton?.state.items_count || 0, totals: cartSingleton?.state.totals, permalink: cartSingleton?.state.permalink }; if (cartSingleton) { cartSingleton.state = errS } setState(errS); emitCart(errS) }
        return r
    }, [base])
    const addItem = React.useCallback((id:number, quantity = 1) => mutate("/wp-json/wc/store/v1/cart/add-item", { id, quantity }), [mutate])
    const updateItem = React.useCallback((key:string, quantity:number) => mutate("/wp-json/wc/store/v1/cart/update-item", { key, quantity }), [mutate])
    const removeItem = React.useCallback((key:string) => mutate("/wp-json/wc/store/v1/cart/remove-item", { key }), [mutate])
    return { state, addItem, updateItem, removeItem, refresh }
}

function useSeo(t: { title?: string; description?: string; robots?: string } | null) {
    React.useEffect(() => {
        if (typeof document === "undefined" || !t) return
        const setMeta = (name: string, content: string) => {
            let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
            if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el) }
            el.setAttribute("content", content)
        }
        if (t.title) document.title = t.title
        if (t.description) setMeta("description", t.description)
        if (t.robots) setMeta("robots", t.robots)
    }, [JSON.stringify(t || {})])
}

const A = (p:React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...p} style={{ color: "inherit", textDecoration: "none", ...p.style }} />

function Button({ href, onClick, children, variant = "primary", style, disabled, title }:{ href?:string; onClick?:() => void; children:React.ReactNode; variant?:string; style?:React.CSSProperties; disabled?:boolean; title?:string }) {
    const base = { ...s.btnBase, ...(s as any)[variant === "primary" ? "btnPrimary" : variant === "dark" ? "btnDark" : variant === "ghost" ? "btnGhost" : "btnSecondary"], ...style }
    if (href) return <A href={href} style={base} title={title}>{children}</A>
    return <button onClick={onClick} disabled={disabled} title={title} style={base}>{children}</button>
}

function SectionHeading({ eyebrow, title, body }:{ eyebrow?:string; title:string; body?:string }) {
    return <div style={s.sectionHeadInner}>{eyebrow && <p style={s.eyebrow}>{eyebrow}</p>}<h2 style={s.h2}>{title}</h2>{body && <p style={s.muted}>{body}</p>}</div>
}

function LoadingState({ title, body }:{ title:string; body:string }) {
    return <div style={s.state} role="status"><b>{title}</b><p>{body}</p></div>
}
function EmptyState({ title, body, action }:{ title:string; body:string; action?:{label:string; href:string} }) {
    return <div style={s.state}><b>{title}</b><p>{body}</p>{action && <div style={{ marginTop: 14 }}><Button href={action.href} variant="dark">{action.label}</Button></div>}</div>
}
function ErrorState({ title, body, action }:{ title:string; body:string; action?:{label:string; href:string} }) {
    return <div style={s.state}><b>{title}</b><p>{body}</p>{action && <div style={{ marginTop: 14 }}><Button href={action.href} variant="dark">{action.label}</Button></div>}</div>
}

function Logo({ dark = false }:{ dark?:boolean }) {
    return <A href="/" style={s.logo} aria-label="Xhunta home"><span style={s.mark}>X</span><span><b style={dark ? { color: "white" } : undefined}>Xhunta</b><small style={dark ? { color: "#CBD5E1" } : undefined}>Digital Projects & Resources</small></span></A>
}

function Header({ base }:{ base:string }) {
    const [open, setOpen] = React.useState(false)
    const [q, setQ] = React.useState("")
    const { state } = useCartStore(base)
    const nav = [["Store", "/shop"], ["Free Resources", "/free-resources"], ["Categories", "/categories"], ["Blog", "/blog"]]
    const search = (e:React.FormEvent) => { e.preventDefault(); if (typeof window !== "undefined") window.location.href = shopHref(`?search=${encodeURIComponent(q)}`) }
    const count = state.status === "ready" || state.status === "mutating" ? state.items_count : 0
    return <header style={s.header}>
        <div style={s.bar}>
            <Logo />
            <nav style={s.nav} aria-label="Primary">{nav.map(n => <A key={n[0]} href={n[1]} style={s.navlink}>{n[0]}</A>)}</nav>
            <form onSubmit={search} role="search" style={s.searchForm}><input aria-label="Search resources" value={q} onChange={e => setQ(e.target.value)} placeholder="Search resources" style={s.searchInput} /></form>
            <div style={s.actions}>
                <A href="/cart" style={s.iconBtn} aria-label={`Cart, ${count} items`}>Cart{count > 0 ? <span style={s.cartCount}>{count}</span> : null}</A>
                <A href="/my-account" style={s.secondaryBtn}>Account</A>
                <Button variant="ghost" onClick={() => setOpen(!open)} style={s.menuBtn as any} aria-label="Toggle menu">{open ? "Close" : "Menu"}</Button>
            </div>
        </div>
        {open && <MobileHeader base={base} onClose={() => setOpen(false)} />}
    </header>
}

function MobileHeader({ onClose }:{ base:string; onClose:() => void }) {
    const nav = [["Store", "/shop"], ["Free Resources", "/free-resources"], ["Categories", "/categories"], ["Blog", "/blog"], ["Cart", "/cart"], ["My Account", "/my-account"]]
    return <nav style={s.mobileNav} aria-label="Mobile" onClick={onClose}>{nav.map(n => <A key={n[0]} href={n[1]} style={s.mobileLink}>{n[0]}</A>)}<A href="/login" style={s.mobileLink}>Login</A><A href="/register" style={s.mobileLink}>Register</A></nav>
}

function Col({ title, links }:{ title:string; links:string[][] }) {
    return <div><h3 style={s.footTitle}>{title}</h3>{links.map(l => <A key={l[0]} href={l[1]} style={s.footLink}>{l[0]}</A>)}</div>
}

function Footer() {
    return <footer style={s.footer}><div style={s.footerGrid}>
        <div><Logo dark /><p style={s.footerText}>A professional digital marketplace frontend powered by WordPress and WooCommerce as the source of truth.</p></div>
        <Col title="Marketplace" links={[["Store", "/shop"], ["Free Resources", "/free-resources"], ["Categories", "/categories"], ["Blog", "/blog"]]} />
        <Col title="Account" links={[["Login", "/login"], ["Register", "/register"], ["My Account", "/my-account"], ["Cart", "/cart"]]} />
        <Col title="Company" links={[["About", "/about"], ["Contact", "/contact"], ["Privacy Policy", "/privacy-policy"], ["Terms", "/terms-and-conditions"]]} />
    </div><div style={s.legal}>© {new Date().getFullYear()} Xhunta. No private WooCommerce or WordPress credentials are exposed.</div></footer>
}

function Hero({ title, body, primary = "Explore Resources", secondary = "Free Resources", primaryHref = "/shop", secondaryHref = "/free-resources", base }:{ title:string; body:string; primary?:string; secondary?:string; primaryHref?:string; secondaryHref?:string; base:string }) {
    return <section style={s.hero}><div><p style={s.eyebrow}>Xhunta Marketplace</p><h1 style={s.h1}>{title}</h1><p style={s.lead}>{body}</p><div style={s.ctas}><A href={primaryHref} style={s.primaryBtn}>{primary}</A><A href={secondaryHref} style={s.secondaryBtn}>{secondary}</A></div></div><CategoryPreview base={base} /></section>
}

function Section({ title, body, eyebrow, children }:{ title:string; body?:string; eyebrow?:string; children:React.ReactNode }) {
    return <section style={s.section}><div style={s.sectionHead}><SectionHeading eyebrow={eyebrow} title={title} body={body} /></div>{children}</section>
}

function CTA() {
    return <section style={s.cta}><h2 style={s.h2}>Find the right digital resource faster</h2><p style={s.muted}>Browse project source code, documentation, diagrams, templates, presentations, reports, and free resources.</p><A href="/shop" style={s.primaryBtn}>Explore Resources</A></section>
}

function StaticCards() {
    const items = [["Practical Resources", "Clear, compact marketplace structure for browsing useful digital resources."], ["Ready-to-Use Projects", "Project source code, research, documentation, diagrams, templates, and more."], ["Student & Developer Focused", "Digital resources for learning, final-year projects, and professional work."], ["Free and Premium Options", "Free and premium resources, marked by the WooCommerce Access attribute."]]
    return <div style={s.featureGrid}>{items.map(t => <div style={s.feature} key={t[0]}><b>{t[0]}</b><p>{t[1]}</p></div>)}</div>
}

function CategoryPreview({ base }:{ base:string }) {
    const { data } = useApi<Category[]>(base, "/wp-json/wc/store/v1/products/categories?per_page=6&hide_empty=false", [])
    const items = data.filter(c => c.name?.toLowerCase() !== "uncategorized").slice(0, 6)
    if (!items.length) return <div style={s.heroVisual}><div style={{ gridColumn: "1 / -1" }}><EmptyState title="Loading categories" body="Real Xhunta categories load from WooCommerce." /></div></div>
    return <div style={s.heroVisual}>{items.map(c => <A href={shopHref(`?category=${encodeURIComponent(c.slug)}`)} key={c.id} style={s.previewItem}><b>{c.name}</b><small>{c.count || 0} resources</small></A>)}</div>
}

function SearchInput({ value, onChange, onSearch, placeholder = "Search resources" }:{ value:string; onChange:(v:string) => void; onSearch:() => void; placeholder?:string }) {
    return <form role="search" style={{ display: "contents" }} onSubmit={(e) => { e.preventDefault(); onSearch() }}><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={s.input} /></form>
}

function FilterBar({ categories, filters, setFilters, free = false }:{ categories:Category[]; filters:any; setFilters:(v:any) => void; free?:boolean }) {
    const apply = (patch:any) => setFilters({ ...filters, ...patch, page: 1 })
    return <div style={s.toolbar} className="xh-toolbar">
        <SearchInput value={filters.search} onChange={(v:any) => apply({ search: v })} onSearch={() => { if (typeof window !== "undefined") window.location.href = shopHref(`?search=${encodeURIComponent(filters.search || "")}`) }} />
        <select aria-label="Category" style={s.input} value={filters.category} onChange={e => apply({ category: e.target.value })}><option value="">All categories</option>{categories.map(c => <option value={c.slug} key={c.id}>{c.name}</option>)}</select>
        <select aria-label="Access" style={s.input} value={free ? "free" : filters.access} disabled={free} onChange={e => apply({ access: e.target.value })}><option value="">All access</option><option value="free">Free</option><option value="premium">Premium</option></select>
        <select aria-label="Sort" style={s.input} value={filters.sort} onChange={e => apply({ sort: e.target.value })}><option value="date">Newest</option><option value="popularity">Popular</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
    </div>
}

function ProductCard({ p, base, onAdd }:{ p:Product; base:string; onAdd?: (id:number) => void }) {
    const img = p.images?.[0]
    const label = p.categories?.[0]?.name || `ID ${p.id}`
    const summary = clean(p.short_description || p.summary || p.description || "").slice(0, 120)
    return <article style={s.card}>
        <div style={s.thumb}>{img?.src ? <img loading="lazy" src={img.thumbnail || img.src} alt={img.alt || p.name} style={s.img} /> : <span>Resource</span>}<em style={isFree(p) ? s.freeBadge : s.premiumBadge}>{getAccess(p)}</em></div>
        <small style={s.label}>{label}</small>
        <h3 style={s.cardTitle}><A href={productHref(p)}>{p.name}</A></h3>
        <p style={s.cardText}>{summary}</p>
        <div style={s.cardFoot}><b style={s.price}>{isFree(p) ? "Free" : price(p)}</b>
            {isFree(p) ? <A href={productHref(p)} style={s.smallBtn}>View / Download</A> : p.is_purchasable !== false && onAdd ? <Button variant="dark" onClick={() => onAdd(p.id)} style={s.smallBtnBtn as any}>Add to cart</Button> : <A href={productHref(p)} style={s.smallBtn}>View</A>}
        </div>
    </article>
}

function ProductGrid({ base, params = {}, access = "all", perLimit = 9, onAdd, onEmpty }:{ base:string; params?:Record<string, string | number | undefined>; access?: "all" | "free" | "premium"; perLimit?: number; onAdd?: (id:number) => void; onEmpty?: { title: string; body: string } }) {
    const [page, setPage] = React.useState(1)
    const path = `/wp-json/wc/store/v1/products?${qs({ per_page: perLimit, page, ...params })}`
    const { data, state } = useApi<Product[]>(base, path, [])
    const shown = React.useMemo(() => {
        const list = Array.isArray(data) ? data : []
        if (access === "free") return list.filter(isFree)
        if (access === "premium") return list.filter(p => !isFree(p))
        return list
    }, [data, access])
    if (state === "loading") return <LoadingState title="Loading resources" body="Fetching products from the public WooCommerce Store API." />
    if (state === "error") return <ErrorState title="Products unavailable" body="The public WooCommerce Store API could not be reached." action={{ label: "Browse categories", href: "/categories" }} />
    if (!shown.length) return <EmptyState title={onEmpty?.title || (access === "free" ? "No free resources found" : "No products found")} body={onEmpty?.body || "WooCommerce returned no matching resources."} action={{ label: "Browse all resources", href: "/shop" }} />
    return <><div style={s.productGrid} className="xh-grid">{shown.map(p => <ProductCard key={p.id} p={p} base={base} onAdd={onAdd} />)}</div>
        <div style={s.loadRow}><Button variant="secondary" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Previous</Button><span>Page {page}</span><Button variant="secondary" onClick={() => setPage(page + 1)}>Next</Button></div></>
}

function CategoryCard({ c }:{ c:Category }) {
    return <A href={shopHref(`?category=${encodeURIComponent(c.slug)}`)} style={s.catCard} key={c.id}>
        {c.image?.src ? <img loading="lazy" src={c.image.thumbnail || c.image.src} alt={c.image.alt || c.name} style={s.catImg} /> : <span style={s.catIcon}>{clean(c.name).slice(0, 1) || "?"}</span>}
        <b>{c.name}</b>
        {c.description && <small>{clean(c.description).slice(0, 95)}</small>}
        <em style={s.catCount}>{c.count || 0} resources</em>
    </A>
}

function CategoryGrid({ base }:{ base:string }) {
    const { data, state } = useApi<Category[]>(base, "/wp-json/wc/store/v1/products/categories?per_page=50&hide_empty=false", [])
    const shown = (Array.isArray(data) ? data : []).filter(c => c.name?.toLowerCase() !== "uncategorized")
    if (state === "loading") return <LoadingState title="Loading categories" body="Fetching WooCommerce product categories." />
    if (state === "error") return <ErrorState title="Categories unavailable" body="The public WooCommerce category endpoint could not be reached." action={{ label: "Retry", href: "/categories" }} />
    if (!shown.length) return <EmptyState title="No categories found" body="WooCommerce returned no public product categories." action={{ label: "View all resources", href: "/shop" }} />
    return <div style={s.catGrid} className="xh-cat-grid">{shown.map(c => <CategoryCard c={c} key={c.id} />)}</div>
}

function BlogCard({ p }:{ p:Post }) {
    const image = postImage(p)
    const cat = postCategory(p)
    return <article style={s.blogCard}>
        {image?.source_url ? <img loading="lazy" src={image.media_details?.sizes?.medium?.source_url || image.source_url} alt={image.alt_text || clean(p.title.rendered)} style={s.blogImage} /> : <div style={s.blogTile} aria-hidden><span>{clean(p.title.rendered).slice(0, 1) || "B"}</span></div>}
        <div style={s.blogMeta}><p style={s.eyebrow}>{cat ? cat.name : "Article"}</p><time dateTime={p.date}>{new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></div>
        <h3 style={s.blogTitle}><A href={postHref(p)}>{clean(p.title.rendered)}</A></h3>
        <p style={s.cardText}>{clean(p.excerpt.rendered).slice(0, 130)}</p>
        <A href={postHref(p)} style={s.smallBtn}>Read article</A>
    </article>
}

function BlogGrid({ base }:{ base:string }) {
    const [page, setPage] = React.useState(1)
    const { data, state } = useApi<Post[]>(base, `/wp-json/wp/v2/posts?_embed=1&per_page=9&page=${page}`, [])
    if (state === "loading") return <LoadingState title="Loading articles" body="Fetching WordPress posts." />
    if (state === "error") return <ErrorState title="Posts unavailable" body="Verify the public WordPress posts endpoint." action={{ label: "Retry", href: "/blog" }} />
    if (!data.length) return <EmptyState title="No posts found" body="WordPress returned no published posts." action={{ label: "Go to store", href: "/shop" }} />
    return <><div style={s.blogGrid} className="xh-blog-grid">{data.map(p => <BlogCard p={p} key={p.id} />)}</div>
        <div style={s.loadRow}><Button variant="secondary" onClick={() => setPage(page + 1)}>Load more articles</Button></div></>
}

function RelatedPosts({ base, catId, excludeId }:{ base:string; catId?:number; excludeId?:number }) {
    let path = "/wp-json/wp/v2/posts?_embed=1&per_page=3"
    if (catId) path += `&categories=${catId}`
    if (excludeId) path += `&exclude=${excludeId}`
    const { data, state } = useApi<Post[]>(base, path, [])
    if (state !== "ready" || !data.length) return null
    return <Section title="Related posts" body="More articles from the Xhunta blog."><div style={s.blogGrid} className="xh-blog-grid">{data.map(p => <BlogCard p={p} key={p.id} />)}</div></Section>
}

function HomePage({ base }:{ base:string }) {
    useSeo({ title: "Xhunta — Digital Projects & Resources", description: "Browse project source code, thesis resources, documentation, diagrams, templates, graphics, presentations, reports, and free digital resources from Xhunta." })
    return <><Hero title="Digital Projects & Resources" body="Xhunta provides project source code, research materials, documentation, diagrams, templates, graphics, presentations, reports, and other practical digital resources." base={base} />
        <Section title="Popular categories" body="The real WooCommerce product categories on Xhunta."><CategoryGrid base={base} /></Section>
        <Section title="Featured resources" body="Dynamic products from the WooCommerce Store API."><ProductGrid base={base} perLimit={6} /></Section>
        <Section title="Free resources" body="Filtered by the WooCommerce Access attribute, not by price."><ProductGrid base={base} access="free" perLimit={6} onEmpty={{ title: "No free resources yet", body: "Free resources are tagged with the Access attribute." }} /></Section>
        <Section title="Why choose Xhunta"><StaticCards /></Section>
        <Section title="How it works"><div style={s.steps}>{["Browse", "Choose", "Download"].map((x:any, i:number) => <div style={s.step} key={x}><span>{i + 1}</span><b>{x}</b><p>{i === 0 ? "Search categories and resources." : i === 1 ? "Review details, access type, and price." : "Use the secure WooCommerce flow."}</p></div>)}</div></Section>
        <CTA /></>
}

function ShopPage({ base, free = false }:{ base:string; free?:boolean }) {
    const { data: categories } = useApi<Category[]>(base, "/wp-json/wc/store/v1/products/categories?per_page=50&hide_empty=false", [])
    const realCategories = (Array.isArray(categories) ? categories : []).filter(c => c.name?.toLowerCase() !== "uncategorized")
    const [filters, setFilters] = React.useState(() => ({ search: currentParam("search"), category: currentParam("category"), access: free ? "free" : currentParam("access"), sort: "date" }))
    const catSlug = filters.category
    const categoryId = catSlug ? realCategories.find(c => c.slug === catSlug)?.id : undefined
    useSeo({
        title: free ? "Free Resources — Xhunta" : "Shop — Xhunta",
        description: free ? "Free digital resources on Xhunta, marked with the WooCommerce Access attribute: Free." : "Browse and filter real Xhunta WooCommerce resources across code, research, documentation, diagrams, design assets, and templates.",
    })
    return <><Hero title={free ? "Free resources" : "Shop digital resources"} body={free ? "A live view of Xhunta resources marked with the WooCommerce Access attribute: Free." : "Search, filter, and browse real Xhunta WooCommerce resources."} base={base} primary={free ? "All resources" : "Free Resources"} secondary="Categories" secondaryHref="/categories" />
        <Section title={free ? "Free downloads" : "All resources"}>
            <FilterBar categories={realCategories} filters={filters} setFilters={setFilters} free={free} />
            <ProductGrid base={base} access={free ? "free" : (filters.access as any || "all")} params={{ search: filters.search, categories: categoryId, orderby: filters.sort === "popularity" ? "popularity" : (filters.sort || "").startsWith("price") ? "price" : "date", order: filters.sort === "price_asc" ? "asc" : "desc" }} />
        </Section></>
}

function CategoriesPage({ base }:{ base:string }) {
    useSeo({ title: "Categories — Xhunta", description: "Explore the real WooCommerce product categories on Xhunta, including images, descriptions, and product counts." })
    return <><Hero title="Categories" body="Explore the actual WooCommerce product categories on Xhunta." base={base} /><Section title="Resource directory" eyebrow="Browse by topic"><CategoryGrid base={base} /></Section></>
}

function ProductDetailPage({ base }:{ base:string }) {
    const slug = currentParam("slug") || currentPathSlug(PRODUCT_BASE)
    const { data: p, state } = useApi<Product | null>(base, slug ? `/wp-json/wc/store/v1/products/${encodeURIComponent(slug)}` : "/wp-json/wc/store/v1/products?per_page=1", null)
    const [slugResolved, setSlugResolved] = React.useState(false)
    React.useEffect(() => { setSlugResolved(true) }, [])
    const product: Product | null = slug ? p : (Array.isArray(p) ? (p as Product[])[0] || null : null)
    const cart = useCartStore(base)
    const [addedKey, setAddedKey] = React.useState("")
    const [addErr, setAddErr] = React.useState("")
    useSeo(product ? { title: `${clean(product.name)} — Xhunta`, description: clean(product.short_description || product.description || "").slice(0, 160) } : null)
    if (state === "loading" || !slugResolved) return <LoadingState title="Loading product" body="Fetching the real WooCommerce product by slug." />
    if (state === "error") return <ErrorState title="Product unavailable" body="The requested product could not be loaded from WooCommerce." action={{ label: "Back to store", href: "/shop" }} />
    if (!product) return <EmptyState title="Product not found" body="No WooCommerce product matches this slug." action={{ label: "Back to store", href: "/shop" }} />
    const add = async () => {
        if (cart.state.status === "error") { setAddErr((cart.state.error || "Cart session unavailable") + " — use the WooCommerce product page to purchase."); return }
        setAddErr(""); setAddedKey("")
        const r = await cart.addItem(product.id)
        if (r.ok) setAddedKey(String(product.id))
        else setAddErr((r.error || "Could not add to cart") + (String(r.error || "").toLowerCase().includes("nonce") ? " — secure cart session is not available yet." : ""))
    }
    const canAdd = product.is_purchasable !== false
    const relatedCat = product.categories?.[0]
    return <>
        <section style={s.detail}>
            <div style={s.gallery}>{product.images?.length ? product.images.map(img => <img key={img.src} loading="lazy" src={img.src} alt={img.alt || product.name} style={s.detailImg} />) : <div style={s.detailImg}>Product image</div>}</div>
            <div>
                <p style={s.eyebrow}>{product.categories?.[0]?.name || "Digital Resource"} · Product ID {product.id}</p>
                <h1 style={s.h1}>{product.name}</h1>
                <p style={s.lead}>{clean(product.short_description || product.summary || product.description || "").slice(0, 320)}</p>
                <div style={s.detailFacts}>
                    <b style={s.price}>{isFree(product) ? "Free" : price(product)}</b>
                    <em style={isFree(product) ? s.freeBadgeInline : s.premiumBadgeInline}>{getAccess(product)}</em>
                    <span>{product.is_in_stock === true ? "In stock" : product.is_in_stock === false ? "Out of stock" : isFree(product) ? "Instant download" : "Digital delivery"}</span>
                    {product.review_count ? <span>{product.average_rating} rating · {product.review_count} reviews</span> : null}
                </div>
                <div style={s.ctas}>
                    {isFree(product) ? <A href={product.permalink || product.add_to_cart?.url || "/shop"} style={s.primaryBtn}>View / Download</A>
                        : canAdd ? (addedKey ? <A href="/cart" style={s.primaryBtn}>Added to cart — View cart</A> : <Button onClick={add} style={s.primaryBtn as any} disabled={cart.state.status === "mutating"}>{cart.state.status === "mutating" ? "Adding…" : "Add to cart"}</Button>) : null}
                    {!isFree(product) && <A href={product.permalink || product.add_to_cart?.url || "/shop"} style={s.secondaryBtn}>{canAdd ? "Buy on WooCommerce" : "View on WooCommerce"}</A>}
                    <A href="/shop" style={s.secondaryBtn}>Back to Store</A>
                </div>
                {addErr && <p role="alert" style={s.errorNote}>{addErr}</p>}
                <div style={s.panel}>
                    <b>Resource information</b>
                    {product.sku ? <p style={{ margin: "4px 0" }}>SKU: {product.sku}</p> : null}
                    <p>{clean(product.description || product.short_description || "")}</p>
                    {isFree(product) ? <p style={s.downloadNote}>This is a free digital resource. The download link is provided on the product page at Xhunta.</p> : <p style={s.downloadNote}>Premium resource. After checkout, the download becomes available through your WooCommerce account on Xhunta.</p>}
                    {(product.attributes || []).length ? <div style={s.attrGrid}>{(product.attributes || []).map(a => <span key={a.name}>{a.name}: {(a.terms || []).map(t => t.name).join(", ")}</span>)}</div> : null}
                </div>
            </div>
        </section>
        <Section title="Related resources" body="More resources in the same category."><ProductGrid base={base} perLimit={3} params={{ categories: relatedCat?.id }} /></Section>
    </>
}

function PostPage({ base }:{ base:string }) {
    const slug = currentParam("slug") || currentPathSlug(BLOG_POST_BASE) || currentPathSlug("/blog")
    const { data: p, state } = useApi<Post[]>(base, slug ? `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1` : "", [])
    const post = (Array.isArray(p) ? p[0] : null) as Post | null
    useSeo(post ? { title: `${clean(post.title.rendered)} — Xhunta` } : null)
    if (slug && !p.length && state === "ready") return <EmptyState title="Post not found" body="No published WordPress post matches this slug." action={{ label: "Back to blog", href: "/blog" }} />
    if (!post) return <><Hero title="Xhunta blog" body="Editorial resources, guides, and marketplace updates from real WordPress posts." base={base} /><Section title="Latest posts"><BlogGrid base={base} /></Section></>
    const image = postImage(post)
    const cat = postCategory(post)
    return <>
        <article style={s.article}>
            {image?.source_url && <img src={image.source_url} alt={image.alt_text || clean(post.title.rendered)} style={s.articleImage} />}
            <p style={s.eyebrow}>{cat ? cat.name : "Article"}</p>
            <h1 style={s.h1}>{clean(post.title.rendered)}</h1>
            <time dateTime={post.date} style={s.muted}>{new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
            <div style={s.prose} dangerouslySetInnerHTML={{ __html: post.content?.rendered || post.excerpt.rendered }} />
            <div style={{ marginTop: 22 }}><A href="/blog" style={s.secondaryBtn}>Back to blog</A></div>
        </article>
        {cat?.id ? <RelatedPosts base={base} catId={cat.id} excludeId={post.id} /> : null}
    </>
}

function BlogPage({ base }:{ base:string }) {
    useSeo({ title: "Blog — Xhunta", description: "Editorial resources, guides, and marketplace updates from real WordPress posts on Xhunta." })
    return <><Hero title="Xhunta blog" body="Editorial resources, guides, and marketplace updates from real WordPress posts." base={base} /><Section title="Latest posts"><BlogGrid base={base} /></Section></>
}

function CartPage({ base }:{ base:string }) {
    useSeo({ title: "Cart — Xhunta", robots: "noindex, nofollow" })
    const { state, updateItem, removeItem } = useCartStore(base)
    if (state.status === "idle" || state.status === "loading" || state.status === "mutating") return <><Hero title="Cart" body="Review your selected Xhunta resources before checkout." base={base} primary="Browse Store" secondary="Free Resources" /><Section title="Loading cart"><LoadingState title="Loading cart" body="Fetching your WooCommerce Store API cart session." /></Section></>
    if (state.status === "error") return <><Hero title="Cart" body="Your WooCommerce cart." base={base} primary="Browse Store" secondary="Free Resources" /><Section title="Cart"><ErrorState title="Cart session unavailable" body="Open the native WooCommerce cart to review and manage your selected resources." action={{ label: "Open cart on WooCommerce", href: `${base}/cart/` }} /></Section></>
    const items = state.items || []
    if (!items.length) return <><Hero title="Cart" body="Your WooCommerce cart is empty." base={base} primary="Browse Store" secondary="Free Resources" /><Section title="Empty cart"><EmptyState title="No resources in cart" body="Cart state is read from the WooCommerce Store API, not mocked in Framer." action={{ label: "Browse resources", href: "/shop" }} /></Section></>
    const total = state.totals ? money(state.totals.total_price, state.totals) : ""
    return <><Hero title="Cart" body="Review your selected Xhunta resources before checkout." base={base} primary="Checkout" primaryHref="/checkout" secondary="Store" secondaryHref="/shop" />
        <Section title="Cart items">
            <div style={s.cartList}>{items.map(item => <div style={s.cartItem} key={item.key}>
                {item.images?.[0]?.thumbnail || item.images?.[0]?.src ? <img src={item.images[0].thumbnail || item.images[0].src} alt={item.images[0].alt || item.name} style={s.cartImage} /> : <div style={s.cartImage} />}
                <div><b>{item.permalink ? <A href={item.permalink}>{item.name}</A> : item.name}</b><p>{clean(item.short_description || "").slice(0, 90)}</p></div>
                <span>Qty {item.quantity}</span>
                <b>{money(item.totals?.line_total || item.prices?.price || "0", item.prices as any)}</b>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="ghost" onClick={() => updateItem(item.key, Math.max(1, item.quantity - 1))} style={{ padding: "8px 10px" }} title="Decrease quantity">−</Button>
                    <Button variant="ghost" onClick={() => updateItem(item.key, item.quantity + 1)} style={{ padding: "8px 10px" }} title="Increase quantity">+</Button>
                    <Button variant="ghost" onClick={() => removeItem(item.key)} style={{ padding: "8px 10px" }} title="Remove item">Remove</Button>
                </div>
            </div>)}</div>
            <div style={s.cartSummary}><b>Subtotal</b><strong>{total}</strong><A href="/checkout" style={s.primaryBtn}>Checkout</A><A href={state.permalink || `${base}/cart/`} style={s.secondaryBtn}>Continue on WooCommerce</A></div>
        </Section></>
}

function CheckoutPage({ base }:{ base:string }) {
    useSeo({ title: "Checkout — Xhunta", robots: "noindex, nofollow" })
    const { state, refresh } = useCartStore(base)
    const [form, setForm] = React.useState({ first_name: "", last_name: "", company: "", address_1: "", address_2: "", city: "", postcode: "", country: "US", state: "", email: "", phone: "" })
    const [pm, setPm] = React.useState("")
    const [busy, setBusy] = React.useState(false)
    const [result, setResult] = React.useState<null | { ok: boolean; order_id?: number; message?: string }>(null)
    const set = (k:string) => (e:any) => setForm({ ...form, [k]: e.target.value })
    const place = async () => {
        if (!form.email || !form.first_name || !form.address_1 || !form.city || !form.postcode) { setResult({ ok: false, message: "Please complete the required billing fields (name, email, address, city, postcode)." }); return }
        setBusy(true); setResult(null)
        try {
            const nonce = (cartSingleton?.base === base && cartSingleton.nonce) || readCartNonce()
            const res = await storeFetch(base, "/wp-json/wc/store/v1/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(nonce ? { "Nonce": nonce, "X-WC-Store-API-Nonce": nonce } : {}) },
                body: JSON.stringify({ billing_address: form, payment_method: pm || undefined }),
            })
            const j = await res.json()
            if (res.ok && j.order_id) { setResult({ ok: true, order_id: j.order_id }); cartSingleton && (cartSingleton.state = { status: "ready", items: [], items_count: 0, totals: j.totals as any }); emitCart(cartSingleton.state); refresh() }
            else setResult({ ok: false, message: j?.message || (String(j?.code || "").toLowerCase().includes("nonce") ? "Secure checkout session is not available yet." : "Checkout could not be completed.") })
        } catch (e:any) { setResult({ ok: false, message: (e && e.message) || "Network error during checkout." }) }
        setBusy(false)
    }
    if (result?.ok) return <><Hero title="Order confirmed" body={`Your order #${result.order_id} has been placed on Xhunta.`} base={base} primary="Back to store" secondary="My downloads" secondaryHref={`${base}/my-account/`} /><Section title="Order placed"><EmptyState title={`Thanks — order #${result.order_id} confirmed`} body="Continue on the WooCommerce order page to complete payment and access your downloads." action={{ label: "View order on WooCommerce", href: `${base}/my-account/orders/` }} /></Section></>
    if (state.status === "error") return <><Hero title="Checkout" body="Complete your purchase securely." base={base} primary="Cart" primaryHref="/cart" secondary="Store" secondaryHref="/shop" /><Section title="Checkout"><ErrorState title="Checkout requires a cart session" body="Open the native WooCommerce checkout to finalize securely." action={{ label: "Checkout on WooCommerce", href: `${base}/checkout/` }} /></Section></>
    if (!state.items?.length) return <><Hero title="Checkout" body="Complete your purchase securely." base={base} primary="Browse store" secondary="Cart" secondaryHref="/cart" /><Section title="Checkout"><EmptyState title="Your cart is empty" body="Add resources to your cart before checking out." action={{ label: "Browse resources", href: "/shop" }} /></Section></>
    const total = state.totals ? money(state.totals.total_price, state.totals) : ""
    const field = (k:string, label:string, type = "text", required = true) => <input aria-label={label} placeholder={label} type={type} value={(form as any)[k]} onChange={set(k)} style={s.input} required={required} />
    return <><Hero title="Checkout" body="Place your order through the WooCommerce checkout flow." base={base} primary="Payment" primaryHref="/checkout" secondary="Cart" secondaryHref="/cart" />
        <Section title="Checkout details">
            <div style={s.checkoutGrid}>
                <div style={s.formCard}><b style={{ display: "block", marginBottom: 12 }}>Billing details</b>
                    <div style={s.formRow}>{field("first_name", "First name")}{field("last_name", "Last name")}</div>
                    <div style={s.formRow}>{field("email", "Email", "email")}{field("phone", "Phone", "tel", false)}</div>
                    {field("address_1", "Street address")}{field("address_2", "Apartment, suite (optional)", "text", false)}
                    <div style={s.formRow}>{field("city", "City")}{field("postcode", "Postcode / ZIP")}</div>
                    <div style={s.formRow}><input aria-label="Country" placeholder="Country code (e.g. US, PK)" value={form.country} onChange={set("country")} style={s.input} /><input aria-label="State" placeholder="State (optional)" value={form.state} onChange={set("state")} style={s.input} /></div>
                    <p style={s.formNote}>You will be able to review, pay, and download securely on the WooCommerce order page.</p>
                </div>
                <div style={s.formCard}><b style={{ display: "block", marginBottom: 12 }}>Order summary</b>
                    <div style={s.orderRow}><span>Items</span><span>{state.items_count}</span></div>
                    <div style={s.orderRow}><span>Total</span><strong>{total}</strong></div>
                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                        <Button onClick={place} style={s.btnPrimary as any} disabled={busy}>{busy ? "Placing order…" : "Place order"}</Button>
                        <A href={state.permalink || `${base}/checkout/`} style={s.secondaryBtn}>Proceed on WooCommerce</A>
                    </div>
                    {result && !result.ok && <p role="alert" style={s.errorNote}>{result.message}</p>}
                    <p style={s.formNote}>Payment methods and processing run on WooCommerce. No WooCommerce credentials are stored or exposed here.</p>
                </div>
            </div>
        </Section></>
}

function LoginPage({ base }:{ base:string }) {
    useSeo({ title: "Login — Xhunta", robots: "noindex, nofollow" })
    return <><Hero title="Login" body="Access your Xhunta customer dashboard securely." base={base} primary="Create account" primaryHref="/register" secondary="Register" secondaryHref="/register" />
        <Section title="Login"><div style={s.authCard}><form action={`${base}/my-account/`} method="get" style={{ display: "grid", gap: 12 }}>
            <input required aria-label="Email or username" placeholder="Email or username" style={s.input} name="log" />
            <input required aria-label="Password" type="password" placeholder="Password" style={s.input} name="pwd" />
            <Button style={s.btnPrimary as any}>Sign in securely</Button>
            <p style={s.formNote}>Authentication is handled by the secure WooCommerce account flow on xhunta.com. Private customer data always stays behind authentication.</p>
            <A href={`${base}/my-account/lost-password/`} style={s.link}>Lost password?</A>
        </form></div></Section></>
}

function RegisterPage({ base }:{ base:string }) {
    useSeo({ title: "Register — Xhunta", robots: "noindex, nofollow" })
    return <><Hero title="Register" body="Create your Xhunta customer account." base={base} primary="Login" primaryHref="/login" secondary="Sign in" secondaryHref="/login" />
        <Section title="Create an account"><div style={s.authCard}><form action={`${base}/my-account/`} method="get" style={{ display: "grid", gap: 12 }}>
            <input required aria-label="Email address" type="email" placeholder="Email address" style={s.input} name="email" />
            <input required aria-label="Password" type="password" placeholder="Password" style={s.input} name="password" />
            <Button style={s.btnPrimary as any}>Create account</Button>
            <p style={s.formNote}>Registration runs through the secure WooCommerce account flow on xhunta.com. Your credentials are never handled by this frontend.</p>
        </form></div></Section></>
}

function AccountPage({ base }:{ base:string }) {
    useSeo({ title: "My Account — Xhunta", robots: "noindex, nofollow" })
    const panels = [["Dashboard", "An overview of your account on Xhunta."], ["Orders", "A history of your orders and their status."], ["Downloads", "Your purchased digital downloads."], ["Account details", "Email, name, and password management."]]
    return <><Hero title="My Account" body="Your account data appears only after secure authentication." base={base} primary="Login" primaryHref="/login" secondary="Register" secondaryHref="/register" />
        <Section title="Account overview"><div style={s.panelGrid}>{panels.map(x => <div style={s.panel} key={x[0]}><b>{x[0]}</b><p>{x[1]}</p></div>)}</div>
            <div style={{ marginTop: 18 }}><A href={`${base}/my-account/`} style={s.primaryBtn}>Signed in on WooCommerce — open my account</A></div>
        </Section></>
}

function AboutPage({ base }:{ base:string }) {
    useSeo({ title: "About — Xhunta", description: "Xhunta is a marketplace for practical digital projects, source code, documentation, research, templates, diagrams, and free learning resources." })
    return <><Hero title="About Xhunta" body="Xhunta is a professional marketplace for practical digital projects, source code, documentation, research resources, templates, diagrams, graphics, reports, presentations, and free learning resources." base={base} /><Section title="Built for students and developers"><StaticCards /></Section><CTA /></>
}

function ContactPage({ base }:{ base:string }) {
    useSeo({ title: "Contact — Xhunta", robots: "noindex, nofollow" })
    return <><Hero title="Contact" body="Send a message to Xhunta." base={base} primary="Go to Shop" secondary="About" secondaryHref="/about" />
        <Section title="Contact form"><div style={s.authCard}><form action={`${base}/contact/`} method="get" style={{ display: "grid", gap: 12 }}>
            <input required aria-label="Your name" placeholder="Your name" style={s.input} />
            <input required aria-label="Email" type="email" placeholder="Email" style={s.input} />
            <textarea aria-label="Message" placeholder="Message" rows={5} style={s.textarea} />
            <Button style={s.btnPrimary as any}>Send message</Button>
            <p style={s.formNote}>Contact submissions are routed to the WordPress contact flow on xhunta.com.</p>
        </form></div></Section></>
}

function LegalPage({ base, kind }:{ base:string; kind:"privacy" | "terms" }) {
    const isPrivacy = kind === "privacy"
    useSeo({ title: isPrivacy ? "Privacy Policy — Xhunta" : "Terms & Conditions — Xhunta", robots: "noindex, nofollow" })
    return <><Hero title={isPrivacy ? "Privacy Policy" : "Terms & Conditions"} body={isPrivacy ? "Your privacy when using the Xhunta marketplace." : "Terms for purchasing and downloading Xhunta digital resources."} base={base} primary="Shop" secondary="Contact" secondaryHref="/contact" />
        <Section title={isPrivacy ? "Privacy" : "Terms"}>
            <div style={s.prose}><p>This storefront surfaces public WooCommerce and WordPress data only. No private, admin, or application credentials are exposed or stored. Private customer data such as orders, downloads, and account details is handled exclusively by the secure WooCommerce account area on xhunta.com.</p><p>For the full {isPrivacy ? "privacy policy" : "terms and conditions"}, see the official Xhunta page at <A href={`${base}/${isPrivacy ? "privacy-policy" : "terms-and-conditions"}/`} style={s.link}>{base}/{isPrivacy ? "privacy-policy" : "terms-and-conditions"}/</A>.</p></div>
        </Section></>
}

function Utility({ kind, base }:{ kind: PageMode; base:string }) {
    if (kind === "about") return <AboutPage base={base} />
    if (kind === "contact") return <ContactPage base={base} />
    if (kind === "privacy") return <LegalPage base={base} kind="privacy" />
    if (kind === "terms") return <LegalPage base={base} kind="terms" />
    if (kind === "login") return <LoginPage base={base} />
    if (kind === "register") return <RegisterPage base={base} />
    if (kind === "account") return <AccountPage base={base} />
    return null
}

/** @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed */
export default function XhuntaMarketplace({ page = "home", wpBaseUrl = DEFAULT_WP }:Props) {
    const base = wpBaseUrl || DEFAULT_WP
    let content:React.ReactNode
    if (page === "home") content = <HomePage base={base} />
    else if (page === "shop") content = <ShopPage base={base} />
    else if (page === "free") content = <ShopPage base={base} free />
    else if (page === "categories") content = <CategoriesPage base={base} />
    else if (page === "product") content = <ProductDetailPage base={base} />
    else if (page === "blog") content = <BlogPage base={base} />
    else if (page === "post") content = <PostPage base={base} />
    else if (page === "cart") content = <CartPage base={base} />
    else if (page === "checkout") content = <CheckoutPage base={base} />
    else content = <Utility kind={page} base={base} />
    const desktopHeader = ["home", "shop", "free", "categories", "product", "blog", "post", "about", "contact", "privacy", "terms"].includes(page)
    return <main style={s.root} className="xh-marketplace">{(page === "cart" || page === "checkout" || page === "login" || page === "register" || page === "account") ? null : <Header base={base} />}{content}<Footer /></main>
}

const s:any = {
    root:{ fontFamily: "Inter, Arial, sans-serif", color: P.text, background: P.bg, width: "100%", minHeight: "100%", overflowX: "hidden", maxWidth: "100%" },
    header:{ position: "sticky", top: 0, zIndex: 9, background: "rgba(255,255,255,.95)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${P.border}` },
    bar:{ maxWidth: 1240, margin: "0 auto", minHeight: 72, padding: "0 24px", display: "flex", alignItems: "center", gap: 18 },
    logo:{ display: "flex", alignItems: "center", gap: 10, color: P.dark }, mark:{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 8, background: P.primary, color: "white", fontWeight: 900 },
    nav:{ display: "flex", gap: 2, flex: 1 }, navlink:{ padding: "10px 12px", borderRadius: 7, fontSize: 14, fontWeight: 600 },
    searchForm:{ display: "flex", minWidth: 170 }, searchInput:{ height: 40, width: "100%", border: `1px solid ${P.border}`, borderRadius: 8, padding: "0 12px", fontSize: 14, background: "white" },
    actions:{ display: "flex", alignItems: "center", gap: 8 }, iconBtn:{ position: "relative", border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 },
    cartCount:{ background: P.primary, color: "white", borderRadius: 999, minWidth: 18, height: 18, padding: "0 5px", display: "inline-grid", placeItems: "center", fontSize: 11, fontWeight: 800 },
    menuBtn:{ display: "none", border: `1px solid ${P.border}`, background: "white", borderRadius: 8, padding: "10px 12px" },
    mobileNav:{ display: "grid", gap: 2, padding: "0 24px 18px" }, mobileLink:{ padding: 12, borderBottom: `1px solid ${P.border}` },
    hero:{ maxWidth: 1240, margin: "0 auto", padding: "56px 24px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 32, alignItems: "center" },
    eyebrow:{ fontSize: 12, fontWeight: 800, color: P.primary, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" },
    h1:{ fontSize: "clamp(30px,4vw,50px)", lineHeight: 1.06, letterSpacing: "-0.02em", color: P.dark, margin: "0 0 16px", fontWeight: 850 },
    h2:{ fontSize: "clamp(24px,2.6vw,34px)", lineHeight: 1.12, letterSpacing: "-0.01em", color: P.dark, margin: 0, fontWeight: 800 },
    lead:{ fontSize: 17, lineHeight: 1.6, color: P.text, margin: "0 0 24px" }, muted:{ color: P.muted, lineHeight: 1.6, margin: "6px 0 0" },
    sectionHeadInner:{ display: "grid", gap: 2 }, sectionHead:{ marginBottom: 18 },
    ctas:{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }, link:{ color: P.primary, fontWeight: 600, textDecoration: "underline" },
    btnBase:{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "11px 16px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none", minWidth: 0 },
    btnPrimary:{ background: P.primary, color: "white", border: `1px solid ${P.primary}` }, primaryBtn:{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: P.primary, color: "white", padding: "12px 18px", borderRadius: 8, fontWeight: 700, border: `1px solid ${P.primary}` },
    btnSecondary:{ background: "white", color: P.dark, padding: "11px 16px", borderRadius: 8, fontWeight: 700, border: `1px solid ${P.border}` }, secondaryBtn:{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "white", color: P.dark, padding: "11px 16px", borderRadius: 8, fontWeight: 700, border: `1px solid ${P.border}` },
    btnDark:{ background: P.dark, color: "white" }, btnGhost:{ background: "transparent", color: P.dark, border: `1px solid ${P.border}`, padding: "10px 12px" },
    smallBtn:{ display: "inline-flex", background: P.dark, color: "white", padding: "9px 12px", borderRadius: 7, fontWeight: 700, fontSize: 13 },
    smallBtnBtn:{ padding: "9px 12px", fontSize: 13, borderRadius: 7 },
    heroVisual:{ border: `1px solid ${P.border}`, borderRadius: 8, background: P.soft, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, boxShadow: "0 10px 30px rgba(17,24,39,.06)" },
    previewItem:{ background: "white", border: `1px solid ${P.border}`, borderRadius: 8, padding: 14, display: "grid", gap: 4, color: P.dark },
    section:{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px" },
    toolbar:{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 },
    input:{ height: 44, border: `1px solid ${P.border}`, borderRadius: 8, padding: "0 13px", fontSize: 14, background: "white", minWidth: 0, width: "100%" },
    textarea:{ minHeight: 120, border: `1px solid ${P.border}`, borderRadius: 8, padding: 13, fontSize: 14, fontFamily: "inherit" },
    productGrid:{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 },
    card:{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 14, background: "white", display: "grid", gap: 8 },
    thumb:{ height: 165, borderRadius: 7, background: P.soft, border: `1px solid ${P.border}`, display: "grid", placeItems: "center", position: "relative", overflow: "hidden", color: P.muted },
    img:{ width: "100%", height: "100%", objectFit: "cover" },
    freeBadge:{ position: "absolute", top: 10, left: 10, background: P.goodBg, color: P.good, borderRadius: 7, padding: "5px 8px", fontStyle: "normal", fontSize: 12, fontWeight: 800 },
    premiumBadge:{ position: "absolute", top: 10, left: 10, background: P.blueBg, color: P.primary, borderRadius: 7, padding: "5px 8px", fontStyle: "normal", fontSize: 12, fontWeight: 800 },
    freeBadgeInline:{ background: P.goodBg, color: P.good, borderRadius: 7, padding: "6px 9px", fontStyle: "normal", fontSize: 13, fontWeight: 800 },
    premiumBadgeInline:{ background: P.blueBg, color: P.primary, borderRadius: 7, padding: "6px 9px", fontStyle: "normal", fontSize: 13, fontWeight: 800 },
    label:{ color: P.primary, fontWeight: 800, fontSize: 12, textTransform: "uppercase", letterSpacing: ".03em" },
    cardTitle:{ fontSize: 17, lineHeight: 1.3, color: P.dark, margin: 0 },
    cardText:{ fontSize: 14, lineHeight: 1.55, color: P.muted, margin: 0, minHeight: 42 },
    cardFoot:{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 2 }, price:{ fontSize: 17, color: P.dark },
    loadRow:{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginTop: 20 },
    catGrid:{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 },
    catCard:{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 16, background: "white", display: "grid", gap: 8, color: P.dark },
    catIcon:{ width: 40, height: 40, borderRadius: 8, background: P.soft, color: P.primary, display: "grid", placeItems: "center", fontWeight: 900 },
    catImg:{ width: "100%", height: 105, objectFit: "cover", borderRadius: 7 }, catCount:{ fontStyle: "normal", color: P.muted, fontSize: 13 },
    featureGrid:{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }, feature:{ background: P.soft, border: `1px solid ${P.border}`, borderRadius: 8, padding: 18 },
    steps:{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }, step:{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 18 },
    state:{ border: `1px dashed ${P.border}`, background: P.soft, borderRadius: 8, padding: 22, textAlign: "center", display: "grid", gap: 6, justifyItems: "center" },
    blogGrid:{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 },
    blogCard:{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 18, display: "grid", gap: 10, background: "white" },
    blogImage:{ width: "100%", height: 150, objectFit: "cover", borderRadius: 7, background: P.soft },
    blogTile:{ width: "100%", height: 150, borderRadius: 7, background: P.soft, display: "grid", placeItems: "center", fontSize: 34, fontWeight: 900, color: P.primary, border: `1px solid ${P.border}` },
    blogMeta:{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
    blogTitle:{ fontSize: 17, lineHeight: 1.32, color: P.dark, margin: 0 },
    detail:{ maxWidth: 1240, margin: "0 auto", padding: "52px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" },
    gallery:{ display: "grid", gap: 12 }, detailImg:{ minHeight: 240, maxHeight: 440, border: `1px solid ${P.border}`, borderRadius: 8, background: P.soft, display: "grid", placeItems: "center", width: "100%", objectFit: "cover" },
    detailFacts:{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "0 0 18px" },
    attrGrid:{ display: "grid", gap: 6, marginTop: 12, color: P.muted }, panelGrid:{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 },
    panel:{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 18, background: "white" },
    errorNote:{ color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", fontSize: 13, margin: "12px 0" },
    downloadNote:{ background: P.soft, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: P.muted, margin: "12px 0 0" },
    article:{ maxWidth: 780, margin: "0 auto", padding: "52px 24px" },
    articleImage:{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 8, marginBottom: 20 },
    prose:{ fontSize: 16.5, lineHeight: 1.75, color: P.text, overflowWrap: "anywhere" },
    cta:{ maxWidth: 1192, margin: "30px auto", padding: "32px 28px", background: P.soft, border: `1px solid ${P.border}`, borderRadius: 8, display: "grid", gap: 12, justifyItems: "start" },
    cartList:{ display: "grid", gap: 12 }, cartItem:{ display: "grid", gridTemplateColumns: "72px 1fr auto auto auto", gap: 14, alignItems: "center", border: `1px solid ${P.border}`, borderRadius: 8, padding: 12, background: "white" },
    cartImage:{ width: 72, height: 72, objectFit: "cover", borderRadius: 7, background: P.soft },
    cartSummary:{ display: "flex", gap: 18, justifyContent: "flex-end", alignItems: "center", marginTop: 18, flexWrap: "wrap" },
    checkoutGrid:{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16, alignItems: "start" },
    formCard:{ border: `1px solid ${P.border}`, borderRadius: 8, padding: 18, background: "white", display: "grid", gap: 10 },
    formRow:{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, orderRow:{ display: "flex", justifyContent: "space-between", padding: "6px 0" },
    formNote:{ color: P.muted, fontSize: 13, lineHeight: 1.5, margin: 0 }, authCard:{ maxWidth: 460, padding: 4 },
    footer:{ background: P.dark, color: "white", marginTop: 48 },
    footerGrid:{ maxWidth: 1240, margin: "0 auto", padding: "42px 24px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 28 },
    footerText:{ color: "#CBD5E1", lineHeight: 1.6 }, footTitle:{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0, color: "#CBD5E1" },
    footLink:{ display: "block", padding: "6px 0", color: "#E5E7EB" }, legal:{ maxWidth: 1240, margin: "0 auto", padding: "18px 24px", borderTop: "1px solid rgba(255,255,255,.12)", color: "#CBD5E1", fontSize: 13 },
}

if (typeof document !== "undefined" && !document.getElementById("xhunta-responsive")) {
    const style = document.createElement("style")
    style.id = "xhunta-responsive"
    style.textContent = [
        ".xh-marketplace{overflow-x:hidden}",
        "@media(max-width:980px){.xh-toolbar{grid-template-columns:1fr 1fr!important}",
        "@media(max-width:980px){.xh-marketplace nav[aria-label='Primary']{display:none!important}.xh-marketplace button[style*='menu']{display:inline-flex!important}",
        "@media(max-width:900px){.xh-grid,.xh-blog-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.xh-cat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}",
        ".xh-marketplace [style*='1.05fr .95fr'],.xh-marketplace [style*='1fr 1fr'],.xh-marketplace [style*='1.2fr .8fr'],.xh-marketplace [style*='2fr 1fr 1fr 1fr']{grid-template-columns:1fr!important}.xh-marketplace .xh-toolbar{grid-template-columns:1fr 1fr!important}",
        "@media(max-width:640px){.xh-grid,.xh-blog-grid,.xh-cat-grid,.xh-marketplace .xh-toolbar{grid-template-columns:1fr!important}",
        ".xh-marketplace [style*='42px 24px'],.xh-marketplace [style*='52px 24px'],.xh-marketplace [style*='56px 24px'],.xh-marketplace [style*='36px 24px']{padding:26px 18px!important}.xh-marketplace .xh-toolbar{grid-template-columns:1fr!important}",
        ".xh-marketplace [style*='72px 1fr auto auto auto']{grid-template-columns:64px 1fr}.xh-marketplace .xh-toolbar,.xh-marketplace [style*='64px 1fr']{}.xh-marketplace form[role='search']{display:none!important}",
    ].join("")
    document.head.appendChild(style)
}

addPropertyControls(XhuntaMarketplace, {
    page: { type: ControlType.Enum, title: "Page", options: ["home", "shop", "free", "categories", "product", "blog", "post", "account", "cart", "checkout", "login", "register", "about", "contact", "privacy", "terms"], optionTitles: ["Home", "Shop", "Free Resources", "Categories", "Product Detail", "Blog", "Blog Post", "My Account", "Cart", "Checkout", "Login", "Register", "About", "Contact", "Privacy", "Terms"], defaultValue: "home" },
    wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: "https://xhunta.com", placeholder: "https://xhunta.com" },
})

/* ===================== REUSABLE COMPONENT LIBRARY (migrated) ===================== */

/* ------------------------------------------------------------------ *
 *  XHUNTA — component library + centralized data layer
 *  Architecture: Framer pages -> native sections -> reusable code
 *  components -> centralized API/data layer -> WordPress/WooCommerce.
 *  The monolithic XhuntaMarketplace.tsx continues to work until every
 *  page is migrated and verified. This file is its replacement.
 * ------------------------------------------------------------------ */

/* ============================ TYPES ============================ */

type XProduct = { id: number; name: string; slug: string; summary?: string; short_description?: string; description?: string; price_html?: string; on_sale?: boolean; average_rating?: string; rating_count?: number; review_count?: number; is_purchasable?: boolean; is_in_stock?: boolean; is_on_backorder?: boolean; type?: string; sku?: string; add_to_cart?: { url?: string; text?: string; description?: string }; prices?: { xPrice: string; regular_price?: string; sale_price?: string; currency_code: string; currency_symbol: string; currency_minor_unit?: number; currency_decimal_separator?: string; currency_thousand_separator?: string; currency_prefix?: string; currency_suffix?: string }; images?: { id?: number; src: string; thumbnail?: string; alt?: string; name?: string }[]; categories?: { id: number; name: string; slug: string; link?: string }[]; attributes?: { id?: number; name: string; taxonomy?: string; terms?: { id?: number; name: string; slug?: string }[] }[]; permalink?: string }
type XCategory = { id: number; name: string; slug: string; description?: string; count?: number; image?: { src: string; thumbnail?: string; alt?: string }; parent?: number }
type XPost = { id: number; slug: string; link: string; date: string; title: { rendered: string }; excerpt: { rendered: string }; content?: { rendered: string }; categories?: number[]; _embedded?: any }

type XCartItem = { key: string; id: number; name: string; quantity: number; short_description?: string; permalink?: string; prices?: { xPrice: string; currency_prefix?: string; currency_symbol?: string; currency_minor_unit?: number; currency_suffix?: string }; totals?: { line_total: string }; images?: { thumbnail?: string; src?: string; alt?: string }[] }
type XCartTotals = { total_items: string; total_fees: string; total_discount: string; total_shipping: string | null; total_tax: string; total_price: string; currency_code: string; currency_symbol: string; currency_minor_unit: number; currency_prefix: string; currency_suffix: string }
type XCartState = { status: "idle" | "loading" | "ready" | "mutating" | "error"; error?: string; items: XCartItem[]; items_count: number; totals?: XCartTotals; permalink?: string }

/* ===================== CENTRALIZED DATA LAYER ===================== */

const XHP = { primary: "#2563EB", dark: "#111827", text: "#374151", muted: "#6B7280", bg: "#FFFFFF", soft: "#F8FAFC", border: "#E5E7EB", good: "#166534", goodBg: "#DCFCE7", blueBg: "#DBEAFE" }
const XH_WP = "https://xhunta.com"
const XH_PROD = "/product"
const XH_BLOG = "/blog-post"

const xClean = (html = "") => String(html || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, "\u201c").replace(/&#8221;/g, "\u201d").replace(/\s+/g, " ").trim()
const xApi = (base: string, path: string) => `${base.replace(/\/$/, "")}${path}`
const xFree = (p?: XProduct | null) => !!(p && (p.attributes || []).some(a => (a.name || "").toLowerCase() === "access" && (a.terms || []).some(t => (t.name || "").toLowerCase() === "free")))
const xAccess = (p?: XProduct | null) => (p && xFree(p) ? "Free" : "Premium")
const xPrice = (p?: XProduct | null) => {
  if (!p?.prices) return ""
  const minor = p.prices.currency_minor_unit ?? 0
  const amount = Number(p.prices.xPrice || 0) / Math.pow(10, minor)
  return `${p.prices.currency_prefix || p.prices.currency_symbol || ""}${amount.toLocaleString(undefined, { minimumFractionDigits: minor ? 2 : 0, maximumFractionDigits: minor ? 2 : 0 })}${p.prices.currency_suffix || ""}`.trim()
}
const xMoney = (amount: string | number, t?: { currency_prefix?: string; currency_symbol?: string; currency_minor_unit?: number; currency_suffix?: string }) => {
  const minor = t?.currency_minor_unit ?? 0
  const n = Number(amount || 0) / Math.pow(10, minor)
  const pre = t?.currency_prefix ?? t?.currency_symbol ?? ""
  return `${pre}${n.toLocaleString(undefined, { minimumFractionDigits: minor ? 2 : 0, maximumFractionDigits: minor ? 2 : 0 })}${t?.currency_suffix || ""}`.trim()
}
const xProdHref = (p: Pick<XProduct, "slug">) => `${XH_PROD}?slug=${encodeURIComponent(p.slug)}`
const xPostHref = (p: Pick<XPost, "slug">) => `${XH_BLOG}?slug=${encodeURIComponent(p.slug)}`
const xShopHref = (extra = "") => `/shop${extra}`
const xParam = (key: string) => (typeof window === "undefined" ? "" : new URL(window.location.href).searchParams.get(key) || "")
const xPathSlug = (prefix: string) => {
  if (typeof window === "undefined") return ""
  const path = window.location.pathname.replace(/\/$/, "")
  const p2 = prefix.replace(/\/$/, "")
  return path.startsWith(p2 + "/") ? decodeURIComponent(path.slice(p2.length + 1)) : ""
}
const xQs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") s.set(k, String(v)) })
  return s.toString()
}
const xPostCat = (p?: XPost | null): { id: number; name: string } | null => {
  if (!p) return null
  const terms = (((p._embedded?.["wp:term"] || [])[0] || []) as any[]).filter((t: any) => t?.taxonomy === "category")
  const c = terms[0]
  return c ? { id: c.id, name: c.name } : null
}
const xPostImg = (p?: XPost | null) => (p?._embedded?.["wp:featuredmedia"]?.[0] as any) || null

const xFetch = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store", credentials: "include" })
  if (!res.ok) throw new Error("HTTP " + res.status)
  return res.json()
}

export function xUseApi<T>(base: string, path: string, fallback: T) {
  const [data, setData] = React.useState<T>(fallback)
  const [state, setState] = React.useState<string>(base ? "loading" : "empty")
  const [reset, setReset] = React.useState(0)
  React.useEffect(() => {
    if (!base) { setState("empty"); return }
    let alive = true
    setState("loading")
    xFetch<T>(xApi(base, path)).then(j => {
      if (alive) { setData(j); setState(Array.isArray(j) && j.length === 0 ? "empty" : "ready") }
    }).catch(() => alive && setState("error"))
    return () => { alive = false }
  }, [base, path, reset])
  const retry = React.useCallback(() => setReset(r => r + 1), [])
  return { data, state, retry } as { data: T; state: string; retry: () => void }
}

export function xUseProducts(base: string, params: Record<string, string | number | undefined> = {}) {
  return xUseApi<XProduct[]>(base, `/wp-json/wc/store/v1/products?${xQs({ per_page: params.per_page || 9, page: params.page || 1, search: params.search, categories: params.categories, orderby: params.orderby, order: params.order })}`, [])
}
export function xUseProduct(base: string, slug: string, fallback: XProduct | null = null) {
  return xUseApi<XProduct | null>(base, slug ? `/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}` : "", fallback)
}
export function xUseCategories(base: string) {
  return xUseApi<XCategory[]>(base, "/wp-json/wc/store/v1/products/categories?per_page=50&hide_empty=false", [])
}
export function xUseCatProducts(base: string, categoryIds: number[]) {
  return xUseApi<XProduct[]>(base, `/wp-json/wc/store/v1/products?per_page=20&categories=${categoryIds.join(",")}`, [])
}
export function xUsePosts(base: string, perPage = 9, page = 1) {
  return xUseApi<XPost[]>(base, `/wp-json/wp/v2/posts?_embed=1&per_page=${perPage}&page=${page}`, [])
}
export function xUsePost(base: string, slug: string) {
  return xUseApi<XPost[]>(base, slug ? `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1` : "", [])
}
export function xUseRelated(base: string, catId?: number, excludeId?: number) {
  let path = "/wp-json/wp/v2/posts?_embed=1&per_page=3"
  if (catId) path += `&categories=${catId}`
  if (excludeId) path += `&exclude=${excludeId}`
  return xUseApi<XPost[]>(base, path, [])
}

/* ---------------------- URL-aware hook / nav ---------------------- */

export function xUseUrl(): string {
  const [s, setS] = React.useState<string>(typeof window === "undefined" ? "" : window.location.search)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const update = () => setS(window.location.search)
    window.addEventListener("popstate", update)
    window.addEventListener("xhunta:nav", update)
    return () => { window.removeEventListener("popstate", update); window.removeEventListener("xhunta:nav", update) }
  }, [])
  return s
}
export function xNav(params: Record<string, string | number | undefined>, replace = false) {
  if (typeof window === "undefined") return
  const target = `/shop?${xQs(params)}`
  if (replace) window.history.replaceState({}, "", target)
  else window.history.pushState({}, "", target)
  window.dispatchEvent(new Event("xhunta:nav"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

/* --------------------------- SEO helper --------------------------- */

export function xUseSeo(t: { title?: string; description?: string; robots?: string } | null) {
  React.useEffect(() => {
    if (typeof document === "undefined" || !t) return
    const setMeta = (name: string, content: string) => {
      let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el) }
      el.setAttribute("content", content)
    }
    if (t.title) document.title = t.title
    if (t.description) setMeta("description", t.description)
    if (t.robots) setMeta("robots", t.robots)
  }, [JSON.stringify(t || {})])
}

/* ------------------------- Cart store (proven) ------------------------- */

const X_CART_S = "xhunta.cart.v1"
let xCartS: { base: string; nonce: string; state: XCartState } | null = null
const xCartL: Array<(s: XCartState) => void> = []
function xEmit(s: XCartState) { xCartL.forEach(l => l(s)) }
function xReadN(): string { try { return JSON.parse(localStorage.getItem(X_CART_S) || "{}").nonce || "" } catch { return "" } }
function xWriteP(s: XCartState, nonce: string) {
  try { localStorage.setItem(X_CART_S, JSON.stringify({ nonce, items_count: s.items_count, totals: s.totals })) } catch { /* private mode */ }
}
const xStoreFetch = (base: string, path: string, init?: RequestInit) => fetch(xApi(base, path), { cache: "no-store", credentials: "include", ...init })

async function xCartLoad(base: string): Promise<XCartState> {
  let nonce = xCartS?.base === base ? xCartS.nonce : xReadN()
  try {
    const res = await xStoreFetch(base, "/wp-json/wc/store/v1/cart")
    if (!res.ok) return { status: "error", error: "Cart unavailable (" + res.status + ")", items: [], items_count: 0 }
    const headerNonce = res.headers.get("X-WC-Store-API-Nonce")
    if (headerNonce) nonce = headerNonce
    const j = await res.json()
    const s: XCartState = { status: "ready", items: j.items || [], items_count: j.items_count || 0, totals: j.totals, permalink: j.permalink }
    if (xCartS?.base === base) xCartS.nonce = nonce || xCartS.nonce
    xWriteP(s, nonce || xCartS?.nonce || "")
    return s
  } catch (e: any) {
    return { status: "error", error: (e && e.message) || "Cart unavailable", items: [], items_count: 0 }
  }
}

const xMutate = async (base: string, path: string, body: any): Promise<{ ok: boolean; error?: string; state?: XCartState }> => {
  const nonce = (xCartS?.base === base && xCartS.nonce) || xReadN()
  try {
    const res = await xStoreFetch(base, path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(nonce ? { "X-WC-Store-API-Nonce": nonce, "Nonce": nonce } : {}) },
      body: JSON.stringify(body),
    })
    const headerNonce = res.headers.get("X-WC-Store-API-Nonce")
    if (headerNonce && xCartS?.base === base) xCartS.nonce = headerNonce
    const j = await res.json()
    if (!res.ok) {
      const msg = j?.message || j?.code || ("Request failed (" + res.status + ")")
      return { ok: false, error: msg }
    }
    const s: XCartState = { status: "ready", items: j.items || [], items_count: j.items_count || 0, totals: j.totals, permalink: j.permalink }
    if (headerNonce && xCartS?.base === base) xCartS.nonce = headerNonce
    xWriteP(s, (xCartS?.base === base && xCartS.nonce) || xReadN())
    return { ok: true, state: s }
  } catch (e: any) {
    return { ok: false, error: (e && e.message) || "Network error" }
  }
}

export function xUseCart(base: string) {
  const [state, setState] = React.useState<XCartState>(() =>
    xCartS?.base === base ? xCartS.state : { status: "idle", items: [], items_count: 0 })
  React.useEffect(() => {
    xCartL.push(setState)
    return () => { const i = xCartL.indexOf(setState); if (i >= 0) xCartL.splice(i, 1) }
  }, [])
  React.useEffect(() => {
    if (!base) return
    if (xCartS?.base === base) { setState(xCartS.state); return }
    xCartS = { base, nonce: xReadN(), state: { status: "loading", items: [], items_count: 0 } }
    setState(xCartS.state)
    xCartLoad(base).then(s => { xCartS!.base = base; xCartS!.state = s; xEmit(s) })
  }, [base])
  const refresh = React.useCallback(() => { xCartLoad(base).then(s => { if (xCartS) { xCartS.state = s } xEmit(s) }) }, [base])
  const mutate = React.useCallback(async (path: string, body: any) => {
    if (xCartS?.base === base && xCartS.state.status !== "mutating") {
      xCartS.state = { ...xCartS.state, status: "mutating" }
      xEmit(xCartS.state)
    }
    const r = await xMutate(base, path, body)
    if (r.ok && r.state) { xCartS!.state = r.state; setState(r.state); xEmit(r.state) }
    else if (!r.ok) { const errS: XCartState = { status: "error", error: r.error, items: xCartS?.state.items || [], items_count: xCartS?.state.items_count || 0, totals: xCartS?.state.totals, permalink: xCartS?.state.permalink }; if (xCartS) { xCartS.state = errS } setState(errS); xEmit(errS) }
    return r
  }, [base])
  const addItem = React.useCallback((id: number, quantity = 1) => mutate("/wp-json/wc/store/v1/cart/add-item", { id, quantity }), [mutate])
  const updateItem = React.useCallback((key: string, quantity: number) => mutate("/wp-json/wc/store/v1/cart/update-item", { key, quantity }), [mutate])
  const removeItem = React.useCallback((key: string) => mutate("/wp-json/wc/store/v1/cart/remove-item", { key }), [mutate])
  return { state, addItem, updateItem, removeItem, refresh }
}

/* ===================== SHARED STYLESHEET ===================== */

const CSS = [
  ":root{--xh-primary:#2563EB;--xh-dark:#111827;--xh-text:#374151;--xh-muted:#6B7280;--xh-bg:#FFFFFF;--xh-soft:#F8FAFC;--xh-border:#E5E7EB;--xh-good:#166534;--xh-goodBg:#DCFCE7;--xh-blueBg:#DBEAFE}",
  ".xh{box-sizing:border-box;font-family:Inter,-apple-system,Arial,sans-serif;color:var(--xh-text);width:100%;max-width:100%}.xh *{box-sizing:border-box}.xh a{color:inherit;text-decoration:none}",
  ".xh-eyebrow{font-size:12px;font-weight:800;color:var(--xh-primary);text-transform:uppercase;letter-spacing:.04em;margin:0 0 10px}",
  ".xh-title-h1{font-size:clamp(30px,4vw,50px);line-height:1.06;letter-spacing:-.02em;color:var(--xh-dark);margin:0 0 16px;font-weight:850}",
  ".xh-title-h2{font-size:clamp(24px,2.6vw,34px);line-height:1.12;letter-spacing:-.01em;color:var(--xh-dark);margin:0;font-weight:800}",
  ".xh-lead{font-size:17px;line-height:1.6;color:var(--xh-text);margin:0 0 22px}.xh-muted{color:var(--xh-muted);line-height:1.6}.xh-big-muted{font-size:17px;color:var(--xh-muted);line-height:1.6;margin:12px 0 0}",
  ".xh-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 16px;border-radius:8px;font-weight:700;font-size:14px;line-height:1;cursor:pointer;border:1px solid transparent;min-width:0;font-family:inherit;text-decoration:none}",
  ".xh-btn--primary{background:var(--xh-primary);color:#fff;border-color:var(--xh-primary)}.xh-btn--dark{background:var(--xh-dark);color:#fff;border-color:var(--xh-dark)}.xh-btn--secondary{background:#fff;color:var(--xh-dark);border-color:var(--xh-border)}.xh-btn--ghost{background:transparent;color:var(--xh-dark);border-color:var(--xh-border)}",
  ".xh-btn--sm{padding:9px 12px;font-size:13px}.xh-btn--lg{padding:13px 20px;font-size:15px}.xh-btn--block{width:100%}.xh-btn:disabled{opacity:.6;cursor:default}",
  ".xh-section{width:100%;max-width:1240px;margin:0 auto;padding:36px 24px}.xh-section--tight{padding:24px 24px}.xh-section--large{padding:56px 24px}.xh-section--flush{padding:0 24px}",
  ".xh-section--soft{background:var(--xh-soft)}.xh-section--dark{background:var(--xh-dark);color:#E5E7EB}.xh-section--accent{background:var(--xh-primary);color:#fff}",
  ".xh-section-head{display:grid;gap:2px;margin-bottom:18px}.xh-section-head--center{text-align:center;justify-items:center}",
  ".xh-hero{width:100%;max-width:1240px;margin:0 auto;padding:56px 24px;display:grid;grid-template-columns:1.05fr .95fr;gap:32px;align-items:center}.xh-hero--center{grid-template-columns:1fr;max-width:820px;text-align:center;justify-items:center}.xh-hero--dark{color:#E5E7EB}.xh-hero--dark .xh-title-h1,.xh-hero--dark .xh-lead{color:#fff}.xh-hero--dark .xh-eyebrow{color:#93C5FD}",
  ".xh-cta{margin:30px auto;max-width:1192px;padding:32px 28px;background:var(--xh-soft);border:1px solid var(--xh-border);border-radius:8px;display:grid;gap:12px;justify-items:start;width:100%}",
  ".xh-grid{display:grid;grid-template-columns:repeat(var(--xh-cols,3),minmax(0,1fr));gap:16px}",
  ".xh-card{border:1px solid var(--xh-border);border-radius:8px;padding:14px;background:#fff;display:grid;gap:8px;align-content:start}",
  ".xh-thumb{height:165px;border-radius:7px;background:var(--xh-soft);border:1px solid var(--xh-border);display:grid;place-items:center;position:relative;overflow:hidden;color:var(--xh-muted)}.xh-thumb img{width:100%;height:100%;object-fit:cover;display:block}",
  ".xh-badge{display:inline-flex;align-items:center;border-radius:999px;font-size:12px;font-weight:800;padding:4px 9px;font-style:normal;line-height:1.2}",
  ".xh-badge--free{background:var(--xh-goodBg);color:var(--xh-good)}.xh-badge--premium{background:var(--xh-blueBg);color:var(--xh-primary)}.xh-badge--new{background:var(--xh-primary);color:#fff}.xh-badge--sale{background:#FEE2E2;color:#B91C1C}.xh-badge--default{background:var(--xh-soft);color:var(--xh-muted);border:1px solid var(--xh-border)}",
  ".xh-card-title{font-size:17px;line-height:1.3;color:var(--xh-dark);margin:0}.xh-card-text{font-size:14px;line-height:1.55;color:var(--xh-muted);margin:0;min-height:42px}.xh-card-label{color:var(--xh-primary);font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.03em;margin:0}",
  ".xh-card-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px}.xh-xPrice{font-size:17px;color:var(--xh-dark);font-weight:800}",
  ".xh-cat-card{border:1px solid var(--xh-border);border-radius:8px;padding:16px;background:#fff;display:grid;gap:8px;color:var(--xh-dark);align-content:start}.xh-cat-card img{width:100%;height:105px;object-fit:cover;border-radius:7px}.xh-cat-icon{width:40px;height:40px;border-radius:8px;background:var(--xh-soft);color:var(--xh-primary);display:grid;place-items:center;font-weight:900}.xh-cat-count{font-style:normal;color:var(--xh-muted);font-size:13px;margin:0}",
  ".xh-blog-card{border:1px solid var(--xh-border);border-radius:8px;padding:18px;display:grid;gap:10px;background:#fff;align-content:start}.xh-blog-card img{width:100%;height:150px;object-fit:cover;border-radius:7px;background:var(--xh-soft)}.xh-tile{width:100%;height:150px;border-radius:7px;background:var(--xh-soft);display:grid;place-items:center;font-size:34px;font-weight:900;color:var(--xh-primary);border:1px solid var(--xh-border)}.xh-blog-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}",
  ".xh-state{border:1px dashed var(--xh-border);background:var(--xh-soft);border-radius:8px;padding:22px;text-align:center;display:grid;gap:6px;justify-items:center;width:100%}.xh-state b{color:var(--xh-dark)}",
  ".xh-toolbar{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:18px}.xh-input{height:44px;border:1px solid var(--xh-border);border-radius:8px;padding:0 13px;font-size:14px;background:#fff;min-width:0;width:100%;font-family:inherit}",
  ".xh-load-row{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:20px;flex-wrap:wrap}",
  ".xh-cart-list{display:grid;gap:12px}.xh-cart-item{display:grid;grid-template-columns:72px 1fr auto auto auto;gap:14px;align-items:center;border:1px solid var(--xh-border);border-radius:8px;padding:12px;background:#fff}.xh-cart-item img{width:72px;height:72px;object-fit:cover;border-radius:7px;background:var(--xh-soft)}.xh-cart-summary{display:flex;gap:18px;justify-content:flex-end;align-items:center;margin-top:18px;flex-wrap:wrap}",
  ".xh-checkout-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;align-items:start}.xh-form-card{border:1px solid var(--xh-border);border-radius:8px;padding:18px;background:#fff;display:grid;gap:10px}.xh-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.xh-form-note{color:var(--xh-muted);font-size:13px;line-height:1.5;margin:0}.xh-error-note{color:#B91C1C;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px 12px;font-size:13px;margin:0}",
  ".xh-detail{width:100%;max-width:1240px;margin:0 auto;padding:52px 24px;display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}.xh-gallery{display:grid;gap:12px}.xh-detail-img{min-height:240px;max-height:440px;border:1px solid var(--xh-border);border-radius:8px;background:var(--xh-soft);display:grid;place-items:center;width:100%;object-fit:cover}.xh-detail-facts{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:0 0 18px}.xh-panel{border:1px solid var(--xh-border);border-radius:8px;padding:18px;background:#fff}.xh-attr-grid{display:grid;gap:6px;margin-top:12px;color:var(--xh-muted)}",
  ".xh-article{width:100%;max-width:780px;margin:0 auto;padding:52px 24px}.xh-article img.hero{width:100%;max-height:420px;object-fit:cover;border-radius:8px;margin-bottom:20px}.xh-prose{font-size:16.5px;line-height:1.75;color:var(--xh-text);overflow-wrap:anywhere}.xh-prose h1,.xh-prose h2,.xh-prose h3{color:var(--xh-dark)}.xh-prose img{max-width:100%;height:auto;border-radius:8px}.xh-prose a{color:var(--xh-primary);text-decoration:underline}",
  ".xh-author{border:1px solid var(--xh-border);border-radius:8px;padding:18px;background:#fff;display:grid;gap:10px}",
  ".xh-header{position:sticky;top:0;z-index:9;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);border-bottom:1px solid var(--xh-border);width:100%}.xh-bar{max-width:1240px;margin:0 auto;min-height:72px;padding:0 24px;display:flex;align-items:center;gap:18px}.xh-logo{display:flex;align-items:center;gap:10px;color:var(--xh-dark);min-width:0}.xh-logo mark{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:var(--xh-primary);color:#fff;font-weight:900}.xh-logo b{color:var(--xh-dark)}.xh-logo small{display:block;color:var(--xh-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".xh-nav{display:flex;gap:2px;flex:1}",
  ".xh-navlink{padding:10px 12px;border-radius:7px;font-size:14px;font-weight:600;color:var(--xh-dark);white-space:nowrap}.xh-navlink:hover{background:var(--xh-soft)}",
  ".xh-search{display:flex;min-width:160px;max-width:230px}.xh-header .xh-input{height:40px}",
  ".xh-actions{display:flex;align-items:center;gap:8px}.xh-mini{border:1px solid var(--xh-border);border-radius:8px;padding:10px 12px;font-size:14px;display:inline-flex;align-items:center;gap:6px;color:var(--xh-dark);background:#fff;text-decoration:none}.xh-mini--primary{background:var(--xh-dark);color:#fff;border-color:var(--xh-dark)}.xh-count{background:var(--xh-primary);color:#fff;border-radius:999px;min-width:18px;height:18px;padding:0 5px;display:inline-grid;place-items:center;font-size:11px;font-weight:800}",
  ".xh-menu-btn{display:none;border:1px solid var(--xh-border);background:#fff;border-radius:8px;padding:10px 12px;font-size:14px;cursor:pointer}.xh-drawer{display:none;grid-template-columns:1fr;gap:2px;padding:0 24px 18px}.xh-drawer a{padding:12px;border-bottom:1px solid var(--xh-border);color:var(--xh-dark);font-weight:600}.xh-drawer form{display:grid;gap:8px;padding:12px 0}",
  ".xh-footer{background:var(--xh-dark);color:#fff;width:100%;margin-top:48px}.xh-foot-grid{max-width:1240px;margin:0 auto;padding:42px 24px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:28px}.xh-foot-title{font-size:14px;text-transform:uppercase;letter-spacing:0;color:#CBD5E1;margin:0 0 10px}.xh-foot-link{display:block;padding:6px 0;color:#E5E7EB;text-decoration:none}.xh-legal{max-width:1240px;margin:0 auto;padding:18px 24px;border-top:1px solid rgba(255,255,255,.12);color:#CBD5E1;font-size:13px}",
  "@media(max-width:980px){.xh-nav{display:none!important}.xh-search{display:none!important}.xh-menu-btn{display:inline-flex!important}.xh-toolbar{grid-template-columns:1fr 1fr!important}}",
  "@media(max-width:900px){.xh-grid,[data-cols]{--xh-cols:2!important}.xh-hero,.xh-detail,.xh-checkout-grid{grid-template-columns:1fr!important}.xh-cat-card img,.xh-tile,.xh-blog-card img{max-height:180px}.xh-foot-grid{grid-template-columns:1fr 1fr!important}.xh-hero--center{max-width:100%!important}}",
  "@media(max-width:640px){.xh-grid{--xh-cols:1!important}.xh-toolbar{grid-template-columns:1fr!important}.xh-foot-grid{grid-template-columns:1fr!important}.xh-stats-grid{grid-template-columns:1fr!important}.xh-section,.xh-hero,.xh-detail,.xh-article,.xh-section--tight,.xh-section--large,.xh-section--flush{padding-left:18px!important;padding-right:18px!important}.xh-bar{padding:0 16px!important}.xh-cart-item{grid-template-columns:64px 1fr!important}.xh-cart-item>:nth-child(3),.xh-cart-item>:nth-child(4),.xh-cart-item>:nth-child(5){grid-column:2/3!important}.xh-hero--center{max-width:100%!important}.xh-logo small{display:none!important}.xh-count{display:none!important}}",
  ".xh-stats-grid{display:grid;gap:14px;padding:22px;border-radius:8px;border:1px solid var(--xh-border)}@media(max-width:900px){.xh-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}",
].join("")

let injected = false
function ensureStyles() {
  if (typeof document === "undefined" || injected) return
  if (document.getElementById("xhunta-core")) { injected = true; return }
  const style = document.createElement("style")
  style.id = "xhunta-core"
  style.textContent = CSS
  document.head.appendChild(style)
  injected = true
}

/* ===================== PRESENTATIONAL PRIMITIVES ===================== */

const XA = (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...p} style={{ color: "inherit", textDecoration: "none", ...p.style }} />

function Btn({ href, onClick, children, variant = "primary", size = "md", external = false, className = "", style, disabled }: { href?: string; onClick?: () => void; children: React.ReactNode; variant?: "primary" | "dark" | "secondary" | "ghost"; size?: "sm" | "md" | "lg"; external?: boolean; className?: string; style?: React.CSSProperties; disabled?: boolean }) {
  const cls = `xh-btn xh-btn--${variant} ${size !== "md" ? `xh-btn--${size}` : ""} ${className}`.trim()
  if (href) {
    if (/^https?:\/\//.test(href)) return <XA href={href} className={cls} style={style} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined}>{children}</XA>
    return <XA href={href} className={cls} style={style}>{children}</XA>
  }
  return <button className={cls} onClick={onClick} style={style} disabled={disabled}>{children}</button>
}

function BadgeView({ label, variant }: { label: string; variant?: "free" | "premium" | "new" | "sale" | "default" }) {
  return <span className={`xh-badge xh-badge--${variant || "default"}`}>{label}</span>
}

function StateView({ mode, title, body, actionLabel, actionHref, onRetry }: { mode: "loading" | "empty" | "error"; title: string; body: string; actionLabel?: string; actionHref?: string; onRetry?: () => void }) {
  return <div className="xh-state" role="status"><b>{title}</b><p className="xh-muted" style={{ margin: 0 }}>{body}</p>
    {actionLabel && actionHref && <div style={{ marginTop: 10 }}><Btn href={actionHref} variant="dark" size="sm">{actionLabel}</Btn></div>}
    {actionLabel && onRetry && <div style={{ marginTop: 10 }}><Btn onClick={onRetry} variant="dark" size="sm">{actionLabel}</Btn></div>}
  </div>
}

function SectionHeadView({ eyebrow, title, body, align }: { eyebrow?: string; title: string; body?: string; align?: "start" | "center" }) {
  return <div className={`xh-section-head ${align === "center" ? "xh-section-head--center" : ""}`}>
    {eyebrow ? <p className="xh-eyebrow" style={{ margin: 0 }}>{eyebrow}</p> : null}
    <h2 className="xh-title-h2">{title}</h2>
    {body ? <p className="xh-muted" style={{ margin: 0 }}>{body}</p> : null}
  </div>
}

function LogoView({ dark = false }: { dark?: boolean }) {
  return <XA href="/" className="xh-logo" aria-label="Xhunta home" style={{ color: dark ? "#fff" : undefined }}><mark>X</mark><span><b style={dark ? { color: "#fff" } : undefined}>Xhunta</b><small style={dark ? { color: "#CBD5E1" } : undefined}>Digital Projects &amp; Resources</small></span></XA>
}

function ProductCardView({ p, base, onAdd }: { p: XProduct; base: string; onAdd?: (id: number) => void }) {
  const img = p.images?.[0]
  const label = p.categories?.[0]?.name || `ID ${p.id}`
  const summary = xClean(p.short_description || p.summary || p.description || "").slice(0, 120)
  const free = xFree(p)
  return <article className="xh-card">
    <a className="xh-thumb" href={xProdHref(p)} style={{ display: "grid" }}>{img?.src ? <img loading="lazy" src={img.thumbnail || img.src} alt={img.alt || p.name} /> : <span>Resource</span>}</a>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><span className="xh-card-label">{label}</span><BadgeView label={free ? "Free" : "Premium"} variant={free ? "free" : "premium"} /></div>
    <h3 className="xh-card-title"><XA href={xProdHref(p)}>{p.name}</XA></h3>
    <p className="xh-card-text">{summary}</p>
    <div className="xh-card-foot">
      <b className="xh-xPrice">{free ? "Free" : xPrice(p) || p.price_html || ""}</b>
      {free ? <Btn href={xProdHref(p)} variant="dark" size="sm">View / Download</Btn>
        : p.is_purchasable !== false && onAdd ? <Btn onClick={() => onAdd(p.id)} variant="dark" size="sm">Add to cart</Btn>
          : <Btn href={xProdHref(p)} variant="dark" size="sm">View</Btn>}
    </div>
  </article>
}

function CategoryCardView({ c }: { c: XCategory }) {
  const href = xShopHref(`?category=${encodeURIComponent(c.slug)}`)
  const img = c.image?.src
  return <XA href={href} className="xh-cat-card">
    {img ? <img loading="lazy" src={c.image!.thumbnail || img} alt={c.image!.alt || c.name} /> : <span className="xh-cat-icon">{xClean(c.name).slice(0, 1) || "?"}</span>}
    <b>{c.name}</b>
    {c.description ? <small style={{ color: "var(--xh-muted)" }}>{xClean(c.description).slice(0, 95)}</small> : null}
    <em className="xh-cat-count">{c.count || 0} resources</em>
  </XA>
}

function BlogCardView({ p }: { p: XPost }) {
  const image = xPostImg(p)
  const cat = xPostCat(p)
  const title = xClean(p.title.rendered)
  return <article className="xh-blog-card">
    <XA href={xPostHref(p)}>{image?.source_url ? <img loading="lazy" src={image.media_details?.sizes?.medium?.source_url || image.source_url} alt={image.alt_text || title} /> : <div className="xh-tile" aria-hidden><span>{title.slice(0, 1) || "B"}</span></div>}</XA>
    <div className="xh-blog-meta"><p className="xh-eyebrow" style={{ margin: 0 }}>{cat ? cat.name : "Article"}</p><time dateTime={p.date} style={{ color: "var(--xh-muted)", fontSize: 13 }}>{new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></div>
    <h3 className="xh-card-title"><XA href={xPostHref(p)}>{title}</XA></h3>
    <p className="xh-card-text">{xClean(p.excerpt.rendered).slice(0, 130)}</p>
    <Btn href={xPostHref(p)} variant="dark" size="sm">Read article</Btn>
  </article>
}

function LoadRow({ onPrev, onNext, page }: { onPrev?: () => void; onNext?: () => void; page: number }) {
  return <div className="xh-load-row"><Btn variant="secondary" onClick={onPrev} disabled={page <= 1}>Previous</Btn><span className="xh-muted" style={{ fontSize: 14 }}>Page {page}</span><Btn variant="secondary" onClick={onNext}>Next</Btn></div>
}

/* ===================== CANVAS COMPONENTS ===================== */

/* ------------------------------ Header ------------------------------ */

export function XhHeader({ wpBaseUrl, navLinks = [], showSearch = true, showCart = true, showAccount = true, logoTitle }: { wpBaseUrl?: string; navLinks?: { label: string; href: string }[]; showSearch?: boolean; showCart?: boolean; showAccount?: boolean; logoTitle?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const { state } = xUseCart(base)
  const nav = (navLinks && navLinks.length ? navLinks : [["Store", "/shop"], ["Free Resources", "/free-resources"], ["Categories", "/categories"], ["Blog", "/blog"]].map(n => ({ label: n[0], href: n[1] })))
  const search = (e: React.FormEvent) => { e.preventDefault(); if (typeof window !== "undefined") window.location.href = xShopHref(`?search=${encodeURIComponent(q)}`) }
  const count = state.status === "ready" || state.status === "mutating" ? state.items_count : 0
  return <header className="xh xh-header">
    <div className="xh-bar">
      <XA href="/" className="xh-logo" aria-label="Xhunta home"><mark>X</mark><span><b>{logoTitle || "Xhunta"}</b><small>Digital Projects &amp; Resources</small></span></XA>
      <nav className="xh-nav" aria-label="Primary">{nav.map(n => <XA key={n.label} href={n.href} className="xh-navlink">{n.label}</XA>)}</nav>
      {showSearch ? <form onSubmit={search} role="search" className="xh-search"><input aria-label="Search resources" value={q} onChange={e => setQ(e.target.value)} placeholder="Search resources" className="xh-input" /></form> : null}
      <div className="xh-actions">
        {showCart ? <XA href="/cart" className="xh-mini" aria-label={`Cart, ${count} items`}>Cart{count > 0 ? <span className="xh-count">{count}</span> : null}</XA> : null}
        {showAccount ? <XA href="/my-account" className="xh-mini">Account</XA> : null}
        <button className="xh-menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
      </div>
    </div>
    {open ? <nav className="xh-drawer" style={{ display: "grid" }} aria-label="Mobile" onClick={() => setOpen(false)}>{nav.map(n => <XA key={n.label} href={n.href}>{n.label}</XA>)}<XA href="/cart">Cart</XA><XA href="/my-account">My Account</XA><XA href="/login">Login</XA><XA href="/register">Register</XA></nav> : null}
  </header>
}
XhHeader.displayName = "XhHeader"
addPropertyControls(XhHeader, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  logoTitle: { type: ControlType.String, title: "Logo Title", defaultValue: "Xhunta" },
  navLinks: { type: ControlType.Array, title: "Nav Links", control: { type: ControlType.Object, controls: { label: { type: ControlType.String, title: "Label", defaultValue: "Store" }, href: { type: ControlType.String, title: "Href", defaultValue: "/shop" } } }, maxCount: 8, defaultValue: [{ label: "Store", href: "/shop" }, { label: "Free Resources", href: "/free-resources" }, { label: "Categories", href: "/categories" }, { label: "Blog", href: "/blog" }] },
  showSearch: { type: ControlType.Boolean, title: "Show Search", defaultValue: true },
  showCart: { type: ControlType.Boolean, title: "Show Cart", defaultValue: true },
  showAccount: { type: ControlType.Boolean, title: "Show Account", defaultValue: true },
})

/* ---------------------------- Mobile Nav ---------------------------- */

export function XhMobileNav({ navLinks = [] }: { navLinks?: { label: string; href: string }[] }) {
  ensureStyles()
  const nav = (navLinks && navLinks.length ? navLinks : [["Store", "/shop"], ["Free Resources", "/free-resources"], ["Categories", "/categories"], ["Blog", "/blog"], ["Cart", "/cart"], ["My Account", "/my-account"]].map(n => ({ label: n[0], href: n[1] })))
  return <nav className="xh" aria-label="Mobile"><div className="xh-drawer" style={{ display: "grid", padding: 0 }}>{nav.map(n => <XA key={n.label} href={n.href}>{n.label}</XA>)}<XA href="/login">Login</XA><XA href="/register">Register</XA></div></nav>
}
XhMobileNav.displayName = "XhMobileNav"
addPropertyControls(XhMobileNav, {
  navLinks: { type: ControlType.Array, title: "Nav Links", control: { type: ControlType.Object, controls: { label: { type: ControlType.String, title: "Label", defaultValue: "Store" }, href: { type: ControlType.String, title: "Href", defaultValue: "/shop" } } }, maxCount: 10, defaultValue: [{ label: "Store", href: "/shop" }, { label: "Free Resources", href: "/free-resources" }, { label: "Categories", href: "/categories" }, { label: "Blog", href: "/blog" }, { label: "Cart", href: "/cart" }, { label: "My Account", href: "/my-account" }] },
})

/* ------------------------------ Footer ------------------------------ */

export function XhFooter({ columns = [], legalText = "" }: { columns?: { title: string; links: { label: string; href: string }[] }[]; legalText?: string }) {
  ensureStyles()
  const cols = (columns && columns.length ? columns : [
    { title: "Marketplace", links: [{ label: "Store", href: "/shop" }, { label: "Free Resources", href: "/free-resources" }, { label: "Categories", href: "/categories" }, { label: "Blog", href: "/blog" }] },
    { title: "Account", links: [{ label: "Login", href: "/login" }, { label: "Register", href: "/register" }, { label: "My Account", href: "/my-account" }, { label: "Cart", href: "/cart" }] },
    { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Privacy Policy", href: "/privacy-policy" }, { label: "Terms", href: "/terms-and-conditions" }] },
  ])
  const year = new Date().getFullYear()
  return <footer className="xh xh-footer">
    <div className="xh-foot-grid">
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}><LogoView dark /><p className="xh-muted" style={{ color: "#CBD5E1", margin: 0, lineHeight: 1.6 }}>XA professional digital marketplace frontend powered by WordPress and WooCommerce as the source of truth.</p></div>
      {cols.map(c => <div key={c.title} style={{ display: "grid", gap: 2, alignContent: "start" }}><h3 className="xh-foot-title">{c.title}</h3>{c.links.map(l => <XA key={l.label} href={l.href} className="xh-foot-link">{l.label}</XA>)}</div>)}
    </div>
    <div className="xh-legal">{legalText || `© ${year} Xhunta. No private WooCommerce or WordPress credentials are exposed.`}</div>
  </footer>
}
XhFooter.displayName = "XhFooter"
addPropertyControls(XhFooter, {
  columns: { type: ControlType.Array, title: "Link Columns", control: { type: ControlType.Object, controls: { title: { type: ControlType.String, title: "Heading", defaultValue: "Marketplace" }, links: { type: ControlType.Array, title: "Links", control: { type: ControlType.Object, controls: { label: { type: ControlType.String, title: "Label", defaultValue: "Store" }, href: { type: ControlType.String, title: "Href", defaultValue: "/shop" } } } } } }, defaultValue: [] },
  legalText: { type: ControlType.String, title: "Legal Line", placeholder: "© 2026 Xhunta — keep default" },
})

/* ------------------------------ Button ------------------------------ */

export function XhButton({ label = "Button", href = "", variant = "primary", size = "md", block = false, external = false, disabled = false }: { label?: string; href?: string; variant?: string; size?: any; block?: boolean; external?: boolean; disabled?: boolean }) {
  ensureStyles()
  return <div className="xh" style={{ width: "100%" }}><Btn href={href || undefined} variant={(variant as any) || "primary"} size={(size as any) || "md"} external={external} className={block ? "xh-btn--block" : ""} style={disabled && !href ? { pointerEvents: "none", opacity: .6 } : undefined}>{label}</Btn></div>
}
XhButton.displayName = "XhButton"
addPropertyControls(XhButton, {
  label: { type: ControlType.String, title: "Label", defaultValue: "Button" },
  href: { type: ControlType.String, title: "Link", defaultValue: "/shop" },
  variant: { type: ControlType.Enum, title: "Variant", options: ["primary", "dark", "secondary", "ghost"], optionTitles: ["Primary", "Dark", "Secondary", "Ghost"], defaultValue: "primary" },
  size: { type: ControlType.Enum, title: "Size", options: ["sm", "md", "lg"], optionTitles: ["Small", "Medium", "Large"], defaultValue: "md" },
  block: { type: ControlType.Boolean, title: "Full width", defaultValue: false },
  external: { type: ControlType.Boolean, title: "Open in new tab", defaultValue: false },
  disabled: { type: ControlType.Boolean, title: "Disabled", defaultValue: false },
})

/* ------------------------------ Badge ------------------------------ */

export function XhBadge({ label = "Free", variant = "free" }: { label?: string; variant?: string }) {
  ensureStyles()
  return <span className="xh"><BadgeView label={label} variant={(variant as any) || "default"} /></span>
}
XhBadge.displayName = "XhBadge"
addPropertyControls(XhBadge, {
  label: { type: ControlType.String, title: "Label", defaultValue: "Free" },
  variant: { type: ControlType.Enum, title: "Variant", options: ["free", "premium", "new", "sale", "default"], optionTitles: ["Free", "Premium", "New", "Sale", "Default"], defaultValue: "free" },
})

/* --------------------------- Section Heading --------------------------- */

export function XhSectionHeading({ eyebrow = "", title = "Section title", description = "", align = "start" }: { eyebrow?: string; title?: string; description?: string; align?: any }) {
  ensureStyles()
  return <div className="xh"><SectionHeadView eyebrow={eyebrow} title={title || ""} body={description} align={(align as any) || "start"} /></div>
}
XhSectionHeading.displayName = "XhSectionHeading"
addPropertyControls(XhSectionHeading, {
  eyebrow: { type: ControlType.String, title: "Eyebrow", placeholder: "Xhunta" },
  title: { type: ControlType.String, title: "Heading", defaultValue: "Section title" },
  description: { type: ControlType.String, title: "Description", placeholder: "Optional supporting copy" },
  align: { type: ControlType.Enum, title: "Align", options: ["start", "center"], optionTitles: ["Left", "Center"], defaultValue: "start" },
})

/* ------------------------------ Section ------------------------------ */

export function XhSection({ children, background = "white", padding = "normal", radius = 0, label = "" }: { children?: React.ReactNode; background?: string; padding?: any; radius?: number; label?: string }) {
  ensureStyles()
  const pad = padding === "tight" ? "xh-section--tight" : padding === "large" ? "xh-section--large" : padding === "flush" ? "xh-section--flush" : ""
  const bg = background === "soft" ? "xh-section--soft" : background === "dark" ? "xh-section--dark" : background === "accent" ? "xh-section--accent" : ""
  return <section className={`xh ${pad} ${bg}`.trim()} style={{ borderRadius: radius, ...(label ? { position: "relative" } : {}) }} aria-label={label || undefined}>{children}</section>
}
XhSection.displayName = "XhSection"
addPropertyControls(XhSection, {
  children: { type: ControlType.Children },
  background: { type: ControlType.Enum, title: "Background", options: ["white", "soft", "dark", "accent", "none"], optionTitles: ["White", "Soft", "Dark", "Accent", "None"], defaultValue: "white" },
  padding: { type: ControlType.Enum, title: "Padding", options: ["tight", "normal", "large", "flush"], optionTitles: ["Tight", "Normal", "Large", "Flush"], defaultValue: "normal" },
  radius: { type: ControlType.Number, title: "Corner radius", defaultValue: 0, min: 0, max: 32 },
  label: { type: ControlType.String, title: "Label", placeholder: "Structural label (optional)" },
})

/* ------------------------------ Hero ------------------------------ */

export function XhHero({ wpBaseUrl, eyebrow = "Xhunta Marketplace", title = "Digital Projects & Resources", description = "", primaryLabel = "Explore Resources", primaryHref = "/shop", secondaryLabel = "Free Resources", secondaryHref = "/free-resources", imageUrl = "", align = "left", background = "white", visual = "categories", sectionTitle = "" }: { wpBaseUrl?: string; eyebrow?: string; title?: string; description?: string; primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string; imageUrl?: string; align?: any; background?: string; visual?: string; sectionTitle?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const centered = (align as any) === "center"
  const bg = background === "dark" ? " xh-hero--dark" : ""
  const cls = `xh xh-hero${centered ? " xh-hero--center" : ""}${bg}`.trim()
  const preview = visual === "categories" ? <HeroPreview base={base} title={sectionTitle} /> : visual === "image" && imageUrl ? <a className="xh-hero-visual-link" href={primaryHref} style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid var(--xh-border)" }}><img src={imageUrl} alt="" style={{ width: "100%", display: "block", objectFit: "cover", minHeight: 260 }} /></a> : null
  return <section className={cls} style={{ background: centered && background === "soft" ? "var(--xh-soft)" : background === "dark" ? "var(--xh-dark)" : background === "soft" ? "var(--xh-soft)" : undefined, borderRadius: 8 }}>
    <div className="xh-hero-content">
      {eyebrow ? <p className="xh-eyebrow">{eyebrow}</p> : null}
      <h1 className="xh-title-h1">{title}</h1>
      {description ? <p className={background === "dark" ? "xh-lead" : "xh-lead"}>{description}</p> : null}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: centered ? "center" : "flex-start" }}>
        {primaryLabel ? <Btn href={primaryHref} variant="primary" size="lg">{primaryLabel}</Btn> : null}
        {secondaryLabel ? <Btn href={secondaryHref} variant="secondary" size="lg">{secondaryLabel}</Btn> : null}
      </div>
    </div>
    {preview}
  </section>
}
XhHero.displayName = "XhHero"
addPropertyControls(XhHero, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  eyebrow: { type: ControlType.String, title: "Eyebrow", defaultValue: "Xhunta Marketplace" },
  title: { type: ControlType.String, title: "Heading", defaultValue: "Digital Projects & Resources" },
  description: { type: ControlType.String, title: "Description", defaultValue: "Xhunta provides project source code, research materials, documentation, diagrams, templates, graphics, presentations, reports, and other practical digital resources." },
  primaryLabel: { type: ControlType.String, title: "Primary CTA label", defaultValue: "Explore Resources" },
  primaryHref: { type: ControlType.String, title: "Primary CTA link", defaultValue: "/shop" },
  secondaryLabel: { type: ControlType.String, title: "Secondary CTA label", defaultValue: "Free Resources" },
  secondaryHref: { type: ControlType.String, title: "Secondary CTA link", defaultValue: "/free-resources" },
  visual: { type: ControlType.Enum, title: "Visual", options: ["categories", "image", "none"], optionTitles: ["Live categories", "Image", "None"], defaultValue: "categories" },
  imageUrl: { type: ControlType.File, title: "Image", allowedFileTypes: ["image/*"] },
  align: { type: ControlType.Enum, title: "Align", options: ["left", "center"], optionTitles: ["Left", "Center"], defaultValue: "left" },
  background: { type: ControlType.Enum, title: "Background", options: ["white", "soft", "dark"], optionTitles: ["White", "Soft", "Dark"], defaultValue: "white" },
})

function HeroPreview({ base, title }: { base: string; title?: string }) {
  const { data, state } = xUseCategories(base)
  const items = (Array.isArray(data) ? data : []).filter(c => c.name?.toLowerCase() !== "uncategorized").slice(0, 6)
  if (state !== "ready" || !items.length) return null
  return <div style={{ border: "1px solid var(--xh-border)", borderRadius: 8, background: "var(--xh-soft)", padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, boxShadow: "0 10px 30px rgba(17,24,39,.06)" }}>
    {items.map(c => <XA key={c.id} href={xShopHref(`?category=${encodeURIComponent(c.slug)}`)} style={{ background: "#fff", border: "1px solid var(--xh-border)", borderRadius: 8, padding: 14, display: "grid", gap: 4, color: "var(--xh-dark)" }}><b>{c.name}</b><small style={{ color: "var(--xh-muted)" }}>{c.count || 0} resources</small></XA>)}
  </div>
}

/* ------------------------------ CTA ------------------------------ */

export function XhCTA({ title = "Find the right digital resource faster", description = "", buttonLabel = "Explore Resources", buttonHref = "/shop", background = "soft" }: { title?: string; description?: string; buttonLabel?: string; buttonHref?: string; background?: any }) {
  ensureStyles()
  const bg = (background as any) === "accent" ? "var(--xh-primary)" : (background as any) === "dark" ? "var(--xh-dark)" : "var(--xh-soft)"
  const light = background === "accent" || background === "dark"
  return <section className="xh xh-cta" style={{ background: bg, borderColor: "var(--xh-border)", justifyItems: "center", textAlign: "center" }}>
    <h2 className="xh-title-h2" style={light ? { color: "#fff" } : undefined}>{title}</h2>
    {description ? <p className="xh-muted" style={{ margin: 0, maxWidth: 640, ...(light ? { color: "rgba(255,255,255,.85)" } : {}) }}>{description}</p> : null}
    <div style={{ marginTop: 4 }}><Btn href={buttonHref} variant={light ? "secondary" : "primary"}>{buttonLabel}</Btn></div>
  </section>
}
XhCTA.displayName = "XhCTA"
addPropertyControls(XhCTA, {
  title: { type: ControlType.String, title: "Heading", defaultValue: "Find the right digital resource faster" },
  description: { type: ControlType.String, title: "Description", defaultValue: "Browse project source code, documentation, diagrams, templates, presentations, reports, and free resources." },
  buttonLabel: { type: ControlType.String, title: "Button label", defaultValue: "Explore Resources" },
  buttonHref: { type: ControlType.String, title: "Button link", defaultValue: "/shop" },
  background: { type: ControlType.Enum, title: "Background", options: ["soft", "accent", "dark"], optionTitles: ["Soft", "Accent", "Dark"], defaultValue: "soft" },
})

/* ------------------------------ Stats ------------------------------ */

export function XhStats({ items = [], background = "soft" }: { items?: { value: string; label: string }[]; background?: string }) {
  ensureStyles()
  const stats = items && items.length ? items : [{ value: "100%", label: "Powered by real WooCommerce data" }, { value: "9+", label: "Public product categories" }, { value: "2", label: "Live resources on the store" }]
  const bg = background === "dark" ? "var(--xh-dark)" : background === "accent" ? "var(--xh-primary)" : "var(--xh-soft)"
  const light = background === "dark" || background === "accent"
  return <section className="xh xh-stats-grid" style={{ background: bg, gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)` }}>
    {stats.map(s => <div key={s.label} style={{ display: "grid", gap: 4, textAlign: "center" }}><b style={{ fontSize: 28, color: light ? "#fff" : "var(--xh-dark)" }}>{s.value}</b><span className="xh-muted" style={light ? { color: "rgba(255,255,255,.8)" } : {}}>{s.label}</span></div>)}
  </section>
}
XhStats.displayName = "XhStats"
addPropertyControls(XhStats, {
  items: { type: ControlType.Array, title: "Stats", control: { type: ControlType.Object, controls: { value: { type: ControlType.String, title: "Value", defaultValue: "100%" }, label: { type: ControlType.String, title: "Label", defaultValue: "Label" } } }, maxCount: 4, defaultValue: [{ value: "100%", label: "Powered by real WooCommerce data" }, { value: "9+", label: "Public product categories" }, { value: "2", label: "Live resources on the store" }] },
  background: { type: ControlType.Enum, title: "Background", options: ["soft", "accent", "dark"], optionTitles: ["Soft", "Accent", "Dark"], defaultValue: "soft" },
})

/* ------------------------------ State ------------------------------ */

export function XhState({ mode = "loading", title = "Loading", body = "", actionLabel = "", actionHref = "/shop" }: { mode?: any; title?: string; body?: string; actionLabel?: string; actionHref?: string }) {
  ensureStyles()
  return <div className="xh"><StateView mode={(mode as any) || "loading"} title={title} body={body} actionLabel={actionLabel || undefined} actionHref={actionHref || undefined} /></div>
}
XhState.displayName = "XhState"
addPropertyControls(XhState, {
  mode: { type: ControlType.Enum, title: "Mode", options: ["loading", "empty", "error"], optionTitles: ["Loading", "Empty", "Error"], defaultValue: "loading" },
  title: { type: ControlType.String, title: "Title", defaultValue: "Loading" },
  body: { type: ControlType.String, title: "Body", defaultValue: "" },
  actionLabel: { type: ControlType.String, title: "Action label", defaultValue: "" },
  actionHref: { type: ControlType.String, title: "Action link", defaultValue: "/shop" },
})

/* ---------------------------- Search Bar ---------------------------- */

export function XhSearchBar({ placeholder = "Search resources", size = "md" }: { placeholder?: string; size?: any }) {
  ensureStyles()
  const [q, setQ] = React.useState(xParam("search"))
  const [urlParams] = xUseUrl()
  React.useEffect(() => setQ(xParam("search")), [urlParams])
  const submit = (e: React.FormEvent) => { e.preventDefault(); xNav({ search: q, category: xParam("category") || "", access: xParam("access") || "", sort: xParam("sort") || "date" }) }
  return <form className="xh" role="search" onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
    <input aria-label={placeholder} placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} className="xh-input" style={{ height: size === "lg" ? 48 : 44 }} />
    <Btn variant="dark" size={size as any}>Search</Btn>
  </form>
}
XhSearchBar.displayName = "XhSearchBar"
addPropertyControls(XhSearchBar, {
  placeholder: { type: ControlType.String, title: "Placeholder", defaultValue: "Search resources" },
  size: { type: ControlType.Enum, title: "Size", options: ["sm", "md", "lg"], optionTitles: ["Small", "Medium", "Large"], defaultValue: "md" },
})

/* ---------------------------- Filter Bar ---------------------------- */

export function XhFilterBar({ wpBaseUrl, freeOnly = false }: { wpBaseUrl?: string; freeOnly?: boolean }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { data } = xUseCategories(base)
  const cats = (Array.isArray(data) ? data : []).filter(c => c.name?.toLowerCase() !== "uncategorized")
  const [urlParams] = xUseUrl()
  const search = xParam("search")
  const category = xParam("category")
  const access = freeOnly ? "free" : xParam("access")
  const sort = xParam("sort") || "date"
  const apply = (patch: Record<string, string>) => xNav({ search, category, access, sort, ...patch }, true)
  return <div className="xh xh-toolbar">
    <form role="search" onSubmit={e => { e.preventDefault(); apply({ search }) }} style={{ display: "contents" }}>
      <input aria-label="Search" placeholder="Search resources" value={search} onChange={e => apply({ search: e.target.value })} className="xh-input" />
    </form>
    <select aria-label="XCategory" className="xh-input" value={category} onChange={e => apply({ category: e.target.value })}><option value="">All categories</option>{cats.map(c => <option value={c.slug} key={c.id}>{c.name}</option>)}</select>
    {!freeOnly ? <select aria-label="Access" className="xh-input" value={access} onChange={e => apply({ access: e.target.value })}><option value="">All access</option><option value="free">Free</option><option value="premium">Premium</option></select> : <input className="xh-input" value="Free resources only" disabled aria-label="Filter" style={{ opacity: .7 }} />}
    <select aria-label="Sort" className="xh-input" value={sort} onChange={e => apply({ sort: e.target.value })}><option value="date">Newest</option><option value="popularity">Popular</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
  </div>
}
XhFilterBar.displayName = "XhFilterBar"
addPropertyControls(XhFilterBar, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  freeOnly: { type: ControlType.Boolean, title: "Free resources only", defaultValue: false },
})

/* --------------------------- XProduct Grid --------------------------- */

export function XhProductGrid({ wpBaseUrl, columns = 3, access = "all", perPage = 9, pagination = true, emptyTitle = "", emptyBody = "" }: { wpBaseUrl?: string; columns?: number; access?: string; perPage?: number; pagination?: boolean; emptyTitle?: string; emptyBody?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const [page, setPage] = React.useState(1)
  const [urlParams] = xUseUrl()
  const search = xParam("search")
  const categorySlug = xParam("category")
  const accessFilter = xParam("access") || ""
  React.useEffect(() => setPage(1), [urlParams])
  const { data: cats } = xUseCategories(base)
  const catSlug = categorySlug
  const catId = catSlug ? (Array.isArray(cats) ? cats.find(c => c.slug === catSlug)?.id : undefined) : undefined
  const sort = xParam("sort") || "date"
  const { data, state, retry } = xUseProducts(base, { search, categories: catId, orderby: sort.startsWith("xPrice") ? "xPrice" : sort === "popularity" ? "popularity" : "date", order: sort === "price_asc" ? "asc" : "desc", per_page: perPage, page })
  const shown = React.useMemo(() => {
    let list = Array.isArray(data) ? data : []
    if (catId) list = list.filter(p => (p.categories || []).some(c => c.id === catId))
    const target = access === "free" ? "free" : access === "premium" ? "premium" : accessFilter || "all"
    if (target === "free") return list.filter(xFree)
    if (target === "premium") return list.filter(p => !xFree(p))
    if (sort === "price_asc") return [...list].sort((a, b) => Number(a.prices?.xPrice || 0) - Number(b.prices?.xPrice || 0))
    if (sort === "price_desc") return [...list].sort((a, b) => Number(b.prices?.xPrice || 0) - Number(a.prices?.xPrice || 0))
    return list
  }, [data, access, accessFilter, catId, sort])
  const count = Math.max(columns, 2)
  if (state === "loading") return <div className="xh"><StateView mode="loading" title="Loading resources" body="Fetching products from the public WooCommerce Store API." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="Products unavailable" body="The public WooCommerce Store API could not be reached." onRetry={retry} actionLabel="Retry" /></div>
  if (!shown.length) return <div className="xh"><StateView mode="empty" title={emptyTitle || (access === "free" ? "No free resources found" : "No products found")} body={emptyBody || "WooCommerce returned no matching resources."} actionLabel="Browse all resources" actionHref="/shop" /></div>
  return <div className="xh">
    <div className="xh-grid" style={{ ["--xh-cols" as any]: Math.min(count, 4) }}>{shown.map(p => <ProductCardView key={p.id} p={p} base={base} onAdd={undefined} />)}</div>
    {pagination ? <LoadRow page={page} onPrev={() => setPage(Math.max(1, page - 1))} onNext={() => setPage(page + 1)} /> : null}
  </div>
}
XhProductGrid.displayName = "XhProductGrid"
addPropertyControls(XhProductGrid, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  columns: { type: ControlType.Number, title: "Columns", defaultValue: 3, min: 2, max: 4, step: 1 },
  access: { type: ControlType.Enum, title: "Access", options: ["all", "free", "premium"], optionTitles: ["All", "Free only", "Premium only"], defaultValue: "all" },
  perPage: { type: ControlType.Number, title: "Products per page", defaultValue: 9, min: 3, max: 24, step: 3 },
  pagination: { type: ControlType.Boolean, title: "Show pagination", defaultValue: true },
  emptyTitle: { type: ControlType.String, title: "Empty state title", placeholder: "Default" },
  emptyBody: { type: ControlType.String, title: "Empty state body", placeholder: "Default" },
})

/* --------------------------- XProduct Card --------------------------- */

export function XhProductCard({ wpBaseUrl = XH_WP, slug = "", title = "" }: { wpBaseUrl?: string; slug?: string; title?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { data, state } = xUseProduct(base, slug || title)
  const product = (Array.isArray(data) ? data[0] : data) as XProduct | null
  if (state !== "ready" || !product) return <div className="xh"><StateView mode={state === "error" ? "error" : "loading"} title={state === "error" ? "XProduct unavailable" : "Loading product"} body="" /></div>
  return <div className="xh"><ProductCardView p={product} base={base} onAdd={undefined} /></div>
}
XhProductCard.displayName = "XhProductCard"
addPropertyControls(XhProductCard, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  slug: { type: ControlType.String, title: "XProduct slug", placeholder: "e.g. thesis-template" },
  title: { type: ControlType.String, title: "Fallback title (placeholder)", defaultValue: "" },
})

/* --------------------------- XCategory Grid --------------------------- */

export function XhCategoryGrid({ wpBaseUrl, columns = 4, hidden = true }: { wpBaseUrl?: string; columns?: number; hidden?: boolean }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { data, state, retry } = xUseCategories(base)
  const shown = (Array.isArray(data) ? data : []).filter(c => !hidden || c.name?.toLowerCase() !== "uncategorized")
  if (state === "loading") return <div className="xh"><StateView mode="loading" title="Loading categories" body="Fetching WooCommerce product categories." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="Categories unavailable" body="The public WooCommerce category endpoint could not be reached." onRetry={retry} actionLabel="Retry" /></div>
  if (!shown.length) return <div className="xh"><StateView mode="empty" title="No categories found" body="WooCommerce returned no public product categories." actionLabel="View all resources" actionHref="/shop" /></div>
  return <div className="xh"><div className="xh-grid" style={{ ["--xh-cols" as any]: Math.max(Math.min(columns, 6), 1) }}>{shown.map(c => <CategoryCardView c={c} key={c.id} />)}</div></div>
}
XhCategoryGrid.displayName = "XhCategoryGrid"
addPropertyControls(XhCategoryGrid, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  columns: { type: ControlType.Number, title: "Columns", defaultValue: 4, min: 2, max: 6, step: 1 },
  hidden: { type: ControlType.Boolean, title: "Hide Uncategorized", defaultValue: true },
})

/* --------------------------- XCategory Card --------------------------- */

export function XhCategoryCard({ wpBaseUrl = XH_WP, slug = "", title = "" }: { wpBaseUrl?: string; slug?: string; title?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { data, state } = xUseCategories(base)
  const cat = (Array.isArray(data) ? data : []).find(c => c.slug === (slug || title)) || null
  if (state !== "ready") return <div className="xh"><StateView mode={state === "error" ? "error" : "loading"} title={state === "error" ? "Categories unavailable" : "Loading category"} body="" /></div>
  if (!cat) return <div className="xh"><StateView mode="empty" title="Category not found" body={`No public category matches "${slug || title}".`} /></div>
  return <div className="xh"><CategoryCardView c={cat} /></div>
}
XhCategoryCard.displayName = "XhCategoryCard"
addPropertyControls(XhCategoryCard, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  slug: { type: ControlType.String, title: "XCategory slug", placeholder: "e.g. templates" },
  title: { type: ControlType.String, title: "Fallback (placeholder)", defaultValue: "" },
})

/* ----------------------------- Blog Grid ----------------------------- */

export function XhBlogGrid({ wpBaseUrl, perPage = 9, loadMore = true }: { wpBaseUrl?: string; perPage?: number; loadMore?: boolean }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const [page, setPage] = React.useState(1)
  const { data, state, retry } = xUsePosts(base, perPage, page)
  if (state === "loading") return <div className="xh"><StateView mode="loading" title="Loading articles" body="Fetching WordPress posts." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="Posts unavailable" body="Verify the public WordPress posts endpoint." onRetry={retry} actionLabel="Retry" /></div>
  if (!data.length) return <div className="xh"><StateView mode="empty" title="No posts found" body="WordPress returned no published posts." actionLabel="Go to store" actionHref="/shop" /></div>
  return <div className="xh">
    <div className="xh-grid" style={{ ["--xh-cols" as any]: 3 }}>{data.map(p => <BlogCardView p={p} key={p.id} />)}</div>
    {loadMore ? <div className="xh-load-row"><Btn variant="secondary" onClick={() => setPage(page + 1)}>Load more articles</Btn></div> : null}
  </div>
}
XhBlogGrid.displayName = "XhBlogGrid"
addPropertyControls(XhBlogGrid, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  perPage: { type: ControlType.Number, title: "Posts per page", defaultValue: 9, min: 3, max: 18, step: 3 },
  loadMore: { type: ControlType.Boolean, title: "Load more button", defaultValue: true },
})

/* ----------------------------- Blog Card ----------------------------- */

export function XhBlogCard({ wpBaseUrl = XH_WP, slug = "", title = "" }: { wpBaseUrl?: string; slug?: string; title?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { data, state } = xUsePost(base, slug || title)
  const post = (Array.isArray(data) ? data[0] : null) as XPost | null
  if (state !== "ready") return <div className="xh"><StateView mode={state === "error" ? "error" : "loading"} title={state === "error" ? "XPost unavailable" : "Loading post"} body="" /></div>
  if (!post) return <div className="xh"><StateView mode="empty" title="Post not found" body={`No published post matches "${slug || title}".`} /></div>
  return <div className="xh"><BlogCardView p={post} /></div>
}
XhBlogCard.displayName = "XhBlogCard"
addPropertyControls(XhBlogCard, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  slug: { type: ControlType.String, title: "XPost slug", placeholder: "e.g. hello-world" },
  title: { type: ControlType.String, title: "Fallback (placeholder)", defaultValue: "" },
})

/* ----------------------------- Cart Button ----------------------------- */

export function XhCartButton({ wpBaseUrl = XH_WP, label = "Cart", href = "/cart" }: { wpBaseUrl?: string; label?: string; href?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { state } = xUseCart(base)
  const count = state.status === "ready" || state.status === "mutating" ? state.items_count : 0
  return <div className="xh"><XA href={href} className="xh-mini xh-mini--primary" aria-label={`Cart, ${count} items`}>{label}{count > 0 ? <span className="xh-count">{count}</span> : null}</XA></div>
}
XhCartButton.displayName = "XhCartButton"
addPropertyControls(XhCartButton, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  label: { type: ControlType.String, title: "Label", defaultValue: "Cart" },
  href: { type: ControlType.String, title: "Link", defaultValue: "/cart" },
})

/* -------------------------------- Cart -------------------------------- */

export function XhCart({ wpBaseUrl = XH_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { state, updateItem, removeItem } = xUseCart(base)
  if (state.status === "idle" || state.status === "loading" || state.status === "mutating") return <div className="xh"><StateView mode="loading" title="Loading cart" body="Fetching your WooCommerce Store API cart session." /></div>
  if (state.status === "error") return <div className="xh"><StateView mode="error" title="Cart session unavailable" body="Open the native WooCommerce cart to review and manage your selected resources." actionLabel="Open cart on WooCommerce" actionHref={`${base}/cart/`} /></div>
  const items = state.items || []
  if (!items.length) return <div className="xh"><StateView mode="empty" title="No resources in cart" body="Cart state is read from the WooCommerce Store API, not mocked in Framer." actionLabel="Browse resources" actionHref="/shop" /></div>
  const total = state.totals ? xMoney(state.totals.total_price, state.totals) : ""
  return <div className="xh">
    <div className="xh-cart-list">{items.map(item => <div className="xh-cart-item" key={item.key}>
      {item.images?.[0]?.thumbnail || item.images?.[0]?.src ? <img src={item.images[0].thumbnail || item.images[0].src} alt={item.images[0].alt || item.name} /> : <div style={{ width: 72, height: 72, borderRadius: 7, background: "var(--xh-soft)", border: "1px solid var(--xh-border)" }} />}
      <div style={{ display: "grid", gap: 4 }}><b style={{ color: "var(--xh-dark)" }}>{item.permalink ? <XA href={item.permalink}>{item.name}</XA> : item.name}</b><p className="xh-muted" style={{ margin: 0, fontSize: 13 }}>{xClean(item.short_description || "").slice(0, 90)}</p></div>
      <span className="xh-muted" style={{ fontSize: 14 }}>Qty {item.quantity}</span>
      <b style={{ color: "var(--xh-dark)", whiteSpace: "nowrap" }}>{xMoney(item.totals?.line_total || item.prices?.xPrice || "0", item.prices as any)}</b>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn variant="ghost" size="sm" onClick={() => updateItem(item.key, Math.max(1, item.quantity - 1))}>−</Btn>
        <Btn variant="ghost" size="sm" onClick={() => updateItem(item.key, item.quantity + 1)}>+</Btn>
        <Btn variant="ghost" size="sm" onClick={() => removeItem(item.key)}>Remove</Btn>
      </div>
    </div>)}</div>
    <div className="xh-cart-summary"><b style={{ color: "var(--xh-dark)" }}>Subtotal</b><strong style={{ color: "var(--xh-dark)" }}>{total}</strong><Btn href="/checkout" variant="primary">Checkout</Btn><Btn href={state.permalink || `${base}/cart/`} variant="secondary">Continue on WooCommerce</Btn></div>
  </div>
}
XhCart.displayName = "XhCart"
addPropertyControls(XhCart, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
})

/* ------------------------------ Checkout ------------------------------ */

export function XhCheckout({ wpBaseUrl = XH_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const { state, refresh } = xUseCart(base)
  const [form, setForm] = React.useState({ first_name: "", last_name: "", company: "", address_1: "", address_2: "", city: "", postcode: "", country: "US", state: "", email: "", phone: "" })
  const [pm, setPm] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<null | { ok: boolean; order_id?: number; message?: string }>(null)
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })
  const place = async () => {
    if (!form.email || !form.first_name || !form.address_1 || !form.city || !form.postcode) { setResult({ ok: false, message: "Please complete the required billing fields (name, email, address, city, postcode)." }); return }
    setBusy(true); setResult(null)
    try {
      const res = await xStoreFetch(base, "/wp-json/wc/store/v1/checkout", { cache: "no-store", credentials: "include", method: "POST", headers: { "Content-Type": "application/json", ...((xCartS?.base === base && xCartS.nonce) || xReadN() ? { "Nonce": (xCartS?.base === base && xCartS.nonce) || xReadN(), "X-WC-Store-API-Nonce": (xCartS?.base === base && xCartS.nonce) || xReadN() } : {}) }, body: JSON.stringify({ billing_address: form, payment_method: pm || undefined }) })
      const j = await res.json()
      if (res.ok && j.order_id) { setResult({ ok: true, order_id: j.order_id }); xCartS && (xCartS.state = { status: "ready", items: [], items_count: 0, totals: j.totals as any }); xEmit(xCartS.state); refresh() }
      else setResult({ ok: false, message: j?.message || (String(j?.code || "").toLowerCase().includes("nonce") ? "Secure checkout session is not available yet." : "Checkout could not be completed.") })
    } catch (e: any) { setResult({ ok: false, message: (e && e.message) || "Network error during checkout." }) }
    setBusy(false)
  }
  if (result?.ok) return <div className="xh"><StateView mode="empty" title={`Thanks — order #${result.order_id} confirmed`} body="Continue on the WooCommerce order page to complete payment and access your downloads." actionLabel="View order on WooCommerce" actionHref={`${base}/my-account/orders/`} /></div>
  if (state.status === "error") return <div className="xh"><StateView mode="error" title="Checkout requires a cart session" body="Open the native WooCommerce checkout to finalize securely." actionLabel="Checkout on WooCommerce" actionHref={`${base}/checkout/`} /></div>
  if (!state.items?.length) return <div className="xh"><StateView mode="empty" title="Your cart is empty" body="Add resources to your cart before checking out." actionLabel="Browse resources" actionHref="/shop" /></div>
  const total = state.totals ? xMoney(state.totals.total_price, state.totals) : ""
  const field = (k: string, label: string, type = "text", required = true) => <input aria-label={label} placeholder={label} type={type} value={(form as any)[k]} onChange={set(k)} className="xh-input" required />
  return <div className="xh xh-checkout-grid">
    <div className="xh-form-card"><b style={{ display: "block", marginBottom: 4, color: "var(--xh-dark)" }}>Billing details</b>
      <div className="xh-form-row">{field("first_name", "First name")}{field("last_name", "Last name")}</div>
      <div className="xh-form-row">{field("email", "Email", "email")}{field("phone", "Phone", "tel", false)}</div>
      {field("address_1", "Street address")}{field("address_2", "Apartment, suite (optional)", "text", false)}
      <div className="xh-form-row">{field("city", "City")}{field("postcode", "Postcode / ZIP")}</div>
      <div className="xh-form-row"><input aria-label="Country" placeholder="Country code (e.g. US, PK)" value={form.country} onChange={set("country")} className="xh-input" /><input aria-label="State" placeholder="State (optional)" value={form.state} onChange={set("state")} className="xh-input" /></div>
      <p className="xh-form-note">You will be able to review, pay, and download securely on the WooCommerce order page.</p>
    </div>
    <div className="xh-form-card"><b style={{ display: "block", marginBottom: 4, color: "var(--xh-dark)" }}>Order summary</b>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--xh-border)" }}><span>Items</span><span>{state.items_count}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>Total</span><strong style={{ color: "var(--xh-dark)" }}>{total}</strong></div>
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <Btn onClick={place} variant="primary" size="lg" className={busy ? "" : ""}>{busy ? "Placing order…" : "Place order"}</Btn>
        <Btn href={state.permalink || `${base}/checkout/`} variant="secondary">Proceed on WooCommerce</Btn>
      </div>
      {result && !result.ok ? <p role="alert" className="xh-error-note">{result.message}</p> : null}
      <p className="xh-form-note">Payment methods and processing run on WooCommerce. No WooCommerce credentials are stored or exposed here.</p>
    </div>
  </div>
}
XhCheckout.displayName = "XhCheckout"
addPropertyControls(XhCheckout, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
})

/* ------------------------------- Auth Form ------------------------------- */

export function XhAuthForm({ wpBaseUrl = XH_WP, mode = "login", title = "", note = "" }: { wpBaseUrl?: string; mode?: any; title?: string; note?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const m = (mode as any) || "login"
  const isContact = m === "contact"
  return <div className="xh" style={{ maxWidth: 560 }}>
    <div className="xh-form-card">
      {title ? <b style={{ color: "var(--xh-dark)" }}>{title}</b> : null}
      <form action={`${base}/${isContact ? "contact" : "my-account"}/`} method={isContact ? "post" : "get"} style={{ display: "grid", gap: 12 }}>
        {isContact ? <>
          <input required aria-label="Your name" placeholder="Your name" className="xh-input" name="your-name" />
          <input required aria-label="Email" type="email" placeholder="Email" className="xh-input" name="your-email" />
          <textarea aria-label="Message" placeholder="Message" rows={5} className="xh-input" style={{ minHeight: 120, resize: "vertical", fontFamily: "inherit" }} name="your-message" />
          <ButtonView text={m === "contact" ? "Send message" : "Submit"} />
        </> : m === "register" ? <>
          <input required aria-label="Email address" type="email" placeholder="Email address" className="xh-input" name="email" />
          <input required aria-label="Password" type="password" placeholder="Password" className="xh-input" name="password" />
          <ButtonView text="Create account" href={`${base}/my-account/`} external />
        </> : <>
          <input required aria-label="Email or username" placeholder="Email or username" className="xh-input" name="log" />
          <input required aria-label="Password" type="password" placeholder="Password" className="xh-input" name="pwd" />
          <ButtonView text="Sign in securely" href={`${base}/my-account/`} external />
          <a href={`${base}/my-account/lost-password/`} style={{ color: "var(--xh-primary)", fontWeight: 600, textDecoration: "underline" }}>Lost password?</a>
        </>}
      </form>
      <p className="xh-form-note">{note}</p>
    </div>
  </div>
}
XhAuthForm.displayName = "XhAuthForm"
addPropertyControls(XhAuthForm, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
  mode: { type: ControlType.Enum, title: "Mode", options: ["login", "register", "contact"], optionTitles: ["Login", "Register", "Contact"], defaultValue: "login" },
  title: { type: ControlType.String, title: "Title", defaultValue: "" },
  note: { type: ControlType.String, title: "Note", defaultValue: "" },
})

function ButtonView({ text, href, external }: { text: string; href?: string; external?: boolean }) {
  return <Btn href={href || undefined} variant="primary" size="lg" external={!!external}>{text}</Btn>
}

/* --------------------------- XProduct Detail --------------------------- */

export function XhProductDetail({ wpBaseUrl = XH_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const slug = xParam("slug") || xPathSlug(XH_PROD)
  const [slugResolved, setSlugResolved] = React.useState(false)
  React.useEffect(() => { setSlugResolved(true) }, [])
  const { data, state, retry } = xUseProduct(base, slug)
  const product = (Array.isArray(data) ? data[0] : null) as XProduct | null
  const cart = xUseCart(base)
  const [addedKey, setAddedKey] = React.useState("")
  const [addErr, setAddErr] = React.useState("")
  xUseSeo(product ? { title: `${xClean(product.name)} — Xhunta`, description: xClean(product.short_description || product.description || "").slice(0, 160) } : null)
  if (state === "loading" || !slugResolved) return <div className="xh"><StateView mode="loading" title="Loading product" body="Fetching the real WooCommerce product by slug." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="XProduct unavailable" body="The requested product could not be loaded from WooCommerce." actionLabel="Back to store" actionHref="/shop" /></div>
  if (!product) return <div className="xh"><StateView mode="empty" title="XProduct not found" body="No WooCommerce product matches this slug." actionLabel="Back to store" actionHref="/shop" /></div>
  const add = async () => {
    if (cart.state.status === "error") { setAddErr((cart.state.error || "Cart session unavailable") + " — use the WooCommerce product page to purchase."); return }
    setAddErr(""); setAddedKey("")
    const r = await cart.addItem(product.id)
    if (r.ok) setAddedKey(String(product.id))
    else setAddErr((r.error || "Could not add to cart") + (String(r.error || "").toLowerCase().includes("nonce") ? " — secure cart session is not available yet." : ""))
  }
  const canAdd = product.is_purchasable !== false
  const relatedCat = product.categories?.[0]
  const free = xFree(product)
  return <div className="xh">
    <div className="xh-detail">
      <div className="xh-gallery">{product.images?.length ? product.images.map(img => <img key={img.src} loading="lazy" src={img.src} alt={img.alt || product.name} className="xh-detail-img" />) : <div className="xh-detail-img">Product image</div>}</div>
      <div style={{ display: "grid", gap: 0, alignContent: "start" }}>
        <p className="xh-eyebrow">{product.categories?.[0]?.name || "Digital Resource"} · Product ID {product.id}</p>
        <h1 className="xh-title-h1">{product.name}</h1>
        <p className="xh-lead">{xClean(product.short_description || product.summary || product.description || "").slice(0, 320)}</p>
        <div className="xh-detail-facts">
          <b className="xh-xPrice">{free ? "Free" : xPrice(product)}</b>
          <BadgeView label={free ? "Free" : "Premium"} variant={free ? "free" : "premium"} />
          <span className="xh-muted">{product.is_in_stock === true ? "In stock" : product.is_in_stock === false ? "Out of stock" : free ? "Instant download" : "Digital delivery"}</span>
          {product.review_count ? <span className="xh-muted">{product.average_rating} rating · {product.review_count} reviews</span> : null}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {free ? <Btn href={product.permalink || product.add_to_cart?.url || "/shop"} variant="primary" size="lg">{`View / Download`}</Btn>
            : canAdd ? (addedKey ? <Btn href="/cart" variant="primary" size="lg">Added to cart — View cart</Btn> : <Btn onClick={add} variant="primary" size="lg">{cart.state.status === "mutating" ? "Adding…" : "Add to cart"}</Btn>) : null}
          {!free ? <Btn href={product.permalink || product.add_to_cart?.url || "/shop"} variant="secondary" size="lg">{canAdd ? "Buy on WooCommerce" : "View on WooCommerce"}</Btn> : null}
          <Btn href="/shop" variant="secondary" size="lg">Back to Store</Btn>
        </div>
        {addErr ? <p role="alert" className="xh-error-note" style={{ marginTop: 12 }}>{addErr}</p> : null}
        <div className="xh-panel" style={{ marginTop: 22 }}>
          <b style={{ color: "var(--xh-dark)" }}>Resource information</b>
          {product.sku ? <p style={{ margin: "4px 0" }}>SKU: {product.sku}</p> : null}
          <p>{xClean(product.description || product.short_description || "") || "No description provided by WooCommerce."}</p>
          {free ? <p className="xh-form-note" style={{ background: "var(--xh-soft)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--xh-border)" }}>This is a free digital resource. The download link is provided on the product page at Xhunta.</p> : <p className="xh-form-note" style={{ background: "var(--xh-soft)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--xh-border)" }}>Premium resource. After checkout, the download becomes available through your WooCommerce account on Xhunta.</p>}
          {(product.attributes || []).length ? <div className="xh-attr-grid">{(product.attributes || []).map(a => <span key={a.name}>{a.name}: {(a.terms || []).map(t => t.name).join(", ")}</span>)}</div> : null}
        </div>
      </div>
    </div>
    <RelatedProducts base={base} categoryId={relatedCat?.id} onRetry={retry} />
  </div>
}
XhProductDetail.displayName = "XhProductDetail"
addPropertyControls(XhProductDetail, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
})

function RelatedProducts({ base, categoryId, onRetry }: { base: string; categoryId?: number; onRetry: () => void }) {
  const { data, state } = xUseApi<XProduct[]>(base, `/wp-json/wc/store/v1/products?per_page=3${categoryId ? `&categories=${categoryId}` : ""}`, [])
  if (state !== "ready" || !data.length) return null
  return <><SectionHeadView eyebrow="" title="Related resources" body="More resources in the same category." /><div className="xh-grid" style={{ ["--xh-cols" as any]: 3 }}>{data.map(p => <ProductCardView key={p.id} p={p} base={base} onAdd={undefined} />)}</div></>
}

/* ------------------------------ Blog XPost ------------------------------ */

export function XhPostDetail({ wpBaseUrl = XH_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || XH_WP
  const slug = xParam("slug") || xPathSlug(XH_BLOG)
  const { data, state, retry } = xUsePost(base, slug)
  const post = (Array.isArray(data) ? data[0] : null) as XPost | null
  xUseSeo(post ? { title: `${xClean(post.title.rendered)} — Xhunta` } : null)
  if (slug && !post && state === "ready") return <div className="xh"><StateView mode="empty" title="Post not found" body="No published WordPress post matches this slug." actionLabel="Back to blog" actionHref="/blog" /></div>
  if (state === "loading") return <div className="xh"><StateView mode="loading" title="Loading article" body="Fetching WordPress post." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="XPost unavailable" body="The requested article could not be loaded." onRetry={retry} actionLabel="Retry" /></div>
  if (!post) return null
  const image = xPostImg(post)
  const cat = xPostCat(post)
  return <div className="xh">
    <article className="xh-article">
      {image?.source_url ? <img src={image.source_url} alt={image.alt_text || xClean(post.title.rendered)} className="hero" /> : null}
      <p className="xh-eyebrow">{cat ? cat.name : "Article"}</p>
      <h1 className="xh-title-h1">{xClean(post.title.rendered)}</h1>
      <time dateTime={post.date} className="xh-muted">{new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
      <div className="xh-prose" style={{ marginTop: 18 }} dangerouslySetInnerHTML={{ __html: post.content?.rendered || post.excerpt.rendered }} />
      <div style={{ marginTop: 22 }}><Btn href="/blog" variant="secondary">Back to blog</Btn></div>
    </article>
    <RelatedPostsView base={base} catId={cat?.id} excludeId={post.id} />
  </div>
}
XhPostDetail.displayName = "XhPostDetail"
addPropertyControls(XhPostDetail, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: XH_WP },
})

function RelatedPostsView({ base, catId, excludeId }: { base: string; catId?: number; excludeId?: number }) {
  const { data, state } = xUseRelated(base, catId, excludeId)
  if (state !== "ready" || !data.length) return null
  return <><SectionHeadView eyebrow="" title="Related posts" body="More articles from the Xhunta blog." /><div className="xh-grid" style={{ ["--xh-cols" as any]: 3 }}>{data.map(p => <BlogCardView p={p} key={p.id} />)}</div></>
}
