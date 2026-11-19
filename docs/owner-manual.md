# Owner's manual

How to run Yours Crafts Woman day to day. No code needed for anything here.

**Your admin panel:** sign in with your owner email, then go to `/admin` (or **My account →
Open the admin panel**). Bookmark it on your phone. Every screen works on a phone.

---

## Your daily routine (5 minutes)

1. Open **Dashboard**. It shows sales today and this month, **Waiting to pack**, **Low stock**
   (3 or fewer left) and your top sellers.
2. Open each order under **Orders to pack**, make it, pack it, then update it (see below).
3. Check WhatsApp for custom-piece requests. They never go through the website checkout.

---

## Orders

### Update an order

Open **Orders**, then click the order. Under **Update this order**:

1. Choose the new **Status**:
   **Placed** (just paid) → **Confirmed** (you've seen it) → **Packed** → **Shipped** → **Delivered**.
   You can skip steps. Most people go straight from Placed to Packed to Shipped.
2. When shipping, fill in **Courier** (e.g. *Delhivery*, *India Post*) and **Tracking ID or link**.
   If you paste the courier's full tracking link, the customer gets a **Track with the courier** button.
3. Optional: add a **Note for the history**, e.g. "Sent with a free card".
4. Leave **Email the customer about this update** ticked if you want them to get an email
   (this needs order emails switched on, see go-live.md step 4).
5. Press **Mark as Shipped** (the button names the status you picked).

Every change is saved with the date, time and who made it, under **History**. The customer's tracking page
updates straight away.

**Private notes** are only for you, e.g. "gift for her sister, add a dried rose". Customers never see them.

**Packing slip:** press **Packing slip**, then **Print**. It has the address, items and order number, with no prices,
so it can go inside a gift parcel.

**Finding an order:** use the filters at the top (**To pack**, **Shipped**, and so on), or search by order
number, name, email or phone. **Unpaid checkouts** are people who pressed Pay but didn't finish. They're
not orders, but they're useful to see what people almost bought.

### Cancel and refund

1. Refund the money in the **Razorpay dashboard** (Transactions → Payments → the payment → **Refund**).
2. In the order, set the status to **Cancelled** and tick **Put the items back in stock** if the pieces can be
   sold again.

The Returns page tells customers they can change or cancel within your **cancel window** (set in Settings),
before you start making the piece.

### Custom orders

The **Request a custom piece** buttons open WhatsApp with a ready-made message to your number. Agree on the
price and payment there (for example a UPI payment link from the Razorpay dashboard). Custom orders don't go
through the website's cart.

---

## Products

### Add a product

**Products → Add product**, then fill in:

| Field | What to put |
|---|---|
| **Name** | What customers see, e.g. *Blush Rose Chocolate Bouquet*. The **Web address** fills itself in. |
| **Description** | What it is, size, what's inside, how long it lasts. Write it the way you'd describe it in a DM. |
| **Category** | Where it shows in the shop menu. |
| **Tags** | Words people might search for, separated by commas: `diwali, gift for her, rose`. |
| **Price** | The normal price in rupees, e.g. `1299`. |
| **Sale price** | Optional. If filled, the shop shows it with the old price crossed out. |
| **In stock** | How many you can sell right now. At 0 it shows **Sold out** and can't be bought. |
| **Photos** | Drag in up to 12. The **first photo is the main one**. Drag to reorder, or use **Make main photo**. Add a short description of each photo for blind customers and Google. |
| **Options** | Only if it comes in sizes or colours, e.g. *Small* / *Large*, each with a **Price difference** (`200` or `-100`) and its own stock. |
| **Featured** | Ticks it into the highlights. |
| **Show in the shop** | Untick to keep it hidden while you're still working on it. |

Then press **Save and add to shop**. It's live straight away.

**Photo tips:** use natural daylight and a plain background, and make the main photo square. Big phone photos are
fine, because the panel shrinks them before uploading.

### Change, sell out, hide

- **Edit:** click the product, change anything, press **Save changes**.
- **Sold out:** set **In stock** to 0. Stock goes down by itself when someone pays.
- **Archive:** hides it from the shop but keeps it for your records and past orders. **Restore** brings it back.
- **Duplicate:** makes a copy (hidden at first), which is handy for a new colour of the same bouquet.

### Artworks (your paintings)

**Artworks → Add artwork** works the same way, plus:

- **Original painting (one of a kind):** set **In stock** to 1. It shows **Sold out** once someone buys it.
- **Print (several sizes or copies):** add each size as an option (*A4*, *A3*…) with its price difference and stock.
- **Size of the piece:** e.g. `45 × 60 cm, acrylic on canvas`.
- Tick **Featured** to show it under *Featured artwork* on the home page.

The **About the Artist** page lists your originals and prints automatically.

---

## Deals, coupons and editions

### Run a sale (a deal)

**Deals & coupons → Deals**:

1. **Name** it, e.g. *Diwali sale*.
2. **Discount:** percentage off, or rupees off each item.
3. **Applies to:** a whole category or one product.
4. **Starts** and **Ends:** the sale switches on and off by itself at those times (Indian time).
5. **Save deal.**

Customers see the lower price with the old one crossed out. If a product also has a sale price, the cheaper
of the two wins.

### Make a coupon code

**Deals & coupons → Coupon codes**: a **Code** like `DIWALI15`, the discount, an optional **Minimum order**,
dates, and **How many times it can be used** in total. Customers type it at checkout. Share it on Instagram.

### Editions (collections)

**Editions** groups products under a name, e.g. *Diwali Edition*, with a description and dates. Each edition gets
its own shop page, which is good to link from your Instagram bio during a festival.

---

## Settings

**Settings** changes the shop without any code:

| Setting | What it does |
|---|---|
| **WhatsApp number** | Where every WhatsApp button goes. Include 91, no spaces: `919876543210`. |
| **Shipping charge** | Flat delivery fee per order (₹80 to start). |
| **Free shipping from** | Orders at or above this are delivered free (₹999 to start). The cart tells customers how much more they need. |
| **Text at the very top of every page** | The announcement bar. Leave empty to hide it. |
| **Instagram link** | Used in the footer and the Contact page. |
| **Change or cancel window (hours)** | How long after ordering customers may ask to change or cancel. |

---

## Customers

**Customers** lists everyone who has an account or has paid as a guest, with their number of orders and total
spent. The button next to each person lists their orders.

---

## Your data (for analysis)

**Download data** gives CSV files of orders, order items, status history, products, customers and events
(page views, searches, add-to-cart and so on). They open in Excel, Google Sheets or pandas:

```python
import pandas as pd
orders = pd.read_csv("orders.csv")
```

Prices are in **paise** (divide by 100 for rupees) and times are in UTC. Every column and event is
explained in [`data-dictionary.md`](data-dictionary.md).

---

## Changing words on the website

| What | Where |
|---|---|
| Products, prices, photos, sales, announcement bar, WhatsApp number | Admin panel (above) |
| Your story and photo on the About the Artist page | `src/content/artist.ts` |
| Contact details, policy dates, support email | `src/content/policies.ts` |
| The wording of Shipping, Returns, Privacy and Terms | `src/app/(shop)/(info)/<page>/page.tsx` |

To edit those files without installing anything: open the file on github.com, click the ✏️ pencil, change the
text between the quotes, then **Commit changes**. The live site updates in about two minutes. Or ask Claude to
do it.

---

## When something looks wrong

| Problem | What to do |
|---|---|
| A customer paid but no order shows | Check **Orders → Unpaid checkouts**, and the payment in Razorpay. The webhook (go-live.md step 3) fixes these automatically, so make sure it's set up. |
| A customer didn't get an email | Order emails need Resend and your own domain (go-live.md step 4). They can always find the order at **Track an order** with the order number and email. |
| Someone forgot their password | They use **Forgot password?** on the sign-in page. |
| The site shows example products | Archive them, or add yours. |
| The whole site is slow or down after a quiet week | Supabase's free plan pauses after a week without visits. Open supabase.com and press **Restore**. |
| You want something new on the site | Ask Claude, quoting this repository. |
