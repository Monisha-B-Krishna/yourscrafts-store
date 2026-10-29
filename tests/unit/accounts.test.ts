import { describe, expect, it } from "vitest";
import { isOwnerAccount } from "@/lib/auth/admin-role";
import { loginHref, safeNextPath } from "@/lib/auth/redirect";
import { nextSyncStep } from "@/lib/cart/sync";
import {
  addressSchema,
  formatIndianPhone,
  INDIAN_STATES,
  newPasswordFormSchema,
  normaliseIndianPhone,
  signUpSchema,
} from "@/lib/validation/account";

describe("Indian mobile numbers", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["+91-98765-43210", "9876543210"],
    ["919876543210", "9876543210"],
    ["098765 43210", "9876543210"],
    ["6000000000", "6000000000"],
  ])("accepts %s", (input, expected) => {
    expect(normaliseIndianPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "5876543210", "98765432101", "+1 415 555 0100", "phone"])("rejects %s", (input) => {
    expect(normaliseIndianPhone(input)).toBeNull();
  });

  it("formats for display", () => {
    expect(formatIndianPhone("9876543210")).toBe("+91 98765 43210");
    expect(formatIndianPhone(null)).toBe("");
  });
});

describe("sign-up form", () => {
  const valid = { fullName: "Asha Rao", email: " Asha@Example.COM ", phone: "+91 98765 43210", password: "rose2026" };

  it("cleans up a valid sign-up", () => {
    expect(signUpSchema.parse(valid)).toEqual({
      fullName: "Asha Rao",
      email: "asha@example.com",
      phone: "9876543210",
      password: "rose2026",
    });
  });

  it("requires a phone number", () => {
    const result = signUpSchema.safeParse({ ...valid, phone: "" });
    expect(result.success).toBe(false);
  });

  it.each(["short1", "allletters", "12345678"])("rejects the weak password %s", (password) => {
    expect(signUpSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  it("checks the two new passwords match", () => {
    expect(newPasswordFormSchema.safeParse({ password: "rose2026", confirm: "rose2027" }).success).toBe(false);
    expect(newPasswordFormSchema.safeParse({ password: "rose2026", confirm: "rose2026" }).success).toBe(true);
  });
});

describe("address form", () => {
  const valid = {
    name: "Asha Rao",
    phone: "98765 43210",
    line1: "12, 3rd Cross, Malleshwaram",
    line2: "",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560 003",
    isDefault: false,
  };

  it("accepts a normal Indian address and tidies it", () => {
    const parsed = addressSchema.parse(valid);
    expect(parsed.pincode).toBe("560003");
    expect(parsed.phone).toBe("9876543210");
    expect(parsed.line2).toBeNull();
  });

  it("accepts its own tidied output (the browser tidies, then the server checks again)", () => {
    const once = addressSchema.parse(valid);
    expect(addressSchema.parse(once)).toEqual(once);
    const withLine2 = addressSchema.parse({ ...valid, line2: "Near the temple" });
    expect(addressSchema.parse(withLine2).line2).toBe("Near the temple");
  });

  it.each(["056003", "56003", "5600031", "ABCDEF"])("rejects the PIN code %s", (pincode) => {
    expect(addressSchema.safeParse({ ...valid, pincode }).success).toBe(false);
  });

  it("only allows real states and union territories", () => {
    expect(addressSchema.safeParse({ ...valid, state: "Narnia" }).success).toBe(false);
    expect(INDIAN_STATES).toHaveLength(36);
  });
});

describe("where to go after signing in", () => {
  it.each([
    ["/checkout", "/checkout"],
    ["/shop?category=gift-hampers", "/shop?category=gift-hampers"],
    ["/account/addresses", "/account/addresses"],
  ])("keeps on-site paths: %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "checkout",
    "/login",
    "/signup?next=/x",
    "/auth/confirm",
    "",
    undefined,
    42,
  ])("falls back to /account for %s", (input) => {
    expect(safeNextPath(input)).toBe("/account");
  });

  it("builds login links", () => {
    expect(loginHref("/checkout")).toBe("/login?next=%2Fcheckout");
    expect(loginHref("https://evil.example")).toBe("/login");
    expect(loginHref()).toBe("/login");
  });
});

describe("cart sync decisions", () => {
  it("merges a guest cart into the account once, at login", () => {
    expect(nextSyncStep(null, "user-a")).toBe("merge");
  });
  it("loads the saved cart for a returning customer", () => {
    expect(nextSyncStep("user-a", "user-a")).toBe("load");
  });
  it("never merges another customer's leftover cart", () => {
    expect(nextSyncStep("user-b", "user-a")).toBe("load");
  });
  it("clears the copy after sign-out, and leaves guests alone", () => {
    expect(nextSyncStep("user-a", null)).toBe("clear");
    expect(nextSyncStep(null, null)).toBe("none");
  });
});

describe("owner (admin) account", () => {
  const confirmed = "2026-10-29T10:00:00Z";
  it("matches ADMIN_EMAIL, ignoring case, once the email is confirmed", () => {
    expect(isOwnerAccount({ email: "Owner@Shop.in", email_confirmed_at: confirmed }, "owner@shop.in ")).toBe(true);
  });
  it("never trusts an unconfirmed email", () => {
    expect(isOwnerAccount({ email: "owner@shop.in", email_confirmed_at: undefined }, "owner@shop.in")).toBe(false);
  });
  it("needs ADMIN_EMAIL to be set and to match", () => {
    expect(isOwnerAccount({ email: "owner@shop.in", email_confirmed_at: confirmed }, "")).toBe(false);
    expect(isOwnerAccount({ email: "someone@shop.in", email_confirmed_at: confirmed }, "owner@shop.in")).toBe(false);
  });
});
