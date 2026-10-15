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
| | | `search_vector`: generated full-text index over name (weight A), tags (B) and description (C) |
| `product_images` | One image of a product | `product_id`, `url`, `alt`, `sort_order` (0 = main image) |
| `product_variants` | A size/colour option | `product_id`, `name`, `price_delta` (added to the product price), `stock`, `sku` |
| `collections` | A named edition, e.g. "Diwali Edition 2026" | `starts_at`, `ends_at`, `is_active`, `banner_image` |
| `collection_products` | Membership of a product in a collection | `collection_id`, `product_id` |
| `deals` | A time-boxed discount on one product or one category | `type` (`percentage` / `flat`), `value` (percent points, or paise when flat), `product_id` **or** `category_id`, `starts_at`, `ends_at` |
| `coupons` | A checkout code | `code` (upper case), `type`, `value`, `min_order` (paise), `usage_limit`, `used_count` |

## Customers

| Table | What one row is | Key columns |
|---|---|---|
| `profiles` | One per signed-up user (created automatically on sign-up) | `user_id` → `auth.users`, `full_name`, `phone`, `role` (`customer` / `admin`) |
| `addresses` | A saved shipping address | `user_id`, `pincode` (6 digits), `state`, `is_default` |
| `carts` / `cart_items` | A signed-in user's cart (guest carts live in the browser) | `cart_items.product_id`, `variant_id`, `qty` |
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

One row per tracked action. Visitors can write events but nobody can read them except the admin.

| Column | Meaning |
|---|---|
| `session_id` | Random ID for one browser session (8–64 chars); groups a visit's events |
| `user_id` | Set only when the visitor is signed in |
| `event_name` | One of the events below (enforced by the database) |
| `product_id` | The product involved, when there is one |
| `metadata` | Extra JSON details. **Never contains personal data** (no names, emails, phones or addresses). |

| `event_name` | Fired when | `metadata` |
|---|---|---|
| `page_view` | Any page loads | `{ "path": "/shop", "referrer_host": "instagram.com" }` |
| `product_view` | A product page loads | `{}` |
| `search` | A search is submitted | `{ "query": "diwali", "results": 3 }` |
| `add_to_cart` / `remove_from_cart` | Cart changes | `{ "qty": 1, "variant_id": "…" }` |
| `save_for_later` | Item saved | `{}` |
| `begin_checkout` | Checkout page opened | `{ "items": 3, "subtotal": 249700 }` |
| `payment_success` / `payment_failed` | Razorpay result | `{ "order_number": "YCW-2026-00001", "total": 249700 }` / `{ "reason": "…" }` |

Event logging is wired up in Phases 2 and 4. The exact metadata keys above will be confirmed
as each event goes live.

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
```
