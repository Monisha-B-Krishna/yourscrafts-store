import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettingsRows } from "@/lib/settings";
import { whatsappLink } from "@/lib/whatsapp";

describe("store settings", () => {
  it("has the spec defaults", () => {
    expect(DEFAULT_SETTINGS.whatsapp_number).toBe("919999999999");
    expect(DEFAULT_SETTINGS.flat_shipping_rate).toBe(8000);
    expect(DEFAULT_SETTINGS.free_shipping_threshold).toBe(99900);
  });

  it("reads key/value rows from the database", () => {
    const s = parseSettingsRows([
      { key: "whatsapp_number", value: "919876543210" },
      { key: "flat_shipping_rate", value: 5000 },
    ]);
    expect(s.whatsapp_number).toBe("919876543210");
    expect(s.flat_shipping_rate).toBe(5000);
    expect(s.free_shipping_threshold).toBe(99900);
  });

  it("falls back to defaults for invalid values", () => {
    const s = parseSettingsRows([
      { key: "flat_shipping_rate", value: "eighty" },
      { key: "whatsapp_number", value: "call me" },
    ]);
    expect(s.flat_shipping_rate).toBe(8000);
    expect(s.whatsapp_number).toBe("919999999999");
  });
});

describe("whatsappLink", () => {
  it("strips formatting from the number", () => {
    expect(whatsappLink("+91 99999-99999")).toBe("https://wa.me/919999999999");
  });
  it("URL-encodes the pre-filled message", () => {
    expect(whatsappLink("919999999999", "Hi! Custom piece & more?")).toBe(
      "https://wa.me/919999999999?text=Hi!%20Custom%20piece%20%26%20more%3F",
    );
  });
});
