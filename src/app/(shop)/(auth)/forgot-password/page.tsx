import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/shop/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/shop/auth/password-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you a link to choose a new one."
      footer={
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
