# Kaari Works mobile app

Flutter client for the Kaari Works artisan marketplace. It shares the Next.js API, PostgreSQL database, and Clerk accounts with the website.

## Included screens

- **Discover:** search published products, view artisan stories and prices, and send bulk enquiries directly to sellers.
- **Sell:** create a product listing with price, making cost, inventory and minimum bulk order.
- **Enquiries:** see buyer/seller messages and reply to a buyer enquiry.
- **Account:** Clerk sign-up, sign-in and account controls.

## Requirements and first-time setup

Install Flutter 3.27.4 or newer (Dart 3.6.2 or newer), then from this directory generate the Android/iOS runner projects and fetch dependencies:

```powershell
flutter create --platforms=android,ios .
flutter pub get
```

The Clerk Flutter SDK is currently a community-maintained beta. In Clerk Dashboard, enable **Native API** for the same development instance used by the website. The frontend needs only the Clerk publishable key; never include the Clerk secret key in a mobile app.

## Run on Android emulator

Start the Next.js web API and PostgreSQL using `../web/README.md`. Then run from this directory:

```powershell
flutter run `
  --dart-define=CLERK_PUBLISHABLE_KEY=pk_test_your_key `
  --dart-define=GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com `
  --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

`GOOGLE_WEB_CLIENT_ID` is needed for the native Google button. Until native Google OAuth is configured, omit that define and use the other Clerk sign-in methods.

`10.0.2.2` is the Android emulator's route to the development computer. For a physical phone, use the computer's LAN IP and start Next.js with `npm run dev -- --hostname 0.0.0.0`; both devices must be on the same network. iOS Simulator can use `http://127.0.0.1:3000` when running on macOS.

Local HTTP is for development only. Use HTTPS for a deployed backend. If Android blocks cleartext traffic during local development, set `android:usesCleartextTraffic="true"` on the generated `<application>` element in `android/app/src/main/AndroidManifest.xml`; remove it for production.

## Google sign-in on mobile

Email/password and other Clerk authentication flows use Clerk's prebuilt Flutter UI. Android does not permit Google sign-in inside an in-app browser, so the app includes a native Google ID-token flow. Native Google sign-in requires the Clerk Native API and custom Google OAuth credentials for Android, iOS, and a Web client. Configure those credentials in the new Kaari Works Clerk application and Google Cloud, then pass the Web client ID through `GOOGLE_WEB_CLIENT_ID`. Follow [Clerk's Flutter Google setup guide](https://docs.page/clerk-community/clerk-sdk-flutter/guides/sign-in-with-google) for platform client IDs, redirect URI and SHA-1 configuration.

## API and data

The app calls the same Next.js API routes as the website: `GET /api/products`, `POST /api/products`, `POST /api/products/{id}/inquiries`, `GET /api/inquiries`, and `POST /api/inquiries/{id}/reply`. Authenticated calls attach the current Clerk session JWT. Pass the new Kaari Works Clerk publishable key at launch; never put a secret key in Flutter.
