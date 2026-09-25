import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, integer } from "@/lib/http";

// PATCH /api/cart/[itemId] — update quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const id = parseInt(itemId, 10);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in." }, { status: 401 });

    const item = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true, product: { select: { quantityAvailable: true, minimumOrderQuantity: true } } },
    });
    if (!item || item.cart.userId !== userId) return NextResponse.json({ detail: "Item not found." }, { status: 404 });

    const body = await request.json();
    const quantity = integer(body.quantity, 1, 1);
    if (quantity < item.product.minimumOrderQuantity) return NextResponse.json({ detail: `Minimum order is ${item.product.minimumOrderQuantity} units.` }, { status: 422 });
    if (quantity > item.product.quantityAvailable) return NextResponse.json({ detail: `Only ${item.product.quantityAvailable} units available.` }, { status: 422 });

    await prisma.cartItem.update({ where: { id }, data: { quantity } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not update cart item.");
  }
}

// DELETE /api/cart/[itemId] — remove item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const id = parseInt(itemId, 10);
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in." }, { status: 401 });

    const item = await prisma.cartItem.findUnique({ where: { id }, include: { cart: true } });
    if (!item || item.cart.userId !== userId) return NextResponse.json({ detail: "Item not found." }, { status: 404 });

    await prisma.cartItem.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "Could not remove cart item.");
  }
}
