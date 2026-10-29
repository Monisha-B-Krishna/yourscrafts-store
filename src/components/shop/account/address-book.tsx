"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
} from "@/app/(shop)/account/actions";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import type { SavedAddress } from "@/lib/addresses";
import { formatIndianPhone, type AddressInput } from "@/lib/validation/account";
import { AddressForm } from "./address-form";

type Editing = { kind: "new" } | { kind: "edit"; id: string } | null;

const toInput = (a: SavedAddress): AddressInput => ({
  name: a.name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  city: a.city,
  state: a.state as AddressInput["state"],
  pincode: a.pincode,
  isDefault: a.is_default,
});

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(addresses.length === 0 ? { kind: "new" } : null);
  const [confirmDelete, setConfirmDelete] = useState<SavedAddress | null>(null);
  const [pending, startTransition] = useTransition();

  function done(message: string) {
    setEditing(null);
    toast.success(message);
    router.refresh();
  }

  function makeDefault(address: SavedAddress) {
    startTransition(async () => {
      const res = await setDefaultAddressAction(address.id);
      if (res.ok) {
        toast.success("Default address updated");
        router.refresh();
      } else toast.error(res.message);
    });
  }

  function remove(address: SavedAddress) {
    startTransition(async () => {
      const res = await deleteAddressAction(address.id);
      setConfirmDelete(null);
      if (res.ok) {
        toast("Address removed");
        router.refresh();
      } else toast.error(res.message);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {editing?.kind === "new" ? (
        <section aria-labelledby="new-address-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
          <h2 id="new-address-heading" className="mb-6 text-2xl">
            {addresses.length === 0 ? "Add your first address" : "Add a new address"}
          </h2>
          <AddressForm
            initial={{
              name: "",
              phone: "",
              line1: "",
              line2: "",
              city: "",
              state: "" as AddressInput["state"],
              pincode: "",
              isDefault: addresses.length === 0,
            }}
            showDefaultToggle={addresses.length > 0}
            onSave={async (values) => {
              const res = await saveAddressAction(null, values);
              if (res.ok) done("Address saved");
              return res;
            }}
            onCancel={addresses.length > 0 ? () => setEditing(null) : undefined}
          />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setEditing({ kind: "new" })}
          className="flex h-14 items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-input font-medium text-ink transition-colors hover:border-peach hover:bg-peach-soft/50"
        >
          <PlusIcon className="size-5" aria-hidden="true" />
          Add a new address
        </button>
      )}

      {addresses.length > 0 && (
        <ul aria-label="Saved addresses" className="grid gap-4 xl:grid-cols-2">
          {addresses.map((address) =>
            editing?.kind === "edit" && editing.id === address.id ? (
              <li key={address.id} className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8 xl:col-span-2">
                <h2 className="mb-6 text-2xl">Edit address</h2>
                <AddressForm
                  initial={toInput(address)}
                  defaultLocked={address.is_default}
                  onSave={async (values) => {
                    const res = await saveAddressAction(address.id, values);
                    if (res.ok) done("Address updated");
                    return res;
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={address.id} className="flex flex-col rounded-3xl border border-border/70 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex items-center gap-2 font-medium">
                    <MapPinIcon className="size-4 shrink-0 text-peach-deep" aria-hidden="true" />
                    {address.name}
                  </p>
                  {address.is_default && (
                    <span className="shrink-0 rounded-full bg-peach-soft px-3 py-1 text-xs font-medium">Default</span>
                  )}
                </div>
                <address className="mt-3 text-sm leading-relaxed text-muted-ink not-italic">
                  {address.line1}
                  {address.line2 && (
                    <>
                      <br />
                      {address.line2}
                    </>
                  )}
                  <br />
                  {address.city}, {address.state} {address.pincode}
                  <br />
                  {formatIndianPhone(address.phone)}
                </address>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: "edit", id: address.id })}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-peach-soft"
                  >
                    <PencilIcon className="size-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(address)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-peach-soft"
                  >
                    <Trash2Icon className="size-4" aria-hidden="true" />
                    Remove
                  </button>
                  {!address.is_default && (
                    <button
                      type="button"
                      onClick={() => makeDefault(address)}
                      disabled={pending}
                      className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-peach-deep hover:bg-peach-soft disabled:opacity-60"
                    >
                      Make default
                    </button>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="bg-cream sm:max-w-md">
          <DialogTitle className="font-serif text-2xl">Remove this address?</DialogTitle>
          <DialogDescription>
            {confirmDelete && `${confirmDelete.name}, ${confirmDelete.line1}, ${confirmDelete.city}`}
          </DialogDescription>
          <DialogFooter className="mt-2 gap-3 sm:gap-2">
            <DialogClose
              render={
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-ink/20 px-6 font-medium hover:bg-peach-soft"
                />
              }
            >
              Keep it
            </DialogClose>
            <button
              type="button"
              disabled={pending}
              onClick={() => confirmDelete && remove(confirmDelete)}
              className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-6 font-medium text-cream hover:bg-ink/85 disabled:opacity-60"
            >
              {pending ? "Removing…" : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
