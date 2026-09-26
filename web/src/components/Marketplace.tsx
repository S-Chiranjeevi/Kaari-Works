"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Sparkles, MessageCircle, Search, ShoppingBag, Store, Package, User, X, ClipboardList, ShoppingCart, CheckCircle, Clock, Truck, XCircle, Edit, Trash2, Eye, Plus, AlertCircle, BarChart3 } from "lucide-react";
import EditProductModal, { type EditableProduct } from "@/components/EditProductModal";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { FairPriceGuide, ProductPhotoUpload } from "@/components/SellerListingControls";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VoiceNav from "@/components/VoiceNav";
import ProductDetailModal, { type ProductDetail } from "@/components/ProductDetailModal";
import CartSidebar, { type Cart } from "@/components/CartSidebar";
import CheckoutSidebar, { type CheckoutItem } from "@/components/CheckoutSidebar";
import { LangProvider, useLang } from "@/lib/i18n";
import { VoiceAction } from "@/lib/voiceCommands";

type Product = {
  id: number; name: string; category: string; description: string; materials: string | null;
  seller_name: string | null; seller_id: string; price_inr: number;
  making_cost_inr?: number | null;
  hours_to_make?: number | null;
  craft_experience_years?: number | null;
  minimum_order_quantity: number; quantity_available: number; lead_time: string | null;
  image_url: string | null; images?: string[];
};
type Inquiry = {
  id: number; product_id: number; product_name: string; buyer_id: string; seller_id: string;
  quantity: number; message: string; status: string; seller_reply: string | null; created_at: string;
};
type Order = {
  id: number; status: string; total_amount_inr: number; shipping_address: string | null;
  notes: string | null; created_at: string;
  items: Array<{ id: number; product_id: number; product_name: string; seller_name: string | null; quantity: number; price_inr: number; subtotal_inr: number }>;
};
type SellerProduct = Product & {
  status: string;
  inquiries_count: number;
  orders_count: number;
  units_sold: number;
  revenue_inr: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
};
type SellerSummary = {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_inquiries: number;
  total_orders: number;
  total_units_sold: number;
  total_revenue_inr: number;
};
type ListingForm = {
  name: string; category: string; description: string; price: string; cost: string;
  hours: string; experience: string; quantity: string; minimum: string; leadTime: string;
  image: string; images: string[];
};

const blankForm: ListingForm = {
  name: "", category: "Textiles", description: "", price: "", cost: "",
  hours: "", experience: "", quantity: "20", minimum: "5", leadTime: "",
  image: "", images: [],
};

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

const FEATURED_ARTISANS = [
  { name: "Sita Devi",   craft: "Madhubani Paintings",   region: "Madhubani, Bihar",  price: 1200, icon: "🎨", color: "#f5e2cf", product: "Madhubani Story Panel" },
  { name: "Razia Khatri",craft: "Ajrakh Block Print",    region: "Kutch, Gujarat",    price: 980,  icon: "🧵", color: "#ead9d5", product: "Ajrakh Cotton Table Runner" },
  { name: "Imran Khan",  craft: "Blue Pottery",          region: "Jaipur, Rajasthan", price: 1450, icon: "🏺", color: "#dce9ef", product: "Blue Pottery Serving Bowl" },
  { name: "Lakshmi SHG", craft: "Natural Fibre Weaving", region: "Kerala",            price: 850,  icon: "🧺", color: "#eee1c9", product: "Handwoven Market Basket" },
  { name: "Ravi Kumar",  craft: "Teak Woodcarving",      region: "Saharanpur, UP",    price: 1750, icon: "🪵", color: "#ead7bd", product: "Carved Teak Desk Tray" },
];

const ORDER_STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock size={14} color="#f59e0b"/>,
  confirmed: <CheckCircle size={14} color="#13866c"/>,
  shipped:   <Truck size={14} color="#3b82f6"/>,
  delivered: <CheckCircle size={14} color="#059669"/>,
  cancelled: <XCircle size={14} color="#ef4444"/>,
};

function MarketplaceInner() {
  const { t } = useLang();
  const { isSignedIn, userId, getToken } = useAuth();
  const [tab, setTab] = useState<"discover" | "sell" | "inquiries" | "enquiry">("discover");
  const [products, setProducts] = useState<Product[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [category, setCategory] = useState("All crafts");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [notice, setNotice] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLastSaved, setDraftLastSaved] = useState<string | null>(null);

  // Seller product tracking & management state
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [sellerSummary, setSellerSummary] = useState<SellerSummary>({
    total_products: 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
    total_inquiries: 0,
    total_orders: 0,
    total_units_sold: 0,
    total_revenue_inr: 0,
  });
  const [sellerView, setSellerView] = useState<"inventory" | "add">("inventory");
  const [sellerFilter, setSellerFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sellerSearch, setSellerSearch] = useState("");
  const [loadingSellerProducts, setLoadingSellerProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [form, setForm] = useState(blankForm);
  const [contact, setContact] = useState<Product | null>(null);
  const [contactQuantity, setContactQuantity] = useState("10");
  const [contactMessage, setContactMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[] | null>(null);

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
    } finally { setLoading(false); }
  }, [api, category, search, t]);

  const loadInquiries = useCallback(async () => {
    if (!isSignedIn) return setInquiries([]);
    try { setInquiries(await api("/api/inquiries", {}, true)); }
    catch { /* silent */ }
  }, [api, isSignedIn]);

  const loadOrders = useCallback(async () => {
    if (!isSignedIn) return setOrders([]);
    try { setOrders(await api("/api/orders", {}, true)); }
    catch { /* silent */ }
  }, [api, isSignedIn]);

  const loadSellerProducts = useCallback(async () => {
    if (!isSignedIn) return;
    setLoadingSellerProducts(true);
    try {
      const res = await api("/api/products/seller", {}, true);
      if (res) {
        setSellerProducts(res.products || []);
        if (res.summary) setSellerSummary(res.summary);
      }
    } catch {
      // silent
    } finally {
      setLoadingSellerProducts(false);
    }
  }, [api, isSignedIn]);

  async function handleDeleteProduct(productId: number, productName: string) {
    if (!window.confirm(`Are you sure you want to permanently delete "${productName}"? This will remove it from the marketplace.`)) {
      return;
    }
    try {
      await api(`/api/products/${productId}`, { method: "DELETE" }, true);
      flash(`✓ "${productName}" has been deleted.`);
      await loadSellerProducts();
      await loadProducts();
      if (selectedProduct?.id === productId) setSelectedProduct(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not delete product.");
    }
  }

  const loadCart = useCallback(async () => {
    if (!isSignedIn) return;
    try { setCart(await api("/api/cart", {}, true)); }
    catch { /* silent */ }
  }, [api, isSignedIn]);

  const loadDraft = useCallback(async () => {
    let localDraft: ListingForm | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("kaari_seller_draft");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            localDraft = {
              name: parsed.name || "",
              category: parsed.category || "Textiles",
              description: parsed.description || "",
              price: parsed.price || "",
              cost: parsed.cost || "",
              hours: parsed.hours || "",
              experience: parsed.experience || "",
              quantity: parsed.quantity || "20",
              minimum: parsed.minimum || "5",
              leadTime: parsed.leadTime || "",
              image: parsed.image || "",
              images: Array.isArray(parsed.images) && parsed.images.length > 0 ? parsed.images : (parsed.image ? [parsed.image] : []),
            };
          }
        }
      } catch {
        // ignore
      }
    }

    if (isSignedIn) {
      try {
        const res = await api("/api/products/draft", {}, true);
        if (res?.draft) {
          const d = res.draft;
          const loadedForm: ListingForm = {
            name: d.name || "",
            category: d.category || "Textiles",
            description: d.description || "",
            price: d.price || "",
            cost: d.cost || "",
            hours: d.hours || "",
            experience: d.experience || "",
            quantity: d.quantity || "20",
            minimum: d.minimum || "5",
            leadTime: d.leadTime || "",
            image: d.image || "",
            images: Array.isArray(d.images) && d.images.length > 0 ? d.images : (d.image ? [d.image] : []),
          };
          setForm(loadedForm);
          setHasDraft(true);
          if (d.updatedAt) {
            setDraftLastSaved(new Date(d.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
          if (typeof window !== "undefined") {
            try { localStorage.setItem("kaari_seller_draft", JSON.stringify(loadedForm)); } catch {}
          }
          return;
        }
      } catch {
        // fallback to localDraft
      }
    }

    if (localDraft) {
      setForm(localDraft);
      setHasDraft(true);
    }
  }, [api, isSignedIn]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadInquiries(); }, [loadInquiries]);
  useEffect(() => { void loadOrders(); void loadCart(); }, [loadOrders, loadCart]);
  useEffect(() => { void loadDraft(); }, [loadDraft]);
  useEffect(() => {
    if (tab === "sell") {
      void loadDraft();
      if (isSignedIn) void loadSellerProducts();
    }
  }, [tab, isSignedIn, loadDraft, loadSellerProducts]);

  const filteredSellerProducts = useMemo(() => {
    return sellerProducts.filter((p) => {
      if (sellerFilter !== "all" && p.stock_status !== sellerFilter) return false;
      if (sellerSearch.trim()) {
        const q = sellerSearch.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      return true;
    });
  }, [sellerProducts, sellerFilter, sellerSearch]);

  // Auto-sync form changes to localStorage so accidental refresh or closing tab preserves entered details
  useEffect(() => {
    const hasContent = form.name.trim() || form.images.length > 0 || form.price || form.description.trim();
    if (hasContent && typeof window !== "undefined") {
      const timer = setTimeout(() => {
        try { localStorage.setItem("kaari_seller_draft", JSON.stringify(form)); } catch {}
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [form]);

  // Search on Enter or after 600ms debounce
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 600);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const suggestedRange = useMemo(() => {
    const cost = Number(form.cost) || 0, hours = Number(form.hours) || 0, experience = Number(form.experience) || 0;
    if (!cost && !hours) return null;
    const base = (cost + hours * 75) * (1 + Math.min(experience * 0.025, 0.2)) * 1.1;
    const low = Math.max(cost * 1.15, Math.round(base * 1.15 / 10) * 10);
    return { low: Math.round(low), high: Math.max(Math.round(low) + 50, Math.round(base * 1.4 / 10) * 10) };
  }, [form.cost, form.hours, form.experience]);

  const setField = (field: keyof ListingForm, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(""), 4000); };

  // ── Cart actions ──────────────────────────────────────────────────────────
  async function addToCart(productId: number, quantity: number) {
    const updated = await api("/api/cart", { method: "POST", body: JSON.stringify({ product_id: productId, quantity }) }, true);
    setCart(updated);
    setCartOpen(true);
    setSelectedProduct(null);
  }

  async function updateCartQty(itemId: number, quantity: number) {
    await api(`/api/cart/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }, true);
    await loadCart();
  }

  async function removeFromCart(itemId: number) {
    await api(`/api/cart/${itemId}`, { method: "DELETE" }, true);
    await loadCart();
  }

  async function clearCart() {
    await api("/api/cart", { method: "DELETE" }, true);
    setCart(null);
  }

  // ── Order actions ─────────────────────────────────────────────────────────
  async function placeOrderFromCart(shippingAddress: string, notes: string) {
    await api("/api/orders", { method: "POST", body: JSON.stringify({ from_cart: true, shipping_address: shippingAddress, notes }) }, true);
    await loadCart();
    await loadOrders();
    setCartOpen(false);
    flash("✓ Order placed! Check the Orders tab.");
    setTab("inquiries");
  }

  async function buyNow(productId: number, quantity: number) {
    const p = products.find(prod => prod.id === productId) || selectedProduct;
    if (!p) return;
    setCheckoutItems([{
      product_id: productId,
      product_name: p.name,
      quantity,
      price_inr: p.price_inr,
    }]);
    setSelectedProduct(null);
  }

  async function confirmBuyNow(shippingAddress: string, notes: string) {
    if (!checkoutItems) return;
    await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({ items: checkoutItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })), shipping_address: shippingAddress, notes }),
    }, true);
    await loadOrders();
    setCheckoutItems(null);
    flash("✓ Order placed! Check the Orders tab.");
    setTab("inquiries");
  }

  // ── Open product detail ───────────────────────────────────────────────────
  async function openProduct(id: number) {
    try {
      const p = await api(`/api/products/${id}`);
      setSelectedProduct(p);
      if (typeof window !== "undefined") {
        window.history.pushState({ productId: id }, "", `/products/${id}`);
      }
    } catch { flash("Could not load product details."); }
  }

  // ── Multi-image Upload & Compression ──────────────────────────────────────
  function compressPhoto(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(String(e.target?.result));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.84));
        };
        img.onerror = () => resolve(String(e.target?.result));
        img.src = String(e.target?.result);
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  async function handleAddImages(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (validFiles.length === 0) return flash(t("noticeImageType"));

    const newPhotos = await Promise.all(validFiles.map(compressPhoto));
    const cleanPhotos = newPhotos.filter(Boolean);

    setForm((prev) => {
      const updated = [...prev.images, ...cleanPhotos];
      return {
        ...prev,
        images: updated,
        image: updated[0] || "",
      };
    });
    flash(`Added ${cleanPhotos.length} photo${cleanPhotos.length > 1 ? "s" : ""}!`);
  }

  function handleRemoveImage(index: number) {
    setForm((prev) => {
      const updated = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: updated,
        image: updated[0] || "",
      };
    });
  }

  async function enhanceImage(index = 0) {
    const targetImg = form.images[index] || form.image;
    if (!targetImg) return flash(t("noticeNoImage"));
    setEnhancing(true);
    try {
      const result = await api("/api/ai/enhance-image", { method: "POST", body: JSON.stringify({ image: targetImg }) }, true);
      setForm((prev) => {
        const updated = [...prev.images];
        if (updated.length > 0) updated[index] = result.image;
        else updated.push(result.image);
        return { ...prev, images: updated, image: updated[0] || "" };
      });
      flash(t("noticeEnhanced"));
    } catch (error) { flash(error instanceof Error ? error.message : t("noticeEnhanceFail")); }
    finally { setEnhancing(false); }
  }

  async function saveDraft() {
    setDraftSaving(true);
    try {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kaari_seller_draft", JSON.stringify(form));
        } catch {}
      }

      if (isSignedIn) {
        await api("/api/products/draft", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            category: form.category,
            description: form.description,
            price: form.price,
            cost: form.cost,
            hours: form.hours,
            experience: form.experience,
            quantity: form.quantity,
            minimum: form.minimum,
            leadTime: form.leadTime,
            image: form.image,
            images: form.images,
          }),
        }, true);
      }

      setHasDraft(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setDraftLastSaved(timeStr);
      flash("✓ Draft saved! Your images and product details are safely preserved.");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Draft saved locally.");
    } finally {
      setDraftSaving(false);
    }
  }

  async function discardDraft() {
    if (!window.confirm("Are you sure you want to discard this draft and reset the form?")) return;
    try {
      if (isSignedIn) {
        await api("/api/products/draft", { method: "DELETE" }, true).catch(() => {});
      }
    } catch {}
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("kaari_seller_draft"); } catch {}
    }
    setForm(blankForm);
    setHasDraft(false);
    setDraftLastSaved(null);
    flash("Draft discarded.");
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
        lead_time: form.leadTime || null,
        image_url: form.images.length > 0 ? JSON.stringify(form.images) : (form.image || null),
        images: form.images,
      }) }, true);

      // Clean up draft in local storage and database
      if (typeof window !== "undefined") {
        try { localStorage.removeItem("kaari_seller_draft"); } catch {}
      }
      if (isSignedIn) {
        await api("/api/products/draft", { method: "DELETE" }, true).catch(() => {});
      }
      setHasDraft(false);
      setDraftLastSaved(null);

      setForm(blankForm); flash(t("noticePublished")); setSellerView("inventory"); await loadSellerProducts(); setTab("discover"); await loadProducts();
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
    cat.toLowerCase().includes("pottery") ? "🏺" : cat.toLowerCase().includes("jewel") ? "💍" :
    cat.toLowerCase().includes("wood") ? "🪵" : "🧵";

  function handleVoiceAction(action: VoiceAction) {
    switch (action) {
      case "nav:buy":          setTab("discover"); break;
      case "nav:sell":         setTab("sell"); break;
      case "nav:orders":       setTab("inquiries"); break;
      case "nav:enquiry":      setTab("enquiry"); break;
      case "nav:signin":       window.location.href = "/sign-in"; break;
      case "nav:signup":       window.location.href = "/sign-up"; break;
      case "chat:open":        window.dispatchEvent(new CustomEvent("kaari:voice-chat-open")); break;
      case "chat:close":       window.dispatchEvent(new CustomEvent("kaari:voice-chat-close")); break;
      case "scroll:top":       window.scrollTo({ top: 0, behavior: "smooth" }); break;
      case "scroll:catalogue": document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); break;
      case "search:focus":     document.querySelector<HTMLInputElement>(".search-bar-input")?.focus(); break;
      case "help":             break;
    }
  }

  const cartCount = cart?.item_count ?? 0;

  return <div className="page-shell">

    {/* ── Top navigation bar ── */}
    <header className="site-header top-nav-bar">
      <a href="#top" className="brand"><span className="brand-mark">✿</span><span>Kaari<span className="brand-accent">Works</span></span></a>
      <nav className="top-nav-tabs" aria-label="Main navigation">
        <button className={`top-nav-item ${tab === "discover" ? "top-nav-item--active" : ""}`} onClick={() => setTab("discover")}>
          <ShoppingBag size={22}/><span>{t("navBuy")}</span>
        </button>
        <button className={`top-nav-item ${tab === "sell" ? "top-nav-item--active" : ""}`} onClick={() => setTab("sell")}>
          <Store size={22}/><span>{t("navSell")}</span>
        </button>
        <button className={`top-nav-item ${tab === "inquiries" ? "top-nav-item--active" : ""}`} onClick={() => setTab("inquiries")}>
          <Package size={22}/><span>{t("navOrders")}</span>
        </button>
        <button className={`top-nav-item ${tab === "enquiry" ? "top-nav-item--active" : ""}`} onClick={() => setTab("enquiry")}>
          <ClipboardList size={22}/><span>{t("navEnquiries")}</span>
        </button>
        <div className="top-nav-item top-nav-lang"><LanguageSwitcher /></div>
        <div className="top-nav-item top-nav-voice"><VoiceNav onAction={handleVoiceAction} /></div>
        {/* Cart button */}
        <SignedIn>
          <button className="top-nav-item cart-nav-btn" onClick={() => setCartOpen(true)}>
            <span className="cart-icon-wrap">
              <ShoppingCart size={22}/>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </span>
            <span>Cart</span>
          </button>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="redirect"><button className="top-nav-item"><User size={22}/><span>{t("navProfile")}</span></button></SignInButton>
        </SignedOut>
        <SignedIn><div className="top-nav-item top-nav-profile"><UserButton /></div></SignedIn>
      </nav>
    </header>

    {/* ── Discover / Buy tab ── */}
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
        {/* Search bar */}
        <div className="search-bar-wrapper">
          <Search size={18} className="search-bar-icon"/>
          <input
            className="search-bar-input"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            placeholder={t("searchPlaceholder")}
          />
          {searchInput && (
            <button className="search-bar-clear" onClick={() => { setSearchInput(""); setSearch(""); }} aria-label="Clear search"><X size={16}/></button>
          )}
        </div>

        {/* Category icon grid */}
        <div className="section-head-simple"><h2>{t("catalogueHeading")}</h2></div>
        <div className="cat-icon-grid">
          {CATEGORY_ICONS.map(({ key, eng, emoji, bg }) => (
            <button key={eng} className={`cat-icon-btn ${category === eng ? "cat-icon-btn--active" : ""}`} onClick={() => setCategory(eng)} aria-pressed={category === eng}>
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
              <div className="featured-card-art">{a.icon}</div>
              <div className="featured-card-body">
                <span className="featured-card-category">{a.craft}</span>
                <strong className="featured-card-name">{a.product}</strong>
                <div className="featured-card-seller">{t("madeBy")} {a.name}</div>
                <div className="featured-card-region">{a.region}</div>
                <div className="featured-card-foot"><span className="featured-price">₹{a.price.toLocaleString("en-IN")}</span></div>
              </div>
            </article>
          ))}
        </div>

        {/* Product grid */}
        <div className="product-grid" style={{marginTop: "24px"}}>
          {loading
            ? <div className="empty">{t("loading")}</div>
            : products.length === 0
              ? <div className="empty">{search ? `No results for "${search}"` : t("emptyProducts")}</div>
              : products.map((product) => (
                <article className="product-card product-card--clickable product-card--split" key={product.id} onClick={() => openProduct(product.id)}>
                  <div className="product-art product-art--half">
                    {product.image_url ? <img src={product.image_url} alt={product.name}/> : <span aria-hidden="true">{productIcon(product.category)}</span>}
                    <span className="category-label">{product.category}</span>
                    {product.quantity_available <= 0 && <span className="out-of-stock-badge">Out of stock</span>}
                  </div>
                  <div className="product-body product-body--half">
                    <h3>{product.name}</h3>
                    <div className="seller-name">{t("madeBy")} {product.seller_name || t("independentArtisan")}</div>
                    <p className="product-description">{product.description || `Handmade ${product.category.toLowerCase()}.`}</p>
                    {/* Detail chips */}
                    <div className="product-chips">
                      <span className="product-chip">📦 Min. {product.minimum_order_quantity}</span>
                      {product.quantity_available > 0
                        ? <span className="product-chip product-chip--green">✓ {product.quantity_available} in stock</span>
                        : <span className="product-chip product-chip--red">Out of stock</span>}
                      {product.lead_time && (
                        <span className="product-chip">
                          🕐 {String(product.lead_time).match(/day|week|month|hr|hour/i) ? product.lead_time : `${product.lead_time} days`}
                        </span>
                      )}
                    </div>
                    <div className="product-foot">
                      <div className="product-price">₹{product.price_inr.toLocaleString("en-IN")}<small> / piece</small></div>
                      <div className="product-card-actions">
                        <button
                          type="button"
                          className="ask-kaari-btn"
                          title="Ask Kaari AI to estimate cost & time"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent("kaari:estimate-product", {
                              detail: {
                                name: product.name,
                                category: product.category,
                                description: product.description,
                                price_inr: product.price_inr,
                                lead_time: product.lead_time,
                                quantity_available: product.quantity_available,
                                minimum_order_quantity: product.minimum_order_quantity,
                              }
                            }));
                          }}
                        >
                          <Sparkles size={12} /> Ask Kaari
                        </button>
                        <button className="button" style={{fontSize:11,padding:"6px 12px"}} onClick={(e) => { e.stopPropagation(); openProduct(product.id); }}>View & Buy</button>
                      </div>
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
        <h1>{t("sellHeading")}</h1><p>{t("sellSub")}</p>
      </div>
      <SignedOut>
        <div className="form-card seller-signin-card">
          <h2>{t("sellSignInCard")}</h2><p>{t("sellSignInNote")}</p>
          <SignInButton mode="redirect"><button className="button">{t("sellSignInBtn")}</button></SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        {/* Subnavigation: Toggle between Inventory Tracker & Create Listing */}
        <div className="seller-nav-tabs">
          <button
            type="button"
            className={`seller-nav-tab ${sellerView === "inventory" ? "seller-nav-tab--active" : ""}`}
            onClick={() => setSellerView("inventory")}
          >
            <Package size={17} />
            <span>My Products & Inventory ({sellerProducts.length})</span>
          </button>
          <button
            type="button"
            className={`seller-nav-tab ${sellerView === "add" ? "seller-nav-tab--active" : ""}`}
            onClick={() => setSellerView("add")}
          >
            <Plus size={17} />
            <span>Add New Listing</span>
          </button>
        </div>

        {/* ── View 1: Inventory Tracker & Monitor ── */}
        {sellerView === "inventory" && (
          <section className="seller-inventory-section">
            {/* KPI Metrics Tracking Bar */}
            <div className="seller-metrics-grid">
              <div className="seller-metric-card">
                <div className="seller-metric-header">
                  <span>Total Listings</span>
                  <Package size={17} color="#13866c" />
                </div>
                <div className="seller-metric-value">{sellerSummary.total_products}</div>
                <div className="seller-metric-sub">Handmade craft items</div>
              </div>

              <div className="seller-metric-card">
                <div className="seller-metric-header">
                  <span>In Stock</span>
                  <CheckCircle size={17} color="#059669" />
                </div>
                <div className="seller-metric-value" style={{ color: "#059669" }}>
                  {sellerSummary.in_stock}
                </div>
                <div className="seller-metric-sub">&gt; 5 available pieces</div>
              </div>

              <div className="seller-metric-card">
                <div className="seller-metric-header">
                  <span>Stock Alerts</span>
                  <AlertCircle size={17} color={sellerSummary.low_stock + sellerSummary.out_of_stock > 0 ? "#d97706" : "#6d847c"} />
                </div>
                <div className="seller-metric-value" style={{ color: sellerSummary.low_stock + sellerSummary.out_of_stock > 0 ? "#d97706" : "#122c26" }}>
                  {sellerSummary.low_stock + sellerSummary.out_of_stock}
                </div>
                <div className="seller-metric-sub">
                  {sellerSummary.low_stock} low, {sellerSummary.out_of_stock} out of stock
                </div>
              </div>

              <div className="seller-metric-card">
                <div className="seller-metric-header">
                  <span>Inquiries Received</span>
                  <MessageCircle size={17} color="#2563eb" />
                </div>
                <div className="seller-metric-value" style={{ color: "#2563eb" }}>
                  {sellerSummary.total_inquiries}
                </div>
                <div className="seller-metric-sub">Buyer custom inquiries</div>
              </div>

              <div className="seller-metric-card">
                <div className="seller-metric-header">
                  <span>Sales Revenue</span>
                  <BarChart3 size={17} color="#0d6654" />
                </div>
                <div className="seller-metric-value" style={{ color: "#0d6654", fontSize: "22px" }}>
                  ₹{sellerSummary.total_revenue_inr.toLocaleString("en-IN")}
                </div>
                <div className="seller-metric-sub">
                  {sellerSummary.total_units_sold} craft units sold
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="seller-filter-bar">
              <div className="seller-search-box">
                <Search size={16} className="seller-search-icon" />
                <input
                  type="text"
                  placeholder="Search your products by title or category..."
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                  className="seller-search-input"
                />
              </div>

              <div className="seller-status-filters">
                <button
                  type="button"
                  className={`seller-filter-chip ${sellerFilter === "all" ? "seller-filter-chip--active" : ""}`}
                  onClick={() => setSellerFilter("all")}
                >
                  All ({sellerProducts.length})
                </button>
                <button
                  type="button"
                  className={`seller-filter-chip ${sellerFilter === "in_stock" ? "seller-filter-chip--active" : ""}`}
                  onClick={() => setSellerFilter("in_stock")}
                >
                  In Stock ({sellerSummary.in_stock})
                </button>
                <button
                  type="button"
                  className={`seller-filter-chip ${sellerFilter === "low_stock" ? "seller-filter-chip--active" : ""}`}
                  onClick={() => setSellerFilter("low_stock")}
                >
                  Low Stock ({sellerSummary.low_stock})
                </button>
                <button
                  type="button"
                  className={`seller-filter-chip ${sellerFilter === "out_of_stock" ? "seller-filter-chip--active" : ""}`}
                  onClick={() => setSellerFilter("out_of_stock")}
                >
                  Out of Stock ({sellerSummary.out_of_stock})
                </button>
              </div>
            </div>

            {/* Inventory List / Grid */}
            {loadingSellerProducts ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#60726d" }}>
                <p style={{ fontWeight: 600 }}>Loading your product inventory...</p>
              </div>
            ) : filteredSellerProducts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 24px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1.5px dashed #cbdad4",
                }}
              >
                <Package size={44} color="#94aca3" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ margin: "0 0 6px", color: "#192824", fontSize: "1.15rem" }}>
                  {sellerProducts.length === 0 ? "No products listed yet" : "No matching products found"}
                </h3>
                <p style={{ margin: "0 0 20px", color: "#60726d", fontSize: "0.9rem" }}>
                  {sellerProducts.length === 0
                    ? "Start showcasing your artisanal craft to thousands of buyers."
                    : "Try clearing your search query or status filter."}
                </p>
                {sellerProducts.length === 0 ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => setSellerView("add")}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={16} /> Create Your First Listing
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => { setSellerSearch(""); setSellerFilter("all"); }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="seller-inventory-grid">
                {filteredSellerProducts.map((p) => {
                  const displayImg = p.images?.[0] || p.image_url || "";
                  const photosCount = p.images?.length || (p.image_url ? 1 : 0);
                  const statusPillClass =
                    p.status === "draft"
                      ? "stock-pill--draft"
                      : p.stock_status === "out_of_stock"
                      ? "stock-pill--out"
                      : p.stock_status === "low_stock"
                      ? "stock-pill--low"
                      : "stock-pill--instock";

                  const statusPillText =
                    p.status === "draft"
                      ? "🟡 Draft"
                      : p.stock_status === "out_of_stock"
                      ? "🔴 Out of Stock"
                      : p.stock_status === "low_stock"
                      ? `🟠 Low Stock (${p.quantity_available})`
                      : `🟢 In Stock (${p.quantity_available})`;

                  return (
                    <div key={p.id} className="seller-inv-card">
                      <div className="seller-inv-cover-wrap">
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={p.name}
                            className="seller-inv-cover-img"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23eee'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='12'>No image</text></svg>";
                            }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#8aa098" }}>
                            <span>No photo uploaded</span>
                          </div>
                        )}
                        <span className={`seller-inv-status-badge ${statusPillClass}`}>
                          {statusPillText}
                        </span>
                        {photosCount > 1 && (
                          <span className="seller-inv-photos-badge">
                            📷 {photosCount} photos
                          </span>
                        )}
                      </div>

                      <div className="seller-inv-body">
                        <span className="seller-inv-cat">{p.category}</span>
                        <h3 className="seller-inv-title" title={p.name}>{p.name}</h3>

                        <div className="seller-inv-price-row">
                          <span className="seller-inv-price">₹{p.price_inr.toLocaleString("en-IN")}</span>
                          {p.making_cost_inr != null && (
                            <span className="seller-inv-cost">
                              Cost: ₹{p.making_cost_inr.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {/* Live Inventory & Performance Tracking */}
                        <div className="seller-inv-stats-box">
                          <div className="seller-inv-stat-item">
                            <span className="seller-inv-stat-label">Available Stock</span>
                            <span className="seller-inv-stat-val">
                              {p.quantity_available} pcs (min {p.minimum_order_quantity})
                            </span>
                          </div>
                          <div className="seller-inv-stat-item">
                            <span className="seller-inv-stat-label">Inquiries</span>
                            <span className="seller-inv-stat-val">
                              💬 {p.inquiries_count || 0} received
                            </span>
                          </div>
                          <div className="seller-inv-stat-item">
                            <span className="seller-inv-stat-label">Orders Placed</span>
                            <span className="seller-inv-stat-val">
                              🛒 {p.orders_count || 0} ({p.units_sold || 0} units)
                            </span>
                          </div>
                          <div className="seller-inv-stat-item">
                            <span className="seller-inv-stat-label">Sales Revenue</span>
                            <span className="seller-inv-stat-val" style={{ color: "#0d6654" }}>
                              ₹{(p.revenue_inr || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons: Edit, Delete, View */}
                        <div className="seller-inv-actions">
                          <button
                            type="button"
                            className="seller-inv-btn-edit"
                            onClick={() => setEditingProduct(p as unknown as EditableProduct)}
                          >
                            <Edit size={14} />
                            <span>Edit Details</span>
                          </button>
                          <button
                            type="button"
                            className="seller-inv-btn-delete"
                            title="Delete this product"
                            onClick={() => void handleDeleteProduct(p.id, p.name)}
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="seller-inv-btn-view"
                            title="View buyer listing preview"
                            onClick={() => void openProduct(p.id)}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── View 2: Add New Listing Form ── */}
        {sellerView === "add" && (
          <form className="listing-workspace" onSubmit={publishListing}>
            <div className="listing-form-main"><section className="form-card">
              {hasDraft && (
                <div className="draft-banner" style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "linear-gradient(135deg, rgba(19, 134, 108, 0.08), rgba(19, 134, 108, 0.03))",
                  border: "1px solid rgba(19, 134, 108, 0.25)",
                  borderRadius: "10px",
                  marginBottom: "20px",
                  fontSize: "0.88rem",
                  color: "#13866c",
                  flexWrap: "wrap",
                  gap: "8px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.1rem" }}>💾</span>
                    <span>
                      <strong>Saved draft active</strong>
                      {draftLastSaved ? ` · Last saved at ${draftLastSaved}` : ""}
                      {" — your uploaded images and details are preserved."}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={discardDraft}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc3545",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      textDecoration: "underline",
                      padding: "4px 8px",
                    }}
                  >
                    Discard draft
                  </button>
                </div>
              )}
              <ProductPhotoUpload
                images={form.images}
                image={form.image}
                enhancing={enhancing}
                onAddImages={handleAddImages}
                onRemoveImage={handleRemoveImage}
                onSelect={(file) => file && handleAddImages([file])}
                onEnhance={() => void enhanceImage(0)}
                onRemove={() => setForm((prev) => ({ ...prev, images: [], image: "" }))}
              />
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
                <label className="field"><span>Your selling price (₹)</span><input required type="number" min="1" value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="e.g. 1200"/></label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "24px", flexWrap: "wrap" }}>
                <button className="button" type="submit" disabled={saving || draftSaving} style={{ minWidth: "160px" }}>
                  {saving ? t("publishingBtn") : "🚀 " + t("publishBtn")}
                </button>
                <button
                  type="button"
                  className="button outline"
                  onClick={saveDraft}
                  disabled={saving || draftSaving}
                  style={{
                    borderColor: "#13866c",
                    color: "#13866c",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    minWidth: "150px",
                  }}
                >
                  {draftSaving ? "Saving..." : "💾 Save as draft"}
                </button>
                {hasDraft && (
                  <button
                    type="button"
                    onClick={discardDraft}
                    disabled={saving || draftSaving}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#888",
                      cursor: "pointer",
                      fontSize: "0.86rem",
                      marginLeft: "auto",
                      padding: "6px 10px",
                      textDecoration: "underline",
                    }}
                  >
                    Discard draft
                  </button>
                )}
              </div>
            </section></div>
            <FairPriceGuide range={suggestedRange} cost={form.cost} hours={form.hours} experience={form.experience} price={form.price} setPrice={(v) => setField("price", v)}/>
          </form>
        )}
      </SignedIn>
    </main>}

    {/* ── Orders tab ── */}
    {tab === "inquiries" && <main className="inbox">
      <div className="eyebrow">{t("enquiriesEyebrow")}</div>
      <h1>{t("navOrders")}</h1>
      <SignedOut>
        <div className="form-card"><p>{t("enquiriesSignIn")}</p>
          <SignInButton mode="redirect"><button className="button">{t("enquiriesSignInBtn")}</button></SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        {orders.length === 0
          ? <div className="empty">No orders yet. Shop for handmade goods in the Buy tab!</div>
          : orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-head">
                <div className="order-status-row">
                  {ORDER_STATUS_ICON[order.status] ?? <Clock size={14}/>}
                  <span className="order-status-label">{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                  <span className="order-date">· {new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <strong className="order-total">₹{order.total_amount_inr.toLocaleString("en-IN")}</strong>
              </div>
              <div className="order-items-list">
                {order.items.map((item) => (
                  <div className="order-item-row" key={item.id}>
                    <span className="order-item-name">{item.product_name}</span>
                    <span className="order-item-meta">{item.quantity} × ₹{item.price_inr.toLocaleString("en-IN")} = ₹{item.subtotal_inr.toLocaleString("en-IN")}</span>
                    {item.seller_name && <span className="order-item-seller">by {item.seller_name}</span>}
                  </div>
                ))}
              </div>
              {order.shipping_address && <div className="order-shipping">📦 {order.shipping_address}</div>}
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
        <div className="form-card"><p>{t("enquiriesSignIn")}</p>
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

    {/* ── Product detail modal ── */}
    {selectedProduct && (
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          if (typeof window !== "undefined") {
            window.history.pushState(null, "", "/");
          }
        }}
        onAddToCart={addToCart}
        onBuyNow={buyNow}
        isOwner={Boolean(selectedProduct && userId && selectedProduct.seller_id === userId)}
        onEdit={(p) => {
          setEditingProduct(p as unknown as EditableProduct);
          setSelectedProduct(null);
        }}
        onDelete={(id) => {
          void handleDeleteProduct(id, selectedProduct?.name || "Product");
          setSelectedProduct(null);
        }}
      />
    )}

    {/* ── Edit product modal ── */}
    {editingProduct && (
      <EditProductModal
        product={editingProduct}
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        onSaved={async (updated) => {
          flash(`✓ "${updated.name}" updated successfully!`);
          await loadSellerProducts();
          await loadProducts();
          setEditingProduct(null);
        }}
        onDeleted={async () => {
          flash("Product deleted.");
          await loadSellerProducts();
          await loadProducts();
          setEditingProduct(null);
        }}
        api={api}
      />
    )}

    {/* ── Checkout sidebar (Buy Now) ── */}
    {checkoutItems && (
      <CheckoutSidebar
        items={checkoutItems}
        onClose={() => setCheckoutItems(null)}
        onConfirm={confirmBuyNow}
        title="Buy Now — Place Order"
      />
    )}

    {/* ── Cart sidebar ── */}
    {cartOpen && cart && (
      <CartSidebar
        cart={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateCartQty}
        onRemove={removeFromCart}
        onCheckout={placeOrderFromCart}
        onClear={clearCart}
      />
    )}

    {/* ── Contact seller modal ── */}
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
