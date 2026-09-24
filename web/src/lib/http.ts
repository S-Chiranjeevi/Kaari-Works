import { NextResponse } from "next/server";

export function errorResponse(error: unknown, fallback = "Request failed") {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ detail: message || fallback }, { status: 400 });
}

export function serializeProduct(product: {
  id: number; sellerId: string; name: string; category: string; description: string;
  materials: string | null; priceInr: number; makingCostInr: number | null;
  hoursToMake: number | null; craftExperienceYears: number | null;
  quantityAvailable: number; minimumOrderQuantity: number; leadTime: string | null;
  imageUrl: string | null; status: string; createdAt: Date; updatedAt: Date;
  seller?: { displayName: string | null } | null;
}) {
  return {
    id: product.id, seller_id: product.sellerId, seller_name: product.seller?.displayName ?? null,
    name: product.name, category: product.category, description: product.description,
    materials: product.materials, price_inr: product.priceInr, making_cost_inr: product.makingCostInr,
    hours_to_make: product.hoursToMake, craft_experience_years: product.craftExperienceYears,
    quantity_available: product.quantityAvailable, minimum_order_quantity: product.minimumOrderQuantity,
    lead_time: product.leadTime, image_url: product.imageUrl, status: product.status,
    created_at: product.createdAt, updated_at: product.updatedAt,
  };
}

export function serializeInquiry(inquiry: {
  id: number; productId: number; buyerId: string; sellerId: string; quantity: number;
  message: string; status: string; sellerReply: string | null; createdAt: Date; repliedAt: Date | null;
  product?: { name: string };
}) {
  return {
    id: inquiry.id, product_id: inquiry.productId, product_name: inquiry.product?.name ?? "Product",
    buyer_id: inquiry.buyerId, seller_id: inquiry.sellerId, quantity: inquiry.quantity,
    message: inquiry.message, status: inquiry.status, seller_reply: inquiry.sellerReply,
    created_at: inquiry.createdAt, replied_at: inquiry.repliedAt,
  };
}

export function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function integer(value: unknown, fallback: number, minimum = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}
