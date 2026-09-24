import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, text, serializeInquiry } from "@/lib/http";

// POST /api/inquiries/[inquiryId]/reply — seller replies to an inquiry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inquiryId: string }> }
) {
  try {
    const { inquiryId } = await params;
    const id = parseInt(inquiryId, 10);
    if (!Number.isInteger(id)) return NextResponse.json({ detail: "Not found." }, { status: 404 });

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Sign in to reply." }, { status: 401 });

    const inquiry = await prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) return NextResponse.json({ detail: "Inquiry not found." }, { status: 404 });
    if (inquiry.sellerId !== userId) {
      return NextResponse.json({ detail: "Only the seller can reply to this inquiry." }, { status: 403 });
    }

    const body = await request.json();
    const sellerReply = text(body.reply, 2000);
    if (sellerReply.length < 2) {
      return NextResponse.json({ detail: "Reply must be at least 2 characters." }, { status: 422 });
    }

    const updated = await prisma.inquiry.update({
      where: { id },
      data: { sellerReply, repliedAt: new Date(), status: "replied" },
      include: { product: { select: { name: true } } },
    });

    return NextResponse.json(serializeInquiry(updated));
  } catch (error) {
    return errorResponse(error, "Unable to submit reply.");
  }
}