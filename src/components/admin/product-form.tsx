"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { saveProductAction } from "@/app/admin/products/actions";
import { Card, buttonClass } from "@/components/admin/ui";
import { Field, FormMessage, fieldClass } from "@/components/shop/form/field";
import { productFormSchema, slugify, type ProductFormData, type ProductFormInput } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";
import { ImageUploader, type UploadedImage } from "./image-uploader";

export type ProductKind = "product" | "art";

/**
 * Add or edit a product (or an artwork). Prices in rupees; the first photo is
 * the main one. Options (sizes, colours) each have their own price and stock.
 */
export function ProductForm({
  kind,
  initial,
  categories,
  isNew,
}: {
  kind: ProductKind;
  initial: ProductFormInput;
  categories: { id: string; name: string }[];
  isNew: boolean;
}) {
  const router = useRouter();
  const [images, setImages] = useState<UploadedImage[]>(initial.images);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const form = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initial,
  });
  const { errors } = form.formState;
  const variants = useFieldArray({ control: form.control, name: "variants" });
  const type = form.watch("type");
  const hasVariants = variants.fields.length > 0;
  const ids = { desc: useId(), cat: useId(), type: useId() };
  const base = kind === "art" ? "/admin/artworks" : "/admin/products";

  const nameField = form.register("name");

  // The browser checks the form first; the server checks the same raw values again.
  const onSubmit = form.handleSubmit(
    () =>
      start(async () => {
        setError(null);
        const res = await saveProductAction({ ...form.getValues(), images });
        if (!res.ok) {
          setError(res.message);
          for (const [name, message] of Object.entries(res.fields ?? {})) form.setError(name as keyof ProductFormInput, { message });
          return;
        }
        toast.success(isNew ? "Saved! It's now in the shop." : "Changes saved.");
        if (isNew) router.replace(`${base}/${res.id}`);
        else router.refresh();
      }),
    () => setError("Please check the highlighted fields."),
  );

  const typeOptions =
    kind === "art"
      ? [
          { value: "original_art", label: "Original painting (one of a kind)" },
          { value: "print", label: "Print (several sizes or copies)" },
        ]
      : [{ value: "product", label: "Handmade product" }];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {error && <FormMessage tone="error">{error}</FormMessage>}

      <Card title="Basics">
        <div className="flex flex-col gap-5">
          <Field
            label="Name"
            error={errors.name?.message}
            {...nameField}
            onChange={(e) => {
              void nameField.onChange(e);
              if (!slugTouched) form.setValue("slug", slugify(e.target.value));
            }}
          />
          <div>
            <label htmlFor={ids.desc} className="mb-1.5 block text-sm font-medium">
              Description
            </label>
            <textarea
              id={ids.desc}
              rows={6}
              placeholder="What it is, what it's made of, why it makes a lovely gift…"
              className={cn(fieldClass, "h-auto py-3")}
              aria-invalid={errors.description ? true : undefined}
              {...form.register("description")}
            />
            {errors.description && <p className="mt-1.5 text-sm text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={ids.cat} className="mb-1.5 block text-sm font-medium">
                Category
              </label>
              <select id={ids.cat} className={fieldClass} {...form.register("categoryId")}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={ids.type} className="mb-1.5 block text-sm font-medium">
                Type
              </label>
              <select id={ids.type} className={fieldClass} {...form.register("type")}>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Field
            label="Tags"
            optional
            hint="Separate with commas: helps search, e.g. diwali, gift for her, rose"
            error={errors.tags?.message}
            {...form.register("tags")}
          />
        </div>
      </Card>

      <Card title="Photos" description="The first photo is the main one. Drag to reorder.">
        <ImageUploader
          images={images}
          onChange={(next) => {
            setImages(next);
            form.setValue("images", next);
          }}
          bucket={kind === "art" ? "artworks" : "product-images"}
          altFallback={form.watch("name") || "Product photo"}
        />
        {errors.images && <p className="mt-2 text-sm text-destructive">{errors.images.message as string}</p>}
      </Card>

      <Card title="Price & stock">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Price" prefix="₹" inputMode="decimal" placeholder="1299" error={errors.price?.message} {...form.register("price")} />
          <Field
            label="Sale price"
            optional
            prefix="₹"
            inputMode="decimal"
            placeholder="Leave empty if not on sale"
            error={errors.salePrice?.message}
            {...form.register("salePrice")}
          />
          {!hasVariants && (
            <Field
              label="In stock"
              inputMode="numeric"
              hint={type === "original_art" ? "1 if available, 0 once sold" : "How many you can sell right now"}
              error={errors.stock?.message}
              {...form.register("stock")}
            />
          )}
          <Field label="SKU" optional hint="Your own code for this item" error={errors.sku?.message} {...form.register("sku")} />
        </div>
        <p className="mt-4 text-sm text-muted-ink">
          Running a deal for a whole category instead? Use <strong className="font-medium text-ink">Deals &amp; coupons</strong>.
        </p>
      </Card>

      <Card
        title="Options"
        description={
          kind === "art"
            ? "Print sizes, each with its own price difference and stock."
            : "Sizes or colours a customer must pick, each with its own price difference and stock."
        }
      >
        {variants.fields.length > 0 && (
          <ul className="mb-4 flex flex-col gap-4">
            {variants.fields.map((field, i) => {
              const e = errors.variants?.[i];
              return (
                <li key={field.id} className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] sm:items-start">
                  <Field label="Option name" placeholder={kind === "art" ? "A4" : "Small"} error={e?.name?.message} {...form.register(`variants.${i}.name`)} />
                  <Field label="Price difference" prefix="₹" placeholder="0" hint="e.g. 200 or -100" error={e?.priceDelta?.message} {...form.register(`variants.${i}.priceDelta`)} />
                  <Field label="In stock" inputMode="numeric" error={e?.stock?.message} {...form.register(`variants.${i}.stock`)} />
                  <Field label="SKU" optional error={e?.sku?.message} {...form.register(`variants.${i}.sku`)} />
                  <button
                    type="button"
                    onClick={() => variants.remove(i)}
                    aria-label={`Remove option ${i + 1}`}
                    className="inline-flex size-11 items-center justify-center self-end rounded-full text-destructive hover:bg-destructive/5 sm:mt-7"
                  >
                    <Trash2Icon className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {errors.variants?.message && <p className="mb-3 text-sm text-destructive">{errors.variants.message}</p>}
        <button
          type="button"
          onClick={() => variants.append({ id: "", name: "", priceDelta: "0", stock: "0", sku: "" })}
          className={buttonClass.secondary}
        >
          <PlusIcon className="size-4" aria-hidden="true" /> Add an option
        </button>
        {hasVariants && <p className="mt-3 text-sm text-muted-ink">With options, stock is counted per option.</p>}
      </Card>

      <Card title="Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={kind === "art" ? "Size of the piece" : "Dimensions"}
            optional
            placeholder={kind === "art" ? "30 × 40 cm, acrylic on canvas" : "25 × 20 × 10 cm"}
            error={errors.dimensions?.message}
            {...form.register("dimensions")}
          />
          <Field label="Weight (grams)" optional inputMode="numeric" hint="Packed weight, for shipping" error={errors.weightG?.message} {...form.register("weightG")} />
          <Field
            label="Web address"
            prefix="/product/"
            hint="Made from the name. Change it only if you need to."
            error={errors.slug?.message}
            className="sm:col-span-2"
            {...form.register("slug", { onChange: () => setSlugTouched(true) })}
          />
        </div>
      </Card>

      <Card title="Visibility">
        <div className="flex flex-col gap-4 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 size-5 accent-ink" {...form.register("isActive")} />
            <span>
              <span className="font-medium">Show in the shop</span>
              <span className="block text-muted-ink">Untick to hide it (archive). Past orders keep its details.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-0.5 size-5 accent-ink" {...form.register("isFeatured")} />
            <span>
              <span className="font-medium">Featured</span>
              <span className="block text-muted-ink">
                {kind === "art" ? "Shown in “Featured artwork” on the home page." : "Highlighted in the shop."}
              </span>
            </span>
          </label>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t bg-cream/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : isNew ? "Save and add to shop" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.push(base)} className={buttonClass.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}
