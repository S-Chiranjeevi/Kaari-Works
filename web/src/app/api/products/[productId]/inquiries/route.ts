import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, integer, serializeInquiry, text } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to contact the seller." }, { status: 401 });
    const productId = Number((await context.params).productId);
    if (!Number.isInteger(productId)) return NextResponse.json({ detail: "Product not found." }, { status: 404 });
    const product = await prisma.product.findFirst({ where: { id: productId, status: "published" } });
    if (!product) return NextResponse.json({ detail: "Product not found." }, { status: 404 });
    if (product.sellerId === userId) return NextResponse.json({ detail: "You cannot enquire about your own listing." }, { status: 400 });
    const body = await request.json();
    const quantity = integer(body.quantity, 0, 1);
    const message = text(body.message, 3000);
    if (!quantity || message.length < 2) return NextResponse.json({ detail: "Enter a quantity and a message." }, { status: 422 });
    const user = await currentUser();
    await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, email: user?.emailAddresses[0]?.emailAddress ?? null, displayName: user?.fullName ?? null, role: "buyer" },
      update: {},
    });
    const inquiry = await prisma.inquiry.create({ data: { productId, buyerId: userId, sellerId: product.sellerId, quantity, message }, include: { product: { select: { name: true } } } });
    return NextResponse.json(serializeInquiry(inquiry), { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to send the enquiry.");
  }
}
