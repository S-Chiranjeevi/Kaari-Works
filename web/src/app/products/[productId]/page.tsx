"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ProductDetailModal, { type ProductDetail } from "@/components/ProductDetailModal";
import EditProductModal, { type EditableProduct } from "@/components/EditProductModal";
import CheckoutSidebar, { type CheckoutItem } from "@/components/CheckoutSidebar";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { LangProvider } from "@/lib/i18n";

function ProductPageInner({ productId }: { productId: string }) {
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[] | null>(null);
  const [editing, setEditing] = useState(false);

  const api = useCallback(async (path: string, init: RequestInit = {}, authenticated = false) => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("Content-Type", "application/json");
    if (authenticated) {
      const token = await getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(path, { ...init, headers });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.detail || "Something went wrong. Please try again.");
    return body;
  }, [getToken]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error("Product not found");
        const data = await res.json();
        setProduct(data);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, router]);

  async function handleAddToCart(id: number, quantity: number) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: id, quantity }),
    });
  }

  async function handleBuyNow(id: number, quantity: number) {
    if (!product) return;
    setCheckoutItems([
      {
        product_id: product.id,
        product_name: product.name,
        quantity,
        price_inr: product.price_inr,
      },
    ]);
  }

  async function confirmBuyNow(address: string, notes: string) {
    if (!checkoutItems) return;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipping_address: address,
        notes,
        items: checkoutItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price_inr: item.price_inr,
        })),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not place order");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api(`/api/products/${id}`, { method: "DELETE" }, true);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete product.");
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f9f7" }}>
        <p style={{ color: "#13866c", fontWeight: 700 }}>Loading product details...</p>
      </div>
    );
  }

  if (!product) return null;

  const isOwner = Boolean(userId && product.seller_id === userId);

  return (
    <>
      <ProductDetailModal
        product={product}
        onClose={() => router.push("/")}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        isOwner={isOwner}
        onEdit={() => setEditing(true)}
        onDelete={handleDelete}
      />
      {editing && (
        <EditProductModal
          product={product}
          isOpen={editing}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setProduct(updated as ProductDetail);
            setEditing(false);
          }}
          onDeleted={() => router.push("/")}
          api={api}
        />
      )}
      {checkoutItems && (
        <CheckoutSidebar
          items={checkoutItems}
          onClose={() => setCheckoutItems(null)}
          onConfirm={confirmBuyNow}
          title="Buy Now — Place Order"
        />
      )}
      <BuyerEstimateChat />
    </>
  );
}

export default function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  return (
    <LangProvider>
      <ProductPageInner productId={productId} />
    </LangProvider>
  );
}
