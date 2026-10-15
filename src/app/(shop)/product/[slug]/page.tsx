import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PackageIcon, TruckIcon } from "lucide-react";
import { WhatsAppIcon } from "@/components/shop/icons";
import { ProductGrid } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import { PurchasePanel } from "@/components/shop/purchase-panel";
import { Section } from "@/components/shop/section";
import { ProductViewTracker } from "@/components/shop/trackers";
import { getProductBySlug, getRelatedProducts, getSettings } from "@/lib/catalog";
import { estimateDelivery, formatDeliveryDate } from "@/lib/delivery";
import { siteUrl } from "@/lib/env";
import { INTERNATIONAL_MESSAGE, whatsappLink } from "@/lib/whatsapp";

// Product pages are built on first visit, cached, and refreshed at most once a minute.
export const revalidate = 60;

export function generateStaticParams() {
  return []; // none at build time: every product page is generated on demand
}

type Params = Promise<{ slug: string }>;

const TYPE_LABEL = {
  product: "Handmade gift",
  original_art: "Original painting",
  print: "Art print",
} as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Not found" };
  const description = product.description.length > 155 ? `${product.description.slice(0, 152)}…` : product.description;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: product.images[0] ? [{ url: product.images[0].url, alt: product.images[0].alt }] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const [related, settings] = await Promise.all([getRelatedProducts(product, 4), getSettings()]);
  const delivery = estimateDelivery(product.type);
  const productUrl = `${siteUrl}/product/${product.slug}`;
  const customMessage = `Hi Monisha! I love the ${product.name} (${productUrl}). Could you make a custom version for me? Here's what I have in mind: `;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 overflow-x-auto text-sm">
        <ol className="flex items-center gap-1.5 whitespace-nowrap text-muted-ink">
          {[
            { href: "/", label: "Home" },
            { href: "/shop", label: "Shop" },
            ...(product.category
              ? [{ href: `/shop?category=${product.category.slug}`, label: product.category.name }]
              : []),
          ].map((crumb) => (
            <li key={crumb.href} className="flex items-center gap-1.5">
              <Link href={crumb.href} className="hover:text-ink hover:underline">
                {crumb.label}
              </Link>
              <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </li>
          ))}
          <li aria-current="page" className="truncate text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <p className="text-sm tracking-wide text-peach-deep uppercase">{TYPE_LABEL[product.type]}</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl lg:text-5xl">{product.name}</h1>

          <div className="mt-6">
            <PurchasePanel product={product} />
          </div>

          <div className="mt-8 space-y-3 rounded-2xl bg-white/70 p-5 ring-1 ring-border">
            <p className="flex items-start gap-3 text-sm">
              <TruckIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-semibold">
                  Estimated delivery: {formatDeliveryDate(delivery.earliest)} – {formatDeliveryDate(delivery.latest)}
                </span>
                <span className="block text-muted-ink">
                  Packed by hand and dispatched within {delivery.dispatchMin}–{delivery.dispatchMax} days. We ship
                  across India.
                </span>
              </span>
            </p>
            <p className="flex items-start gap-3 text-sm">
              <PackageIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span className="text-muted-ink">
                Free shipping on orders above ₹{(settings.free_shipping_threshold / 100).toLocaleString("en-IN")}.
                Outside India?{" "}
                <a
                  href={whatsappLink(settings.whatsapp_number, INTERNATIONAL_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink underline underline-offset-4"
                >
                  Message us on WhatsApp
                </a>
              </span>
            </p>
          </div>

          <a
            href={whatsappLink(settings.whatsapp_number, customMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3 rounded-2xl bg-peach-soft/70 p-5 text-sm hover:bg-peach-soft"
          >
            <WhatsAppIcon className="size-6 shrink-0" />
            <span>
              <span className="block font-semibold">Want it personalised?</span>
              <span className="text-muted-ink">Request a custom version on WhatsApp: names, colours, sizes.</span>
            </span>
          </a>

          <section aria-labelledby="details" className="mt-10">
            <h2 id="details" className="text-2xl">
              Details
            </h2>
            <p className="mt-3 leading-relaxed text-ink/85">{product.description}</p>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-ink">Type</dt>
              <dd>{TYPE_LABEL[product.type]}</dd>
              {product.category && (
                <>
                  <dt className="text-muted-ink">Category</dt>
                  <dd>{product.category.name}</dd>
                </>
              )}
              {product.dimensions && (
                <>
                  <dt className="text-muted-ink">{product.type === "product" ? "Size" : "Medium & size"}</dt>
                  <dd>{product.dimensions}</dd>
                </>
              )}
            </dl>
            {product.tags.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
                {product.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/search?q=${encodeURIComponent(tag.replace(/-/g, " "))}`}
                      className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs text-muted-ink ring-1 ring-border hover:text-ink"
                    >
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {related.length > 0 && (
        <Section id="related" eyebrow="More to love" title="You may also like" className="mt-20 px-0 sm:px-0 lg:px-0">
          <ProductGrid products={related} />
        </Section>
      )}

      <ProductViewTracker productId={product.id} />
    </div>
  );
}
