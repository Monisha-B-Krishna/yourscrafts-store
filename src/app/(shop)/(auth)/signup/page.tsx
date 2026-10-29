import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shop/auth/auth-shell";
import { SignUpForm } from "@/components/shop/auth/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save favourites, keep your addresses handy and track every order."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={params.next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-ink underline underline-offset-2"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
