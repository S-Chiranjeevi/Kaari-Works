import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, text } from "@/lib/http";

function serializeOrder(order: {
  id: number; status: string; totalAmountInr: number; shippingAddress: string | null;
  notes: string | null; createdAt: Date; updatedAt: Date;
  items: Array<{ id: number; productId: number; productName: string; sellerName: string | null; quantity: number; priceInr: number }>;
}) {
  return {
    id: order.id,
    status: order.status,
    total_amount_inr: order.totalAmountInr,
    shipping_address: order.shippingAddress,
    notes: order.notes,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    items: order.items.map((i) => ({
      id: i.id,
      product_id: i.productId,
      product_name: i.productName,
      seller_name: i.sellerName,
      quantity: i.quantity,
      price_inr: i.priceInr,
      subtotal_inr: i.priceInr * i.quantity,
    })),
  };
}

// GET /api/orders — buyer's order history
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ detail: "Sign in to view orders." }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(orders.map(serializeOrder));
}

// POST /api/orders — place order from cart or direct buy
// Body: { items: [{ product_id, quantity }], shipping_address?, notes? }
//   OR: { from_cart: true, shipping_address?, notes? }
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to place an order." }, { status: 401 });

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const displayName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || null;
    await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, displayName, email, role: "buyer" },
      update: { displayName, email },
    });

    const body = await request.json();
    const shippingAddress = text(body.shipping_address, 500) || null;
    const notes = text(body.notes, 1000) || null;

    // Resolve order items — either from cart or from explicit list
    let rawItems: Array<{ product_id: number; quantity: number }> = [];

    if (body.from_cart === true) {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });
      if (!cart || cart.items.length === 0) return NextResponse.json({ detail: "Your cart is empty." }, { status: 422 });
      rawItems = cart.items.map((i) => ({ product_id: i.productId, quantity: i.quantity }));
    } else if (Array.isArray(body.items) && body.items.length > 0) {
      rawItems = body.items.map((i: { product_id: unknown; quantity: unknown }) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
      }));
    } else {
      return NextResponse.json({ detail: "No items provided." }, { status: 422 });
    }

    if (rawItems.length === 0) return NextResponse.json({ detail: "No items to order." }, { status: 422 });

    // Fetch products and validate stock — all in one query
    const productIds = rawItems.map((i) => i.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "published" },
      include: { seller: { select: { displayName: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderItems: Array<{ productId: number; productName: string; sellerName: string | null; quantity: number; priceInr: number }> = [];
    let total = 0;

    for (const raw of rawItems) {
      const product = productMap.get(raw.product_id);
      if (!product) return NextResponse.json({ detail: `Product ${raw.product_id} not found.` }, { status: 404 });
      if (product.sellerId === userId) return NextResponse.json({ detail: `You cannot order your own product: ${product.name}.` }, { status: 422 });
      if (raw.quantity < product.minimumOrderQuantity) return NextResponse.json({ detail: `Minimum order for ${product.name} is ${product.minimumOrderQuantity} units.` }, { status: 422 });
      if (raw.quantity > product.quantityAvailable) return NextResponse.json({ detail: `Only ${product.quantityAvailable} units of ${product.name} available.` }, { status: 422 });
      orderItems.push({ productId: product.id, productName: product.name, sellerName: product.seller.displayName, quantity: raw.quantity, priceInr: product.priceInr });
      total += product.priceInr * raw.quantity;
    }

    // Create order and decrement stock in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Re-check stock inside transaction to avoid race conditions
      for (const item of orderItems) {
        const p = await tx.product.findUnique({ where: { id: item.productId }, select: { quantityAvailable: true } });
        if (!p || p.quantityAvailable < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productName}.`);
        }
      }

      // Decrement stock
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantityAvailable: { decrement: item.quantity } },
        });
      }

      // Create the order
      const created = await tx.order.create({
        data: {
          buyerId: userId,
          totalAmountInr: total,
          shippingAddress,
          notes,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Clear cart if ordered from cart
      if (body.from_cart === true) {
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return created;
    });

    return NextResponse.json(serializeOrder(order), { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not place order.";
    return NextResponse.json({ detail: msg }, { status: 400 });
  }
}
