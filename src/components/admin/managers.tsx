"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCouponAction,
  deleteDealAction,
  deleteEditionAction,
  saveCouponAction,
  saveDealAction,
  saveEditionAction,
  type ManageResult,
} from "@/app/admin/deals/actions";
import { Field, FormMessage, fieldClass } from "@/components/shop/form/field";
import {
  isoToIstInput,
  paiseToRupeesInput,
  slugify,
  type CouponFormInput,
  type DealFormInput,
  type EditionFormInput,
} from "@/lib/admin/forms";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { ImageUploader } from "./image-uploader";
import { Pill, buttonClass, formatWhen } from "./ui";

/**
 * Small "list + add/edit panel" managers for deals, coupons and editions.
 * Each form sends raw text to the server, which checks it again.
 */

type Option = { id: string; name: string };
type Errors = Record<string, string | undefined>;

function useSaver(save: (v: unknown) => Promise<ManageResult>, onDone: () => void) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (values: unknown, success: string) =>
    start(async () => {
      const res = await save(values);
      if (res.ok) {
        setErrors({});
        setMessage(null);
        toast.success(success);
        onDone();
        router.refresh();
      } else {
        setMessage(res.message);
        setErrors(res.fields ?? {});
      }
    });
  return { errors, message, pending, submit };
}

function Select({ label, value, onChange, children, error }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} className={fieldClass}>
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function DeleteButton({ onDelete, what }: { onDelete: () => Promise<ManageResult>; what: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Delete ${what}`}
      onClick={() => {
        if (!window.confirm(`Delete ${what}? This can't be undone.`)) return;
        start(async () => {
          const res = await onDelete();
          if (res.ok) {
            toast(`Deleted ${what}`);
            router.refresh();
          } else toast.error(res.message);
        });
      }}
      className="inline-flex size-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/5"
    >
      <Trash2Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

const live = (starts: string | null, ends: string | null, active = true) => {
  const now = Date.now();
  if (!active) return { label: "Paused", tone: "muted" as const };
  if (starts && Date.parse(starts) > now) return { label: "Scheduled", tone: "soft" as const };
  if (ends && Date.parse(ends) <= now) return { label: "Ended", tone: "muted" as const };
  return { label: "Live", tone: "good" as const };
};
const off = (type: string, value: number) => (type === "percentage" ? `${value}% off` : `${formatINR(value)} off`);

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export interface DealRow {
  id: string;
  name: string;
  type: "percentage" | "flat";
  value: number;
  product_id: string | null;
  category_id: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export function DealsManager({ deals, categories, products }: { deals: DealRow[]; categories: Option[]; products: Option[] }) {
  const [editing, setEditing] = useState<DealFormInput | null>(null);
  const names = new Map([...categories, ...products].map((o) => [o.id, o.name]));
  const blank = (): DealFormInput => ({
    id: "",
    name: "",
    type: "percentage",
    value: "10",
    target: "category",
    categoryId: categories[0]?.id ?? "",
    productId: "",
    startsAt: isoToIstInput(new Date().toISOString()),
    endsAt: "",
    isActive: true,
  });

  return (
    <div className="flex flex-col gap-4">
      {deals.length > 0 && (
        <ul className="divide-y divide-border">
          {deals.map((d) => {
            const s = live(d.starts_at, d.ends_at, d.is_active);
            return (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {d.name} <Pill tone={s.tone}>{s.label}</Pill>
                  </p>
                  <p className="text-sm text-muted-ink">
                    {off(d.type, d.value)} {d.category_id ? "everything in" : "on"} {names.get(d.category_id ?? d.product_id ?? "") ?? "—"} ·{" "}
                    {formatWhen(d.starts_at)} → {d.ends_at ? formatWhen(d.ends_at) : "no end date"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${d.name}`}
                  onClick={() =>
                    setEditing({
                      id: d.id,
                      name: d.name,
                      type: d.type,
                      value: d.type === "percentage" ? String(d.value) : paiseToRupeesInput(d.value),
                      target: d.category_id ? "category" : "product",
                      categoryId: d.category_id ?? "",
                      productId: d.product_id ?? "",
                      startsAt: isoToIstInput(d.starts_at),
                      endsAt: isoToIstInput(d.ends_at),
                      isActive: d.is_active,
                    })
                  }
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-peach-soft"
                >
                  <PencilIcon className="size-4" aria-hidden="true" />
                </button>
                <DeleteButton what={`the deal “${d.name}”`} onDelete={() => deleteDealAction(d.id)} />
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <DealForm key={editing.id || "new"} initial={editing} categories={categories} products={products} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <button type="button" onClick={() => setEditing(blank())} className={buttonClass.secondary}>
            <PlusIcon className="size-4" aria-hidden="true" /> New deal
          </button>
        </div>
      )}
    </div>
  );
}

function DealForm({ initial, categories, products, onDone }: { initial: DealFormInput; categories: Option[]; products: Option[]; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const { errors, message, pending, submit } = useSaver(saveDealAction, onDone);
  const set = <K extends keyof DealFormInput>(k: K, value: DealFormInput[K]) => setV((x) => ({ ...x, [k]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(v, initial.id ? "Deal updated. Shop prices change straight away." : "Deal created.");
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-cream/60 p-4 sm:p-5"
      noValidate
    >
      <h3 className="text-lg font-semibold">{initial.id ? "Edit deal" : "New deal"}</h3>
      {message && <FormMessage tone="error">{message}</FormMessage>}
      <Field label="Name" placeholder="Diwali sale" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Discount" value={v.type} onChange={(x) => set("type", x as DealFormInput["type"])}>
          <option value="percentage">Percentage off</option>
          <option value="flat">Fixed amount off (₹)</option>
        </Select>
        <Field
          label={v.type === "percentage" ? "Percent off" : "Rupees off each item"}
          prefix={v.type === "flat" ? "₹" : undefined}
          inputMode="decimal"
          value={v.value}
          onChange={(e) => set("value", e.target.value)}
          error={errors.value}
        />
        <Select label="Applies to" value={v.target} onChange={(x) => set("target", x as DealFormInput["target"])}>
          <option value="category">A whole category</option>
          <option value="product">One product</option>
        </Select>
        {v.target === "category" ? (
          <Select label="Category" value={v.categoryId} onChange={(x) => set("categoryId", x)} error={errors.categoryId}>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        ) : (
          <Select label="Product" value={v.productId} onChange={(x) => set("productId", x)} error={errors.productId}>
            <option value="">Choose…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
        <Field label="Starts" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} error={errors.startsAt} />
        <Field label="Ends" optional type="datetime-local" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-5 accent-ink" />
        Deal is on (untick to pause it)
      </label>
      <p className="text-xs text-muted-ink">
        Customers always get the lowest price: the deal, or a product&rsquo;s own sale price if that&rsquo;s lower.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : "Save deal"}
        </button>
        <button type="button" onClick={onDone} className={buttonClass.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export interface CouponRow {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: number;
  min_order: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
}

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const [editing, setEditing] = useState<CouponFormInput | null>(null);
  const blank: CouponFormInput = { id: "", code: "", type: "percentage", value: "10", minOrder: "", startsAt: "", endsAt: "", usageLimit: "" };
  return (
    <div className="flex flex-col gap-4">
      {coupons.length > 0 && (
        <ul className="divide-y divide-border">
          {coupons.map((c) => {
            const used = c.usage_limit !== null && c.used_count >= c.usage_limit;
            const s = used ? { label: "Used up", tone: "muted" as const } : live(c.starts_at, c.ends_at);
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-mono font-medium">
                    {c.code} <Pill tone={s.tone}>{s.label}</Pill>
                  </p>
                  <p className="text-sm text-muted-ink">
                    {off(c.type, c.value)}
                    {c.min_order > 0 && ` on orders of ${formatINR(c.min_order)}+`} · used {c.used_count}
                    {c.usage_limit !== null ? ` of ${c.usage_limit}` : " times"}
                    {c.ends_at && ` · ends ${formatWhen(c.ends_at)}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${c.code}`}
                  onClick={() =>
                    setEditing({
                      id: c.id,
                      code: c.code,
                      type: c.type,
                      value: c.type === "percentage" ? String(c.value) : paiseToRupeesInput(c.value),
                      minOrder: c.min_order ? paiseToRupeesInput(c.min_order) : "",
                      startsAt: isoToIstInput(c.starts_at),
                      endsAt: isoToIstInput(c.ends_at),
                      usageLimit: c.usage_limit === null ? "" : String(c.usage_limit),
                    })
                  }
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-peach-soft"
                >
                  <PencilIcon className="size-4" aria-hidden="true" />
                </button>
                <DeleteButton what={`the coupon ${c.code}`} onDelete={() => deleteCouponAction(c.id)} />
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <CouponForm key={editing.id || "new"} initial={editing} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <button type="button" onClick={() => setEditing(blank)} className={buttonClass.secondary}>
            <PlusIcon className="size-4" aria-hidden="true" /> New coupon
          </button>
        </div>
      )}
    </div>
  );
}

function CouponForm({ initial, onDone }: { initial: CouponFormInput; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const { errors, message, pending, submit } = useSaver(saveCouponAction, onDone);
  const set = <K extends keyof CouponFormInput>(k: K, value: CouponFormInput[K]) => setV((x) => ({ ...x, [k]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(v, initial.id ? "Coupon updated." : "Coupon created.");
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-cream/60 p-4 sm:p-5"
      noValidate
    >
      <h3 className="text-lg font-semibold">{initial.id ? "Edit coupon" : "New coupon"}</h3>
      {message && <FormMessage tone="error">{message}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" placeholder="DIWALI15" autoCapitalize="characters" value={v.code} onChange={(e) => set("code", e.target.value.toUpperCase())} error={errors.code} hint="What customers type at checkout" />
        <Select label="Discount" value={v.type} onChange={(x) => set("type", x as CouponFormInput["type"])}>
          <option value="percentage">Percentage off the order</option>
          <option value="flat">Fixed amount off (₹)</option>
        </Select>
        <Field label={v.type === "percentage" ? "Percent off" : "Rupees off"} prefix={v.type === "flat" ? "₹" : undefined} inputMode="decimal" value={v.value} onChange={(e) => set("value", e.target.value)} error={errors.value} />
        <Field label="Minimum order" optional prefix="₹" inputMode="decimal" value={v.minOrder} onChange={(e) => set("minOrder", e.target.value)} error={errors.minOrder} />
        <Field label="Starts" optional type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} error={errors.startsAt} />
        <Field label="Ends" optional type="datetime-local" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
        <Field label="How many times it can be used" optional inputMode="numeric" hint="In total, across all customers" value={v.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} error={errors.usageLimit} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : "Save coupon"}
        </button>
        <button type="button" onClick={onDone} className={buttonClass.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Editions (collections)
// ---------------------------------------------------------------------------

export interface EditionRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_image: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  product_ids: string[];
}

export function EditionsManager({ editions, products }: { editions: EditionRow[]; products: Option[] }) {
  const [editing, setEditing] = useState<EditionFormInput | null>(null);
  const blank: EditionFormInput = { id: "", name: "", slug: "", description: "", bannerImage: "", startsAt: "", endsAt: "", isActive: true, productIds: [] };
  return (
    <div className="flex flex-col gap-4">
      {editions.length > 0 && (
        <ul className="divide-y divide-border">
          {editions.map((ed) => {
            const s = live(ed.starts_at, ed.ends_at, ed.is_active);
            return (
              <li key={ed.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {ed.name} <Pill tone={s.tone}>{s.label}</Pill>
                  </p>
                  <p className="text-sm text-muted-ink">
                    {ed.product_ids.length} {ed.product_ids.length === 1 ? "piece" : "pieces"} ·{" "}
                    <a href={`/shop?collection=${ed.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      /shop?collection={ed.slug}
                    </a>
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${ed.name}`}
                  onClick={() =>
                    setEditing({
                      id: ed.id,
                      name: ed.name,
                      slug: ed.slug,
                      description: ed.description,
                      bannerImage: ed.banner_image ?? "",
                      startsAt: isoToIstInput(ed.starts_at),
                      endsAt: isoToIstInput(ed.ends_at),
                      isActive: ed.is_active,
                      productIds: ed.product_ids,
                    })
                  }
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-peach-soft"
                >
                  <PencilIcon className="size-4" aria-hidden="true" />
                </button>
                <DeleteButton what={`the edition “${ed.name}”`} onDelete={() => deleteEditionAction(ed.id)} />
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <EditionForm key={editing.id || "new"} initial={editing} products={products} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <button type="button" onClick={() => setEditing(blank)} className={buttonClass.secondary}>
            <PlusIcon className="size-4" aria-hidden="true" /> New edition
          </button>
        </div>
      )}
    </div>
  );
}

function EditionForm({ initial, products, onDone }: { initial: EditionFormInput; products: Option[]; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [filter, setFilter] = useState("");
  const { errors, message, pending, submit } = useSaver(saveEditionAction, onDone);
  const set = <K extends keyof EditionFormInput>(k: K, value: EditionFormInput[K]) => setV((x) => ({ ...x, [k]: value }));
  const chosen = new Set(v.productIds);
  const shown = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase())), [products, filter]);
  const descId = useId();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(v, initial.id ? "Edition updated." : "Edition created.");
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-cream/60 p-4 sm:p-5"
      noValidate
    >
      <h3 className="text-lg font-semibold">{initial.id ? "Edit edition" : "New edition"}</h3>
      {message && <FormMessage tone="error">{message}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Name"
          placeholder="Diwali Edition"
          value={v.name}
          onChange={(e) => {
            set("name", e.target.value);
            if (!slugTouched) set("slug", slugify(e.target.value));
          }}
          error={errors.name}
        />
        <Field
          label="Web address"
          prefix="?collection="
          className="[&_input]:pl-28"
          value={v.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value);
          }}
          error={errors.slug}
        />
        <Field label="Starts" optional type="datetime-local" value={v.startsAt as string} onChange={(e) => set("startsAt", e.target.value)} error={errors.startsAt} />
        <Field label="Ends" optional type="datetime-local" value={v.endsAt as string} onChange={(e) => set("endsAt", e.target.value)} error={errors.endsAt} />
      </div>
      <div>
        <label htmlFor={descId} className="mb-1.5 block text-sm font-medium">
          Description <span className="font-normal text-muted-ink">(optional)</span>
        </label>
        <textarea id={descId} rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} className={cn(fieldClass, "h-auto py-3")} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Banner photo <span className="font-normal text-muted-ink">(optional)</span></p>
        <ImageUploader
          images={v.bannerImage ? [{ url: v.bannerImage, alt: v.name }] : []}
          onChange={(imgs) => set("bannerImage", imgs[0]?.url ?? "")}
          bucket="product-images"
          altFallback={v.name}
          max={1}
        />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">
          Pieces in this edition <span className="font-normal text-muted-ink">({chosen.size} chosen)</span>
        </legend>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name"
          aria-label="Filter pieces by name"
          className={cn(fieldClass, "mb-2 h-10")}
        />
        <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-white p-2">
          {shown.map((p) => (
            <label key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-peach-soft/50">
              <input
                type="checkbox"
                checked={chosen.has(p.id)}
                onChange={(e) =>
                  set("productIds", e.target.checked ? [...v.productIds, p.id] : v.productIds.filter((x) => x !== p.id))
                }
                className="size-4 accent-ink"
              />
              {p.name}
            </label>
          ))}
          {shown.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-ink">No matches.</p>}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} className="size-5 accent-ink" />
        Show this edition in the shop
      </label>
      <p className="text-xs text-muted-ink">The newest live edition is announced at the top of the home page.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : "Save edition"}
        </button>
        <button type="button" onClick={onDone} className={buttonClass.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
