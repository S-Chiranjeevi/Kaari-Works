"use client";

import { useState } from "react";
import { X, ShoppingCart, Zap, Package, Clock, Layers, Star } from "lucide-react";
import { useLang } from "@/lib/i18n";

export type ProductDetail = {
  id: number; name: string; category: string; description: string;
  materials: string | null; seller_name: string | null; seller_id: string;
  price_inr: number; minimum_order_quantity: number; quantity_available: number;
  lead_time: string | null; image_url: string | null;
};

type Props = {
  product: ProductDetail;
  onClose: () => void;
  onAddToCart: (productId: number, quantity: number) => Promise<void>;
  onBuyNow: (productId: number, quantity: number) => Promise<void>;
};

export default function ProductDetailModal({ product, onClose, onAddToCart, onBuyNow }: Props) {
  const { t } = useLang();
  const [quantity, setQuantity] = useState(product.minimum_order_quantity);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState("");

  const productIcon = () =>
    product.category.toLowerCase().includes("pottery") ? "🏺" :
    product.category.toLowerCase().includes("jewel") ? "💍" :
    product.category.toLowerCase().includes("wood") ? "🪵" :
    product.category.toLowerCase().includes("paint") ? "🎨" :
    product.category.toLowerCase().includes("basket") ? "🧺" :
    product.category.toLowerCase().includes("textile") ? "🧵" : "🎁";

  function clamp(val: number) {
    return Math.max(product.minimum_order_quantity, Math.min(product.quantity_available, val));
  }

  async function handleAddToCart() {
    setAdding(true); setMsg("");
    try {
      await onAddToCart(product.id, quantity);
      setMsg("✓ Added to cart!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add to cart.");
    } finally { setAdding(false); }
  }

  async function handleBuyNow() {
    setBuying(true); setMsg("");
    try {
      await onBuyNow(product.id, quantity);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not place order.");
      setBuying(false);
    }
  }

  const outOfStock = product.quantity_available <= 0;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pd-title">

        {/* Header */}
        <div className="modal-head">
          <span className="pd-category-badge">{product.category}</span>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button>
        </div>

        {/* Image */}
        <div className="pd-image">
          {product.image_url
            ? <img src={product.image_url} alt={product.name}/>
            : <span className="pd-image-emoji">{productIcon()}</span>
          }
        </div>

        {/* Body */}
        <div className="pd-body">
          <h2 id="pd-title" className="pd-name">{product.name}</h2>
          {product.seller_name && <div className="pd-seller">by {product.seller_name}</div>}

          {/* Price */}
          <div className="pd-price-row">
            <span className="pd-price">₹{product.price_inr.toLocaleString("en-IN")}</span>
            <span className="pd-per">per piece</span>
          </div>

          {/* Meta chips */}
          <div className="pd-chips">
            <span className="pd-chip"><Package size={13}/> Min. {product.minimum_order_quantity} units</span>
            {product.quantity_available > 0
              ? <span className="pd-chip pd-chip--green"><Layers size={13}/> {product.quantity_available} in stock</span>
              : <span className="pd-chip pd-chip--red"><Layers size={13}/> Out of stock</span>
            }
            {product.lead_time && <span className="pd-chip"><Clock size={13}/> {product.lead_time}</span>}
            {product.materials && <span className="pd-chip"><Star size={13}/> {product.materials}</span>}
          </div>

          {/* Description */}
          {product.description && <p className="pd-description">{product.description}</p>}

          {/* Quantity selector */}
          {!outOfStock && (
            <div className="pd-qty-row">
              <label className="pd-qty-label">Quantity</label>
              <div className="pd-qty-controls">
                <button className="pd-qty-btn" onClick={() => setQuantity(q => clamp(q - 1))} disabled={quantity <= product.minimum_order_quantity}>−</button>
                <input
                  type="number"
                  className="pd-qty-input"
                  value={quantity}
                  min={product.minimum_order_quantity}
                  max={product.quantity_available}
                  onChange={(e) => setQuantity(clamp(parseInt(e.target.value) || product.minimum_order_quantity))}
                />
                <button className="pd-qty-btn" onClick={() => setQuantity(q => clamp(q + 1))} disabled={quantity >= product.quantity_available}>+</button>
              </div>
              <span className="pd-qty-sub">= ₹{(product.price_inr * quantity).toLocaleString("en-IN")}</span>
            </div>
          )}

          {msg && <p className={`pd-msg ${msg.startsWith("✓") ? "pd-msg--ok" : "pd-msg--err"}`}>{msg}</p>}

          {/* Actions */}
          <div className="pd-actions">
            {outOfStock
              ? <button className="button" disabled style={{opacity:.5}}>Out of Stock</button>
              : <>
                  <button className="button outline pd-cart-btn" onClick={handleAddToCart} disabled={adding || buying}>
                    <ShoppingCart size={16}/>{adding ? "Adding…" : "Add to Cart"}
                  </button>
                  <button className="button pd-buy-btn" onClick={handleBuyNow} disabled={adding || buying}>
                    <Zap size={16}/>{buying ? "Placing…" : "Buy Now"}
                  </button>
                </>
            }
          </div>
        </div>
      </section>
    </div>
  );
}
