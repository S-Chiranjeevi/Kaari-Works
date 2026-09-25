import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaari Works — Handmade, directly from artisans",
  description: "Discover independent Indian artisans, request bulk orders, and bring handcrafted work to your market.",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#13866c",
    colorBackground: "#111816",
    colorInputBackground: "#1c2421",
    colorInputText: "#e8f0ec",
    colorText: "#e8f0ec",
    colorTextSecondary: "#93b5a7",
    colorNeutral: "#2a3d36",
    borderRadius: "12px",
    fontFamily: "inherit",
  },
  elements: {
    card: "shadow-none border border-[#2a3d36]",
    headerTitle: "text-white text-xl font-bold",
    headerSubtitle: "text-[#93b5a7] text-sm",
    socialButtonsBlockButton: "bg-white text-gray-800 hover:bg-gray-100 border-0 font-medium",
    socialButtonsBlockButtonText: "font-semibold",
    dividerLine: "bg-[#2a3d36]",
    dividerText: "text-[#93b5a7] text-xs",
    formFieldLabel: "text-[#c8ddd5] text-sm",
    formFieldInput: "bg-[#1c2421] border-[#2a3d36] text-white placeholder:text-[#557a6b] focus:border-[#13866c]",
    formButtonPrimary: "bg-[#13866c] hover:bg-[#0d6654] text-white font-semibold",
    footerActionLink: "text-[#4ec9a3] hover:text-[#13866c]",
    identityPreviewText: "text-[#c8ddd5]",
    identityPreviewEditButton: "text-[#4ec9a3]",
  },
  layout: {
    logoPlacement: "inside" as const,
    logoImageUrl: "",
    showOptionalFields: false,
    socialButtonsVariant: "blockButton" as const,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const document = <html lang="en"><body>{children}</body></html>;
  return authConfigured
    ? <ClerkProvider appearance={clerkAppearance}>{document}</ClerkProvider>
    : document;
}
