import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaari Works — Handmade, directly from artisans",
  description: "Discover independent Indian artisans, request bulk orders, and bring handcrafted work to your market.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const document = <html lang="en"><body>{children}</body></html>;
  return authConfigured ? <ClerkProvider>{document}</ClerkProvider> : document;
}
