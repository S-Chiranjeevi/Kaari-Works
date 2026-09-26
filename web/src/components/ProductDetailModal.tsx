"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useLang } from "@/lib/i18n";

export type ProductDetail = {
  id: number;
  name: string;
  category: string;
  description: string;
  materials: string | null;
  seller_name: string | null;
  seller_id: string;
  price_inr: number;
  minimum_order_quantity: number;
  quantity_available: number;
  lead_time: string | null;
  image_url: string | null;
  images?: string[];
};

type Props = {
  product: ProductDetail;
  onClose: () => void;
  onAddToCart: (productId: number, quantity: number) => Promise<void>;
  onBuyNow: (productId: number, quantity: number) => Promise<void>;
  isOwner?: boolean;
  onEdit?: (product: ProductDetail) => void;
  onDelete?: (productId: number) => void;
};

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  isOwner,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useLang();
  const [activeIdx, setActiveIdx] = useState(0);
  const [quantity, setQuantity] = useState(product.minimum_order_quantity || 1);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState("");

  // Touch swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Extract all images
  const images: string[] = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    if (product.image_url) {
      if (product.image_url.startsWith("[")) {
        try {
          const parsed = JSON.parse(product.image_url);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      return [product.image_url];
    }
    return [];
  }, [product]);

  // Keyboard navigation (Escape to close, Left/Right arrow to swipe)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) {
        setActiveIdx((i) => (i > 0 ? i - 1 : images.length - 1));
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        setActiveIdx((i) => (i < images.length - 1 ? i + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  // Lock background scroll when page view is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const minSwipeDistance = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > minSwipeDistance && activeIdx < images.length - 1) {
      setActiveIdx((i) => i + 1);
    } else if (distance < -minSwipeDistance && activeIdx > 0) {
      setActiveIdx((i) => i - 1);
    }
  };

  const productIcon = () =>
    product.category.toLowerCase().includes("pottery") ? "🏺" :
    product.category.toLowerCase().includes("jewel") ? "💍" :
    product.category.toLowerCase().includes("wood") ? "🪵" :
    product.category.toLowerCase().includes("paint") ? "🎨" :
    product.category.toLowerCase().includes("basket") ? "🧺" :
    product.category.toLowerCase().includes("textile") ? "🧵" : "✨";

  function clamp(val: number) {
    const min = product.minimum_order_quantity || 1;
    const max = Math.max(min, product.quantity_available || 1);
    return Math.max(min, Math.min(max, val));
  }

  async function handleAddToCart() {
    setAdding(true);
    setMsg("");
    try {
      await onAddToCart(product.id, quantity);
      setMsg("✓ Added to cart!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add to cart.");
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    setBuying(true);
    setMsg("");
    try {
      await onBuyNow(product.id, quantity);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not place order.");
      setBuying(false);
    }
  }

  const triggerAskKaari = () => {
    window.dispatchEvent(
      new CustomEvent("kaari:estimate-product", {
        detail: {
          name: product.name,
          category: product.category,
          description: product.description,
          price_inr: product.price_inr,
          lead_time: product.lead_time,
          materials: product.materials,
        },
      })
    );
  };

  const outOfStock = product.quantity_available <= 0;

  return (
    <div className="product-complete-page" role="main" aria-label={product.name}>
      {/* ── Top Navigation Bar ── */}
      <nav className="product-page-nav">
        <button type="button" className="p-back-btn" onClick={onClose}>
          <ArrowLeft size={18} />
          <span>Back to Marketplace</span>
        </button>
        <div className="p-nav-brand">
          <span className="p-brand-mark">क</span>
          <span className="p-brand-text">Kaari Works</span>
        </div>
        <div className="p-nav-actions">
          <button
            type="button"
            className="ask-kaari-btn p-nav-ask-btn"
            onClick={triggerAskKaari}
            title="Ask Kaari AI about this product"
          >
            <Sparkles size={13} /> Ask Kaari
          </button>
          <button
            type="button"
            className="p-close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </nav>

      {/* ── Page Body ── */}
      <div className="product-page-container">
        {/* ── 1. TOP SECTION: DISPLAYING ONLY THE PRODUCT AS IMAGE ── */}
        <section className="product-page-hero" aria-label="Product Images">
          <div
            className="product-hero-viewport"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 ? (
              <div
                className="product-hero-track"
                style={{ transform: `translateX(-${activeIdx * 100}%)` }}
              >
                {images.map((imgSrc, i) => (
                  <div key={i} className="product-hero-slide">
                    <img
                      src={imgSrc}
                      alt={`${product.name} - view ${i + 1}`}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="product-hero-slide">
                <span className="product-hero-empty-emoji">{productIcon()}</span>
              </div>
            )}

            {/* Desktop / Click Chevrons */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="carousel-nav-btn carousel-nav-btn--prev"
                  aria-label="Previous image"
                  onClick={() => setActiveIdx((i) => (i > 0 ? i - 1 : images.length - 1))}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="carousel-nav-btn carousel-nav-btn--next"
                  aria-label="Next image"
                  onClick={() => setActiveIdx((i) => (i < images.length - 1 ? i + 1 : 0))}
                >
                  <ChevronRight size={24} />
                </button>

                {/* Image counter indicator */}
                <div className="carousel-counter-badge">
                  {activeIdx + 1} / {images.length}
                </div>

                {/* Dot indicators */}
                <div className="carousel-dots" role="tablist">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === activeIdx}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`carousel-dot ${i === activeIdx ? "carousel-dot--active" : ""}`}
                      onClick={() => setActiveIdx(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails strip below the image */}
          {images.length > 1 && (
            <div className="product-hero-thumbs" aria-label="Image thumbnails">
              {images.map((imgSrc, i) => (
                <button
                  key={i}
                  type="button"
                  className={`product-hero-thumb ${i === activeIdx ? "product-hero-thumb--active" : ""}`}
                  onClick={() => setActiveIdx(i)}
                  aria-label={`Select image ${i + 1}`}
                >
                  <img src={imgSrc} alt={`Thumbnail ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── 2. BELOW SECTION: ALL DETAILS ── */}
        <section className="product-page-details" aria-label="Product Details">
          {/* Header Row: Category Badge & Stock */}
          <div className="pd-meta-top">
            <span className="pd-category-pill">{product.category}</span>
            {outOfStock ? (
              <span className="pd-stock-pill pd-stock-pill--out">Out of stock</span>
            ) : (
              <span className="pd-stock-pill pd-stock-pill--in">
                ✓ {product.quantity_available} Available
              </span>
            )}
          </div>

          {/* Product Title & Maker */}
          <div className="pd-title-group">
            <h1 className="pd-page-title">{product.name}</h1>
            <div className="pd-page-maker">
              <span>Handmade with care by</span>
              <strong>{product.seller_name || "Independent Artisan"}</strong>
            </div>
          </div>

          {/* Price Block */}
          <div className="pd-page-price-card">
            <div className="pd-page-price-main">
              <span className="pd-page-currency">₹</span>
              <span className="pd-page-amount">{product.price_inr.toLocaleString("en-IN")}</span>
              <span className="pd-page-unit">/ piece</span>
            </div>
            <div className="pd-page-price-sub">
              Fair price direct from artisan · Minimum order: {product.minimum_order_quantity} {product.minimum_order_quantity === 1 ? "unit" : "units"}
            </div>
          </div>

          {/* Badges / Chips */}
          <div className="pd-chips-row">
            <span className="pd-chip-tag">
              <Package size={14} /> Min. {product.minimum_order_quantity} units
            </span>
            {product.quantity_available > 0 ? (
              <span className="pd-chip-tag pd-chip-tag--green">
                <Layers size={14} /> {product.quantity_available} in stock
              </span>
            ) : (
              <span className="pd-chip-tag pd-chip-tag--red">
                <Layers size={14} /> Out of stock
              </span>
            )}
            {product.lead_time && (
              <span className="pd-chip-tag">
                <Clock size={14} />{" "}
                {String(product.lead_time).match(/day|week|month|hr|hour/i)
                  ? product.lead_time
                  : `${product.lead_time} days`}
              </span>
            )}
            {product.materials && (
              <span className="pd-chip-tag">
                <Star size={14} /> {product.materials}
              </span>
            )}
          </div>

          {/* Description Section */}
          <div className="pd-description-card">
            <h3>About this creation</h3>
            <p>{product.description || `Handmade authentic ${product.category.toLowerCase()} crafted using traditional Indian artisan techniques.`}</p>
          </div>

          {/* Quantity Selector */}
          {!outOfStock && (
            <div className="pd-page-qty-box">
              <div className="pd-qty-left">
                <strong>Select Quantity</strong>
                <small>Min. order: {product.minimum_order_quantity} units</small>
              </div>
              <div className="pd-qty-controls-wrap">
                <div className="pd-qty-stepper">
                  <button
                    type="button"
                    className="pd-qty-btn"
                    onClick={() => setQuantity((q) => clamp(q - 1))}
                    disabled={quantity <= (product.minimum_order_quantity || 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="pd-qty-input"
                    value={quantity}
                    min={product.minimum_order_quantity || 1}
                    max={product.quantity_available}
                    onChange={(e) =>
                      setQuantity(clamp(parseInt(e.target.value) || product.minimum_order_quantity || 1))
                    }
                  />
                  <button
                    type="button"
                    className="pd-qty-btn"
                    onClick={() => setQuantity((q) => clamp(q + 1))}
                    disabled={quantity >= product.quantity_available}
                  >
                    +
                  </button>
                </div>
                <div className="pd-qty-total">
                  <span>Total:</span>
                  <strong>₹{(product.price_inr * quantity).toLocaleString("en-IN")}</strong>
                </div>
              </div>
            </div>
          )}

          {msg && (
            <div className={`pd-msg-banner ${msg.startsWith("✓") ? "pd-msg-banner--ok" : "pd-msg-banner--err"}`}>
              {msg}
            </div>
          )}

          {/* Seller / Owner Controls */}
          {isOwner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "linear-gradient(135deg, #eef9f5, #f5faf8)",
                borderRadius: "12px",
                border: "1.5px solid #bfe0d6",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>👑</span>
                <span style={{ fontSize: "0.88rem", color: "#0d6654", fontWeight: 700 }}>
                  You are the artisan of this listing
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #13866c",
                      background: "#ffffff",
                      color: "#13866c",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ✏️ Edit Listing
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(product.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #fecaca",
                      background: "#ffffff",
                      color: "#dc2626",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="pd-page-actions-bar">
            <button
              type="button"
              className="pd-action-ask-btn"
              onClick={triggerAskKaari}
              title="Ask Kaari AI about making cost and crafting time"
            >
              <Sparkles size={16} />
              <span>Ask Kaari</span>
            </button>

            {outOfStock ? (
              <button type="button" className="button pd-action-btn-disabled" disabled>
                Out of Stock
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="button outline pd-action-cart-btn"
                  onClick={handleAddToCart}
                  disabled={adding || buying}
                >
                  <ShoppingCart size={17} />
                  <span>{adding ? "Adding..." : "Add to Cart"}</span>
                </button>
                <button
                  type="button"
                  className="button pd-action-buy-btn"
                  onClick={handleBuyNow}
                  disabled={adding || buying}
                >
                  <Zap size={17} />
                  <span>{buying ? "Opening..." : "Buy Now"}</span>
                </button>
              </>
            )}
          </div>

          {/* Craft Trust Guarantees */}
          <div className="pd-trust-grid">
            <div className="pd-trust-item">
              <ShieldCheck size={20} className="pd-trust-icon" />
              <div>
                <strong>100% Direct Artisan Pay</strong>
                <small>Every rupee directly supports the maker and their craft tradition.</small>
              </div>
            </div>
            <div className="pd-trust-item">
              <Truck size={20} className="pd-trust-icon" />
              <div>
                <strong>Careful Craft Packaging</strong>
                <small>Packed securely with protective padding for delicate handmade wares.</small>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
