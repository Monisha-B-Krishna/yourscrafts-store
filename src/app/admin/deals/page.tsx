import type { Metadata } from "next";
import { CouponsManager, DealsManager, type CouponRow, type DealRow } from "@/components/admin/managers";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Deals & coupons" };

export default async function DealsPage() {
  const { supabase } = await requireAdmin();
  const [deals, coupons, categories, products] = await Promise.all([
    supabase.from("deals").select("id, name, type, value, product_id, category_id, starts_at, ends_at, is_active").order("starts_at", { ascending: false }),
    supabase.from("coupons").select("id, code, type, value, min_order, starts_at, ends_at, usage_limit, used_count").order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("products").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Deals & coupons" description="Deals lower prices in the shop automatically. Coupons are codes customers type at checkout." />
      <div className="flex flex-col gap-6">
        <Card title="Deals" description="A discount on a whole category or one product, for a set time. Prices change across the shop as soon as it starts.">
          <DealsManager deals={(deals.data ?? []) as DealRow[]} categories={categories.data ?? []} products={products.data ?? []} />
        </Card>
        <Card title="Coupon codes" description="Shared on Instagram or WhatsApp; customers enter them at checkout.">
          <CouponsManager coupons={(coupons.data ?? []) as CouponRow[]} />
        </Card>
      </div>
    </div>
  );
}
