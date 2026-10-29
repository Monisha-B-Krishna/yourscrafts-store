import type { Metadata } from "next";
import { AuthShell } from "@/components/shop/auth/auth-shell";
import { NewPasswordForm } from "@/components/shop/auth/password-forms";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

// Reached from the "reset your password" email, which signs the customer in first.
export default async function ResetPasswordPage() {
  await requireUser("/reset-password");
  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you haven’t used here before.">
      <NewPasswordForm afterSave="account" />
    </AuthShell>
  );
}
