"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import ProductDetailModal, { type ProductDetail } from "@/components/ProductDetailModal";
import CheckoutSidebar, { type CheckoutItem } from "@/components/CheckoutSidebar";
import BuyerEstimateChat from "@/components/BuyerEstimateChat";
import { LangProvider } from "@/lib/i18n";

function ProductPageInner({ productId }: { productId: string }) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[] | null>(null);

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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f9f7" }}>
        <p style={{ color: "#13866c", fontWeight: 700 }}>Loading product details...</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <>
      <ProductDetailModal
        product={product}
        onClose={() => router.push("/")}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
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
