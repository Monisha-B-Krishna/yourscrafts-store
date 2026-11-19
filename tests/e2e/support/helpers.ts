import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Shared bits for the browser tests. They run against a LOCAL Supabase
 * (`npx supabase start`) and the pretend Razorpay/Resend in fake-services.mjs —
 * never against the live shop. playwright.config.ts refuses to start otherwise.
 */

export const PASSWORD = "e2e-Password-2026";
const FAKE_CHECKOUT = readFileSync(join(__dirname, "fake-checkout.js"), "utf8");

export const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Creates a confirmed customer account (or reuses it) with a known password. */
export async function ensureUser(email: string, fullName: string, phone: string) {
  const db = admin();
  const { error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });
  if (!error) return;
  if (!/already/i.test(error.message)) throw error;
  // Already there (e.g. your local owner account): reset the password so the test can sign in.
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) await db.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true });
}

/** A product of its own for each test run, so seeded stock never runs out. */
export async function createTestProduct(opts: { name: string; pricePaise: number; stock: number }) {
  const db = admin();
  const { data: category } = await db.from("categories").select("id").order("sort_order").limit(1).single();
  const slug = `${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${unique()}`;
  const { data, error } = await db
    .from("products")
    .insert({
      name: opts.name,
      slug,
      description: "Made for the automated browser tests.",
      category_id: category?.id ?? null,
      price: opts.pricePaise,
      stock: opts.stock,
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data;
}

export async function signIn(page: Page, email: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Fills the checkout form with a delivery address in India. */
export async function fillCheckout(page: Page, email: string, who = { name: "Kavya Menon", city: "Kochi", state: "Kerala", pin: "682001" }) {
  await expect(page.getByRole("heading", { name: "3. Review & pay" })).toBeVisible();
  const emailBox = page.getByLabel("Email");
  if (await emailBox.isEditable()) await emailBox.fill(email);
  await page.getByLabel("Your mobile number").fill("98765 43210");
  await page.getByLabel("Recipient's full name").fill(who.name);
  await page.getByLabel("Recipient's mobile number").fill("9123456789");
  await page.getByLabel("House / flat number and street").fill("14, Rose Garden Lane");
  await page.getByLabel("City / town").fill(who.city);
  await page.getByLabel("State").selectOption(who.state);
  await page.getByLabel("PIN code").fill(who.pin);
}

/** A guest buys one of a product and pays; returns the order number. */
export async function placeGuestOrder(page: Page, slug: string, email: string) {
  await page.goto(`/product/${slug}`);
  await page.getByRole("button", { name: /^Add to cart/ }).click();
  await page.goto("/checkout");
  await fillCheckout(page, email);
  await page.getByRole("button", { name: /^Pay / }).click();
  await page.getByRole("dialog", { name: "Pretend Razorpay" }).getByRole("button", { name: "Pay now" }).click();
  await page.waitForURL(/\/checkout\/success/);
  return (await page.locator("strong", { hasText: /^YCW-\d{4}-\d{5}$/ }).innerText()).trim();
}

/** Emails the pretend Resend has received for this address. */
export async function emailsTo(address: string): Promise<{ subject: string; html: string }[]> {
  const res = await fetch("http://127.0.0.1:54398/emails.json");
  const all = (await res.json()) as { to: string; subject: string; html: string }[];
  return all.filter((m) => m.to.split(",").includes(address));
}

const swapInFakeCheckout = (page: Page) =>
  page.route("https://checkout.razorpay.com/v1/checkout.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: FAKE_CHECKOUT }),
  );

/** A second, signed-out shopper in their own browser window (baseURL comes from the config). */
export async function shopperPage(browser: Browser, baseURL = process.env.E2E_BASE_URL || "http://localhost:3000") {
  const page = await (await browser.newContext({ baseURL })).newPage();
  await swapInFakeCheckout(page);
  return page;
}

/** Every page swaps Razorpay's real checkout window for the pretend one. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await swapInFakeCheckout(page);
    await use(page);
  },
});

export { expect };
