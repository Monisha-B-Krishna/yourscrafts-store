import type { Metadata } from "next";
import { EditionsManager, type EditionRow } from "@/components/admin/managers";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Editions" };

export default async function EditionsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: editions }, { data: products }] = await Promise.all([
    supabase
      .from("collections")
      .select("id, name, slug, description, banner_image, starts_at, ends_at, is_active, items:collection_products (product_id)")
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id, name").eq("is_active", true).order("name"),
  ]);
  const rows: EditionRow[] = (editions ?? []).map((e) => ({
    ...e,
    product_ids: (e.items as { product_id: string }[]).map((i) => i.product_id),
  }));

  return (
    <div className="max-w-4xl">
      <PageHeader title="Editions" description="Group pieces into a named collection, like Diwali Edition or Mother's Day." />
      <Card>
        <EditionsManager editions={rows} products={products ?? []} />
      </Card>
    </div>
  );
}
