import Marketplace from "@/components/Marketplace";
import PreviewMarketplace from "@/components/PreviewMarketplace";

export default function HomePage() {
  const authConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  return authConfigured ? <Marketplace /> : <PreviewMarketplace />;
}
