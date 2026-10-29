import type { Metadata } from "next";
import { ProfileForm } from "@/components/shop/account/profile-form";
import { NewPasswordForm } from "@/components/shop/auth/password-forms";
import { getProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireUser("/account");
  const profile = await getProfile(session);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="details-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
        <h2 id="details-heading" className="text-2xl">
          Your details
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted-ink">We use these for your orders and delivery updates.</p>
        <ProfileForm
          email={session.user.email ?? ""}
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? ""}
        />
      </section>

      <section aria-labelledby="password-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
        <h2 id="password-heading" className="text-2xl">
          Password
        </h2>
        <p className="mt-1 mb-6 text-sm text-muted-ink">
          Signed in with an email link and never set a password? You can add one here.
        </p>
        <NewPasswordForm submitLabel="Update password" afterSave="inline" />
      </section>
    </div>
  );
}
