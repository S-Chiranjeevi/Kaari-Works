"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, HeartHandshake, Leaf, Menu, MessageCircle, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { FairPriceGuide, ProductPhotoUpload } from "@/components/SellerListingControls";

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

const categories = ["All crafts", "Textiles", "Pottery & ceramics", "Woodwork", "Jewellery", "Home decor", "Baskets", "Paintings"];
const blankForm: ListingForm = { name: "", category: "Textiles", description: "", price: "", cost: "", hours: "", experience: "", quantity: "20", minimum: "5", leadTime: "", image: "" };

export default function Marketplace() {
  const { isSignedIn, userId, getToken } = useAuth();
  const [tab, setTab] = useState<"discover" | "sell" | "inquiries">("discover");
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [category, setCategory] = useState("All crafts");
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
      if (!token) throw new Error("Sign in to continue.");
      headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(path, { ...init, headers });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.detail || "Something went wrong. Please try again.");
    return body;
  }, [getToken]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("q", search.trim());
      if (category !== "All crafts") query.set("category", category);
      setProducts(await api(`/api/products?${query.toString()}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [api, category, search]);

  const loadInquiries = useCallback(async () => {
    if (!isSignedIn) return setInquiries([]);
    try { setInquiries(await api("/api/inquiries", {}, true)); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not load enquiries."); }
  }, [api, isSignedIn]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadInquiries(); }, [loadInquiries]);

  const shownProducts = useMemo(() => products, [products]);
  const suggestedRange = useMemo(() => {
    const cost = Number(form.cost) || 0;
    const hours = Number(form.hours) || 0;
    const experience = Number(form.experience) || 0;
    if (!cost && !hours) return null;
    const labor = hours * 75;
    const skillPremium = Math.min(experience * 0.025, 0.2);
    const base = (cost + labor) * (1 + skillPremium) * 1.1;
    const low = Math.max(cost * 1.15, Math.round(base * 1.15 / 10) * 10);
    const high = Math.max(low + 50, Math.round(base * 1.4 / 10) * 10);
    return { low: Math.round(low), high: Math.round(high) };
  }, [form.cost, form.hours, form.experience]);
  const setField = (field: keyof ListingForm, value: string) => setForm((previous) => ({ ...previous, [field]: value }));
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 3600); };
  function uploadImage(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return flash("Choose a JPG, PNG, or WebP image.");
    if (file.size > 1_000_000) return flash("Choose an image smaller than 1 MB.");
    const reader = new FileReader();
    reader.onload = () => setField("image", String(reader.result));
    reader.readAsDataURL(file);
  }
  async function enhanceImage() {
    if (!form.image) return flash("Upload a product photo first.");
    setEnhancing(true);
    try {
      const result = await api("/api/ai/enhance-image", { method: "POST", body: JSON.stringify({ image: form.image }) }, true);
      setField("image", result.image);
      flash("Photo enhanced. Compare it with your original before publishing.");
    } catch (error) { flash(error instanceof Error ? error.message : "Image enhancement failed."); }
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
      setForm(blankForm); flash("Your listing is live for buyers."); setTab("discover"); await loadProducts(); await loadInquiries();
    } catch (error) { flash(error instanceof Error ? error.message : "Could not publish listing."); }
    finally { setSaving(false); }
  }

  async function sendInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!contact) return; setSaving(true);
    try {
      await api(`/api/products/${contact.id}/inquiries`, { method: "POST", body: JSON.stringify({ quantity: Number(contactQuantity), message: contactMessage }) }, true);
      setContact(null); flash("Your enquiry has been sent to the artisan."); await loadInquiries();
    } catch (error) { flash(error instanceof Error ? error.message : "Could not send enquiry."); }
    finally { setSaving(false); }
  }

  async function replyTo(inquiry: Inquiry) {
    const message = window.prompt(`Reply to buyer about ${inquiry.product_name}:`);
    if (!message?.trim()) return;
    try {
      await api(`/api/inquiries/${inquiry.id}/reply`, { method: "POST", body: JSON.stringify({ message: message.trim() }) }, true);
      flash("Your reply has been saved."); await loadInquiries();
    } catch (error) { flash(error instanceof Error ? error.message : "Could not save your reply."); }
  }

  return <div className="page-shell">
    <header className="site-header">
      <a href="#top" className="brand"><span className="brand-mark">✿</span><span>Kaari<span className="brand-accent">Works</span></span></a>
      <nav className="header-actions" aria-label="Main navigation">
        <button className="nav-link" onClick={() => setTab("discover")}>Discover</button>
        <button className="nav-link" onClick={() => setTab("sell")}>For artisans</button>
        <button className="nav-link" onClick={() => setTab("inquiries")}>Enquiries</button>
        <SignedOut><SignInButton mode="modal"><button className="button outline">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="button">Join Kaari</button></SignUpButton></SignedOut>
        <SignedIn><UserButton /></SignedIn>
      </nav>
    </header>

    {tab === "discover" && <>
      <section className="hero" id="top"><div className="hero-card"><div className="hero-copy"><div className="eyebrow">Crafted with care, traded with trust</div><h1>Tradition in<br />your hands.</h1><p>Meet the artisans behind the work. Discover one-of-a-kind craft and connect directly for the bulk orders your business needs.</p><button className="button" onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })}>Explore the collection <ArrowRight size={16} /></button></div><div className="hero-art" aria-hidden="true">🪡</div></div></section>
      <div className="trust-row"><div className="trust"><span className="trust-icon"><HeartHandshake size={20}/></span><span><strong>Direct artisan contact</strong><small>Talk to the maker, not a middleman</small></span></div><div className="trust"><span className="trust-icon"><ShieldCheck size={20}/></span><span><strong>Clear bulk terms</strong><small>Minimum orders and lead times upfront</small></span></div><div className="trust"><span className="trust-icon"><Leaf size={20}/></span><span><strong>Every piece has a story</strong><small>Support independent craft communities</small></span></div></div>
      <section className="section" id="catalogue"><div className="section-head"><div><h2>Find handmade goods</h2><p>Explore craft from independent makers across India.</p></div><label className="search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, crafts, materials" /></label></div><div className="filters">{categories.map((item) => <button key={item} className={`filter ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className="product-grid">{loading ? <div className="empty">Loading the artisan catalogue…</div> : shownProducts.length === 0 ? <div className="empty">No products yet. Be the first artisan to publish a listing.</div> : shownProducts.map((product) => <article className="product-card" key={product.id}><div className="product-art">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span aria-hidden="true">{product.category.toLowerCase().includes("pottery") ? "🏺" : product.category.toLowerCase().includes("jewel") ? "💍" : product.category.toLowerCase().includes("wood") ? "🪵" : "🧵"}</span>}<span className="category-label">{product.category}</span></div><div className="product-body"><h3>{product.name}</h3><div className="seller-name">Made by {product.seller_name || "Independent artisan"}</div><p className="product-description">{product.description || "A handmade piece created by an independent artisan."}</p><button className="button soft estimate-product-button" onClick={() => window.dispatchEvent(new CustomEvent("kaari:estimate-product", { detail: product }))}>Ask Kaari to estimate cost &amp; time</button><div className="product-foot"><div className="product-price">₹{product.price_inr.toLocaleString("en-IN")}<small>per piece · min. {product.minimum_order_quantity}{product.lead_time ? ` · ${product.lead_time}` : " units"}</small></div><button className="button" onClick={() => { setContact(product); setContactQuantity(String(product.minimum_order_quantity)); setContactMessage(`Hello, I'm interested in ${product.name}. Please share bulk pricing and availability.`); }}>Contact seller</button></div></div></article>)}</div>
      </section>
    </>}

    {tab === "sell" && <main className="seller-layout">
      <div className="seller-heading"><div className="eyebrow">Your craft, your story</div><h1>Create a product listing</h1><p>Share a little about your work. We’ll help you present it beautifully and price it fairly.</p></div>
      <SignedOut><div className="form-card seller-signin-card"><h2>Sign in to create your artisan shop</h2><p>Use your Clerk account to publish product listings and reply to buyers.</p><SignInButton mode="modal"><button className="button">Sign in to continue</button></SignInButton></div></SignedOut>
      <SignedIn><form className="listing-workspace" onSubmit={publishListing}>
        <div className="listing-form-main"><section className="form-card">
          <ProductPhotoUpload image={form.image} enhancing={enhancing} onSelect={uploadImage} onEnhance={()=>void enhanceImage()} onRemove={()=>setField("image","")}/>
          <div className="form-grid listing-details-grid">
            <label className="field"><span>What do you call it?</span><input required minLength={2} maxLength={180} value={form.name} onChange={(e)=>setField("name",e.target.value)} placeholder="e.g. Hand-painted Madhubani fish"/></label>
            <label className="field"><span>Craft category</span><select value={form.category} onChange={(e)=>setField("category",e.target.value)}>{categories.slice(1).map((item)=><option key={item}>{item}</option>)}</select></label>
            <label className="field full"><span>Tell buyers about your creation</span><textarea required maxLength={5000} value={form.description} onChange={(e)=>setField("description",e.target.value)} placeholder="What makes it special? What materials and techniques did you use?"/></label>
            <label className="field"><span>Hours spent making it</span><input type="number" min="0" step="0.5" value={form.hours} onChange={(e)=>setField("hours",e.target.value)} placeholder="e.g. 8"/></label>
            <label className="field"><span>Years in your craft</span><input type="number" min="0" value={form.experience} onChange={(e)=>setField("experience",e.target.value)} placeholder="e.g. 12"/></label>
            <label className="field"><span>Pieces available</span><input type="number" min="0" value={form.quantity} onChange={(e)=>setField("quantity",e.target.value)}/></label>
            <label className="field"><span>Minimum bulk order</span><input required type="number" min="1" value={form.minimum} onChange={(e)=>setField("minimum",e.target.value)}/></label>
            <label className="field"><span>Bulk order lead time</span><input value={form.leadTime} onChange={(e)=>setField("leadTime",e.target.value)} placeholder="e.g. 2–3 weeks"/></label>
            <label className="field"><span>Your making cost (₹)</span><input type="number" min="0" value={form.cost} onChange={(e)=>setField("cost",e.target.value)} placeholder="Materials + other costs"/></label>
          </div>
          <p className="form-note"><Sparkles size={13}/> Gemini enhancement requires your own GEMINI_API_KEY in web/.env.local.</p>
          <button className="button" type="submit" disabled={saving}>{saving?"Publishing…":"Publish listing"}</button>
        </section></div>
        <FairPriceGuide range={suggestedRange} cost={form.cost} hours={form.hours} experience={form.experience} price={form.price} setPrice={(value)=>setField("price",value)}/>
      </form></SignedIn>
    </main>}

    {tab === "inquiries" && <main className="inbox"><div className="eyebrow">Buyer and seller conversations</div><h1>Enquiries</h1><SignedOut><div className="form-card"><p>Sign in to view your buyer requests and seller replies.</p><SignInButton mode="modal"><button className="button">Sign in</button></SignInButton></div></SignedOut><SignedIn>{inquiries.length === 0 ? <div className="empty">No enquiries yet. Contact a seller or publish a listing to get started.</div> : inquiries.map((item) => <article className="inquiry-card" key={item.id}><strong>{item.product_name} · {item.quantity} units</strong><p>{item.message}</p><div className="inquiry-meta">{item.status} · {new Date(item.created_at).toLocaleDateString()}</div>{item.seller_reply && <p><strong>Seller reply:</strong> {item.seller_reply}</p>}{item.seller_id === userId && <button className="button soft" onClick={() => void replyTo(item)}><MessageCircle size={15}/> Reply to buyer</button>}</article>)}</SignedIn></main>}

    <footer className="footer">Kaari Works · Handmade, directly from artisans</footer><BuyerEstimateChat />
    {contact && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setContact(null); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="contact-title"><div className="modal-head"><h2 id="contact-title">Contact the artisan</h2><button className="icon-button" onClick={() => setContact(null)} aria-label="Close"><X size={18}/></button></div><p>Ask {contact.seller_name || "the artisan"} about <strong>{contact.name}</strong>.</p><form className="form-grid" onSubmit={sendInquiry}><label className="field"><span>Quantity (minimum {contact.minimum_order_quantity})</span><input type="number" required min={contact.minimum_order_quantity} value={contactQuantity} onChange={(e) => setContactQuantity(e.target.value)} /></label><label className="field full"><span>Message</span><textarea required minLength={2} maxLength={3000} value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} /></label><button className="button field full" disabled={saving}>{saving ? "Sending…" : "Send enquiry"}</button></form><SignedOut><p className="form-note">You’ll be asked to sign in before your enquiry is sent.</p><SignInButton mode="modal"><button className="button outline">Sign in first</button></SignInButton></SignedOut></section></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </div>;
}
