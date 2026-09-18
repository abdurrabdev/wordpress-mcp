import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/* ------------------------------------------------------------------ *
 *  XHUNTA — component library + centralized data layer
 *  Architecture: Framer pages -> native sections -> reusable code
 *  components -> centralized API/data layer -> WordPress/WooCommerce.
 *  The monolithic XhuntaMarketplace.tsx continues to work until every
 *  page is migrated and verified. This file is its replacement.
 * ------------------------------------------------------------------ */

/* ============================ TYPES ============================ */

export type Product = { id: number; name: string; slug: string; summary?: string; short_description?: string; description?: string; price_html?: string; on_sale?: boolean; average_rating?: string; rating_count?: number; review_count?: number; is_purchasable?: boolean; is_in_stock?: boolean; is_on_backorder?: boolean; type?: string; sku?: string; add_to_cart?: { url?: string; text?: string; description?: string }; prices?: { price: string; regular_price?: string; sale_price?: string; currency_code: string; currency_symbol: string; currency_minor_unit?: number; currency_decimal_separator?: string; currency_thousand_separator?: string; currency_prefix?: string; currency_suffix?: string }; images?: { id?: number; src: string; thumbnail?: string; alt?: string; name?: string }[]; categories?: { id: number; name: string; slug: string; link?: string }[]; attributes?: { id?: number; name: string; taxonomy?: string; terms?: { id?: number; name: string; slug?: string }[] }[]; permalink?: string }
export type Category = { id: number; name: string; slug: string; description?: string; count?: number; image?: { src: string; thumbnail?: string; alt?: string }; parent?: number }
export type Post = { id: number; slug: string; link: string; date: string; title: { rendered: string }; excerpt: { rendered: string }; content?: { rendered: string }; categories?: number[]; _embedded?: any }

export type CartItem = { key: string; id: number; name: string; quantity: number; short_description?: string; permalink?: string; prices?: { price: string; currency_prefix?: string; currency_symbol?: string; currency_minor_unit?: number; currency_suffix?: string }; totals?: { line_total: string }; images?: { thumbnail?: string; src?: string; alt?: string }[] }
export type CartTotals = { total_items: string; total_fees: string; total_discount: string; total_shipping: string | null; total_tax: string; total_price: string; currency_code: string; currency_symbol: string; currency_minor_unit: number; currency_prefix: string; currency_suffix: string }
export type CartState = { status: "idle" | "loading" | "ready" | "mutating" | "error"; error?: string; items: CartItem[]; items_count: number; totals?: CartTotals; permalink?: string }

/* ===================== CENTRALIZED DATA LAYER ===================== */

export const P = { primary: "#2563EB", dark: "#111827", text: "#374151", muted: "#6B7280", bg: "#FFFFFF", soft: "#F8FAFC", border: "#E5E7EB", good: "#166534", goodBg: "#DCFCE7", blueBg: "#DBEAFE" }
export const DEFAULT_WP = "https://xhunta.com"
export const PRODUCT_BASE = "/product"
export const BLOG_POST_BASE = "/blog-post"

export const clean = (html = "") => String(html || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, "\u201c").replace(/&#8221;/g, "\u201d").replace(/\s+/g, " ").trim()
export const apiUrl = (base: string, path: string) => `${base.replace(/\/$/, "")}${path}`
export const isFree = (p?: Product | null) => !!(p && (p.attributes || []).some(a => (a.name || "").toLowerCase() === "access" && (a.terms || []).some(t => (t.name || "").toLowerCase() === "free")))
export const getAccess = (p?: Product | null) => (p && isFree(p) ? "Free" : "Premium")
export const price = (p?: Product | null) => {
  if (!p?.prices) return ""
  const minor = p.prices.currency_minor_unit ?? 0
  const amount = Number(p.prices.price || 0) / Math.pow(10, minor)
  return `${p.prices.currency_prefix || p.prices.currency_symbol || ""}${amount.toLocaleString(undefined, { minimumFractionDigits: minor ? 2 : 0, maximumFractionDigits: minor ? 2 : 0 })}${p.prices.currency_suffix || ""}`.trim()
}
export const money = (amount: string | number, t?: { currency_prefix?: string; currency_symbol?: string; currency_minor_unit?: number; currency_suffix?: string }) => {
  const minor = t?.currency_minor_unit ?? 0
  const n = Number(amount || 0) / Math.pow(10, minor)
  const pre = t?.currency_prefix ?? t?.currency_symbol ?? ""
  return `${pre}${n.toLocaleString(undefined, { minimumFractionDigits: minor ? 2 : 0, maximumFractionDigits: minor ? 2 : 0 })}${t?.currency_suffix || ""}`.trim()
}
export const productHref = (p: Pick<Product, "slug">) => `${PRODUCT_BASE}?slug=${encodeURIComponent(p.slug)}`
export const postHref = (p: Pick<Post, "slug">) => `${BLOG_POST_BASE}?slug=${encodeURIComponent(p.slug)}`
export const shopHref = (extra = "") => `/shop${extra}`
export const currentParam = (key: string) => (typeof window === "undefined" ? "" : new URL(window.location.href).searchParams.get(key) || "")
export const currentPathSlug = (prefix: string) => {
  if (typeof window === "undefined") return ""
  const path = window.location.pathname.replace(/\/$/, "")
  const p2 = prefix.replace(/\/$/, "")
  return path.startsWith(p2 + "/") ? decodeURIComponent(path.slice(p2.length + 1)) : ""
}
export const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") s.set(k, String(v)) })
  return s.toString()
}
export const postCategory = (p?: Post | null): { id: number; name: string } | null => {
  if (!p) return null
  const terms = (((p._embedded?.["wp:term"] || [])[0] || []) as any[]).filter((t: any) => t?.taxonomy === "category")
  const c = terms[0]
  return c ? { id: c.id, name: c.name } : null
}
export const postImage = (p?: Post | null) => (p?._embedded?.["wp:featuredmedia"]?.[0] as any) || null

export const fetchJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store", credentials: "include" })
  if (!res.ok) throw new Error("HTTP " + res.status)
  return res.json()
}

export function useApi<T>(base: string, path: string, fallback: T) {
  const [data, setData] = React.useState<T>(fallback)
  const [state, setState] = React.useState<string>(base ? "loading" : "empty")
  const [reset, setReset] = React.useState(0)
  React.useEffect(() => {
    if (!base) { setState("empty"); return }
    let alive = true
    setState("loading")
    fetchJson<T>(apiUrl(base, path)).then(j => {
      if (alive) { setData(j); setState(Array.isArray(j) && j.length === 0 ? "empty" : "ready") }
    }).catch(() => alive && setState("error"))
    return () => { alive = false }
  }, [base, path, reset])
  const retry = React.useCallback(() => setReset(r => r + 1), [])
  return { data, state, retry } as { data: T; state: string; retry: () => void }
}

export function useProducts(base: string, params: Record<string, string | number | undefined> = {}) {
  return useApi<Product[]>(base, `/wp-json/wc/store/v1/products?${qs({ per_page: params.per_page || 9, page: params.page || 1, search: params.search, categories: params.categories, orderby: params.orderby, order: params.order })}`, [])
}
export function useProductBySlug(base: string, slug: string, fallback: Product | null = null) {
  return useApi<Product | null>(base, slug ? `/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}` : "", fallback)
}
export function useCategories(base: string) {
  return useApi<Category[]>(base, "/wp-json/wc/store/v1/products/categories?per_page=50&hide_empty=false", [])
}
export function useProductsByCategory(base: string, categoryIds: number[]) {
  return useApi<Product[]>(base, `/wp-json/wc/store/v1/products?per_page=20&categories=${categoryIds.join(",")}`, [])
}
export function usePosts(base: string, perPage = 9, page = 1) {
  return useApi<Post[]>(base, `/wp-json/wp/v2/posts?_embed=1&per_page=${perPage}&page=${page}`, [])
}
export function usePostBySlug(base: string, slug: string) {
  return useApi<Post[]>(base, slug ? `/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1` : "", [])
}
export function useRelatedPosts(base: string, catId?: number, excludeId?: number) {
  let path = "/wp-json/wp/v2/posts?_embed=1&per_page=3"
  if (catId) path += `&categories=${catId}`
  if (excludeId) path += `&exclude=${excludeId}`
  return useApi<Post[]>(base, path, [])
}

/* ---------------------- URL-aware hook / nav ---------------------- */

export function useUrlParams(): string {
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
export function navigateShop(params: Record<string, string | number | undefined>, replace = false) {
  if (typeof window === "undefined") return
  const target = `/shop?${qs(params)}`
  if (replace) window.history.replaceState({}, "", target)
  else window.history.pushState({}, "", target)
  window.dispatchEvent(new Event("xhunta:nav"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

/* --------------------------- SEO helper --------------------------- */

export function useSeo(t: { title?: string; description?: string; robots?: string } | null) {
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

const CART_STORAGE = "xhunta.cart.v1"
let cartSingleton: { base: string; nonce: string; state: CartState } | null = null
const cartListeners: Array<(s: CartState) => void> = []
function emitCart(s: CartState) { cartListeners.forEach(l => l(s)) }
function readCartNonce(): string { try { return JSON.parse(localStorage.getItem(CART_STORAGE) || "{}").nonce || "" } catch { return "" } }
function writeCartPersist(s: CartState, nonce: string) {
  try { localStorage.setItem(CART_STORAGE, JSON.stringify({ nonce, items_count: s.items_count, totals: s.totals })) } catch { /* private mode */ }
}
const storeFetch = (base: string, path: string, init?: RequestInit) => fetch(apiUrl(base, path), { cache: "no-store", credentials: "include", ...init })

async function cartLoad(base: string): Promise<CartState> {
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
  } catch (e: any) {
    return { status: "error", error: (e && e.message) || "Cart unavailable", items: [], items_count: 0 }
  }
}

const storeMutate = async (base: string, path: string, body: any): Promise<{ ok: boolean; error?: string; state?: CartState }> => {
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
  } catch (e: any) {
    return { ok: false, error: (e && e.message) || "Network error" }
  }
}

export function useCartStore(base: string) {
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
  const mutate = React.useCallback(async (path: string, body: any) => {
    if (cartSingleton?.base === base && cartSingleton.state.status !== "mutating") {
      cartSingleton.state = { ...cartSingleton.state, status: "mutating" }
      emitCart(cartSingleton.state)
    }
    const r = await storeMutate(base, path, body)
    if (r.ok && r.state) { cartSingleton!.state = r.state; setState(r.state); emitCart(r.state) }
    else if (!r.ok) { const errS: CartState = { status: "error", error: r.error, items: cartSingleton?.state.items || [], items_count: cartSingleton?.state.items_count || 0, totals: cartSingleton?.state.totals, permalink: cartSingleton?.state.permalink }; if (cartSingleton) { cartSingleton.state = errS } setState(errS); emitCart(errS) }
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
  ".xh-card-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px}.xh-price{font-size:17px;color:var(--xh-dark);font-weight:800}",
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

const A = (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...p} style={{ color: "inherit", textDecoration: "none", ...p.style }} />

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
  return <A href="/" className="xh-logo" aria-label="Xhunta home" style={{ color: dark ? "#fff" : undefined }}><mark>X</mark><span><b style={dark ? { color: "#fff" } : undefined}>Xhunta</b><small style={dark ? { color: "#CBD5E1" } : undefined}>Digital Projects &amp; Resources</small></span></A>
}

function ProductCardView({ p, base, onAdd }: { p: Product; base: string; onAdd?: (id: number) => void }) {
  const img = p.images?.[0]
  const label = p.categories?.[0]?.name || `ID ${p.id}`
  const summary = clean(p.short_description || p.summary || p.description || "").slice(0, 120)
  const free = isFree(p)
  return <article className="xh-card">
    <a className="xh-thumb" href={productHref(p)} style={{ display: "grid" }}>{img?.src ? <img loading="lazy" src={img.thumbnail || img.src} alt={img.alt || p.name} /> : <span>Resource</span>}</a>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><span className="xh-card-label">{label}</span><BadgeView label={free ? "Free" : "Premium"} variant={free ? "free" : "premium"} /></div>
    <h3 className="xh-card-title"><A href={productHref(p)}>{p.name}</A></h3>
    <p className="xh-card-text">{summary}</p>
    <div className="xh-card-foot">
      <b className="xh-price">{free ? "Free" : price(p) || p.price_html || ""}</b>
      {free ? <Btn href={productHref(p)} variant="dark" size="sm">View / Download</Btn>
        : p.is_purchasable !== false && onAdd ? <Btn onClick={() => onAdd(p.id)} variant="dark" size="sm">Add to cart</Btn>
          : <Btn href={productHref(p)} variant="dark" size="sm">View</Btn>}
    </div>
  </article>
}

function CategoryCardView({ c }: { c: Category }) {
  const href = shopHref(`?category=${encodeURIComponent(c.slug)}`)
  const img = c.image?.src
  return <A href={href} className="xh-cat-card">
    {img ? <img loading="lazy" src={c.image!.thumbnail || img} alt={c.image!.alt || c.name} /> : <span className="xh-cat-icon">{clean(c.name).slice(0, 1) || "?"}</span>}
    <b>{c.name}</b>
    {c.description ? <small style={{ color: "var(--xh-muted)" }}>{clean(c.description).slice(0, 95)}</small> : null}
    <em className="xh-cat-count">{c.count || 0} resources</em>
  </A>
}

function BlogCardView({ p }: { p: Post }) {
  const image = postImage(p)
  const cat = postCategory(p)
  const title = clean(p.title.rendered)
  return <article className="xh-blog-card">
    <A href={postHref(p)}>{image?.source_url ? <img loading="lazy" src={image.media_details?.sizes?.medium?.source_url || image.source_url} alt={image.alt_text || title} /> : <div className="xh-tile" aria-hidden><span>{title.slice(0, 1) || "B"}</span></div>}</A>
    <div className="xh-blog-meta"><p className="xh-eyebrow" style={{ margin: 0 }}>{cat ? cat.name : "Article"}</p><time dateTime={p.date} style={{ color: "var(--xh-muted)", fontSize: 13 }}>{new Date(p.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></div>
    <h3 className="xh-card-title"><A href={postHref(p)}>{title}</A></h3>
    <p className="xh-card-text">{clean(p.excerpt.rendered).slice(0, 130)}</p>
    <Btn href={postHref(p)} variant="dark" size="sm">Read article</Btn>
  </article>
}

function LoadRow({ onPrev, onNext, page }: { onPrev?: () => void; onNext?: () => void; page: number }) {
  return <div className="xh-load-row"><Btn variant="secondary" onClick={onPrev} disabled={page <= 1}>Previous</Btn><span className="xh-muted" style={{ fontSize: 14 }}>Page {page}</span><Btn variant="secondary" onClick={onNext}>Next</Btn></div>
}

/* ===================== CANVAS COMPONENTS ===================== */

/* ------------------------------ Header ------------------------------ */

export function XhHeader({ wpBaseUrl, navLinks = [], showSearch = true, showCart = true, showAccount = true, logoTitle }: { wpBaseUrl?: string; navLinks?: { label: string; href: string }[]; showSearch?: boolean; showCart?: boolean; showAccount?: boolean; logoTitle?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const { state } = useCartStore(base)
  const nav = (navLinks && navLinks.length ? navLinks : [["Store", "/shop"], ["Free Resources", "/free-resources"], ["Categories", "/categories"], ["Blog", "/blog"]].map(n => ({ label: n[0], href: n[1] })))
  const search = (e: React.FormEvent) => { e.preventDefault(); if (typeof window !== "undefined") window.location.href = shopHref(`?search=${encodeURIComponent(q)}`) }
  const count = state.status === "ready" || state.status === "mutating" ? state.items_count : 0
  return <header className="xh xh-header">
    <div className="xh-bar">
      <A href="/" className="xh-logo" aria-label="Xhunta home"><mark>X</mark><span><b>{logoTitle || "Xhunta"}</b><small>Digital Projects &amp; Resources</small></span></A>
      <nav className="xh-nav" aria-label="Primary">{nav.map(n => <A key={n.label} href={n.href} className="xh-navlink">{n.label}</A>)}</nav>
      {showSearch ? <form onSubmit={search} role="search" className="xh-search"><input aria-label="Search resources" value={q} onChange={e => setQ(e.target.value)} placeholder="Search resources" className="xh-input" /></form> : null}
      <div className="xh-actions">
        {showCart ? <A href="/cart" className="xh-mini" aria-label={`Cart, ${count} items`}>Cart{count > 0 ? <span className="xh-count">{count}</span> : null}</A> : null}
        {showAccount ? <A href="/my-account" className="xh-mini">Account</A> : null}
        <button className="xh-menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
      </div>
    </div>
    {open ? <nav className="xh-drawer" style={{ display: "grid" }} aria-label="Mobile" onClick={() => setOpen(false)}>{nav.map(n => <A key={n.label} href={n.href}>{n.label}</A>)}<A href="/cart">Cart</A><A href="/my-account">My Account</A><A href="/login">Login</A><A href="/register">Register</A></nav> : null}
  </header>
}
XhHeader.displayName = "XhHeader"
addPropertyControls(XhHeader, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
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
  return <nav className="xh" aria-label="Mobile"><div className="xh-drawer" style={{ display: "grid", padding: 0 }}>{nav.map(n => <A key={n.label} href={n.href}>{n.label}</A>)}<A href="/login">Login</A><A href="/register">Register</A></div></nav>
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
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}><LogoView dark /><p className="xh-muted" style={{ color: "#CBD5E1", margin: 0, lineHeight: 1.6 }}>A professional digital marketplace frontend powered by WordPress and WooCommerce as the source of truth.</p></div>
      {cols.map(c => <div key={c.title} style={{ display: "grid", gap: 2, alignContent: "start" }}><h3 className="xh-foot-title">{c.title}</h3>{c.links.map(l => <A key={l.label} href={l.href} className="xh-foot-link">{l.label}</A>)}</div>)}
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
  const base = wpBaseUrl || DEFAULT_WP
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
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
  const { data, state } = useCategories(base)
  const items = (Array.isArray(data) ? data : []).filter(c => c.name?.toLowerCase() !== "uncategorized").slice(0, 6)
  if (state !== "ready" || !items.length) return null
  return <div style={{ border: "1px solid var(--xh-border)", borderRadius: 8, background: "var(--xh-soft)", padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, boxShadow: "0 10px 30px rgba(17,24,39,.06)" }}>
    {items.map(c => <A key={c.id} href={shopHref(`?category=${encodeURIComponent(c.slug)}`)} style={{ background: "#fff", border: "1px solid var(--xh-border)", borderRadius: 8, padding: 14, display: "grid", gap: 4, color: "var(--xh-dark)" }}><b>{c.name}</b><small style={{ color: "var(--xh-muted)" }}>{c.count || 0} resources</small></A>)}
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
  const [q, setQ] = React.useState(currentParam("search"))
  const [urlParams] = useUrlParams()
  React.useEffect(() => setQ(currentParam("search")), [urlParams])
  const submit = (e: React.FormEvent) => { e.preventDefault(); navigateShop({ search: q, category: currentParam("category") || "", access: currentParam("access") || "", sort: currentParam("sort") || "date" }) }
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
  const base = wpBaseUrl || DEFAULT_WP
  const { data } = useCategories(base)
  const cats = (Array.isArray(data) ? data : []).filter(c => c.name?.toLowerCase() !== "uncategorized")
  const [urlParams] = useUrlParams()
  const search = currentParam("search")
  const category = currentParam("category")
  const access = freeOnly ? "free" : currentParam("access")
  const sort = currentParam("sort") || "date"
  const apply = (patch: Record<string, string>) => navigateShop({ search, category, access, sort, ...patch }, true)
  return <div className="xh xh-toolbar">
    <form role="search" onSubmit={e => { e.preventDefault(); apply({ search }) }} style={{ display: "contents" }}>
      <input aria-label="Search" placeholder="Search resources" value={search} onChange={e => apply({ search: e.target.value })} className="xh-input" />
    </form>
    <select aria-label="Category" className="xh-input" value={category} onChange={e => apply({ category: e.target.value })}><option value="">All categories</option>{cats.map(c => <option value={c.slug} key={c.id}>{c.name}</option>)}</select>
    {!freeOnly ? <select aria-label="Access" className="xh-input" value={access} onChange={e => apply({ access: e.target.value })}><option value="">All access</option><option value="free">Free</option><option value="premium">Premium</option></select> : <input className="xh-input" value="Free resources only" disabled aria-label="Filter" style={{ opacity: .7 }} />}
    <select aria-label="Sort" className="xh-input" value={sort} onChange={e => apply({ sort: e.target.value })}><option value="date">Newest</option><option value="popularity">Popular</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
  </div>
}
XhFilterBar.displayName = "XhFilterBar"
addPropertyControls(XhFilterBar, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  freeOnly: { type: ControlType.Boolean, title: "Free resources only", defaultValue: false },
})

/* --------------------------- Product Grid --------------------------- */

export function XhProductGrid({ wpBaseUrl, columns = 3, access = "all", perPage = 9, pagination = true, emptyTitle = "", emptyBody = "" }: { wpBaseUrl?: string; columns?: number; access?: string; perPage?: number; pagination?: boolean; emptyTitle?: string; emptyBody?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const [page, setPage] = React.useState(1)
  const [urlParams] = useUrlParams()
  const search = currentParam("search")
  const categorySlug = currentParam("category")
  const accessFilter = currentParam("access") || ""
  React.useEffect(() => setPage(1), [urlParams])
  const { data: cats } = useCategories(base)
  const catSlug = categorySlug
  const catId = catSlug ? (Array.isArray(cats) ? cats.find(c => c.slug === catSlug)?.id : undefined) : undefined
  const sort = currentParam("sort") || "date"
  const { data, state, retry } = useProducts(base, { search, categories: catId, orderby: sort.startsWith("price") ? "price" : sort === "popularity" ? "popularity" : "date", order: sort === "price_asc" ? "asc" : "desc", per_page: perPage, page })
  const shown = React.useMemo(() => {
    let list = Array.isArray(data) ? data : []
    if (catId) list = list.filter(p => (p.categories || []).some(c => c.id === catId))
    const target = access === "free" ? "free" : access === "premium" ? "premium" : accessFilter || "all"
    if (target === "free") return list.filter(isFree)
    if (target === "premium") return list.filter(p => !isFree(p))
    if (sort === "price_asc") return [...list].sort((a, b) => Number(a.prices?.price || 0) - Number(b.prices?.price || 0))
    if (sort === "price_desc") return [...list].sort((a, b) => Number(b.prices?.price || 0) - Number(a.prices?.price || 0))
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  columns: { type: ControlType.Number, title: "Columns", defaultValue: 3, min: 2, max: 4, step: 1 },
  access: { type: ControlType.Enum, title: "Access", options: ["all", "free", "premium"], optionTitles: ["All", "Free only", "Premium only"], defaultValue: "all" },
  perPage: { type: ControlType.Number, title: "Products per page", defaultValue: 9, min: 3, max: 24, step: 3 },
  pagination: { type: ControlType.Boolean, title: "Show pagination", defaultValue: true },
  emptyTitle: { type: ControlType.String, title: "Empty state title", placeholder: "Default" },
  emptyBody: { type: ControlType.String, title: "Empty state body", placeholder: "Default" },
})

/* --------------------------- Product Card --------------------------- */

export function XhProductCard({ wpBaseUrl = DEFAULT_WP, slug = "", title = "" }: { wpBaseUrl?: string; slug?: string; title?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { data, state } = useProductBySlug(base, slug || title)
  const product = (Array.isArray(data) ? data[0] : data) as Product | null
  if (state !== "ready" || !product) return <div className="xh"><StateView mode={state === "error" ? "error" : "loading"} title={state === "error" ? "Product unavailable" : "Loading product"} body="" /></div>
  return <div className="xh"><ProductCardView p={product} base={base} onAdd={undefined} /></div>
}
XhProductCard.displayName = "XhProductCard"
addPropertyControls(XhProductCard, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  slug: { type: ControlType.String, title: "Product slug", placeholder: "e.g. thesis-template" },
  title: { type: ControlType.String, title: "Fallback title (placeholder)", defaultValue: "" },
})

/* --------------------------- Category Grid --------------------------- */

export function XhCategoryGrid({ wpBaseUrl, columns = 4, hidden = true }: { wpBaseUrl?: string; columns?: number; hidden?: boolean }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { data, state, retry } = useCategories(base)
  const shown = (Array.isArray(data) ? data : []).filter(c => !hidden || c.name?.toLowerCase() !== "uncategorized")
  if (state === "loading") return <div className="xh"><StateView mode="loading" title="Loading categories" body="Fetching WooCommerce product categories." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="Categories unavailable" body="The public WooCommerce category endpoint could not be reached." onRetry={retry} actionLabel="Retry" /></div>
  if (!shown.length) return <div className="xh"><StateView mode="empty" title="No categories found" body="WooCommerce returned no public product categories." actionLabel="View all resources" actionHref="/shop" /></div>
  return <div className="xh"><div className="xh-grid" style={{ ["--xh-cols" as any]: Math.max(Math.min(columns, 6), 1) }}>{shown.map(c => <CategoryCardView c={c} key={c.id} />)}</div></div>
}
XhCategoryGrid.displayName = "XhCategoryGrid"
addPropertyControls(XhCategoryGrid, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  columns: { type: ControlType.Number, title: "Columns", defaultValue: 4, min: 2, max: 6, step: 1 },
  hidden: { type: ControlType.Boolean, title: "Hide Uncategorized", defaultValue: true },
})

/* --------------------------- Category Card --------------------------- */

export function XhCategoryCard({ wpBaseUrl = DEFAULT_WP, slug = "", title = "" }: { wpBaseUrl?: string; slug?: string; title?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { data, state } = useCategories(base)
  const cat = (Array.isArray(data) ? data : []).find(c => c.slug === (slug || title)) || null
  if (state !== "ready") return <div className="xh"><StateView mode={state === "error" ? "error" : "loading"} title={state === "error" ? "Categories unavailable" : "Loading category"} body="" /></div>
  if (!cat) return <div className="xh"><StateView mode="empty" title="Category not found" body={`No public category matches "${slug || title}".`} /></div>
  return <div className="xh"><CategoryCardView c={cat} /></div>
}
XhCategoryCard.displayName = "XhCategoryCard"
addPropertyControls(XhCategoryCard, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  slug: { type: ControlType.String, title: "Category slug", placeholder: "e.g. templates" },
  title: { type: ControlType.String, title: "Fallback (placeholder)", defaultValue: "" },
})

/* ----------------------------- Blog Grid ----------------------------- */

export function XhBlogGrid({ wpBaseUrl, perPage = 9, loadMore = true }: { wpBaseUrl?: string; perPage?: number; loadMore?: boolean }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const [page, setPage] = React.useState(1)
  const { data, state, retry } = usePosts(base, perPage, page)
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  perPage: { type: ControlType.Number, title: "Posts per page", defaultValue: 9, min: 3, max: 18, step: 3 },
  loadMore: { type: ControlType.Boolean, title: "Load more button", defaultValue: true },
})

/* ----------------------------- Blog Card ----------------------------- */

export function XhBlogCard({ wpBaseUrl = DEFAULT_WP, slug = "", title = "" }: { wpBaseUrl?: string; slug?: string; title?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { data, state } = usePostBySlug(base, slug || title)
  const post = (Array.isArray(data) ? data[0] : null) as Post | null
  if (state !== "ready") return <div className="xh"><StateView mode={state === "error" ? "error" : "loading"} title={state === "error" ? "Post unavailable" : "Loading post"} body="" /></div>
  if (!post) return <div className="xh"><StateView mode="empty" title="Post not found" body={`No published post matches "${slug || title}".`} /></div>
  return <div className="xh"><BlogCardView p={post} /></div>
}
XhBlogCard.displayName = "XhBlogCard"
addPropertyControls(XhBlogCard, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  slug: { type: ControlType.String, title: "Post slug", placeholder: "e.g. hello-world" },
  title: { type: ControlType.String, title: "Fallback (placeholder)", defaultValue: "" },
})

/* ----------------------------- Cart Button ----------------------------- */

export function XhCartButton({ wpBaseUrl = DEFAULT_WP, label = "Cart", href = "/cart" }: { wpBaseUrl?: string; label?: string; href?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { state } = useCartStore(base)
  const count = state.status === "ready" || state.status === "mutating" ? state.items_count : 0
  return <div className="xh"><A href={href} className="xh-mini xh-mini--primary" aria-label={`Cart, ${count} items`}>{label}{count > 0 ? <span className="xh-count">{count}</span> : null}</A></div>
}
XhCartButton.displayName = "XhCartButton"
addPropertyControls(XhCartButton, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  label: { type: ControlType.String, title: "Label", defaultValue: "Cart" },
  href: { type: ControlType.String, title: "Link", defaultValue: "/cart" },
})

/* -------------------------------- Cart -------------------------------- */

export function XhCart({ wpBaseUrl = DEFAULT_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { state, updateItem, removeItem } = useCartStore(base)
  if (state.status === "idle" || state.status === "loading" || state.status === "mutating") return <div className="xh"><StateView mode="loading" title="Loading cart" body="Fetching your WooCommerce Store API cart session." /></div>
  if (state.status === "error") return <div className="xh"><StateView mode="error" title="Cart session unavailable" body="Open the native WooCommerce cart to review and manage your selected resources." actionLabel="Open cart on WooCommerce" actionHref={`${base}/cart/`} /></div>
  const items = state.items || []
  if (!items.length) return <div className="xh"><StateView mode="empty" title="No resources in cart" body="Cart state is read from the WooCommerce Store API, not mocked in Framer." actionLabel="Browse resources" actionHref="/shop" /></div>
  const total = state.totals ? money(state.totals.total_price, state.totals) : ""
  return <div className="xh">
    <div className="xh-cart-list">{items.map(item => <div className="xh-cart-item" key={item.key}>
      {item.images?.[0]?.thumbnail || item.images?.[0]?.src ? <img src={item.images[0].thumbnail || item.images[0].src} alt={item.images[0].alt || item.name} /> : <div style={{ width: 72, height: 72, borderRadius: 7, background: "var(--xh-soft)", border: "1px solid var(--xh-border)" }} />}
      <div style={{ display: "grid", gap: 4 }}><b style={{ color: "var(--xh-dark)" }}>{item.permalink ? <A href={item.permalink}>{item.name}</A> : item.name}</b><p className="xh-muted" style={{ margin: 0, fontSize: 13 }}>{clean(item.short_description || "").slice(0, 90)}</p></div>
      <span className="xh-muted" style={{ fontSize: 14 }}>Qty {item.quantity}</span>
      <b style={{ color: "var(--xh-dark)", whiteSpace: "nowrap" }}>{money(item.totals?.line_total || item.prices?.price || "0", item.prices as any)}</b>
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
})

/* ------------------------------ Checkout ------------------------------ */

export function XhCheckout({ wpBaseUrl = DEFAULT_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const { state, refresh } = useCartStore(base)
  const [form, setForm] = React.useState({ first_name: "", last_name: "", company: "", address_1: "", address_2: "", city: "", postcode: "", country: "US", state: "", email: "", phone: "" })
  const [pm, setPm] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<null | { ok: boolean; order_id?: number; message?: string }>(null)
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })
  const place = async () => {
    if (!form.email || !form.first_name || !form.address_1 || !form.city || !form.postcode) { setResult({ ok: false, message: "Please complete the required billing fields (name, email, address, city, postcode)." }); return }
    setBusy(true); setResult(null)
    try {
      const res = await storeFetch(base, "/wp-json/wc/store/v1/checkout", { cache: "no-store", credentials: "include", method: "POST", headers: { "Content-Type": "application/json", ...((cartSingleton?.base === base && cartSingleton.nonce) || readCartNonce() ? { "Nonce": (cartSingleton?.base === base && cartSingleton.nonce) || readCartNonce(), "X-WC-Store-API-Nonce": (cartSingleton?.base === base && cartSingleton.nonce) || readCartNonce() } : {}) }, body: JSON.stringify({ billing_address: form, payment_method: pm || undefined }) })
      const j = await res.json()
      if (res.ok && j.order_id) { setResult({ ok: true, order_id: j.order_id }); cartSingleton && (cartSingleton.state = { status: "ready", items: [], items_count: 0, totals: j.totals as any }); emitCart(cartSingleton.state); refresh() }
      else setResult({ ok: false, message: j?.message || (String(j?.code || "").toLowerCase().includes("nonce") ? "Secure checkout session is not available yet." : "Checkout could not be completed.") })
    } catch (e: any) { setResult({ ok: false, message: (e && e.message) || "Network error during checkout." }) }
    setBusy(false)
  }
  if (result?.ok) return <div className="xh"><StateView mode="empty" title={`Thanks — order #${result.order_id} confirmed`} body="Continue on the WooCommerce order page to complete payment and access your downloads." actionLabel="View order on WooCommerce" actionHref={`${base}/my-account/orders/`} /></div>
  if (state.status === "error") return <div className="xh"><StateView mode="error" title="Checkout requires a cart session" body="Open the native WooCommerce checkout to finalize securely." actionLabel="Checkout on WooCommerce" actionHref={`${base}/checkout/`} /></div>
  if (!state.items?.length) return <div className="xh"><StateView mode="empty" title="Your cart is empty" body="Add resources to your cart before checking out." actionLabel="Browse resources" actionHref="/shop" /></div>
  const total = state.totals ? money(state.totals.total_price, state.totals) : ""
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
})

/* ------------------------------- Auth Form ------------------------------- */

export function XhAuthForm({ wpBaseUrl = DEFAULT_WP, mode = "login", title = "", note = "" }: { wpBaseUrl?: string; mode?: any; title?: string; note?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
  mode: { type: ControlType.Enum, title: "Mode", options: ["login", "register", "contact"], optionTitles: ["Login", "Register", "Contact"], defaultValue: "login" },
  title: { type: ControlType.String, title: "Title", defaultValue: "" },
  note: { type: ControlType.String, title: "Note", defaultValue: "" },
})

function ButtonView({ text, href, external }: { text: string; href?: string; external?: boolean }) {
  return <Btn href={href || undefined} variant="primary" size="lg" external={!!external}>{text}</Btn>
}

/* --------------------------- Product Detail --------------------------- */

export function XhProductDetail({ wpBaseUrl = DEFAULT_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const slug = currentParam("slug") || currentPathSlug(PRODUCT_BASE)
  const [slugResolved, setSlugResolved] = React.useState(false)
  React.useEffect(() => { setSlugResolved(true) }, [])
  const { data, state, retry } = useProductBySlug(base, slug)
  const product = (Array.isArray(data) ? data[0] : null) as Product | null
  const cart = useCartStore(base)
  const [addedKey, setAddedKey] = React.useState("")
  const [addErr, setAddErr] = React.useState("")
  useSeo(product ? { title: `${clean(product.name)} — Xhunta`, description: clean(product.short_description || product.description || "").slice(0, 160) } : null)
  if (state === "loading" || !slugResolved) return <div className="xh"><StateView mode="loading" title="Loading product" body="Fetching the real WooCommerce product by slug." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="Product unavailable" body="The requested product could not be loaded from WooCommerce." actionLabel="Back to store" actionHref="/shop" /></div>
  if (!product) return <div className="xh"><StateView mode="empty" title="Product not found" body="No WooCommerce product matches this slug." actionLabel="Back to store" actionHref="/shop" /></div>
  const add = async () => {
    if (cart.state.status === "error") { setAddErr((cart.state.error || "Cart session unavailable") + " — use the WooCommerce product page to purchase."); return }
    setAddErr(""); setAddedKey("")
    const r = await cart.addItem(product.id)
    if (r.ok) setAddedKey(String(product.id))
    else setAddErr((r.error || "Could not add to cart") + (String(r.error || "").toLowerCase().includes("nonce") ? " — secure cart session is not available yet." : ""))
  }
  const canAdd = product.is_purchasable !== false
  const relatedCat = product.categories?.[0]
  const free = isFree(product)
  return <div className="xh">
    <div className="xh-detail">
      <div className="xh-gallery">{product.images?.length ? product.images.map(img => <img key={img.src} loading="lazy" src={img.src} alt={img.alt || product.name} className="xh-detail-img" />) : <div className="xh-detail-img">Product image</div>}</div>
      <div style={{ display: "grid", gap: 0, alignContent: "start" }}>
        <p className="xh-eyebrow">{product.categories?.[0]?.name || "Digital Resource"} · Product ID {product.id}</p>
        <h1 className="xh-title-h1">{product.name}</h1>
        <p className="xh-lead">{clean(product.short_description || product.summary || product.description || "").slice(0, 320)}</p>
        <div className="xh-detail-facts">
          <b className="xh-price">{free ? "Free" : price(product)}</b>
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
          <p>{clean(product.description || product.short_description || "") || "No description provided by WooCommerce."}</p>
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
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
})

function RelatedProducts({ base, categoryId, onRetry }: { base: string; categoryId?: number; onRetry: () => void }) {
  const { data, state } = useApi<Product[]>(base, `/wp-json/wc/store/v1/products?per_page=3${categoryId ? `&categories=${categoryId}` : ""}`, [])
  if (state !== "ready" || !data.length) return null
  return <><SectionHeadView eyebrow="" title="Related resources" body="More resources in the same category." /><div className="xh-grid" style={{ ["--xh-cols" as any]: 3 }}>{data.map(p => <ProductCardView key={p.id} p={p} base={base} onAdd={undefined} />)}</div></>
}

/* ------------------------------ Blog Post ------------------------------ */

export function XhPostDetail({ wpBaseUrl = DEFAULT_WP }: { wpBaseUrl?: string }) {
  ensureStyles()
  const base = wpBaseUrl || DEFAULT_WP
  const slug = currentParam("slug") || currentPathSlug(BLOG_POST_BASE)
  const { data, state, retry } = usePostBySlug(base, slug)
  const post = (Array.isArray(data) ? data[0] : null) as Post | null
  useSeo(post ? { title: `${clean(post.title.rendered)} — Xhunta` } : null)
  if (slug && !post && state === "ready") return <div className="xh"><StateView mode="empty" title="Post not found" body="No published WordPress post matches this slug." actionLabel="Back to blog" actionHref="/blog" /></div>
  if (state === "loading") return <div className="xh"><StateView mode="loading" title="Loading article" body="Fetching WordPress post." /></div>
  if (state === "error") return <div className="xh"><StateView mode="error" title="Post unavailable" body="The requested article could not be loaded." onRetry={retry} actionLabel="Retry" /></div>
  if (!post) return null
  const image = postImage(post)
  const cat = postCategory(post)
  return <div className="xh">
    <article className="xh-article">
      {image?.source_url ? <img src={image.source_url} alt={image.alt_text || clean(post.title.rendered)} className="hero" /> : null}
      <p className="xh-eyebrow">{cat ? cat.name : "Article"}</p>
      <h1 className="xh-title-h1">{clean(post.title.rendered)}</h1>
      <time dateTime={post.date} className="xh-muted">{new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
      <div className="xh-prose" style={{ marginTop: 18 }} dangerouslySetInnerHTML={{ __html: post.content?.rendered || post.excerpt.rendered }} />
      <div style={{ marginTop: 22 }}><Btn href="/blog" variant="secondary">Back to blog</Btn></div>
    </article>
    <RelatedPostsView base={base} catId={cat?.id} excludeId={post.id} />
  </div>
}
XhPostDetail.displayName = "XhPostDetail"
addPropertyControls(XhPostDetail, {
  wpBaseUrl: { type: ControlType.String, title: "WP Base URL", defaultValue: DEFAULT_WP },
})

function RelatedPostsView({ base, catId, excludeId }: { base: string; catId?: number; excludeId?: number }) {
  const { data, state } = useRelatedPosts(base, catId, excludeId)
  if (state !== "ready" || !data.length) return null
  return <><SectionHeadView eyebrow="" title="Related posts" body="More articles from the Xhunta blog." /><div className="xh-grid" style={{ ["--xh-cols" as any]: 3 }}>{data.map(p => <BlogCardView p={p} key={p.id} />)}</div></>
}