# Yours Crafts Woman — E-commerce Platform Build Spec

> This file is the single source of truth for Claude Code. Read it fully before every work session. Build in the phases below, and do not skip ahead. Ask the owner before any decision that changes this spec.

## 1. Business context
- **Brand:** Yours Crafts Woman (Instagram: @yours.craftswoman). Owner: Monisha, who runs everything herself.
- **Sells:** handmade gifts and crafts (chocolate bouquets, handmade art pieces), plus her original paintings and prints.
- **Today:** sales happen through Instagram DMs and stalls. This site replaces that with a real store.
- **Market:** **India only** for checkout. Prices are in INR. International buyers see a "Contact us on WhatsApp" message.
- **Custom orders:** WhatsApp only and never through checkout. Use a "Request a custom piece" button that opens WhatsApp with a pre-filled message.
- **Content:** start with example products, prices and images. The owner replaces them later from the admin panel.

## 2. Brand & design
- **Logo:** black serif wordmark with a peach-orange hand doodle. Add the file to `/public/brand/`, or use a text placeholder until it's added.
- **Palette (CSS variables in Tailwind config):**
  - `--ink` #111111 (text, wordmark)
  - `--peach` #F4A27A (primary accent, buttons)
  - `--peach-soft` #FCE6D9 (backgrounds, cards)
  - `--cream` #FFF9F4 (page background)
  - `--muted` #6B6B6B (secondary text)
- **Type:** a serif for headings (Playfair Display or Cormorant Garamond) and a clean sans for body text (Inter). Use Google Fonts via `next/font`.
- **Feel:** warm, handmade, premium boutique, with generous whitespace and soft rounded corners. Product photos are the hero.
- **Responsive:** must work on phones (360px+), foldables, tablets, laptops and large desktops. Design mobile-first and test every page at 360, 768, 1024 and 1440 px.
- **Accessibility:** semantic HTML, alt text on every image, visible focus states, and 4.5:1 contrast.

## 3. Tech stack (fixed — do not change without asking)
| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui components |
| Database | Supabase Postgres |
| Auth | Supabase Auth: **email + password / magic link** (free). Phone number collected as a required profile field, not used for OTP. |
| Image storage | Supabase Storage (`product-images`, `artworks` buckets) |
| Payments | Razorpay (**test mode** until owner goes live) — UPI, cards, netbanking, wallets |
| Validation | Zod |
| Forms | React Hook Form |
| Emails | Resend free tier (order confirmation, status updates). Make it optional, so the app works without the key. |
| Hosting | Vercel free tier at `*.vercel.app` (no custom domain yet) |
| Code | GitHub repo `yourscrafts-store`. Vercel auto-deploys on push to `main`. |
| Tests | Vitest (logic) + Playwright (checkout and admin flows) |

**Rules:** no paid services. Put every secret in `.env.local`, never commit secrets, and keep `.env.example` up to date.

## 4. Settings the owner can change from admin (no code edits)
Store these in a `store_settings` table and read them at runtime:
- WhatsApp number (default placeholder: `919999999999`)
- Flat shipping rate (default **₹80**)
- Free-shipping threshold (default **₹999**)
- Store announcement bar text
- Instagram link
- Order cancellation window (hours)

## 5. Pages — customer side
1. **Home:** hero banner, new arrivals, bestsellers, current deals, featured artwork, Instagram strip (static images), WhatsApp custom-order CTA.
2. **Shop / Category listing:** grid with filters (category, price range, in-stock) and sort (new, price, popular). Paginate or infinite scroll.
3. **Search:** search bar in the header with instant suggestions, using Postgres full-text search on name, description and tags.
4. **Product page:** image gallery with zoom, price and sale price, stock status, variants (size/colour if any), quantity, Add to cart, Save for later, delivery estimate, and related products.
5. **Artist page ("About the Artist"):** Monisha's story and photo, a gallery of her paintings, and **original paintings** (qty 1) and **prints** (multiple sizes) for sale.
6. **Cart:** edit quantities, move an item to Save for later, and see a running total showing "₹X more for free shipping".
7. **Saved for later:** list items and move them back to the cart.
8. **Checkout:** shipping address with an Indian PIN code field and state dropdown. Phone number is required. Show the order summary, then pay with Razorpay.
9. **Order confirmation:** order number, summary, and expected timeline.
10. **My account:** profile (name, email, phone), saved addresses, order history.
11. **Order tracking:** status timeline (Placed → Confirmed → Packed → Shipped → Delivered, plus Cancelled). Show the courier name and tracking ID or link when the owner adds one. Guests can track with order number + email.
12. **Static pages:** Contact (WhatsApp, email, Instagram), Shipping policy, Returns & refunds, Privacy policy, Terms. Use placeholder text that the owner edits later.
13. **404 and error pages** in brand style.

**Cart & saved items:** guests can use the cart (stored in localStorage). On login, merge it into the database cart. Save for later requires login.

## 6. Admin panel (`/admin`) — owner only
- **Access:** only users whose `profiles.role = 'admin'` can open it. Check this in Next.js middleware **and** enforce it in Supabase Row Level Security, never hiding it in the UI alone. Seed the owner's email as admin from an env variable `ADMIN_EMAIL`.
- **Dashboard:** today's and this month's revenue, order count, average order value, top products, low-stock alerts, orders waiting to be packed.
- **Products:** create, edit, archive and duplicate products. Upload multiple images with drag-to-reorder, and manage variants, stock, categories, tags, sale price and a "featured" toggle. **Must be simple enough for a non-developer.**
- **Artworks:** same as products, plus an original/print type and dimensions.
- **Deals & editions:** create a discount (percentage or flat, on a product or category, with start and end dates) and coupon codes. Group products into named "editions" or collections (e.g. Diwali Edition).
- **Orders:** list with filters (status, date) and search. The order detail page lets her update status, add a courier and tracking ID, add internal notes, and print a packing slip. Every status change is timestamped in `order_status_history`.
- **Customers:** list with order count and lifetime value.
- **Settings:** everything in Section 4.
- **Data export:** a CSV download button for orders, order_items, products, customers and events.

## 7. Database (Supabase Postgres)
Tables (all have `id uuid pk`, `created_at`, `updated_at`):
- `profiles` (user_id → auth.users, full_name, phone, role: customer|admin)
- `addresses` (user_id, name, phone, line1, line2, city, state, pincode, is_default)
- `categories` (name, slug, parent_id, sort_order)
- `collections` (name, slug, description, banner_image, starts_at, ends_at, is_active)
- `products` (name, slug, description, category_id, type: product|original_art|print, price, sale_price, stock, sku, tags[], is_featured, is_active, weight_g, dimensions)
- `product_images` (product_id, url, alt, sort_order)
- `product_variants` (product_id, name, price_delta, stock, sku)
- `collection_products` (collection_id, product_id)
- `carts` / `cart_items` (user_id, product_id, variant_id, qty)
- `saved_items` (user_id, product_id)
- `coupons` (code, type, value, min_order, starts_at, ends_at, usage_limit, used_count)
- `orders` (order_number e.g. YCW-2026-00001, user_id nullable, email, phone, shipping_address jsonb, subtotal, discount, shipping_fee, total, status, payment_status, razorpay_order_id, razorpay_payment_id, courier, tracking_id, notes)
- `order_items` (order_id, product_id, variant_id, name_snapshot, price_snapshot, qty)
- `order_status_history` (order_id, status, note, changed_by)
- `store_settings` (key, value jsonb)
- `events` (session_id, user_id nullable, event_name, product_id nullable, metadata jsonb) **for analytics**

**Rules:**
- Store prices as **integers in paise** to avoid rounding errors.
- Snapshot product name and price into `order_items`.
- Write all schema changes as SQL migration files in `/supabase/migrations`, plus a seed file with example data: ~20 products across 4 categories, 6 artworks, 2 collections and 1 coupon.
- Turn on Row Level Security for every table. Customers see only their own data, and admin sees everything.

## 8. Payments (Razorpay)
1. The server creates the Razorpay order using the total **recalculated on the server** (never trust prices from the browser).
2. Open Razorpay Checkout on the client.
3. Verify the payment signature on the server, then mark the order paid.
4. Add a webhook endpoint `/api/webhooks/razorpay` as the source of truth (handles closed tabs). It must be idempotent.
5. Reduce stock only after confirmed payment, in a single database transaction. Block checkout if stock runs out.
6. No cash on delivery.

## 9. Analytics (owner is a data scientist — make data clean)
Log these to `events`: `page_view`, `product_view`, `search` (with query), `add_to_cart`, `remove_from_cart`, `save_for_later`, `begin_checkout`, `payment_success`, `payment_failed`. Use a consistent schema with no personal data in metadata. Add a `/docs/data-dictionary.md` that explains every table and event so she can analyse them in Python/SQL.

## 10. Folder structure
```
yourscrafts-store/
  CLAUDE.md
  .env.example
  src/app/(shop)/...        customer pages
  src/app/admin/...         admin pages
  src/app/api/...           route handlers (payments, webhooks, export)
  src/components/ui/        shadcn components
  src/components/shop/      storefront components
  src/components/admin/     admin components
  src/lib/                  supabase clients, razorpay, pricing, validation
  supabase/migrations/      SQL migrations
  supabase/seed.sql         example data
  public/brand/             logo, favicon
  docs/                     setup guide, data dictionary, owner manual
  tests/                    vitest + playwright
```

## 11. Build phases (stop after each one and show the owner)
1. **Foundation:** Next.js project, Tailwind theme with brand colours, layout (header, footer, mobile menu), Supabase connection, all migrations and seed data, home and shop pages showing seeded products.
2. **Shopping:** product page, search, filters, cart, save for later, artist page.
3. **Accounts:** sign up and login (email), profile with phone, addresses, middleware.
4. **Checkout & payments:** checkout, Razorpay test mode, webhook, order confirmation, stock handling, shipping rules from settings.
5. **Orders:** My orders, order tracking (logged-in users and guests), confirmation emails.
6. **Admin:** dashboard, products, artworks, collections, coupons, orders, customers, settings, CSV export.
7. **Polish & launch:** SEO (metadata, sitemap, Open Graph images), performance (Lighthouse 90+ on mobile), accessibility pass, Playwright tests for buy and admin flows, deploy to Vercel, write `docs/owner-manual.md` (plain-language guide: how to add a product, run a deal, update an order).

## 12. Definition of done (every phase)
- `npm run build`, `npm run lint` and the tests all pass.
- The new screens are checked on mobile and desktop widths.
- There are no secrets in the code, and `.env.example` is updated.
- Commit with a clear message and push to GitHub.
- Give the owner a short plain-language summary of what's new and how to see it.

## 13. Out of scope for now (do not build)
International shipping and multi-currency, phone OTP login, cash on delivery, custom domain, multiple admins, mobile app.
