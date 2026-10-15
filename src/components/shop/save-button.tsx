"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HeartIcon } from "lucide-react";
import { toast } from "sonner";
import { saveForLaterAction } from "@/app/(shop)/saved/actions";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

/** Shown when a guest tries to save. Phase 3 adds a "Sign in" button here. */
export function toastSignInToSave() {
  toast("Please sign in to save items for later", {
    description: "Saved items live in your account, so you can find them on any device.",
  });
}

export function SaveButton({ productId, className }: { productId: string; className?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveForLaterAction(productId);
      if (result.ok) {
        setSaved(true);
        track("save_for_later", { productId, metadata: { source: "product_page" } });
        toast.success("Saved for later", { action: { label: "View saved", onClick: () => router.push("/saved") } });
      } else if (result.reason === "signed_out") {
        toastSignInToSave();
      } else {
        toast.error("Couldn't save that just now. Please try again.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={save}
      disabled={pending || saved}
      aria-pressed={saved}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/20 bg-white px-5 font-medium text-ink hover:bg-peach-soft disabled:cursor-default",
        pending && "opacity-60",
        className,
      )}
    >
      <HeartIcon className={cn("size-5", saved && "fill-peach text-peach-deep")} aria-hidden="true" />
      {saved ? "Saved" : "Save for later"}
    </button>
  );
}
