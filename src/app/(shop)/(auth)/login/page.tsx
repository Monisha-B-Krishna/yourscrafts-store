import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shop/auth/auth-shell";
import { LoginForm } from "@/components/shop/auth/login-form";
import { FormMessage } from "@/components/shop/form/field";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your orders, saved items and addresses."
      footer={
        <>
          New here?{" "}
          <Link
            href={params.next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-medium text-ink underline underline-offset-2"
          >
            Create an account
          </Link>
        </>
      }
    >
      {params.error === "link" && (
        <div className="mb-5">
          <FormMessage tone="error">
            That link has expired or was already used. Please sign in, or ask for a new link.
          </FormMessage>
        </div>
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
