"use client";

import { useState } from "react";
import { X, MapPin, FileText, ShoppingBag } from "lucide-react";

export type CheckoutItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  price_inr: number;
};

type Props = {
  items: CheckoutItem[];
  onClose: () => void;
  onConfirm: (shippingAddress: string, notes: string) => Promise<void>;
  title?: string;
};

export default function CheckoutSidebar({ items, onClose, onConfirm, title = "Place Order" }: Props) {
  const [shipping, setShipping] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const total = items.reduce((s, i) => s + i.price_inr * i.quantity, 0);

  async function handleConfirm() {
    if (!shipping.trim()) { setMsg("Please enter a shipping address."); return; }
    setLoading(true); setMsg("");
    try {
      await onConfirm(shipping.trim(), notes.trim());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not place order.");
      setLoading(false);
    }
  }

  return (
    <div className="cart-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="cart-sidebar">
        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-left">
            <ShoppingBag size={20}/>
            <strong>{title}</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button>
        </div>

        {/* Order summary */}
        <div className="cart-items">
          <p style={{fontSize:12,color:"var(--muted)",margin:"0 0 8px",fontWeight:600}}>ORDER SUMMARY</p>
          {items.map((item, i) => (
            <div className="cart-item" key={i}>
              <div className="cart-item-info">
                <strong className="cart-item-name">{item.product_name}</strong>
                <span className="cart-item-price">
                  {item.quantity} × ₹{item.price_inr.toLocaleString("en-IN")} = <strong>₹{(item.price_inr * item.quantity).toLocaleString("en-IN")}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="cart-total">
          <span>Total</span>
          <strong>₹{total.toLocaleString("en-IN")}</strong>
        </div>

        {/* Checkout form */}
        <div className="cart-checkout-form">
          <label className="field">
            <span style={{display:"flex",alignItems:"center",gap:6}}><MapPin size={13}/> Shipping Address *</span>
            <textarea
              rows={3}
              className="cart-textarea"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              placeholder="Enter your full delivery address&#10;e.g. 12, MG Road, Bangalore 560001"
            />
          </label>
          <label className="field">
            <span style={{display:"flex",alignItems:"center",gap:6}}><FileText size={13}/> Notes (optional)</span>
            <textarea
              rows={2}
              className="cart-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions for the artisan?"
            />
          </label>

          {msg && (
            <p className={`pd-msg ${msg.startsWith("✓") ? "pd-msg--ok" : "pd-msg--err"}`}>{msg}</p>
          )}

          <div className="cart-checkout-actions">
            <button className="button outline" onClick={onClose}>Cancel</button>
            <button className="button" onClick={handleConfirm} disabled={loading}>
              {loading ? "Placing order…" : "Confirm Order"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
