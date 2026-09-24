import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, text } from "@/lib/http";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ detail: "Unauthorized." }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({ where: { clerkUserId: userId } });
  if (!profile) return NextResponse.json({ detail: "Profile not found." }, { status: 404 });

  return NextResponse.json({
    clerk_user_id: profile.clerkUserId,
    display_name: profile.displayName,
    email: profile.email,
    role: profile.role,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ detail: "Unauthorized." }, { status: 401 });

    const body = await request.json();
    const role = text(body.role, 20);
    if (role && !["buyer", "seller"].includes(role)) {
      return NextResponse.json({ detail: "Role must be buyer or seller." }, { status: 422 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const displayName =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      clerkUser?.username ||
      null;

    const profile = await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, displayName, email, role: role || "buyer" },
      update: { displayName, email, ...(role ? { role } : {}) },
    });

    return NextResponse.json({
      clerk_user_id: profile.clerkUserId,
      display_name: profile.displayName,
      email: profile.email,
      role: profile.role,
    });
  } catch (error) {
    return errorResponse(error, "Unable to update profile.");
  }
}