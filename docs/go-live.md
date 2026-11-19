# Going live: step by step

This takes the shop from "works on a laptop" to a real address like
`https://yourscrafts-store.vercel.app`. Everything here is on free plans. Allow an
afternoon. Do the steps in order, because later steps use values from earlier ones.

> You'll copy keys between websites. Keep them in a password manager, never in a
> chat, email or GitHub. The **service_role** key and the **Razorpay secret**
> act like master keys.

## 1. Database: Supabase (about 20 minutes)

Follow [setup.md, section 3](setup.md#3-create-the-real-hosted-supabase-project-free-tier):

1. Create the project in the **Mumbai** region.
2. Run `npx supabase link` and then `npx supabase db push`. This creates every table, the security
   rules, the search and the photo storage.
3. Optional: run `supabase/seed.sql` in the SQL Editor to start with the example products.
   You can archive them later from the admin panel.

Then do [section 4](setup.md#4-switch-on-customer-accounts-phase-3), steps 2–4: keep email
confirmation on, set the site address, and paste in the branded email templates. If you
don't know your Vercel address yet, finish step 2 below and come back to this.

Write down these three values from **Project Settings → API**: the Project URL, the anon key
and the service_role key.

## 2. Website: Vercel (about 15 minutes)

1. Sign up at [vercel.com](https://vercel.com) **with your GitHub account** (Hobby plan, free).
2. **Add New → Project →** pick `yourscrafts-store` → **Import**. Vercel recognises Next.js
   by itself, so don't change the build settings.
3. Before you press **Deploy**, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://yourscrafts-store.vercel.app` (your real Vercel address, no `/` at the end) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `ADMIN_EMAIL` | the email you'll sign in with as the owner |
   | `RAZORPAY_KEY_ID` | from step 3 (you can add these after the first deploy) |
   | `RAZORPAY_KEY_SECRET` | from step 3 |
   | `RAZORPAY_WEBHOOK_SECRET` | from step 3 |
   | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | optional, from step 4 |

   **Leave `RAZORPAY_API_BASE` and `RESEND_API_BASE` out.** They're only for the automated tests.
4. Press **Deploy**. When it finishes, Vercel shows your address. If it's different from the one
   you typed, update `NEXT_PUBLIC_SITE_URL` (**Settings → Environment Variables**) and the
   Supabase **URL Configuration**, then go to **Deployments → ⋯ → Redeploy**.

From now on, **every push to `main` on GitHub updates the live site automatically** in about two minutes.
If you change an environment variable, press **Redeploy** for the change to take effect.

## 3. Payments: Razorpay test mode (about 15 minutes)

Follow [setup.md, section 5](setup.md#5-switch-on-payments-phase-4). The webhook URL is:

```
https://<your-vercel-address>/api/webhooks/razorpay
```

Put the three Razorpay values into Vercel and redeploy. Then buy something with test card
`4111 1111 1111 1111` or UPI `success@razorpay`. The order should appear in **/admin → Orders**.

## 4. Order emails: Resend (optional, 10 minutes)

Follow [setup.md, section 6](setup.md#6-switch-on-order-emails-phase-5-optional). Without your own domain,
Resend only emails *your* address. That's fine for testing, but customers won't get emails until a domain is
verified. The shop works either way, because customers can always use **Track an order**.

## 5. Become the owner (2 minutes)

On the live site, **sign up with your `ADMIN_EMAIL`** and click the link in the confirmation
email. **My account** now shows *Open the admin panel*. Do this before you share the link, so
nobody can register your email first.

## 6. Check before you tell anyone

- [ ] Home, shop and a product page load on your phone.
- [ ] A test order goes through, shows in **/admin**, and you can mark it shipped.
- [ ] **Admin → Settings:** your real WhatsApp number (with 91 in front), Instagram link, shipping charge.
- [ ] **Request a custom piece** opens WhatsApp chatting with *your* number.
- [ ] The example products are replaced with yours, or archived.
- [ ] The help pages (Contact, Shipping, Returns, Privacy, Terms) say what you actually do. Their text lives in
      `src/content/policies.ts` and `src/app/(shop)/(info)/`. Fill in your support email in `policies.ts`.
- [ ] **Have someone who knows Indian consumer and data law read Privacy, Terms and Returns.** The starting text is
      a sensible draft, not legal advice.
- [ ] Speed check: paste your address into [pagespeed.web.dev](https://pagespeed.web.dev).

## 7. Taking real money (when you're ready)

1. Complete **KYC** in Razorpay (PAN, bank account, business details). Razorpay's reviewers look at your
   website, so the Contact, Shipping, Returns, Privacy and Terms pages need to be live and accurate, which they now are.
2. Switch the Razorpay dashboard to **Live Mode**, generate **live keys** (`rzp_live_…`), and add the same webhook
   in Live Mode with a **new** secret.
3. Replace the three Razorpay values in Vercel and redeploy.
4. Make one small real purchase yourself, then refund it from the Razorpay dashboard and mark it
   **Cancelled** in admin.

## 8. Get found on Google (free)

1. Open [Google Search Console](https://search.google.com/search-console) → **Add property → URL prefix** → your address.
2. Verify it with the **HTML tag** option. Ask Claude to add the tag to the site's metadata, or use the
   DNS option once you have a domain.
3. **Sitemaps** → submit `sitemap.xml`. Product pages appear in Google over the following days or weeks.

Each product page already tells Google its name, price and stock (structured data), and shares with a
branded preview card on WhatsApp and Instagram.

## Good to know about the free plans

- **Supabase pauses a free project after about a week with no visits at all.** Once the shop has customers,
  this won't happen. If it does, open the Supabase dashboard and press **Restore**. Nothing is lost.
- Free Supabase includes 500 MB of database and 1 GB of photo storage. The admin panel shrinks every photo
  before upload, so that's thousands of products.
- **Vercel's free Hobby plan is for personal, non-commercial projects.** Vercel staff have said that a website
  promoting a business counts as commercial and belongs on Pro (USD 20 a month). Hobby is fine for testing and
  previews. Before taking real orders, decide between paying for Vercel Pro and moving to a host whose free plan
  allows commercial sites. The code doesn't need to change for Pro. Moving hosts would be a small project, so ask
  Claude.
- Backups: download your data regularly from **Admin → Download data** (orders, customers, products), for example monthly.
