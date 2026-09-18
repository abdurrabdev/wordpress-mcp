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