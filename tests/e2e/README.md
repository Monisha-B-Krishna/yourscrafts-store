# Browser tests (Playwright)

Two journeys are checked in a real browser:

| File | What it checks |
|---|---|
| `buy.spec.ts` | On a phone screen, a guest adds a gift to the cart, pays (first attempt fails, retry works), gets the confirmation page and receipt email, and tracks the order with order number + email. A sold-out item can't be paid for. |
| `admin.spec.ts` | Customers get a 404 on `/admin` and the data export. The owner adds a product, ships an order with a courier and tracking ID (history is recorded, customer emailed, private notes stay private), and downloads the orders CSV. |

They run against a **local** copy of the database and **pretend** Razorpay and
Resend (`support/fake-services.mjs`), so no real money or email ever moves.
`playwright.config.ts` refuses to start if `.env.local` points anywhere else.

## Run them

1. Start the local database (needs Docker): `npx supabase start`, then `npx supabase db reset` for fresh example data.
2. In `.env.local`, use the local Supabase values from `npx supabase status`, plus:

   ```
   ADMIN_EMAIL=owner@yourscraftswoman.test
   RAZORPAY_KEY_ID=rzp_test_FakeKey1234
   RAZORPAY_KEY_SECRET=fake_key_secret_for_tests_only
   RAZORPAY_WEBHOOK_SECRET=fake_webhook_secret_for_tests
   RAZORPAY_API_BASE=http://127.0.0.1:54399/v1
   RESEND_API_KEY=re_test_fake_resend_key
   RESEND_API_BASE=http://127.0.0.1:54398
   ```

   (Keep your real keys in a separate file. These are only for testing.)
3. First time only: `npx playwright install chromium`.
4. `npm run test:e2e`

Playwright starts the pretend services, builds and starts the shop if it isn't
already running on http://localhost:3000, and prints a tick per journey. If one
fails, `npx playwright show-report` shows a screenshot and a step-by-step trace.

Notes:
- The tests create their own products, customers and orders each run, so they can
  be run again and again. They reset the password of the `ADMIN_EMAIL` account in
  the **local** database to a test password.
- Already have Chrome or Chromium and don't want another download? Set
  `E2E_CHROMIUM_PATH=/path/to/chrome`.
