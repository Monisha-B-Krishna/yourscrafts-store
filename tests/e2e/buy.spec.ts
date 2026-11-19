import { admin, createTestProduct, emailsTo, expect, fillCheckout, test, unique } from "./support/helpers";

/**
 * A guest on a phone finds a gift, pays (a first attempt fails, the retry
 * works), gets a confirmation and an email, and later tracks the order.
 */
test("guest buys a gift on a phone and tracks the order", async ({ page }) => {
  const db = admin();
  const product = await createTestProduct({ name: "E2E Rose Bouquet", pricePaise: 64_900, stock: 3 });
  // Shipping comes from Admin → Settings, so read what it is right now.
  const { data: settings } = await db.from("store_settings").select("key, value").in("key", ["flat_shipping_rate", "free_shipping_threshold"]);
  const setting = (key: string) => Number(settings?.find((r) => r.key === key)?.value);
  const shipping = 64_900 >= setting("free_shipping_threshold") ? 0 : setting("flat_shipping_rate");
  const total = 64_900 + shipping;
  const email = `guest.${unique()}@example.test`;

  // Find it and add it to the cart.
  await page.goto(`/product/${product.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Rose Bouquet" })).toBeVisible();
  await page.getByRole("button", { name: /^Add to cart/ }).click();

  await page.goto("/cart");
  await expect(page.getByRole("link", { name: "E2E Rose Bouquet" })).toBeVisible();
  // ₹649 is under the free-shipping line, so the cart says how much more is needed.
  if (shipping > 0) await expect(page.getByText(/more for free shipping/)).toBeVisible();

  // Checkout with an Indian address.
  await page.goto("/checkout");
  await fillCheckout(page, email);

  // ₹649 + shipping, worked out on the server and sent to Razorpay in paise.
  await page.getByRole("button", { name: /^Pay / }).click();
  const razorpay = page.getByRole("dialog", { name: "Pretend Razorpay" });
  await expect(razorpay).toHaveAttribute("data-amount", String(total));

  // First attempt fails: nothing is sold yet.
  await razorpay.getByRole("button", { name: "Fail" }).click();
  await expect
    .poll(async () => (await db.from("orders").select("payment_status").eq("email", email).single()).data?.payment_status)
    .toBe("failed");
  expect((await db.from("products").select("stock").eq("id", product.id).single()).data?.stock).toBe(3);

  // The retry goes through.
  await razorpay.getByRole("button", { name: "Pay now" }).click();
  await page.waitForURL(/\/checkout\/success/);
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  const orderNumber = (await page.locator("strong", { hasText: /^YCW-\d{4}-\d{5}$/ }).innerText()).trim();

  // The database agrees: paid once, stock down by one, name and price snapshotted.
  const { data: order } = await db
    .from("orders")
    .select("id, status, payment_status, total, order_items(name_snapshot, price_snapshot, qty)")
    .eq("order_number", orderNumber)
    .single();
  expect(order).toMatchObject({
    status: "placed",
    payment_status: "paid",
    total,
    order_items: [{ name_snapshot: "E2E Rose Bouquet", price_snapshot: 64_900, qty: 1 }],
  });
  expect((await db.from("products").select("stock").eq("id", product.id).single()).data?.stock).toBe(2);

  // A receipt email goes out (to the pretend Resend).
  await expect.poll(async () => (await emailsTo(email)).map((m) => m.subject)).toContain(
    `Order ${orderNumber} confirmed · Yours Crafts Woman`,
  );

  // The cart is empty again.
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();

  // Later: track it with order number + email (any case, extra spaces).
  await page.goto("/track");
  await page.getByLabel("Order number").fill(`  ${orderNumber.toLowerCase()} `);
  await page.getByLabel("Email used at checkout").fill(email.toUpperCase());
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();
  await expect(page.getByText("Kochi")).toBeVisible();

  // Someone with only the number can't see it.
  await page.goto("/track");
  await page.getByLabel("Order number").fill(orderNumber);
  await page.getByLabel("Email used at checkout").fill("someone.else@example.test");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByText("We couldn't find a paid order")).toBeVisible();
});

test("checkout won't take payment for an item that has sold out", async ({ page }) => {
  const product = await createTestProduct({ name: "E2E Last Painting", pricePaise: 150_000, stock: 1 });
  await page.goto(`/product/${product.slug}`);
  await page.getByRole("button", { name: /^Add to cart/ }).click();

  // Someone else buys the last one before this shopper reaches checkout.
  await admin().from("products").update({ stock: 0 }).eq("id", product.id);

  await page.goto("/checkout");
  await fillCheckout(page, `late.${unique()}@example.test`, { name: "Ravi Kumar", city: "Bengaluru", state: "Karnataka", pin: "560001" });
  await expect(page.getByText("No longer available")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pay / })).toBeDisabled();
});
