import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { paiseToRupeesInput } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth";
import { parseSettingsRows } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("store_settings").select("key, value");
  const s = parseSettingsRows(data ?? []);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Changes show in the shop as soon as you save." />
      <SettingsForm
        initial={{
          whatsappNumber: s.whatsapp_number,
          instagramUrl: s.instagram_url,
          flatShippingRate: paiseToRupeesInput(s.flat_shipping_rate),
          freeShippingThreshold: paiseToRupeesInput(s.free_shipping_threshold),
          announcementText: s.announcement_text,
          cancellationWindowHours: String(s.cancellation_window_hours),
        }}
      />
    </div>
  );
}
