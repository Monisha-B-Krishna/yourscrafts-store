"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { duplicateProductAction, setProductActiveAction } from "@/app/admin/products/actions";
import { buttonClass } from "./ui";

export function ProductRowActions({ id, active, base }: { id: string; slug: string; active: boolean; base: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="hidden shrink-0 gap-2 sm:flex">
      <Link href={`${base}/${id}`} className={buttonClass.small}>
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.small}
        onClick={() =>
          start(async () => {
            const res = await duplicateProductAction(id);
            if (res.ok) {
              toast.success("Copy made. It stays hidden until you tick “Show in the shop” and save.");
              router.push(`${base}/${res.id}`);
            } else toast.error(res.message);
          })
        }
      >
        Duplicate
      </button>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.small}
        onClick={() =>
          start(async () => {
            const res = await setProductActiveAction(id, !active);
            if (res.ok) {
              toast.success(active ? "Archived: hidden from the shop." : "Back in the shop.");
              router.refresh();
            } else toast.error(res.message);
          })
        }
      >
        {active ? "Archive" : "Restore"}
      </button>
    </div>
  );
}
