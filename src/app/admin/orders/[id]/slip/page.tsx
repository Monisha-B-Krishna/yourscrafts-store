import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass, formatDay } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatIndianPhone } from "@/lib/validation/account";
import { PrintButton } from "../order-forms";

export const metadata: Metadata = { title: "Packing slip" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A printable slip to put in the parcel: no prices (many orders are gifts). */
export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("orders")
    .select("order_number, paid_at, shipping_address, items:order_items (name_snapshot, qty)")
    .eq("id", id)
    .eq("payment_status", "paid")
    .maybeSingle();
  if (!data) notFound();
  const a = data.shipping_address as { name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
  const items = data.items as { name_snapshot: string; qty: number }[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Link href={`/admin/orders/${id}`} className={buttonClass.secondary}>
          ← Back to order
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-2xl rounded-3xl border border-border/70 bg-white p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b pb-6">
          <div>
            <p className="font-serif text-3xl">Yours Crafts Woman</p>
            <p className="mt-1 text-sm text-muted-ink">Handmade with love · @yours.craftswoman</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{data.order_number}</p>
            <p className="text-muted-ink">{formatDay(data.paid_at)}</p>
          </div>
        </header>
        <section className="mt-6">
          <h2 className="text-xs font-medium tracking-widest text-muted-ink uppercase">Ship to</h2>
          <p className="mt-2 text-lg leading-relaxed">
            <strong>{a.name}</strong>
            <br />
            {a.line1}
            {a.line2 && (
              <>
                <br />
                {a.line2}
              </>
            )}
            <br />
            {a.city}, {a.state} <strong>{a.pincode}</strong>
            <br />
            {formatIndianPhone(a.phone)}
          </p>
        </section>
        <table className="mt-8 w-full text-left">
          <thead>
            <tr className="border-b text-xs tracking-widest text-muted-ink uppercase">
              <th className="pb-2 font-medium">Item</th>
              <th className="w-16 pb-2 text-right font-medium">Qty</th>
              <th className="w-16 pb-2 text-right font-medium">Packed</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, n) => (
              <tr key={n} className="border-b">
                <td className="py-3">{i.name_snapshot}</td>
                <td className="py-3 text-right font-semibold">{i.qty}</td>
                <td className="py-3 text-right">
                  <span className="inline-block size-5 rounded border border-ink/40" aria-label="Tick when packed" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-10 text-center font-serif text-xl">Thank you for supporting handmade ✿</p>
      </article>
    </div>
  );
}
