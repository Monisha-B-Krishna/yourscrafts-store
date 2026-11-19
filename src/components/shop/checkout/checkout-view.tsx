"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockIcon, MapPinIcon, PlusIcon, TagIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  confirmPaymentAction,
  previewCheckoutAction,
  reportPaymentFailureAction,
  startCheckoutAction,
  type CheckoutPreview,
} from "@/app/(shop)/checkout/actions";
import { AddressFields, type AddressFieldName } from "@/components/shop/account/address-form";
import { Field, FormMessage } from "@/components/shop/form/field";
import type { SavedAddress } from "@/lib/addresses";
import { getSessionId, track } from "@/lib/analytics/client";
import { cartStore, useCartLines, type CartLine } from "@/lib/cart/store";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { formatIndianPhone, type AddressInput } from "@/lib/validation/account";
import {
  newAddressCheckoutSchema,
  savedAddressCheckoutSchema,
  type CheckoutDetails,
} from "@/lib/validation/checkout";
import { openRazorpay } from "./razorpay-checkout";

type FormValues = {
  email: string;
  phone: string;
  addressMode: "saved" | "new";
  addressId: string;
  address: Omit<AddressInput, "isDefault">;
  saveAddress: boolean;
};

// Validate only the part of the form in use: a saved address, or the new-address fields.
const savedResolver = zodResolver(savedAddressCheckoutSchema);
const newResolver = zodResolver(newAddressCheckoutSchema);
const resolver: Resolver<FormValues, unknown, CheckoutDetails> = (values, context, options) =>
  (values.addressMode === "saved"
    ? savedResolver(values as never, context, options as never)
    : newResolver(values as never, context, options as never)) as never;

type Stage = "idle" | "starting" | "paying" | "confirming";

export function CheckoutView({
  signedIn,
  email,
  phone,
  addresses,
  paymentsOn,
  testMode,
  whatsappHref,
}: {
  signedIn: boolean;
  email: string;
  phone: string;
  addresses: SavedAddress[];
  paymentsOn: boolean;
  testMode: boolean;
  whatsappHref: string;
}) {
  const lines = useCartLines();
  const [hydrated, setHydrated] = useState(false);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponPending, startCouponTransition] = useTransition();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const tracked = useRef(false);
  const linesKey = JSON.stringify(lines);
  const couponId = useId();

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const form = useForm<FormValues, unknown, CheckoutDetails>({
    resolver,
    defaultValues: {
      email,
      phone,
      addressMode: defaultAddress ? "saved" : "new",
      addressId: defaultAddress?.id ?? "",
      address: { name: "", phone: "", line1: "", line2: "", city: "", state: "" as never, pincode: "" },
      saveAddress: signedIn,
    },
  });
  const { errors } = form.formState;
  const addressMode = form.watch("addressMode");
  const addressId = form.watch("addressId");

  useEffect(() => setHydrated(true), []);

  // Live summary, priced on the server whenever the cart or coupon changes.
  useEffect(() => {
    if (!hydrated) return;
    const current = JSON.parse(linesKey) as CartLine[];
    if (current.length === 0) return;
    let cancelled = false;
    previewCheckoutAction(current, couponCode)
      .then((next) => {
        if (cancelled) return;
        setPreview(next);
        if (!tracked.current && next.quote.itemCount > 0) {
          tracked.current = true;
          track("begin_checkout", { metadata: { items: next.quote.itemCount, subtotal: next.quote.subtotal } });
        }
      })
      .catch(() => !cancelled && toast.error("Couldn't load your order summary. Please check your connection."));
    return () => {
      cancelled = true;
    };
  }, [linesKey, couponCode, hydrated]);

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    startCouponTransition(async () => {
      const next = await previewCheckoutAction(JSON.parse(linesKey), code);
      setPreview(next);
      if (next.coupon) {
        setCouponCode(next.coupon.code);
        setCouponInput("");
        toast.success(`${next.coupon.code} applied: you save ${formatINR(next.coupon.discount)}`);
      }
    });
  }

  function removeCoupon() {
    setCouponCode(null);
  }

  const onSubmit = form.handleSubmit(async (details) => {
    setError(null);
    setStage("starting");
    const res = await startCheckoutAction(details, JSON.parse(linesKey), couponCode, getSessionId());
    if (!res.ok) {
      setStage("idle");
      setError(res.message);
      if (res.reason === "invalid") {
        for (const [name, message] of Object.entries(res.fields)) {
          form.setError((name === "address" ? "address.line1" : name) as keyof FormValues, { message });
        }
      }
      if (res.reason === "cart_changed" || res.reason === "coupon") {
        setPreview(res.preview);
        if (res.reason === "coupon") setCouponCode(null);
      }
      return;
    }

    setStage("paying");
    try {
      await openRazorpay({
        ...res.razorpay,
        onSuccess: async (payment) => {
          setStage("confirming");
          const confirmed = await confirmPaymentAction(payment);
          if (!confirmed.ok) {
            setStage("idle");
            setError(confirmed.message);
            return;
          }
          cartStore.clear();
          window.location.assign(
            `/checkout/success?order=${encodeURIComponent(confirmed.orderId)}&key=${encodeURIComponent(confirmed.accessKey)}`,
          );
        },
        onFailure: (failure) => {
          void reportPaymentFailureAction({ razorpay_order_id: res.razorpay.orderId, ...failure });
        },
        onDismiss: () => {
          setStage("idle");
          toast("Payment not completed. Your cart is saved, so you can try again.");
        },
      });
    } catch {
      setStage("idle");
      setError("We couldn't open the payment window. Please check your connection and try again.");
    }
  });

  if (!hydrated || (lines.length > 0 && preview === null)) return <CheckoutSkeleton />;

  if (lines.length === 0) {
    return (
      <div className="rounded-3xl bg-peach-soft/60 px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl">Your cart is empty</h2>
        <p className="mt-2 text-muted-ink">Add something you love, then come back to check out.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  const shown = preview!;
  const cartHasIssues = shown.quote.hasIssues || shown.quote.itemCount === 0;
  const busy = stage !== "idle";
  const canPay = paymentsOn && !cartHasIssues && !busy;
  const addressErrors = (errors.address ?? {}) as Partial<Record<AddressFieldName, { message?: string }>>;

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      <div className="flex min-w-0 flex-col gap-8">
        {error && <FormMessage tone="error">{error}</FormMessage>}

        <section aria-labelledby="contact-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
          <h2 id="contact-heading" className="text-2xl">
            1. Your details
          </h2>
          {!signedIn && (
            <p className="mt-1 text-sm text-muted-ink">
              Have an account?{" "}
              <Link href="/login?next=%2Fcheckout" className="font-medium text-ink underline underline-offset-2">
                Sign in
              </Link>{" "}
              for saved addresses. Or just continue as a guest.
            </p>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              readOnly={signedIn}
              hint={signedIn ? "Your receipt goes here." : "For your receipt and order updates."}
              error={errors.email?.message}
              {...form.register("email")}
            />
            <Field
              label="Your mobile number"
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              prefix="+91"
              placeholder="98765 43210"
              hint="We'll only call about this order."
              error={errors.phone?.message}
              {...form.register("phone")}
            />
          </div>
        </section>

        <section aria-labelledby="address-heading" className="rounded-3xl border border-border/70 bg-white p-5 sm:p-8">
          <h2 id="address-heading" className="text-2xl">
            2. Delivery address
          </h2>
          <p className="mt-1 text-sm text-muted-ink">
            We deliver anywhere in India. Sending a gift? Put the recipient&rsquo;s name and number here.
          </p>

          {addresses.length > 0 && (
            <fieldset className="mt-6">
              <legend className="sr-only">Choose a delivery address</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => {
                  const selected = addressMode === "saved" && addressId === a.id;
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                        selected ? "border-ink bg-peach-soft/40" : "border-border hover:border-peach",
                      )}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        value={a.id}
                        checked={selected}
                        onChange={() => {
                          form.setValue("addressMode", "saved");
                          form.setValue("addressId", a.id, { shouldValidate: true });
                        }}
                        className="mt-1 size-4 accent-ink"
                      />
                      <span className="min-w-0 text-sm leading-relaxed">
                        <span className="flex items-center gap-1.5 font-medium text-ink">
                          <MapPinIcon className="size-4 text-peach-deep" aria-hidden="true" />
                          {a.name}
                        </span>
                        <span className="block text-muted-ink">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                        </span>
                        <span className="block text-muted-ink">{formatIndianPhone(a.phone)}</span>
                      </span>
                    </label>
                  );
                })}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed p-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
                    addressMode === "new" ? "border-ink bg-peach-soft/40" : "border-input hover:border-peach",
                  )}
                >
                  <input
                    type="radio"
                    name="saved-address"
                    value="new"
                    checked={addressMode === "new"}
                    onChange={() => form.setValue("addressMode", "new")}
                    className="size-4 accent-ink"
                  />
                  <PlusIcon className="size-4" aria-hidden="true" />
                  Deliver somewhere new
                </label>
              </div>
              {errors.addressId && <p className="mt-2 text-sm text-destructive">{errors.addressId.message}</p>}
            </fieldset>
          )}

          {addressMode === "new" && (
            <div className="mt-6 flex flex-col gap-5">
              <AddressFields
                register={(name) => form.register(`address.${name}`)}
                nameLabel="Recipient's full name"
                phoneLabel="Recipient's mobile number"
                errors={Object.fromEntries(
                  Object.entries(addressErrors).map(([k, v]) => [k, v?.message]),
                )}
              />
              {signedIn && (
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="size-5 accent-ink" {...form.register("saveAddress")} />
                  Save this address to my account
                </label>
              )}
            </div>
          )}
        </section>
      </div>

      <aside aria-labelledby="summary-heading" className="h-fit min-w-0 rounded-3xl bg-peach-soft/60 p-5 sm:p-8 lg:sticky lg:top-28">
        <h2 id="summary-heading" className="text-2xl">
          3. Review &amp; pay
        </h2>

        <ul className="mt-5 flex flex-col gap-4">
          {shown.quote.lines.map((line) => (
            <li key={line.key} className="flex gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white">
                {line.image && (
                  <Image
                    src={line.image.url}
                    alt={line.image.alt || line.name}
                    fill
                    sizes="64px"
                    unoptimized={line.image.url.endsWith(".svg")}
                    className="object-cover"
                  />
                )}
                {line.qty > 0 && (
                  <span className="absolute top-1 right-1 rounded-full bg-ink px-1.5 text-xs font-medium text-cream">
                    {line.qty}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="leading-snug font-medium">{line.name}</p>
                {line.variantName && <p className="text-muted-ink">{line.variantName}</p>}
                {line.status !== "ok" && (
                  <p className="text-destructive">
                    {line.status === "adjusted" ? `Only ${line.maxQty} left` : "No longer available"}
                  </p>
                )}
              </div>
              <p className="text-sm font-medium">{formatINR(line.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-ink/10 pt-5">
          {couponCode && shown.coupon ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <span className="flex items-center gap-2">
                <TagIcon className="size-4 text-peach-deep" aria-hidden="true" />
                <span className="font-medium">{shown.coupon.code}</span> applied
              </span>
              <button
                type="button"
                onClick={removeCoupon}
                aria-label={`Remove coupon ${shown.coupon.code}`}
                className="inline-flex size-8 items-center justify-center rounded-full hover:bg-peach-soft"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor={couponId} className="mb-1.5 block text-sm font-medium">
                Coupon code
              </label>
              <div className="flex gap-2">
                <input
                  id={couponId}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={32}
                  aria-invalid={shown.couponError ? true : undefined}
                  aria-describedby={shown.couponError ? `${couponId}-error` : undefined}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-white px-4 text-base uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponPending || !couponInput.trim()}
                  className="h-11 rounded-full border border-ink/20 bg-white px-5 text-sm font-medium hover:bg-peach-soft disabled:opacity-50"
                >
                  {couponPending ? "Checking…" : "Apply"}
                </button>
              </div>
              {shown.couponError && (
                <p id={`${couponId}-error`} className="mt-1.5 text-sm text-destructive">
                  {shown.couponError}
                </p>
              )}
            </div>
          )}
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="font-medium">{formatINR(shown.totals.subtotal)}</dd>
          </div>
          {shown.totals.discount > 0 && (
            <div className="flex justify-between text-peach-deep">
              <dt>Coupon discount</dt>
              <dd className="font-medium">−{formatINR(shown.totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Shipping</dt>
            <dd className="font-medium">{shown.totals.shippingFee === 0 ? "Free" : formatINR(shown.totals.shippingFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold">{formatINR(shown.totals.total)}</dd>
          </div>
        </dl>

        {cartHasIssues && (
          <div className="mt-5">
            <FormMessage tone="error">
              Some items have changed since you added them.{" "}
              <Link href="/cart" className="font-medium underline underline-offset-2">
                Review your cart
              </Link>{" "}
              to continue.
            </FormMessage>
          </div>
        )}

        {paymentsOn ? (
          <button
            type="submit"
            disabled={!canPay}
            aria-busy={busy || undefined}
            className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-medium text-cream transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockIcon className="size-4" aria-hidden="true" />
            {stage === "starting"
              ? "Preparing payment…"
              : stage === "paying"
                ? "Waiting for payment…"
                : stage === "confirming"
                  ? "Confirming your order…"
                  : `Pay ${formatINR(shown.totals.total)}`}
          </button>
        ) : (
          <div className="mt-6">
            <FormMessage tone="info">
              Online payment is being switched on. Until then, you can place this order on WhatsApp.
            </FormMessage>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-peach px-6 font-medium text-ink hover:bg-peach/85"
            >
              Order on WhatsApp
            </a>
          </div>
        )}

        <p className="mt-3 text-center text-xs leading-relaxed text-muted-ink">
          Secure payment by Razorpay: UPI, cards, netbanking and wallets. No cash on delivery.
        </p>
        {paymentsOn && testMode && (
          <p className="mt-3 rounded-xl bg-white px-3 py-2 text-center text-xs text-muted-ink">
            <strong className="font-medium text-ink">Test mode:</strong> no real money moves. Use UPI ID{" "}
            <code className="break-all">success@razorpay</code> or card 4111 1111 1111 1111.
          </p>
        )}
      </aside>
    </form>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px]" aria-busy="true" aria-label="Loading checkout">
      <div className="space-y-8">
        <div className="h-64 animate-pulse rounded-3xl bg-peach-soft/60" />
        <div className="h-80 animate-pulse rounded-3xl bg-peach-soft/60" />
      </div>
      <div className="h-96 animate-pulse rounded-3xl bg-peach-soft/60" />
    </div>
  );
}
