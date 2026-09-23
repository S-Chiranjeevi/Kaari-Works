# ArtisanMart API

FastAPI + PostgreSQL backend for the ArtisanMart prototype. It stores artisan profiles, listings, minimum bulk quantities, and buyer enquiries. Clerk handles browser sign-in and account creation; API routes verify Clerk session JWTs before reading private data or creating/updating listings.

## Run locally

1. Install Docker Desktop and Python 3.11 or newer.
2. From this directory, copy `.env.example` to `.env` and enter your Clerk settings (see below).
3. Start PostgreSQL: `docker compose up -d db`
4. Create a virtual environment and install dependencies:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

5. Start the app from `outputs/backend`:

   ```powershell
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

6. Open <http://localhost:8000>. The API reference is at <http://localhost:8000/docs>.

The API creates the starter tables on first run. Use migrations (for example Alembic) before deploying schema changes to production.

## Configure Clerk and Google

1. Create a Clerk application in the Clerk Dashboard and copy its **Publishable key** and **Secret key** into `.env`. The publishable key is returned by `/api/config` for ClerkJS; the secret key stays server-side.
2. Copy the Clerk instance issuer from the Dashboard (usually `https://<instance>.clerk.accounts.dev`) to `CLERK_ISSUER`. Set `CLERK_JWKS_URL` to the JWKS URL for that same Clerk instance. Keep both values from the same environment (development or production).
3. In Clerk Dashboard, open **SSO connections**, add **Google** for all users, and enable it for sign-in and sign-up. Clerk's development instances can use shared credentials. Production Google sign-in requires your own Google OAuth credentials configured in Clerk.
4. Set `CLERK_ALLOWED_ORIGINS` to the exact origins serving the app. The defaults match the included local server.

Clerk's prebuilt sign-in UI includes the account creation path. The Google button appears when Google is enabled in the Clerk Dashboard. Do not put `CLERK_SECRET_KEY` in the frontend or commit `.env`.

## API overview

- `GET /api/products` — public published catalogue, with optional `q` and `category` filters.
- `GET /api/products/mine`, `POST /api/products`, `PATCH /api/products/{id}` — authenticated seller listings; only the listing owner can edit.
- `POST /api/products/{id}/inquiries` — authenticated buyer bulk enquiry.
- `GET /api/inquiries` — authenticated buyer/seller inbox view.
- `POST /api/inquiries/{id}/reply` — seller-only reply.
- `GET/PATCH /api/me` — create/read/update the profile associated with the verified Clerk user id.

All private endpoints expect `Authorization: Bearer <Clerk session token>`. The backend validates the JWT signature, issuer, expiry, and authorized party (`azp`) against the configured app origins.

## Current scope

Product photos currently store an optional URL; upload storage and image processing are not included yet. Buyer/seller replies are stored in the database, but email/push notifications are not configured. Add database migrations, rate limiting, logging, image storage, and a deployment secret manager before production use.

