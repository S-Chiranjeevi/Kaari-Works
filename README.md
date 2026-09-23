# Kaari Works

An artisan marketplace that helps makers present handmade products and connect directly with buyers, including wholesale and bulk buyers.

## Current app

- Responsive web marketplace for artisan sellers and product discovery.
- Seller dashboard and catalogue, plus listing creation with price, making cost, time, experience, minimum order quantity, and lead time.
- Buyer search, bulk quote requests, and seller contact.
- Clerk sign-in/account creation UI, with Google enabled through Clerk's social connection settings.
- FastAPI backend with PostgreSQL persistence for profiles, products, and buyer/seller enquiries.
- Clerk session JWT verification on protected API routes.

## Run locally

1. Install Python 3.11+ and Docker Desktop.
2. Copy `backend/.env.example` to `backend/.env` and configure Clerk keys, issuer, JWKS URL, and allowed origin.
3. Start the database from `backend/` with `docker compose up -d db`.
4. Install backend dependencies and run the API from `backend/`:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. Open <http://localhost:8000>. API documentation is at <http://localhost:8000/docs>.

See [backend/README.md](backend/README.md) for Clerk/Google setup and API details. Never commit `.env` or expose `CLERK_SECRET_KEY` in browser code.

## Next implementation steps

- Add image uploads/object storage and connect Gemini photo enhancement and listing translation.
- Replace illustrative price bands with verified market data and explainable regional pricing.
- Add database migrations, automated checks, deployment configuration, and buyer/seller notifications before launch.

