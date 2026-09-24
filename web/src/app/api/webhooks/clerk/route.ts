import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Clerk webhook — auto-creates / updates the UserProfile row whenever a user
// signs up or updates their profile.  Configure the webhook in the Clerk
// Dashboard and add CLERK_WEBHOOK_SECRET to .env.local.
export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ detail: "Server misconfigured." }, { status: 500 });
  }

  const headersList = await headers();
  const svixId = headersList.get("svix-id") ?? "";
  const svixTimestamp = headersList.get("svix-timestamp") ?? "";
  const svixSignature = headersList.get("svix-signature") ?? "";

  const body = await request.text();
  const wh = new Webhook(secret);

  let event: unknown;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ detail: "Invalid signature." }, { status: 400 });
  }

  const { type, data } = event as { type: string; data: Record<string, unknown> };

  if (type === "user.created" || type === "user.updated") {
    const clerkUserId = data.id as string;
    const emailAddresses = (data.email_addresses as Array<{ email_address: string; id: string }>) ?? [];
    const primaryEmailId = data.primary_email_address_id as string | null;
    const primaryEmail =
      emailAddresses.find((e) => e.id === primaryEmailId)?.email_address ??
      emailAddresses[0]?.email_address ??
      null;
    const firstName = (data.first_name as string | null) ?? "";
    const lastName = (data.last_name as string | null) ?? "";
    const username = (data.username as string | null) ?? null;
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || username || null;

    await prisma.userProfile.upsert({
      where: { clerkUserId },
      create: { clerkUserId, displayName, email: primaryEmail, role: "buyer" },
      update: { displayName, email: primaryEmail },
    });
  }

  if (type === "user.deleted") {
    const clerkUserId = data.id as string;
    await prisma.userProfile.deleteMany({ where: { clerkUserId } });
  }

  return NextResponse.json({ received: true });
}