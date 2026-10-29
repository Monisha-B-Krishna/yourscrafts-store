# Data dictionary

How the store's data is laid out in Supabase Postgres, written for analysis in SQL or Python.
The source of truth is `supabase/migrations/`.

## Conventions

- **Money is integer paise** in every table (₹1 = 100 paise). Divide by 100 to get rupees.
  `products.price = 129900` means ₹1,299.
- Every table has `id uuid` (primary key), `created_at` and `updated_at` (`timestamptz`, stored
  in UTC). Convert to IST with `created_at at time zone 'Asia/Kolkata'`.
- Row Level Security is on for every table. Analyse with the service-role key, or in Supabase
  Studio, to see all rows.

## Catalogue

| Table | What one row is | Key columns |
|---|---|---|
| `categories` | A shop category | `name`, `slug`, `parent_id` (for sub-categories), `sort_order` |
| `products` | Anything for sale: gifts, original paintings and prints | `type` (`product` / `original_art` / `print`), `price`, `sale_price` (null = not on sale), `stock`, `sku`, `tags[]`, `is_featured`, `is_active` (false = archived), `weight_g`, `dimensions`, `sales_count` |
| | | `effective_price`: generated, `coalesce(sale_price, price)` |
| | | `search_vector`: generated full-text index (english, stemmed) over name (weight A), tags (B) and description (C) |
| | | `search_vector_simple`: the same fields unstemmed, for "as you type" prefix matching |
| `product_images` | One image of a product | `product_id`, `url`, `alt`, `sort_order` (0 = main image) |
| `product_variants` | A size/colour option | `product_id`, `name`, `price_delta` (added to the product price), `stock`, `sku` |

**Stock for products with variants:** each variant's `stock` is the source of truth, and a
trigger keeps `products.stock` equal to the variants' total. Unit price of a variant =
`effective_price + price_delta`.

**Search:** `search_products(search_query, max_results)` returns the best matches as JSON
(same shape as the storefront uses). Every word must match name, tags, description or category
name (prefixes count, so "choc" finds chocolate); if nothing matches all words, products matching
any word are returned.
| `collections` | A named edition, e.g. "Diwali Edition 2026" | `starts_at`, `ends_at`, `is_active`, `banner_image` |
| `collection_products` | Membership of a product in a collection | `collection_id`, `product_id` |
| `deals` | A time-boxed discount on one product or one category | `type` (`percentage` / `flat`), `value` (percent points, or paise when flat), `product_id` **or** `category_id`, `starts_at`, `ends_at` |
| `coupons` | A checkout code | `code` (upper case), `type`, `value`, `min_order` (paise), `usage_limit`, `used_count` |

## Customers

| Table | What one row is | Key columns |
|---|---|---|
| `profiles` | One per signed-up user (created automatically on sign-up) | `user_id` → `auth.users`, `full_name` (≤ 100 chars), `phone` (10-digit Indian mobile, no +91, e.g. `9876543210`), `role` (`customer` / `admin`) |
| `addresses` | A saved shipping address (up to 20 per customer) | `user_id`, `phone` (10 digits), `city`, `state` (one of the 36 states/UTs), `pincode` (6 digits), `is_default` (exactly one per customer) |
| `carts` / `cart_items` | A signed-in user's cart (guest carts live in the browser and are merged in at login) | `cart_items.product_id`, `variant_id`, `qty` (1–99), `created_at` (order the items were added) |
| `saved_items` | "Save for later" | `user_id`, `product_id` |

## Orders

| Table | What one row is | Key columns |
|---|---|---|
| `orders` | One checkout | `order_number` (`YCW-2026-00001`), `user_id` (null for guests), `email`, `phone`, `shipping_address` (JSON), `subtotal`, `discount`, `shipping_fee`, `total` (always `subtotal − discount + shipping_fee`), `coupon_code`, `status`, `payment_status`, `razorpay_order_id`, `razorpay_payment_id`, `courier`, `tracking_id`, `notes` |
| `order_items` | One line in an order | `name_snapshot` and `price_snapshot` (what the customer saw and paid per unit, even if the product changes later), `qty`, `product_id`, `variant_id` |
| `order_status_history` | Every status change, timestamped | `order_id`, `status`, `note`, `changed_by` |

**`orders.status`:** `placed` → `confirmed` → `packed` → `shipped` → `delivered`, or `cancelled`.
**`orders.payment_status`:** `pending`, `paid`, `failed`, `refunded`.

Line revenue = `price_snapshot * qty`. For revenue reports, filter `payment_status = 'paid'`.

## Settings

`store_settings` holds one row per setting as `key` + `value` (JSON):
`whatsapp_number`, `flat_shipping_rate` (paise), `free_shipping_threshold` (paise),
`announcement_text`, `instagram_url`, `cancellation_window_hours`.

## Analytics: `events`

One row per tracked action. Only the admin can read events.

**How events get in:** the browser sends each event to `/api/events`; the server checks it
against a fixed schema (unknown event names or keys are rejected or dropped), masks anything
that looks like an email or phone number, and writes it with the service role. Nobody can write
to the table directly with the public key. Payment events are written by the server only.

| Column | Meaning |
|---|---|
| `session_id` | Random ID for one browsing session (stored in the browser; a new one starts after 30 minutes of inactivity). Groups a visit's events. |
| `user_id` | Set only when the visitor is signed in (from their login, never from the browser) |
| `event_name` | One of the events below (enforced by the database) |
| `product_id` | The product involved (required for product, cart and save events) |
| `metadata` | Extra JSON details. **Never contains personal data** (no names, emails, phones or addresses). |
| `created_at` | When it happened (UTC) |

| `event_name` | Fired when | `metadata` keys |
|---|---|---|
| `page_view` | Any shop page is shown (including in-app navigation) | `path` (e.g. `/shop`, no query string); `referrer_host` on the first page of a visit when the visitor came from another site (e.g. `instagram.com`) |
| `product_view` | A product page is shown | none |
| `search` | Search results page shown, or a suggestion picked from the search box | `query` (lower-cased, emails/phone numbers masked as `[email]`/`[number]`), `results` (count), `source` (`results_page` / `suggestion`) |
| `add_to_cart` | Added from a product page, quantity raised in the cart, or moved from saved items | `qty` (units added), `variant_id` (or null), `source` (`product_page` / `cart` / `saved`), `unit_price` (paise, looked up by the server at that moment) |
| `remove_from_cart` | Removed, or quantity lowered, in the cart | `qty` (units removed), `variant_id` (or null), `source` (`cart`) |
| `save_for_later` | Saved by a signed-in customer | `source` (`product_page` / `cart`) |
| `begin_checkout` | Checkout opened (Phase 4) | `items`, `subtotal` (paise) |
| `payment_success` / `payment_failed` | Razorpay result (Phase 4, server-side) | to be confirmed in Phase 4 |

Notes for analysis:
- Quantities in `add_to_cart` / `remove_from_cart` are **changes**, not totals, so net cart
  units per session = sum(add qty) − sum(remove qty).
- Removing an item that was already sold out or no longer available is not logged as
  `remove_from_cart` (it wasn't a choice).

### Example queries

```sql
-- Revenue by day (₹), paid orders only
select date(created_at at time zone 'Asia/Kolkata') as day, sum(total) / 100.0 as revenue_inr
from orders where payment_status = 'paid' group by 1 order by 1;

-- Product-view → add-to-cart conversion by product
select p.name,
       count(*) filter (where e.event_name = 'product_view') as views,
       count(*) filter (where e.event_name = 'add_to_cart')  as adds
from events e join products p on p.id = e.product_id
group by p.name order by views desc;

-- Searches that found nothing (ideas for new products)
select metadata->>'query' as query, count(*) as times
from events
where event_name = 'search' and (metadata->>'results')::int = 0
group by 1 order by 2 desc;
```

In Python: `pd.read_sql("select * from events", conn)` and expand the JSON with
`pd.json_normalize(df["metadata"])`.
