import {
  admin,
  createTestProduct,
  emailsTo,
  ensureUser,
  expect,
  placeGuestOrder,
  shopperPage,
  signIn,
  test,
  unique,
} from "./support/helpers";

const OWNER = process.env.ADMIN_EMAIL!;

test("customers can't get into the admin panel", async ({ page }) => {
  const email = `shopper.${unique()}@example.test`;
  await ensureUser(email, "Shopper", "9000000002");
  await signIn(page, email);
  expect((await page.goto("/admin"))?.status()).toBe(404);
  expect((await page.goto("/admin/orders"))?.status()).toBe(404);
  expect((await page.request.get("/api/admin/export/orders")).status()).toBe(404);
});

test("the owner adds a product, ships an order and downloads the data", async ({ page, browser }) => {
  await ensureUser(OWNER, "Monisha", "9000000001");
  await signIn(page, OWNER, "/admin");
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { name: /^Hello, / })).toBeVisible();
  await expect(page.getByText("Waiting to pack")).toBeVisible();

  // 1. Add a product with the form.
  const name = `E2E Peacock Lamp ${unique()}`;
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByRole("button", { name: "Save and add to shop" }).click();
  await expect(page.getByText("Please give it a name")).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Description").fill("A hand-painted peacock lamp that glows warm gold.");
  await page.getByLabel("Price", { exact: true }).fill("1,499");
  await page.getByLabel("In stock").fill("5");
  await page.getByRole("button", { name: "Save and add to shop" }).click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/);
  const slug = await page.getByLabel("Web address").inputValue();

  const shopper = await shopperPage(browser);
  expect((await shopper.goto(`/product/${slug}`))?.status()).toBe(200);
  await expect(shopper.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(shopper.getByText("₹1,499").first()).toBeVisible();
  await shopper.close();

  // 2. A guest buys something; the owner ships it.
  const product = await createTestProduct({ name: "E2E Diya Set", pricePaise: 120_000, stock: 4 });
  const buyer = `buyer.${unique()}@example.test`;
  const guest = await shopperPage(browser);
  const orderNumber = await placeGuestOrder(guest, product.slug, buyer);
  const { data: order } = await admin().from("orders").select("id, access_key").eq("order_number", orderNumber).single();

  await page.goto("/admin/orders?status=to-pack");
  await expect(page.getByRole("list", { name: "Orders" }).getByText(orderNumber)).toBeVisible();
  await page.goto(`/admin/orders/${order!.id}`);
  await page.getByLabel("Courier").fill("Delhivery");
  await page.getByLabel("Tracking ID or link").fill("https://www.delhivery.com/track/package/9988776655");
  await page.getByLabel("Status").selectOption("shipped");
  await page.getByLabel("Note for the history").fill("Sent with a free card");
  await page.getByRole("button", { name: "Mark as Shipped" }).click();
  await expect(page.getByText(/Order marked shipped/)).toBeVisible();

  // Every change is timestamped in the history, with who made it.
  const { data: history } = await admin()
    .from("order_status_history")
    .select("status, note, changed_by")
    .eq("order_id", order!.id)
    .order("created_at");
  expect(history?.map((h) => h.status)).toEqual(["placed", "shipped"]);
  expect(history?.[1]).toMatchObject({ note: "Sent with a free card" });
  expect(history?.[1].changed_by).toBeTruthy();

  // The customer is emailed and sees it on their tracking page (but never private notes).
  await expect.poll(async () => (await emailsTo(buyer)).some((m) => m.subject.includes("Shipped") && m.html.includes("Delhivery"))).toBe(true);
  await page.getByLabel("Private notes").fill("Add a dried rose.");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByText("Notes saved.")).toBeVisible();
  await guest.goto(`/orders/${orderNumber}?key=${order!.access_key}`);
  await expect(guest.getByText("Delhivery")).toBeVisible();
  await expect(guest.locator("main")).not.toContainText("dried rose");
  await guest.close();

  // 3. Data export for analysis.
  const csv = await page.request.get("/api/admin/export/orders");
  expect(csv.status()).toBe(200);
  const text = await csv.text();
  // Starts with a byte-order mark so Excel reads ₹ and Indian names correctly.
  expect(text.split("\r\n")[0]).toMatch(/^\uFEFF?id,order_number,user_id,email/);
  expect(text).toContain(orderNumber);
  expect(text).not.toContain(order!.access_key);
});

