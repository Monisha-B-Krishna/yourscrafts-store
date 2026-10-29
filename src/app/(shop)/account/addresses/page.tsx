import type { Metadata } from "next";
import { AddressBook } from "@/components/shop/account/address-book";
import { listAddresses } from "@/lib/addresses";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const session = await requireUser("/account/addresses");
  const addresses = await listAddresses(session.supabase, session.user.id);

  return (
    <div>
      <h2 className="sr-only">Saved addresses</h2>
      <p className="mb-5 text-muted-ink">
        Save the places you send gifts to most, and pick one in a tap at checkout. We deliver anywhere in India.
      </p>
      <AddressBook addresses={addresses} />
    </div>
  );
}
