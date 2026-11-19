import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Card, EmptyState, PageHeader, Pager, Pill, buttonClass } from "@/components/admin/ui";
import { fieldClass } from "@/components/shop/form/field";
import { paiseToRupeesInput, type ProductFormInput } from "@/lib/admin/forms";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { ProductForm, type ProductKind } from "./product-form";
import { ProductRowActions } from "./product-row-actions";

/** Shared by Products and Artworks: the list page and the add/edit page. */

const PAGE_SIZE = 25;
const TYPES: Record<ProductKind, string[]> = { product: ["product"], art: ["original_art", "print"] };
const BASE: Record<ProductKind, string> = { product: "/admin/products", art: "/admin/artworks" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  name: string;
  slug: string;
  type: string;
  price: number;
  sale_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  category: { name: string } | null;
  images: { url: string; sort_order: number }[];
  variants: { id: string }[];
};

export async function ProductListPage({ kind, searchParams }: { kind: ProductKind; searchParams: Record<string, string | undefined> }) {
  const { supabase } = await requireAdmin();
  const q = (searchParams.q ?? "").replace(/[,()*%\\:"']/g, " ").trim().slice(0, 60);
  const show = searchParams.show === "archived" ? "archived" : searchParams.show === "all" ? "all" : "active";
  const category = UUID.test(searchParams.category ?? "") ? searchParams.category! : "";
  const page = Math.max(1, Math.min(500, Number(searchParams.page) || 1));

  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");

  let query = supabase
    .from("products")
    .select("id, name, slug, type, price, sale_price, stock, is_active, is_featured, category:categories (name), images:product_images (url, sort_order), variants:product_variants (id)", { count: "exact" })
    .in("type", TYPES[kind]);
  if (show === "active") query = query.eq("is_active", true);
  if (show === "archived") query = query.eq("is_active", false);
  if (category) query = query.eq("category_id", category);
  if (q) query = query.or(`name.ilike.*${q}*,sku.ilike.*${q}*,slug.ilike.*${q}*`);
  const { data, count, error } = await query.order("created_at", { ascending: false }).order("id").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error && error.code !== "PGRST103") throw new Error(`Could not load products: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const base = BASE[kind];
  const title = kind === "art" ? "Artworks" : "Products";

  const href = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const state: Record<string, string | number> = { q, show, category, page: 1, ...over };
    for (const [k, v] of Object.entries(state)) if (v && !(k === "show" && v === "active") && !(k === "page" && v === 1)) p.set(k, String(v));
    return p.size ? `${base}?${p}` : base;
  };

  return (
    <div>
      <PageHeader
        title={title}
        description={kind === "art" ? "Your original paintings and prints." : "Everything handmade you sell, except artworks."}
        actions={
          <Link href={`${base}/new`} className={buttonClass.primary}>
            <PlusIcon className="size-4" aria-hidden="true" /> {kind === "art" ? "Add artwork" : "Add product"}
          </Link>
        }
      />

      <form method="get" className="mb-6 grid gap-3 rounded-3xl border border-border/70 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Search</span>
          <span className="relative block">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ink" aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Name or SKU" className={cn(fieldClass, "h-11 pl-10")} />
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Category</span>
          <select name="category" defaultValue={category} className={cn(fieldClass, "h-11")}>
            <option value="">All</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Show</span>
          <select name="show" defaultValue={show} className={cn(fieldClass, "h-11")}>
            <option value="active">In the shop</option>
            <option value="archived">Archived</option>
            <option value="all">Everything</option>
          </select>
        </label>
        <button type="submit" className={buttonClass.primary}>
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={q || category || show !== "active" ? "Nothing matches" : `No ${title.toLowerCase()} yet`}>
          <Link href={`${base}/new`} className="font-medium text-ink underline underline-offset-2">
            {kind === "art" ? "Add your first artwork" : "Add your first product"}
          </Link>
        </EmptyState>
      ) : (
        <Card className="p-0 sm:p-0">
          <ul className="divide-y divide-border" aria-label={title}>
            {rows.map((p) => {
              const img = [...p.images].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <Link href={`${base}/${p.id}`} tabIndex={-1} aria-hidden="true" className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-peach-soft">
                    {img && <Image src={img.url} alt="" fill sizes="64px" unoptimized={img.url.endsWith(".svg")} className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`${base}/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-ink">
                      <span>
                        {p.sale_price !== null ? (
                          <>
                            <span className="font-medium text-ink">{formatINR(p.sale_price)}</span> <s>{formatINR(p.price)}</s>
                          </>
                        ) : (
                          <span className="font-medium text-ink">{formatINR(p.price)}</span>
                        )}
                      </span>
                      <span>· {p.stock === 0 ? <span className="text-destructive">Sold out</span> : `${p.stock} in stock`}{p.variants.length ? ` (${p.variants.length} options)` : ""}</span>
                      {p.category && <span>· {p.category.name}</span>}
                      {kind === "art" && <span>· {p.type === "original_art" ? "Original" : "Print"}</span>}
                      {!p.is_active && <Pill tone="muted">Archived</Pill>}
                      {p.is_featured && <Pill>Featured</Pill>}
                    </p>
                  </div>
                  <ProductRowActions id={p.id} slug={p.slug} active={p.is_active} base={base} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Pager page={page} totalPages={totalPages} href={(n) => href({ page: n })} />
    </div>
  );
}

const EMPTY: ProductFormInput = {
  id: null,
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  type: "product",
  price: "",
  salePrice: "",
  stock: "1",
  sku: "",
  tags: "",
  isFeatured: false,
  isActive: true,
  weightG: "",
  dimensions: "",
  variants: [],
  images: [],
};

export async function ProductEditPage({ kind, id }: { kind: ProductKind; id: string | null }) {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
  let initial: ProductFormInput = { ...EMPTY, type: kind === "art" ? "original_art" : "product" };
  let name = "";

  if (id) {
    if (!UUID.test(id)) notFound();
    const { data } = await supabase
      .from("products")
      .select("*, images:product_images (url, alt, sort_order), variants:product_variants (id, name, price_delta, stock, sku)")
      .eq("id", id)
      .in("type", TYPES[kind])
      .maybeSingle();
    if (!data) notFound();
    name = data.name;
    initial = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? "",
      categoryId: data.category_id ?? "",
      type: data.type,
      price: paiseToRupeesInput(data.price),
      salePrice: paiseToRupeesInput(data.sale_price),
      stock: String(data.stock),
      sku: data.sku ?? "",
      tags: (data.tags ?? []).join(", "),
      isFeatured: data.is_featured,
      isActive: data.is_active,
      weightG: data.weight_g === null ? "" : String(data.weight_g),
      dimensions: data.dimensions ?? "",
      variants: [...(data.variants as { id: string; name: string; price_delta: number; stock: number; sku: string | null }[])]
        .sort((a, b) => a.price_delta - b.price_delta || a.name.localeCompare(b.name))
        .map((v) => ({
          id: v.id,
          name: v.name,
          priceDelta: v.price_delta < 0 ? `-${paiseToRupeesInput(-v.price_delta)}` : paiseToRupeesInput(v.price_delta),
          stock: String(v.stock),
          sku: v.sku ?? "",
        })),
      images: [...(data.images as { url: string; alt: string; sort_order: number }[])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ url: i.url, alt: i.alt })),
    };
  }

  const base = BASE[kind];
  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: base, label: kind === "art" ? "Artworks" : "Products" }}
        title={id ? name : kind === "art" ? "Add an artwork" : "Add a product"}
        actions={
          id && initial.isActive ? (
            <Link href={`/product/${initial.slug}`} target="_blank" className={buttonClass.secondary}>
              View in shop ↗
            </Link>
          ) : undefined
        }
      />
      <ProductForm kind={kind} initial={initial} categories={categories ?? []} isNew={!id} />
    </div>
  );
}
