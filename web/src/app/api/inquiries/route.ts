import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeInquiry } from "@/lib/http";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ detail: "Sign in to view enquiries." }, { status: 401 });
  const inquiries = await prisma.inquiry.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json(inquiries.map(serializeInquiry));
}
