"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react";

export type EditableProduct = {
  id: number;
  name: string;
  category: string;
  description: string;
  price_inr: number;
  making_cost_inr?: number | null;
  hours_to_make?: number | null;
  craft_experience_years?: number | null;
  quantity_available: number;
  minimum_order_quantity: number;
  lead_time?: string | null;
  image_url?: string | null;
  images?: string[];
  status?: string;
};

interface EditProductModalProps {
  product: EditableProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedProduct: EditableProduct) => void;
  onDeleted: (productId: number) => void;
  api: (path: string, init?: RequestInit, authenticated?: boolean) => Promise<any>;
}

export default function EditProductModal({
  product,
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  api,
}: EditProductModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Textiles");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [hours, setHours] = useState("");
  const [experience, setExperience] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [minimum, setMinimum] = useState("1");
  const [leadTime, setLeadTime] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState("published");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCategory(product.category || "Textiles");
      setDescription(product.description || "");
      setPrice(String(product.price_inr || ""));
      setCost(product.making_cost_inr != null ? String(product.making_cost_inr) : "");
      setHours(product.hours_to_make != null ? String(product.hours_to_make) : "");
      setExperience(product.craft_experience_years != null ? String(product.craft_experience_years) : "");
      setQuantity(String(product.quantity_available ?? 10));
      setMinimum(String(product.minimum_order_quantity ?? 1));
      setLeadTime(product.lead_time || "");
      setImages(
        Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : product.image_url
          ? [product.image_url]
          : []
      );
      setStatus(product.status || "published");
      setError("");
      setConfirmDelete(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const newBase64s: string[] = [];

    for (const file of fileList) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
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
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(String(e.target?.result));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.src = String(e.target?.result);
        };
        reader.readAsDataURL(file);
      });
      if (b64) newBase64s.push(b64);
    }

    if (newBase64s.length > 0) {
      setImages((prev) => [...prev, ...newBase64s].slice(0, 15));
    }
  }

  function handleRemoveImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter a product name.");
    if (!price || Number(price) <= 0) return setError("Please enter a valid selling price.");

    setSaving(true);
    try {
      const updated = await api(`/api/products/${product?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim(),
          price_inr: Number(price),
          making_cost_inr: cost ? Number(cost) : null,
          hours_to_make: hours ? Number(hours) : null,
          craft_experience_years: experience ? Number(experience) : null,
          quantity_available: Number(quantity) || 0,
          minimum_order_quantity: Math.max(1, Number(minimum) || 1),
          lead_time: leadTime.trim() || null,
          images,
          status,
        }),
      }, true);

      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product details.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    setError("");
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" }, true);
      onDeleted(product.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
      setDeleting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        backgroundColor: "rgba(10, 20, 18, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deleting) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "92vh",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #e2ece9",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #edf2f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#fafcfb",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#192824", fontWeight: 700 }}>
              Edit Product Listing
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#60726d" }}>
              Update pricing, inventory stock, images, and craft specifications.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
            aria-label="Close"
            style={{
              background: "#edf4f1",
              border: "none",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#30433e",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {error && (
            <div
              style={{
                backgroundColor: "#fff0f0",
                border: "1px solid #ffd4d4",
                color: "#c92a2a",
                padding: "10px 14px",
                borderRadius: "8px",
                marginBottom: "18px",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Photos Management */}
          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#192824", marginBottom: "8px" }}>
              Product Images ({images.length}/15)
            </label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    width: "74px",
                    height: "74px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: idx === 0 ? "2px solid #13866c" : "1px solid #d2deda",
                  }}
                >
                  <img
                    src={img}
                    alt={`Photo ${idx + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {idx === 0 && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: "rgba(19, 134, 108, 0.9)",
                        color: "#fff",
                        fontSize: "9px",
                        textAlign: "center",
                        padding: "1px 0",
                        fontWeight: 600,
                      }}
                    >
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    title="Remove photo"
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      backgroundColor: "rgba(0, 0, 0, 0.65)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {images.length < 15 && (
                <label
                  style={{
                    width: "74px",
                    height: "74px",
                    borderRadius: "8px",
                    border: "2px dashed #b7cec7",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#13866c",
                    backgroundColor: "#f7faf9",
                    fontSize: "0.75rem",
                    gap: "4px",
                  }}
                >
                  <ImagePlus size={18} />
                  <span>+ Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => void handleAddFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#7a8d87" }}>
              First image is used as the cover. You can upload multiple angles and artisan workshop shots.
            </p>
          </div>

          {/* Form Fields Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Title */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Product Title *
              </label>
              <input
                type="text"
                required
                maxLength={180}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  backgroundColor: "#fff",
                  boxSizing: "border-box",
                }}
              >
                {["Textiles", "Pottery & ceramics", "Woodwork", "Jewellery", "Home decor", "Baskets", "Paintings"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Listing Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  backgroundColor: "#fff",
                  boxSizing: "border-box",
                }}
              >
                <option value="published">🟢 Published (Live in marketplace)</option>
                <option value="draft">🟡 Draft (Hidden from buyers)</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Craft Description & Materials
              </label>
              <textarea
                rows={3}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your handmade craft, materials used, tradition, and dimensions..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Selling Price */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Making Cost */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Raw Material / Making Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Optional"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Available Stock */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Available Stock (Pieces) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Minimum Order Quantity */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Minimum Order Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Crafting Hours */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Hours to Make (Per Piece)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 4.5"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Lead Time */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#2d3e39", marginBottom: "4px" }}>
                Delivery / Dispatch Lead Time
              </label>
              <input
                type="text"
                maxLength={120}
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                placeholder="e.g. 3-5 business days"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #ccd8d4",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div
            style={{
              marginTop: "28px",
              padding: "16px",
              borderRadius: "10px",
              backgroundColor: "#fff6f6",
              border: "1px solid #ffd8d8",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <strong style={{ display: "block", color: "#b02a37", fontSize: "0.9rem" }}>
                Delete this listing
              </strong>
              <span style={{ fontSize: "0.8rem", color: "#7a4046" }}>
                Permanently removes this product from your inventory and the marketplace.
              </span>
            </div>

            {confirmDelete ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", color: "#b02a37", fontWeight: 600 }}>Confirm delete?</span>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  style={{
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  style={{
                    backgroundColor: "transparent",
                    color: "#555",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  backgroundColor: "transparent",
                  color: "#dc3545",
                  border: "1px solid #dc3545",
                  borderRadius: "6px",
                  padding: "7px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Trash2 size={15} />
                Delete Product
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #edf2f0",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              style={{
                backgroundColor: "#f0f4f3",
                color: "#30433e",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              style={{
                backgroundColor: "#13866c",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 22px",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(19, 134, 108, 0.3)",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
