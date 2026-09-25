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
    colorBackground: "#ffffff",
    colorInputBackground: "#f6faf6",
    colorInputText: "#17322f",
    colorText: "#17322f",
    colorTextSecondary: "#6d7e78",
    colorNeutral: "#e5ebe6",
    borderRadius: "12px",
    fontFamily: "inherit",
  },
  elements: {
    // Sign-in / sign-up card
    card: "shadow-lg border border-[#e5ebe6]",
    headerTitle: "text-[#17322f] text-xl font-bold",
    headerSubtitle: "text-[#6d7e78] text-sm",
    socialButtonsBlockButton: "bg-white text-gray-800 hover:bg-gray-50 border border-[#e5ebe6] font-medium",
    socialButtonsBlockButtonText: "font-semibold",
    dividerLine: "bg-[#e5ebe6]",
    dividerText: "text-[#6d7e78] text-xs",
    formFieldLabel: "text-[#17322f] text-sm font-medium",
    formFieldInput: "bg-[#f6faf6] border-[#e5ebe6] text-[#17322f] placeholder:text-[#93b5a7] focus:border-[#13866c]",
    formButtonPrimary: "bg-[#13866c] hover:bg-[#0d6654] text-white font-semibold",
    footerActionLink: "text-[#13866c] hover:text-[#0d6654] font-semibold",
    identityPreviewText: "text-[#17322f]",
    identityPreviewEditButton: "text-[#13866c]",
    // UserButton popup/popover
    userButtonPopoverCard: "bg-white shadow-xl border border-[#e5ebe6]",
    userButtonPopoverActionButton: "text-[#17322f] hover:bg-[#f6faf6]",
    userButtonPopoverActionButtonText: "text-[#17322f] font-medium",
    userButtonPopoverActionButtonIcon: "text-[#17322f]",
    userButtonPopoverFooter: "hidden",
    userPreviewMainIdentifier: "text-[#17322f] font-semibold",
    userPreviewSecondaryIdentifier: "text-[#6d7e78]",
    userButtonPopoverMain: "bg-white",
  },
  layout: {
    logoPlacement: "inside" as const,
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
