/**
 * Seed script for local development.
 * Run with: npm run db:seed
 *
 * Creates two demo users, two products, and one inquiry so you can
 * see the marketplace working right away without going through Clerk.
 * These rows use synthetic clerk_user_id values that look valid.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Demo seller
  const seller = await prisma.userProfile.upsert({
    where: { clerkUserId: "seed_seller_001" },
    create: {
      clerkUserId: "seed_seller_001",
      displayName: "Meera Potteries",
      email: "meera@example.com",
      role: "seller",
    },
    update: {},
  });

  // Demo buyer
  const buyer = await prisma.userProfile.upsert({
    where: { clerkUserId: "seed_buyer_001" },
    create: {
      clerkUserId: "seed_buyer_001",
      displayName: "Ravi Imports",
      email: "ravi@example.com",
      role: "buyer",
    },
    update: {},
  });

  // Product 1
  const pot = await prisma.product.upsert({
    where: { id: 1 },
    create: {
      sellerId: seller.clerkUserId,
      name: "Blue Pottery Planter",
      category: "Pottery",
      description: "Hand-painted Jaipur blue pottery planter, 20 cm diameter. Ideal for indoor succulents.",
      materials: "Clay, natural pigments",
      priceInr: 450,
      makingCostInr: 180,
      hoursToMake: 3,
      craftExperienceYears: 12,
      quantityAvailable: 40,
      minimumOrderQuantity: 5,
      leadTime: "7-10 days",
      status: "published",
    },
    update: {},
  });

  // Product 2
  await prisma.product.upsert({
    where: { id: 2 },
    create: {
      sellerId: seller.clerkUserId,
      name: "Madhubani Wall Panel",
      category: "Paintings",
      description: "Authentic Madhubani painting on handmade paper, A3 size. Each piece is unique.",
      materials: "Handmade paper, natural colours",
      priceInr: 1200,
      makingCostInr: 300,
      hoursToMake: 8,
      craftExperienceYears: 20,
      quantityAvailable: 15,
      minimumOrderQuantity: 1,
      leadTime: "3-5 days",
      status: "published",
    },
    update: {},
  });

  // Sample inquiry
  await prisma.inquiry.upsert({
    where: { id: 1 },
    create: {
      productId: pot.id,
      buyerId: buyer.clerkUserId,
      sellerId: seller.clerkUserId,
      message: "Hi! We'd like to order 50 planters for our boutique. Can you provide a bulk rate?",
      quantity: 50,
      status: "open",
    },
    update: {},
  });

  console.log("Seed complete:");
  console.log("  seller ->", seller.clerkUserId);
  console.log("  buyer  ->", buyer.clerkUserId);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });