import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser, getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

const COMING = [
  "Today’s and this month’s sales",
  "Add and edit products, artworks and photos",
  "Deals, coupon codes and editions",
  "Orders: update status, add tracking, print packing slips",
  "Customers and store settings",
  "Download your data as CSV",
];

export default async function AdminHome() {
  const session = await getCurrentUser();
  const profile = session ? await getProfile(session) : null;
  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "there";

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl sm:text-4xl">Welcome back, {firstName}</h1>
      <p className="mt-3 text-muted-ink">
        You’re signed in as the store owner, so this private area is open to you and nobody else.
      </p>
      <section aria-labelledby="coming-heading" className="mt-8 rounded-3xl border border-border/70 bg-white p-6 sm:p-8">
        <h2 id="coming-heading" className="text-2xl">
          Coming in the admin panel
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted-ink">
          {COMING.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <Link
        href="/account"
        className="mt-8 inline-flex h-12 items-center rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft"
      >
        My account
      </Link>
    </div>
  );
}
