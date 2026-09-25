"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { MessageCircle, Search, ShoppingBag, Store, Package, User, X, ClipboardList } from "lucide-react";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { FairPriceGuide, ProductPhotoUpload } from "@/components/SellerListingControls";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VoiceNav from "@/components/VoiceNav";
import { LangProvider, useLang } from "@/lib/i18n";
import { VoiceAction } from "@/lib/voiceCommands";

type Product = {
  id: number; name: string; category: string; description: string; seller_name: string | null;
  price_inr: number; minimum_order_quantity: number; lead_time: string | null; image_url: string | null;
};
type Inquiry = {
  id: number; product_id: number; product_name: string; buyer_id: string; seller_id: string;
  quantity: number; message: string; status: string; seller_reply: string | null; created_at: string;
};
type ListingForm = {
  name: string; category: string; description: string; price: string; cost: string;
  hours: string; experience: string; quantity: string; minimum: string; leadTime: string; image: string;
};

const blankForm: ListingForm = { name: "", category: "Textiles", description: "", price: "", cost: "", hours: "", experience: "", quantity: "20", minimum: "5", leadTime: "", image: "" };

// Category icon grid data
const CATEGORY_ICONS = [
  { key: "catTextiles",  eng: "Textiles",           emoji: "🧵", bg: "#fde8e0" },
  { key: "catPottery",   eng: "Pottery & ceramics",  emoji: "🏺", bg: "#fde0e0" },
  { key: "catWoodwork",  eng: "Woodwork",             emoji: "🪵", bg: "#fdf3d0" },
  { key: "catJewellery", eng: "Jewellery",            emoji: "💍", bg: "#e8e0fd" },
  { key: "catHomeDecor", eng: "Home decor",           emoji: "🏡", bg: "#e0fde8" },
  { key: "catBaskets",   eng: "Baskets",              emoji: "🧺", bg: "#fde8f5" },
  { key: "catPaintings", eng: "Paintings",            emoji: "🎨", bg: "#e0ecfd" },
  { key: "catAll",       eng: "All crafts",           emoji: "⋯",  bg: "#e8e8e8" },
] as const;

// Featured artisans data
const FEATURED_ARTISANS = [
  { name: "Sita Devi",         craft: "Madhubani Paintings",    region: "Madhubani, Bihar",   price: 1200, icon: "🎨", color: "#f5e2cf", product: "Madhubani Story Panel" },
  { name: "Razia Khatri",      craft: "Ajrakh Block Print",     region: "Kutch, Gujarat",     price: 980,  icon: "🧵", color: "#ead9d5", product: "Ajrakh Cotton Table Runner" },
  { name: "Imran Khan",        craft: "Blue Pottery",           region: "Jaipur, Rajasthan",  price: 1450, icon: "🏺", color: "#dce9ef", product: "Blue Pottery Serving Bowl" },
  { name: "Lakshmi SHG",       craft: "Natural Fibre Weaving",  region: "Kerala",             price: 850,  icon: "🧺", color: "#eee1c9", product: "Handwoven Market Basket" },
  { name: "Ravi Kumar",        craft: "Teak Woodcarving",       region: "Saharanpur, UP",     price: 1750, icon: "🪵", color: "#ead7bd", product: "Carved Teak Desk Tray" },
];

function MarketplaceInner() {
  const { t } = useLang();
  const { isSignedIn, userId, getToken } = useAuth();
  const [tab, setTab] = useState<"discover" | "sell" | "inquiries" | "enquiry">("discover");
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [category, setCategory] = useState("All crafts"); // always English internally
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(blankForm);
  const [contact, setContact] = useState<Product | null>(null);
  const [contactQuantity, setContactQuantity] = useState("10");
  const [contactMessage, setContactMessage] = useState("");

  const api = useCallback(async (path: string, init: RequestInit = {}, authenticated = false) => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    if (authenticated) {
      const token = await getToken();
      if (!token) throw new Error(t("navSignIn"));
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(path, { ...init, headers });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.detail || "Something went wrong. Please try again.");
    return body;
  }, [getToken, t]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("q", search.trim());
      if (category !== "All crafts") query.set("category", category);
      setProducts(await api(`/api/products?${query.toString()}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("noticeLoadFail"));
    } finally {
      setLoading(false);
    }
  }, [api, category, search, t]);

  const loadInquiries = useCallback(async () => {
    if (!isSignedIn) return setInquiries([]);
    try { setInquiries(await api("/api/inquiries", {}, true)); }
    catch (error) { setNotice(error instanceof Error ? error.message : t("noticeLoadFail")); }
  }, [api, isSignedIn, t]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadInquiries(); }, [loadInquiries]);

  const suggestedRange = useMemo(() => {
    const cost = Number(form.cost) || 0, hours = Number(form.hours) || 0, experience = Number(form.experience) || 0;
    if (!cost && !hours) return null;
    const base = (cost + hours * 75) * (1 + Math.min(experience * 0.025, 0.2)) * 1.1;
    const low = Math.max(cost * 1.15, Math.round(base * 1.15 / 10) * 10);
    return { low: Math.round(low), high: Math.max(Math.round(low) + 50, Math.round(base * 1.4 / 10) * 10) };
  }, [form.cost, form.hours, form.experience]);

  const setField = (field: keyof ListingForm, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 3600); };

  function uploadImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return flash(t("noticeImageType"));
    if (file.size > 1_000_000) return flash(t("noticeImageSize"));
    const reader = new FileReader();
    reader.onload = () => setField("image", String(reader.result));
    reader.readAsDataURL(file);
  }

  async function enhanceImage() {
    if (!form.image) return flash(t("noticeNoImage"));
    setEnhancing(true);
    try {
      const result = await api("/api/ai/enhance-image", { method: "POST", body: JSON.stringify({ image: form.image }) }, true);
      setField("image", result.image);
      flash(t("noticeEnhanced"));
    } catch (error) { flash(error instanceof Error ? error.message : t("noticeEnhanceFail")); }
    finally { setEnhancing(false); }
  }

  async function publishListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      await api("/api/products", { method: "POST", body: JSON.stringify({
        name: form.name, category: form.category, description: form.description,
        price_inr: Number(form.price), making_cost_inr: form.cost ? Number(form.cost) : null,
        hours_to_make: form.hours ? Number(form.hours) : null,
        craft_experience_years: form.experience ? Number(form.experience) : null,
        quantity_available: Number(form.quantity), minimum_order_quantity: Number(form.minimum),
        lead_time: form.leadTime || null, image_url: form.image || null,
      }) }, true);
      setForm(blankForm); flash(t("noticePublished")); setTab("discover"); await loadProducts(); await loadInquiries();
    } catch (error) { flash(error instanceof Error ? error.message : t("noticePublishFail")); }
    finally { setSaving(false); }
  }

  async function sendInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!contact) return; setSaving(true);
    try {
      await api(`/api/products/${contact.id}/inquiries`, { method: "POST", body: JSON.stringify({ quantity: Number(contactQuantity), message: contactMessage }) }, true);
      setContact(null); flash(t("noticeInquirySent")); await loadInquiries();
    } catch (error) { flash(error instanceof Error ? error.message : t("noticeInquiryFail")); }
    finally { setSaving(false); }
  }

  async function replyTo(inquiry: Inquiry) {
    const message = window.prompt(t("replyPrompt", { name: inquiry.product_name }));
    if (!message?.trim()) return;
    try {
      await api(`/api/inquiries/${inquiry.id}/reply`, { method: "POST", body: JSON.stringify({ message: message.trim() }) }, true);
      flash(t("noticeReplySaved")); await loadInquiries();
    } catch (error) { flash(error instanceof Error ? error.message : t("noticeReplyFail")); }
  }

  const productIcon = (cat: string) =>
    cat.toLowerCase().includes("pottery") ? "🏺" :
    cat.toLowerCase().includes("jewel") ? "💍" :
    cat.toLowerCase().includes("wood") ? "🪵" : "🧵";

  function handleVoiceAction(action: VoiceAction) {
    switch (action) {
      case "nav:discover":      setTab("discover"); break;
      case "nav:sell":          setTab("sell"); break;
      case "nav:inquiries":     setTab("inquiries"); break;      case "nav:signin":        window.location.href = "/sign-in"; break;
      case "nav:signup":        window.location.href = "/sign-up"; break;
      case "chat:open":         window.dispatchEvent(new CustomEvent("kaari:voice-chat-open")); break;
      case "chat:close":        window.dispatchEvent(new CustomEvent("kaari:voice-chat-close")); break;
      case "scroll:top":        window.scrollTo({ top: 0, behavior: "smooth" }); break;
      case "scroll:catalogue":  document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); break;
      case "search:focus":      document.querySelector<HTMLInputElement>(".search input")?.focus(); break;
      case "help":              break;
    }
  }

  return <div className="page-shell">
    {/* ── Top navigation bar ── */}
    <header className="site-header top-nav-bar">
      <a href="#top" className="brand"><span className="brand-mark">✿</span><span>Kaari<span className="brand-accent">Works</span></span></a>
      <nav className="top-nav-tabs" aria-label="Main navigation">
        <button className={`top-nav-item ${tab === "discover" ? "top-nav-item--active" : ""}`} onClick={() => setTab("discover")}>
          <ShoppingBag size={22}/>
          <span>{t("navBuy")}</span>
        </button>
        <button className={`top-nav-item ${tab === "sell" ? "top-nav-item--active" : ""}`} onClick={() => setTab("sell")}>
          <Store size={22}/>
          <span>{t("navSell")}</span>
        </button>
        <button className={`top-nav-item ${tab === "inquiries" ? "top-nav-item--active" : ""}`} onClick={() => setTab("inquiries")}>
          <Package size={22}/>
          <span>{t("navOrders")}</span>
        </button>
        <button className={`top-nav-item ${tab === "enquiry" ? "top-nav-item--active" : ""}`} onClick={() => setTab("enquiry")}>
          <ClipboardList size={22}/>
          <span>{t("navEnquiries")}</span>
        </button>
        <div className="top-nav-item top-nav-lang">
          <LanguageSwitcher />
        </div>
        <div className="top-nav-item top-nav-voice">
          <VoiceNav onAction={handleVoiceAction} />
        </div>
        <SignedOut>
          <SignInButton mode="redirect">
            <button className="top-nav-item">
              <User size={22}/>
              <span>{t("navProfile")}</span>
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div className="top-nav-item top-nav-profile">
            <UserButton />
          </div>
        </SignedIn>
      </nav>
    </header>

    {/* ── Discover tab ── */}
    {tab === "discover" && <>
      <section className="hero" id="top">
        <div className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">{t("heroEyebrow")}</div>
            <h1>{t("heroHeading").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}</h1>
            <p>{t("heroParagraph")}</p>
          </div>
          <div className="hero-art" aria-hidden="true">🪡</div>
        </div>
      </section>

      <section className="section" id="catalogue">
        {/* Category icon grid */}
        <div className="section-head-simple">
          <h2>{t("catalogueHeading")}</h2>
        </div>
        <div className="cat-icon-grid">
          {CATEGORY_ICONS.map(({ key, eng, emoji, bg }) => (
            <button
              key={eng}
              className={`cat-icon-btn ${category === eng ? "cat-icon-btn--active" : ""}`}
              onClick={() => setCategory(eng)}
              aria-pressed={category === eng}
            >
              <span className="cat-icon-circle" style={{background: bg}}>{emoji}</span>
              <span className="cat-icon-label">{t(key as Parameters<typeof t>[0])}</span>
            </button>
          ))}
        </div>

        {/* Featured Artisans */}
        <div className="featured-head">
          <strong>{t("featuredArtisans")}</strong>
          <button className="featured-view-all" onClick={() => setCategory("All crafts")}>{t("viewAll")} ›</button>
        </div>
        <div className="featured-scroll">
          {FEATURED_ARTISANS.map((a) => (
            <article className="featured-card" key={a.name} style={{background: a.color}}>
              <div className="featured-icon">{a.icon}</div>
              <div className="featured-info">
                <strong>{a.product}</strong>
                <span>{a.name}</span>
                <span className="featured-region">{a.region}</span>
                <span className="featured-price">₹{a.price.toLocaleString("en-IN")}</span>
              </div>
            </article>
          ))}
        </div>

        {/* Product grid */}
        <div className="product-grid" style={{marginTop: "24px"}}>
          {loading
            ? <div className="empty">{t("loading")}</div>
            : products.length === 0
              ? <div className="empty">{t("emptyProducts")}</div>
              : products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-art">
                    {product.image_url ? <img src={product.image_url} alt={product.name}/> : <span aria-hidden="true">{productIcon(product.category)}</span>}
                    <span className="category-label">{product.category}</span>
                  </div>
                  <div className="product-body">
                    <h3>{product.name}</h3>
                    <div className="seller-name">{t("madeBy")} {product.seller_name || t("independentArtisan")}</div>
                    <p className="product-description">{product.description || t("defaultDescription")}</p>
                    <button className="button soft estimate-product-button" onClick={() => window.dispatchEvent(new CustomEvent("kaari:estimate-product", { detail: product }))}>
                      {t("estimateButton")}
                    </button>
                    <div className="product-foot">
                      <div className="product-price">₹{product.price_inr.toLocaleString("en-IN")}<small>{t("perPieceMin")} {product.minimum_order_quantity}{product.lead_time ? ` · ${product.lead_time}` : ""}</small></div>
                      <button className="button" onClick={() => { setContact(product); setContactQuantity(String(product.minimum_order_quantity)); setContactMessage(t("contactMessageTemplate", { name: product.name })); }}>{t("contactSeller")}</button>
                    </div>
                  </div>
                </article>
              ))
          }
        </div>
      </section>
    </>}

    {/* ── Sell tab ── */}
    {tab === "sell" && <main className="seller-layout">
      <div className="seller-heading">
        <div className="eyebrow" style={{color:"#13866c"}}>{t("sellEyebrow")}</div>
        <h1>{t("sellHeading")}</h1>
        <p>{t("sellSub")}</p>
      </div>
      <SignedOut>
        <div className="form-card seller-signin-card">
          <h2>{t("sellSignInCard")}</h2>
          <p>{t("sellSignInNote")}</p>
          <SignInButton mode="redirect"><button className="button">{t("sellSignInBtn")}</button></SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <form className="listing-workspace" onSubmit={publishListing}>
          <div className="listing-form-main"><section className="form-card">
            <ProductPhotoUpload image={form.image} enhancing={enhancing} onSelect={uploadImage} onEnhance={() => void enhanceImage()} onRemove={() => setField("image", "")}/>
            <div className="form-grid listing-details-grid">
              <label className="field"><span>{t("fieldName")}</span><input required minLength={2} maxLength={180} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder={t("fieldNamePlaceholder")}/></label>
              <label className="field"><span>{t("fieldCategory")}</span><select value={form.category} onChange={(e) => setField("category", e.target.value)}>{["Textiles","Pottery & ceramics","Woodwork","Jewellery","Home decor","Baskets","Paintings"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="field full"><span>{t("fieldDescription")}</span><textarea required maxLength={5000} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder={t("fieldDescriptionPlaceholder")}/></label>
              <label className="field"><span>{t("fieldHours")}</span><input type="number" min="0" step="0.5" value={form.hours} onChange={(e) => setField("hours", e.target.value)} placeholder={t("fieldHoursPlaceholder")}/></label>
              <label className="field"><span>{t("fieldExperience")}</span><input type="number" min="0" value={form.experience} onChange={(e) => setField("experience", e.target.value)} placeholder={t("fieldExperiencePlaceholder")}/></label>
              <label className="field"><span>{t("fieldPieces")}</span><input type="number" min="0" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)}/></label>
              <label className="field"><span>{t("fieldMinimum")}</span><input required type="number" min="1" value={form.minimum} onChange={(e) => setField("minimum", e.target.value)}/></label>
              <label className="field"><span>{t("fieldLeadTime")}</span><input value={form.leadTime} onChange={(e) => setField("leadTime", e.target.value)} placeholder={t("fieldLeadTimePlaceholder")}/></label>
              <label className="field"><span>{t("fieldCost")}</span><input type="number" min="0" value={form.cost} onChange={(e) => setField("cost", e.target.value)} placeholder={t("fieldCostPlaceholder")}/></label>
            </div>
            <button className="button" type="submit" disabled={saving}>{saving ? t("publishingBtn") : t("publishBtn")}</button>
          </section></div>
          <FairPriceGuide range={suggestedRange} cost={form.cost} hours={form.hours} experience={form.experience} price={form.price} setPrice={(v) => setField("price", v)}/>
        </form>
      </SignedIn>
    </main>}

    {/* ── Orders tab ── */}
    {tab === "inquiries" && <main className="inbox">
      <div className="eyebrow">{t("enquiriesEyebrow")}</div>
      <h1>{t("enquiriesHeading")}</h1>
      <SignedOut>
        <div className="form-card">
          <p>{t("enquiriesSignIn")}</p>
          <SignInButton mode="redirect"><button className="button">{t("enquiriesSignInBtn")}</button></SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        {inquiries.length === 0
          ? <div className="empty">{t("enquiriesEmpty")}</div>
          : inquiries.filter(item => item.buyer_id === userId).map((item) => (
            <article className="inquiry-card" key={item.id}>
              <strong>{item.product_name} · {item.quantity} units</strong>
              <p>{item.message}</p>
              <div className="inquiry-meta">{item.status} · {new Date(item.created_at).toLocaleDateString()}</div>
              {item.seller_reply && <p><strong>{t("sellerReply")}</strong> {item.seller_reply}</p>}
            </article>
          ))
        }
      </SignedIn>
    </main>}

    {/* ── Enquiry tab ── */}
    {tab === "enquiry" && <main className="inbox">
      <div className="eyebrow">{t("enquiriesEyebrow")}</div>
      <h1>{t("navEnquiries")}</h1>
      <SignedOut>
        <div className="form-card">
          <p>{t("enquiriesSignIn")}</p>
          <SignInButton mode="redirect"><button className="button">{t("enquiriesSignInBtn")}</button></SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        {inquiries.length === 0
          ? <div className="empty">{t("enquiriesEmpty")}</div>
          : inquiries.map((item) => (
            <article className="inquiry-card" key={item.id}>
              <strong>{item.product_name} · {item.quantity} units</strong>
              <p>{item.message}</p>
              <div className="inquiry-meta">{item.status} · {new Date(item.created_at).toLocaleDateString()}</div>
              {item.seller_reply && <p><strong>{t("sellerReply")}</strong> {item.seller_reply}</p>}
              {item.seller_id === userId && <button className="button soft" onClick={() => void replyTo(item)}><MessageCircle size={15}/> {t("replyToBuyer")}</button>}
            </article>
          ))
        }
      </SignedIn>
    </main>}

    <BuyerEstimateChat/>

    {contact && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setContact(null); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <div className="modal-head">
          <h2 id="contact-title">{t("contactTitle")}</h2>
          <button className="icon-button" onClick={() => setContact(null)} aria-label="Close"><X size={18}/></button>
        </div>
        <p>{t("contactAsk")} {contact.seller_name || t("independentArtisan")} {t("contactAbout")} <strong>{contact.name}</strong>.</p>
        <form className="form-grid" onSubmit={sendInquiry}>
          <label className="field"><span>{t("contactQtyLabel", { min: contact.minimum_order_quantity })}</span><input type="number" required min={contact.minimum_order_quantity} value={contactQuantity} onChange={(e) => setContactQuantity(e.target.value)}/></label>
          <label className="field full"><span>{t("contactMessageLabel")}</span><textarea required minLength={2} maxLength={3000} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)}/></label>
          <button className="button field full" disabled={saving}>{saving ? t("contactSending") : t("contactSend")}</button>
        </form>
        <SignedOut>
          <p className="form-note">{t("contactSignInNote")}</p>
          <SignInButton mode="redirect"><button className="button outline">{t("contactSignInBtn")}</button></SignInButton>
        </SignedOut>
      </section>
    </div>}

    {notice && <div className="notice" role="status">{notice}</div>}
  </div>;
}

export default function Marketplace() {
  return <LangProvider><MarketplaceInner/></LangProvider>;
}
