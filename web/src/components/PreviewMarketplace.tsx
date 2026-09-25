"use client";

import { useMemo, useState } from "react";
import { ArrowRight, HeartHandshake, Leaf, Search, ShieldCheck, ShoppingBag, Store, Package, User, ClipboardList } from "lucide-react";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { FairPriceGuide, ProductPhotoUpload } from "@/components/SellerListingControls";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VoiceNav from "@/components/VoiceNav";
import { LangProvider, useLang } from "@/lib/i18n";
import { VoiceAction } from "@/lib/voiceCommands";

const sampleProducts = [
  { name: "Madhubani Story Panel",     category: "Paintings",          seller: "Sita Devi · Madhubani, Bihar",          price: 1200, minimum: 10, icon: "🎨", color: "#f5e2cf", description: "Hand-painted folk art on handmade paper, each panel tells a story." },
  { name: "Handwoven Market Basket",   category: "Baskets",            seller: "Lakshmi Self Help Group · Kerala",      price: 850,  minimum: 25, icon: "🧺", color: "#eee1c9", description: "Durable natural-fibre basket woven by a women-led artisan collective." },
  { name: "Blue Pottery Serving Bowl", category: "Pottery & ceramics", seller: "Imran Khan · Jaipur, Rajasthan",        price: 1450, minimum: 8,  icon: "🏺", color: "#dce9ef", description: "Traditional blue pottery with a hand-painted floral glaze." },
  { name: "Ajrakh Cotton Table Runner",category: "Textiles",           seller: "Razia Khatri · Kutch, Gujarat",         price: 980,  minimum: 20, icon: "🧵", color: "#ead9d5", description: "Naturally dyed cotton, block printed with heritage Ajrakh motifs." },
  { name: "Carved Teak Desk Tray",     category: "Woodwork",           seller: "Ravi Kumar · Saharanpur, UP",           price: 1750, minimum: 12, icon: "🪵", color: "#ead7bd", description: "A practical desk organiser with hand-carved floral detailing." },
  { name: "Terracotta Leaf Earrings",  category: "Jewellery",          seller: "Meena Crafts · Khurja, UP",             price: 420,  minimum: 30, icon: "💍", color: "#f2d7d1", description: "Lightweight clay earrings finished by hand with natural pigments." },
];

function PreviewMarketplaceInner() {
  const { t } = useLang();

  const categories = useMemo(() => [
    t("catAll"), t("catTextiles"), t("catPottery"), t("catWoodwork"),
    t("catJewellery"), t("catHomeDecor"), t("catBaskets"), t("catPaintings"),
  ], [t]);

  // English category names keyed by translated label for filtering sample data
  const categoryMap = useMemo(() => ({
    [t("catAll")]:       "All crafts",
    [t("catTextiles")]:  "Textiles",
    [t("catPottery")]:   "Pottery & ceramics",
    [t("catWoodwork")]:  "Woodwork",
    [t("catJewellery")]: "Jewellery",
    [t("catHomeDecor")]: "Home decor",
    [t("catBaskets")]:   "Baskets",
    [t("catPaintings")]: "Paintings",
  }), [t]);

  const [category, setCategory] = useState(t("catAll"));
  const [search, setSearch]   = useState("");
  const [active, setActive]   = useState<"discover" | "sell">("discover");
  const [notice, setNotice]   = useState("");
  const [productImage, setProductImage] = useState("");
  const [enhancing, setEnhancing]       = useState(false);
  const [listing, setListing] = useState({
    name: "", category: "Textiles", description: "",
    cost: "", hours: "", experience: "", quantity: "", minimum: "", leadTime: "", price: "",
  });

  const suggested = useMemo(() => {
    const cost = Number(listing.cost) || 0, hours = Number(listing.hours) || 0, experience = Number(listing.experience) || 0;
    if (!cost && !hours) return null;
    const base = (cost + hours * 75) * (1 + Math.min(experience * 0.025, 0.2)) * 1.1;
    const low  = Math.max(cost * 1.15, Math.round(base * 1.15 / 10) * 10);
    return { low: Math.round(low), high: Math.max(Math.round(low) + 50, Math.round(base * 1.4 / 10) * 10) };
  }, [listing.cost, listing.hours, listing.experience]);

  const setListingField = (field: keyof typeof listing, value: string) =>
    setListing((old) => ({ ...old, [field]: value }));

  function uploadImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setNotice(t("noticeImageType")); return; }
    if (file.size > 1_000_000) { setNotice(t("noticeImageSize")); return; }
    const reader = new FileReader();
    reader.onload = () => setProductImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function enhanceImage() {
    if (!productImage) { setNotice(t("noticeNoImage")); return; }
    setEnhancing(true);
    try {
      const response = await fetch("/api/ai/enhance-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: productImage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("noticeEnhanceFail"));
      setProductImage(data.image);
      setNotice(t("noticeEnhanced"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("noticeEnhanceFail"));
    } finally {
      setEnhancing(false);
    }
  }

  const englishCat = categoryMap[category] ?? "All crafts";

  function handleVoiceAction(action: VoiceAction) {
    switch (action) {
      case "nav:buy":           setActive("discover"); break;
      case "nav:sell":          setActive("sell"); break;
      case "nav:orders":
      case "nav:enquiry":       setNotice(t("noticePreviewSignIn")); break;
      case "nav:signin":        setNotice(t("noticePreviewSignIn")); break;
      case "nav:signup":        setNotice(t("noticePreviewJoin")); break;
      case "chat:open":         window.dispatchEvent(new CustomEvent("kaari:voice-chat-open")); break;
      case "chat:close":        window.dispatchEvent(new CustomEvent("kaari:voice-chat-close")); break;
      case "scroll:top":        window.scrollTo({ top: 0, behavior: "smooth" }); break;
      case "scroll:catalogue":  document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); break;
      case "search:focus":      document.querySelector<HTMLInputElement>(".search input")?.focus(); break;
      default: break;
    }
  }
  const shown = useMemo(() =>
    sampleProducts.filter((p) =>
      (englishCat === "All crafts" || p.category === englishCat) &&
      `${p.name} ${p.category} ${p.seller}`.toLowerCase().includes(search.toLowerCase())
    ),
  [englishCat, search]);

  return <div className="page-shell">
    <div style={{background:"#fff4d6",textAlign:"center",padding:"6px 14px",fontSize:11,color:"#72551c",fontWeight:700}}>
      {t("previewBanner")}
    </div>

    {/* ── Top navigation bar ── */}
    <header className="site-header top-nav-bar">
      <a href="#top" className="brand"><span className="brand-mark">✿</span><span>Kaari<span className="brand-accent">Works</span></span></a>
      <nav className="top-nav-tabs" aria-label="Main navigation">
        <button className={`top-nav-item ${active === "discover" ? "top-nav-item--active" : ""}`} onClick={() => setActive("discover")}>
          <ShoppingBag size={22}/>
          <span>{t("navBuy")}</span>
        </button>
        <button className={`top-nav-item ${active === "sell" ? "top-nav-item--active" : ""}`} onClick={() => setActive("sell")}>
          <Store size={22}/>
          <span>{t("navSell")}</span>
        </button>
        <button className="top-nav-item" onClick={() => setNotice(t("noticePreviewSignIn"))}>
          <Package size={22}/>
          <span>{t("navOrders")}</span>
        </button>
        <button className="top-nav-item" onClick={() => setNotice(t("noticePreviewSignIn"))}>
          <ClipboardList size={22}/>
          <span>{t("navEnquiries")}</span>
        </button>
        <div className="top-nav-item top-nav-lang">
          <LanguageSwitcher/>
        </div>
        <div className="top-nav-item top-nav-voice">
          <VoiceNav onAction={handleVoiceAction}/>
        </div>
        <button className="top-nav-item" onClick={() => setNotice(t("noticePreviewSignIn"))}>
          <User size={22}/>
          <span>{t("navProfile")}</span>
        </button>
      </nav>
    </header>

    {active === "discover" ? <>
      <section className="hero" id="top">
        <div className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">{t("heroEyebrow")}</div>
            <h1>{t("heroHeading").split("\n").map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}</h1>
            <p>{t("heroParagraph")}</p>
            <button className="button" onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })}>
              {t("heroCta")} <ArrowRight size={16}/>
            </button>
          </div>
          <div className="hero-art" aria-hidden="true">🪡</div>
        </div>
      </section>

      <div className="trust-row">
        <div className="trust"><span className="trust-icon"><HeartHandshake size={20}/></span><span><strong>{t("trust1Title")}</strong><small>{t("trust1Sub")}</small></span></div>
        <div className="trust"><span className="trust-icon"><ShieldCheck size={20}/></span><span><strong>{t("trust2Title")}</strong><small>{t("trust2Sub")}</small></span></div>
        <div className="trust"><span className="trust-icon"><Leaf size={20}/></span><span><strong>{t("trust3Title")}</strong><small>{t("trust3Sub")}</small></span></div>
      </div>

      <section className="section" id="catalogue">
        <div className="section-head-simple">
          <h2>{t("catalogueHeading")}</h2>
        </div>
        {/* Category icon grid */}
        <div className="cat-icon-grid">
          {[
            { key: "catTextiles",  eng: "Textiles",           emoji: "🧵", bg: "#fde8e0" },
            { key: "catPottery",   eng: "Pottery & ceramics",  emoji: "🏺", bg: "#fde0e0" },
            { key: "catWoodwork",  eng: "Woodwork",             emoji: "🪵", bg: "#fdf3d0" },
            { key: "catJewellery", eng: "Jewellery",            emoji: "💍", bg: "#e8e0fd" },
            { key: "catHomeDecor", eng: "Home decor",           emoji: "🏡", bg: "#e0fde8" },
            { key: "catBaskets",   eng: "Baskets",              emoji: "🧺", bg: "#fde8f5" },
            { key: "catPaintings", eng: "Paintings",            emoji: "🎨", bg: "#e0ecfd" },
            { key: "catAll",       eng: "All crafts",           emoji: "⋯",  bg: "#e8e8e8" },
          ].map(({ key, eng, emoji, bg }) => (
            <button
              key={eng}
              className={`cat-icon-btn ${(categoryMap[category] ?? "All crafts") === eng ? "cat-icon-btn--active" : ""}`}
              onClick={() => setCategory(t(key as Parameters<typeof t>[0]))}
              aria-pressed={(categoryMap[category] ?? "All crafts") === eng}
            >
              <span className="cat-icon-circle" style={{background: bg}}>{emoji}</span>
              <span className="cat-icon-label">{t(key as Parameters<typeof t>[0])}</span>
            </button>
          ))}
        </div>

        {/* Featured Artisans */}
        <div className="featured-head">
          <strong>{t("featuredArtisans")}</strong>
          <button className="featured-view-all" onClick={() => setCategory(t("catAll"))}>{t("viewAll")} ›</button>
        </div>
        <div className="featured-scroll">
          {[
            { name: "Sita Devi",    product: "Madhubani Story Panel",        craft: "Paintings",          region: "Madhubani, Bihar",  price: 1200, icon: "🎨", color: "#f5e2cf" },
            { name: "Razia Khatri", product: "Ajrakh Cotton Table Runner",    craft: "Textiles",           region: "Kutch, Gujarat",    price: 980,  icon: "🧵", color: "#ead9d5" },
            { name: "Imran Khan",   product: "Blue Pottery Serving Bowl",     craft: "Pottery & ceramics", region: "Jaipur, Rajasthan", price: 1450, icon: "🏺", color: "#dce9ef" },
            { name: "Lakshmi SHG",  product: "Handwoven Market Basket",       craft: "Baskets",            region: "Kerala",            price: 850,  icon: "🧺", color: "#eee1c9" },
            { name: "Ravi Kumar",   product: "Carved Teak Desk Tray",         craft: "Woodwork",           region: "Saharanpur, UP",    price: 1750, icon: "🪵", color: "#ead7bd" },
          ].map((a) => (
            <article className="featured-card" key={a.name} style={{background: a.color}}>
              <div className="featured-card-art">{a.icon}</div>
              <div className="featured-card-body">
                <span className="featured-card-category">{a.craft}</span>
                <strong className="featured-card-name">{a.product}</strong>
                <div className="featured-card-seller">{t("madeBy")} {a.name}</div>
                <div className="featured-card-region">{a.region}</div>
                <button className="button soft estimate-product-button" style={{fontSize:11,padding:"6px 10px",margin:"6px 0"}}
                  onClick={() => window.dispatchEvent(new CustomEvent("kaari:estimate-product", { detail: { name: a.product, category: a.craft, description: "", price_inr: a.price } }))}>
                  {t("estimateButton")}
                </button>
                <div className="featured-card-foot">
                  <span className="featured-price">₹{a.price.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="product-grid" style={{marginTop:"24px"}}>
          {shown.map((product) => (
            <article className="product-card" key={product.name}>
              <div className="product-art" style={{background: product.color}}>
                <span>{product.icon}</span>
                <span className="category-label">{product.category}</span>
              </div>
              <div className="product-body">
                <h3>{product.name}</h3>
                <div className="seller-name">{t("madeBy")} {product.seller}</div>
                <p className="product-description">{product.description}</p>
                <button className="button soft estimate-product-button" onClick={() => window.dispatchEvent(new CustomEvent("kaari:estimate-product", { detail: { name: product.name, category: product.category, description: product.description, price_inr: product.price } }))}>
                  {t("estimateButton")}
                </button>
                <div className="product-foot">
                  <div className="product-price">₹{product.price.toLocaleString("en-IN")}<small>{t("perPieceMin")} {product.minimum} units</small></div>
                  <button className="button" onClick={() => setNotice(`Contact ${product.seller.split(" · ")[0]} about ${product.name}.`)}>{t("contactSeller")}</button>
                </div>
              </div>
            </article>
          ))}
          {shown.length === 0 && <div className="empty">{t("emptySearch")}</div>}
        </div>
      </section>
    </> : <main className="seller-layout">
      <div className="seller-heading">
        <div className="eyebrow" style={{color:"#13866c"}}>{t("sellEyebrow")}</div>
        <h1>{t("sellHeading")}</h1>
        <p>{t("sellSub")}</p>
      </div>
      <form className="listing-workspace" onSubmit={(e) => { e.preventDefault(); setNotice(t("noticePreviewPublish")); }}>
        <div className="listing-form-main"><section className="form-card">
          <ProductPhotoUpload image={productImage} enhancing={enhancing} onSelect={uploadImage} onEnhance={() => void enhanceImage()} onRemove={() => setProductImage("")}/>
          <div className="form-grid listing-details-grid">
            <label className="field"><span>{t("fieldName")}</span><input required value={listing.name} onChange={(e) => setListingField("name", e.target.value)} placeholder={t("fieldNamePlaceholder")}/></label>
            <label className="field"><span>{t("fieldCategory")}</span><select value={listing.category} onChange={(e) => setListingField("category", e.target.value)}>{["Textiles","Pottery & ceramics","Woodwork","Jewellery","Home decor","Baskets","Paintings"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field full"><span>{t("fieldDescription")}</span><textarea required value={listing.description} onChange={(e) => setListingField("description", e.target.value)} placeholder={t("fieldDescriptionPlaceholder")}/></label>
            <label className="field"><span>{t("fieldHours")}</span><input type="number" min="0" step="0.5" value={listing.hours} onChange={(e) => setListingField("hours", e.target.value)} placeholder={t("fieldHoursPlaceholder")}/></label>
            <label className="field"><span>{t("fieldExperience")}</span><input type="number" min="0" value={listing.experience} onChange={(e) => setListingField("experience", e.target.value)} placeholder={t("fieldExperiencePlaceholder")}/></label>
            <label className="field"><span>{t("fieldPieces")}</span><input type="number" min="0" value={listing.quantity} onChange={(e) => setListingField("quantity", e.target.value)} placeholder="e.g. 50"/></label>
            <label className="field"><span>{t("fieldMinimum")}</span><input required type="number" min="1" value={listing.minimum} onChange={(e) => setListingField("minimum", e.target.value)} placeholder="e.g. 10"/></label>
            <label className="field"><span>{t("fieldLeadTime")}</span><input value={listing.leadTime} onChange={(e) => setListingField("leadTime", e.target.value)} placeholder={t("fieldLeadTimePlaceholder")}/></label>
            <label className="field"><span>{t("fieldCost")}</span><input type="number" min="0" value={listing.cost} onChange={(e) => setListingField("cost", e.target.value)} placeholder={t("fieldCostPlaceholder")}/></label>
          </div>
          <button className="button" type="submit">{t("previewPublishBtn")}</button>
        </section></div>
        <FairPriceGuide range={suggested} cost={listing.cost} hours={listing.hours} experience={listing.experience} price={listing.price} setPrice={(v) => setListingField("price", v)}/>
      </form>
    </main>}

    <footer className="footer">{t("footer")}</footer>
    <BuyerEstimateChat/>

    {notice && <div className="notice" role="status">
      <button onClick={() => setNotice("")} style={{marginLeft:12,color:"#bde4c7",background:"none",border:0}}>{t("noticeDismiss")}</button>
      {notice}
    </div>}
  </div>;
}

export default function PreviewMarketplace() {
  return <LangProvider><PreviewMarketplaceInner/></LangProvider>;
}
