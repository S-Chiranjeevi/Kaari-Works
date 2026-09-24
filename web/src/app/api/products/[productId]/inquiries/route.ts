import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, integer, text, serializeInquiry } from "@/lib/http";

// POST /api/products/[productId]/inquiries — buyer submits an inquiry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const id = parseInt(productId, 10);
    if (!Number.isInteger(id)) return NextResponse.json({ detail: "Not found." }, { status: 404 });

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to send an inquiry." }, { status: 401 });

    const product = await prisma.product.findUnique({
      where: { id, status: "published" },
      select: { sellerId: true, name: true },
    });
    if (!product) return NextResponse.json({ detail: "Product not found." }, { status: 404 });
    if (product.sellerId === userId) {
      return NextResponse.json({ detail: "You cannot inquire about your own product." }, { status: 422 });
    }

    const body = await request.json();
    const message = text(body.message, 2000);
    const quantity = integer(body.quantity, 1, 1);
    if (message.length < 5) {
      return NextResponse.json({ detail: "Message must be at least 5 characters." }, { status: 422 });
    }

    // Auto-create buyer profile if it does not exist yet
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const displayName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      clerkUser?.username ||
      null;
    await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, displayName, email, role: "buyer" },
      update: { displayName, email },
    });

    const inquiry = await prisma.inquiry.create({
      data: {
        productId: id,
        buyerId: userId,
        sellerId: product.sellerId,
        message,
        quantity,
      },
      include: { product: { select: { name: true } } },
    });

    return NextResponse.json(serializeInquiry(inquiry), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to send inquiry.");
  }
}