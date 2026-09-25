import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, integer } from "@/lib/http";

async function ensureProfile(userId: string) {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const displayName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || null;
  await prisma.userProfile.upsert({
    where: { clerkUserId: userId },
    create: { clerkUserId: userId, displayName, email, role: "buyer" },
    update: { displayName, email },
  });
}

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, priceInr: true, imageUrl: true, quantityAvailable: true, minimumOrderQuantity: true, seller: { select: { displayName: true } } },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, priceInr: true, imageUrl: true, quantityAvailable: true, minimumOrderQuantity: true, seller: { select: { displayName: true } } },
            },
          },
          orderBy: { addedAt: "asc" },
        },
      },
    });
  }
  return cart;
}

function serializeCart(cart: Awaited<ReturnType<typeof getOrCreateCart>>) {
  const items = cart.items.map((item) => ({
    id: item.id,
    product_id: item.productId,
    product_name: item.product.name,
    seller_name: item.product.seller.displayName,
    price_inr: item.product.priceInr,
    quantity: item.quantity,
    quantity_available: item.product.quantityAvailable,
    minimum_order_quantity: item.product.minimumOrderQuantity,
    image_url: item.product.imageUrl?.startsWith("data:image/")
      ? `/api/products/${item.productId}/image`
      : item.product.imageUrl,
    subtotal_inr: item.product.priceInr * item.quantity,
  }));
  return {
    id: cart.id,
    items,
    total_inr: items.reduce((sum, i) => sum + i.subtotal_inr, 0),
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

// GET /api/cart
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ detail: "Sign in to view cart." }, { status: 401 });
  await ensureProfile(userId);
  const cart = await getOrCreateCart(userId);
  return NextResponse.json(serializeCart(cart));
}

// POST /api/cart — add item { product_id, quantity }
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to add to cart." }, { status: 401 });
    await ensureProfile(userId);

    const body = await request.json();
    const productId = integer(body.product_id, 0, 1);
    const quantity = integer(body.quantity, 1, 1);

    const product = await prisma.product.findUnique({
      where: { id: productId, status: "published" },
      select: { id: true, sellerId: true, quantityAvailable: true, minimumOrderQuantity: true },
    });
    if (!product) return NextResponse.json({ detail: "Product not found." }, { status: 404 });
    if (product.sellerId === userId) return NextResponse.json({ detail: "You cannot add your own product to cart." }, { status: 422 });
    if (quantity < product.minimumOrderQuantity) return NextResponse.json({ detail: `Minimum order is ${product.minimumOrderQuantity} units.` }, { status: 422 });
    if (quantity > product.quantityAvailable) return NextResponse.json({ detail: `Only ${product.quantityAvailable} units available.` }, { status: 422 });

    const cart = await getOrCreateCart(userId);

    // Upsert: if item exists, update quantity; otherwise create
    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.quantityAvailable) return NextResponse.json({ detail: `Only ${product.quantityAvailable} units available.` }, { status: 422 });
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
    }

    const updated = await getOrCreateCart(userId);
    return NextResponse.json(serializeCart(updated), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not add to cart.");
  }
}

// DELETE /api/cart — clear entire cart
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in." }, { status: 401 });
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "Could not clear cart.");
  }
}
