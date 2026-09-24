import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const handler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  ? clerkMiddleware()
  : () => NextResponse.next();

export default handler;

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|pdf|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
