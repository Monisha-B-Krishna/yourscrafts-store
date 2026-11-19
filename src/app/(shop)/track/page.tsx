import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/shop/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { TrackForm } from "./track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your Yours Crafts Woman order is with your order number and email.",
};

export default async function TrackPage() {
  const session = await getCurrentUser();
  return (
    <AuthShell
      title="Track your order"
      subtitle="Enter your order number and the email you used at checkout."
      footer={
        session ? (
          <Link href="/account/orders" className="font-medium text-ink underline underline-offset-2">
            See all my orders
          </Link>
        ) : (
          <>
            Have an account?{" "}
            <Link href="/login?next=%2Faccount%2Forders" className="font-medium text-ink underline underline-offset-2">
              Sign in to see all your orders
            </Link>
          </>
        )
      }
    >
      <TrackForm />
    </AuthShell>
  );
}
