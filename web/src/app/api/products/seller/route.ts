import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, serializeProduct } from "@/lib/http";

function resolveProductImages(productId: number, rawImageUrl: string | null): { images: string[]; imageUrl: string | null } {
  if (!rawImageUrl) return { images: [], imageUrl: null };
  if (rawImageUrl.startsWith("[")) {
    try {
      const parsed = JSON.parse(rawImageUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const images = parsed.map((img: string, i: number) =>
          img.startsWith("data:image/") ? `/api/products/${productId}/image?index=${i}` : img
        );
        return { images, imageUrl: images[0] || null };
      }
    } catch {
      // fall through
    }
  }
  const single = rawImageUrl.startsWith("data:image/") ? `/api/products/${productId}/image` : rawImageUrl;
  return { images: [single], imageUrl: single };
}

// GET /api/products/seller — fetch seller's products with tracking & monitoring stats
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ detail: "Sign in to view your seller dashboard." }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { sellerId: userId },
      include: {
        seller: { select: { displayName: true } },
        inquiries: { select: { id: true, status: true, createdAt: true } },
        orderItems: { select: { id: true, quantity: true, priceInr: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let totalInquiries = 0;
    let totalOrders = 0;
    let totalUnitsSold = 0;
    let totalRevenueInr = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const formattedProducts = products.map((product) => {
      const { images, imageUrl } = resolveProductImages(product.id, product.imageUrl);
      const inquiriesCount = product.inquiries.length;
      const ordersCount = product.orderItems.length;
      const unitsSold = product.orderItems.reduce((acc, item) => acc + item.quantity, 0);
      const revenueInr = product.orderItems.reduce((acc, item) => acc + item.quantity * item.priceInr, 0);

      const qty = product.quantityAvailable;
      let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
      if (qty <= 0) {
        stockStatus = "out_of_stock";
        outOfStockCount++;
      } else if (qty <= 5) {
        stockStatus = "low_stock";
        lowStockCount++;
      } else {
        stockStatus = "in_stock";
        inStockCount++;
      }

      totalInquiries += inquiriesCount;
      totalOrders += ordersCount;
      totalUnitsSold += unitsSold;
      totalRevenueInr += revenueInr;

      return {
        ...serializeProduct(product),
        images,
        image_url: imageUrl,
        status: product.status,
        inquiries_count: inquiriesCount,
        orders_count: ordersCount,
        units_sold: unitsSold,
        revenue_inr: revenueInr,
        stock_status: stockStatus,
      };
    });

    const summary = {
      total_products: products.length,
      in_stock: inStockCount,
      low_stock: lowStockCount,
      out_of_stock: outOfStockCount,
      total_inquiries: totalInquiries,
      total_orders: totalOrders,
      total_units_sold: totalUnitsSold,
      total_revenue_inr: totalRevenueInr,
    };

    return NextResponse.json({
      summary,
      products: formattedProducts,
    });
  } catch (error) {
    return errorResponse(error, "Could not load seller products.");
  }
}
