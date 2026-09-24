# Kaari Works web platform

Fresh Next.js implementation of the Kaari Works marketplace. It uses Next.js App Router, React, TypeScript, Tailwind CSS, Clerk, PostgreSQL and Prisma. API responses preserve the snake_case contract consumed by `../mobile`.

## Setup

Requirements: Node.js 20.9+ and a PostgreSQL database. Docker is optional; a hosted PostgreSQL service or local PostgreSQL server works too.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:generate
npm run db:push
npm run dev
```

Set `DATABASE_URL` and `DIRECT_URL` to your PostgreSQL connection strings and add **new Kaari Works Clerk keys** to `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — publishable key for the new Clerk application/environment.
- `CLERK_SECRET_KEY` — server-only secret for that same new application/environment.
- `GEMINI_API_KEY` — optional; used server-side for Gemini product-photo enhancement.
- `GEMINI_IMAGE_MODEL` — optional image-edit model; defaults to `gemini-3.1-flash-image`.

Never put a Clerk secret or Gemini key in browser or Flutter code, and never commit `.env.local`. No API key from the reference repository is used here.

Open `http://localhost:3000`. The Clerk provider supports sign-in and account creation. Configure Google as a social connection in the new Kaari Works Clerk application; Native API and custom OAuth client setup are additionally required for native Flutter Google sign-in.

For local development without Docker, install PostgreSQL on Windows or use a hosted development database. Create an empty database and set its credentials in `.env.local` before `npm run db:push`.

## API routes

- `GET /api/products?q=&category=` — public marketplace search.
- `POST /api/products` — authenticated seller creates a product listing.
- `POST /api/products/:productId/inquiries` — authenticated buyer sends a bulk enquiry.
- `GET /api/inquiries` — signed-in buyer/seller reads their enquiries.
- `POST /api/inquiries/:inquiryId/reply` — listing seller replies to the buyer.

The Prisma schema is in `prisma/schema.prisma`. `db:push` is intended for local prototyping; use reviewed Prisma migrations before production deployment.

Artisans can upload a JPG, PNG, or WebP (up to 1 MB), preview it, and request Gemini enhancement. The original should be checked against the result because generative editing can change visual details. Enhanced listing images are stored in PostgreSQL for this prototype; move image blobs to managed object storage before scaling production traffic.

Seller price guidance updates as manufacturing cost, making hours and years in the craft change. It uses an estimated labour rate, overhead, capped experience premium and margin. It is a cost-based suggested range, not a live market-price feed; sellers set their own final price.
