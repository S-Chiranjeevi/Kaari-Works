import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse, serializeInquiry, text } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ inquiryId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to reply." }, { status: 401 });
    const id = Number((await context.params).inquiryId);
    const body = await request.json();
    const message = text(body.message, 3000);
    if (!Number.isInteger(id) || message.length < 1) return NextResponse.json({ detail: "Enter a reply." }, { status: 422 });
    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) return NextResponse.json({ detail: "Enquiry not found." }, { status: 404 });
    if (inquiry.sellerId !== userId) return NextResponse.json({ detail: "Only the seller can reply." }, { status: 403 });
    const updated = await prisma.inquiry.update({
      where: { id }, data: { sellerReply: message, status: "replied", repliedAt: new Date() },
      include: { product: { select: { name: true } } },
    });
    return NextResponse.json(serializeInquiry(updated));
  } catch (error) {
    return errorResponse(error, "Unable to save the reply.");
  }
}
