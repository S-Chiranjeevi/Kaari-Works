"use client";

import { useState } from "react";
import { X, Trash2, ShoppingBag, Minus, Plus } from "lucide-react";

export type CartItem = {
  id: number; product_id: number; product_name: string; seller_name: string | null;
  price_inr: number; quantity: number; quantity_available: number;
  minimum_order_quantity: number; image_url: string | null; subtotal_inr: number;
};

export type Cart = {
  id: number; items: CartItem[]; total_inr: number; item_count: number;
};

type Props = {
  cart: Cart;
  onClose: () => void;
  onUpdateQty: (itemId: number, quantity: number) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
  onCheckout: (shippingAddress: string, notes: string) => Promise<void>;
  onClear: () => Promise<void>;
};

export default function CartSidebar({ cart, onClose, onUpdateQty, onRemove, onCheckout, onClear }: Props) {
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [shipping, setShipping] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleCheckout() {
    if (!shipping.trim()) { setMsg("Please enter a shipping address."); return; }
    setLoading(true); setMsg("");
    try {
      await onCheckout(shipping, notes);
      setMsg("✓ Order placed successfully!");
      setCheckoutMode(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not place order.");
    } finally { setLoading(false); }
  }

  return (
    <div className="cart-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="cart-sidebar">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <ShoppingBag size={20}/>
            <strong>Cart ({cart.item_count} items)</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close cart"><X size={18}/></button>
        </div>

        {cart.items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={40} strokeWidth={1}/>
            <p>Your cart is empty</p>
            <p>Browse products and add them here</p>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="cart-items">
              {cart.items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <strong className="cart-item-name">{item.product_name}</strong>
                    {item.seller_name && <span className="cart-item-seller">by {item.seller_name}</span>}
                    <span className="cart-item-price">₹{item.price_inr.toLocaleString("en-IN")} × {item.quantity} = <strong>₹{item.subtotal_inr.toLocaleString("en-IN")}</strong></span>
                    {item.quantity >= item.quantity_available && (
                      <span className="cart-item-warn">Max stock reached</span>
                    )}
                  </div>
                  <div className="cart-item-controls">
                    <button className="cart-qty-btn" onClick={() => onUpdateQty(item.id, item.quantity - 1)} disabled={item.quantity <= item.minimum_order_quantity}><Minus size={12}/></button>
                    <span className="cart-qty-val">{item.quantity}</span>
                    <button className="cart-qty-btn" onClick={() => onUpdateQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.quantity_available}><Plus size={12}/></button>
                    <button className="cart-remove-btn" onClick={() => onRemove(item.id)}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="cart-total">
              <span>Total</span>
              <strong>₹{cart.total_inr.toLocaleString("en-IN")}</strong>
            </div>

            {/* Checkout form */}
            {checkoutMode ? (
              <div className="cart-checkout-form">
                <label className="field">
                  <span>Shipping Address *</span>
                  <textarea rows={3} value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="Enter your full delivery address" className="cart-textarea"/>
                </label>
                <label className="field">
                  <span>Notes (optional)</span>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions?" className="cart-textarea"/>
                </label>
                {msg && <p className={`pd-msg ${msg.startsWith("✓") ? "pd-msg--ok" : "pd-msg--err"}`}>{msg}</p>}
                <div className="cart-checkout-actions">
                  <button className="button outline" onClick={() => setCheckoutMode(false)}>Back</button>
                  <button className="button" onClick={handleCheckout} disabled={loading}>{loading ? "Placing…" : "Place Order"}</button>
                </div>
              </div>
            ) : (
              <div className="cart-footer">
                {msg && <p className={`pd-msg ${msg.startsWith("✓") ? "pd-msg--ok" : "pd-msg--err"}`}>{msg}</p>}
                <button className="button" onClick={() => { setCheckoutMode(true); setMsg(""); }}>Proceed to Checkout</button>
                <button className="button outline cart-clear-btn" onClick={onClear}>Clear Cart</button>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
