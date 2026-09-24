# Kaari Works

Marketplace where independent artisans publish handmade products and buyers contact sellers directly for single items or bulk orders.

## Current implementation

- [`web/`](web/) is the fresh Next.js/React/TypeScript website and API, using Clerk for accounts and PostgreSQL through Prisma.
- [`mobile/`](mobile/) is a Flutter client for Android and iOS. It shares the Next.js API and Clerk accounts with the website.
- [`backend/`](backend/) and the root `index.html` are the earlier FastAPI/static prototype. The new web/mobile setup does not use that backend.

The reference repo informed the technology choices and configuration pattern only. Kaari Works has its own new environment variables; no keys from that repository were copied. Put new Clerk, Gemini, and database credentials in `web/.env.local` and never commit them.

## Start the new website/API

Follow [`web/README.md`](web/README.md). In short, configure PostgreSQL and new Clerk keys in `web/.env.local`, then run:

```powershell
cd web
npm install
npm run db:generate
npm run db:push
npm run dev
```

The site runs at <http://localhost:3000>. The API includes public product search, seller listing creation, buyer enquiries, an enquiry inbox, and seller replies. API fields remain compatible with the Flutter app.

## Start the mobile app

Install Flutter and follow [`mobile/README.md`](mobile/README.md) to generate Android/iOS runner projects, configure Clerk Native API and Google OAuth as needed, and run on an emulator or device.

## Remaining integrations

Gemini image enhancement is wired into the website's artisan listing flow, and the floating buyer guide estimates product cost and making time against seller-provided listing details. Both require a new server-side `GEMINI_API_KEY`. Seller price suggestions recalculate from entered making cost, time, and craft experience; they are cost-based estimates rather than a live market-price feed. Gemini translation, production-grade object storage, notifications, and deployment configuration remain future work.
