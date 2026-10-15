import Image from "next/image";
import Link from "next/link";
import { discountPercent, formatINR, fromPrice, isOnSale } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

function Badge({ children, tone }: { children: React.ReactNode; tone: "peach" | "ink" | "cream" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "peach" && "bg-peach text-ink",
        tone === "ink" && "bg-ink text-cream",
        tone === "cream" && "bg-cream/95 text-ink",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Product tile for grids. The product name is the link; it stretches over the
 * whole card so the image is clickable too, without nesting extra links.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  const soldOut = product.stock <= 0;
  const onSale = isOnSale(product);
  const hasVariants = product.variants.length > 0;

  return (
    <article className="group relative flex flex-col rounded-2xl has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-peach-soft">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || product.name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
            unoptimized={image.url.endsWith(".svg")}
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
              soldOut && "opacity-60",
            )}
          />
        ) : null}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {soldOut && <Badge tone="ink">Sold out</Badge>}
          {!soldOut && onSale && <Badge tone="peach">{discountPercent(product)}% off</Badge>}
          {product.type === "original_art" && <Badge tone="cream">Original · 1 of 1</Badge>}
          {product.type === "print" && <Badge tone="cream">Art print</Badge>}
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        {product.category && (
          <p className="text-xs tracking-wide text-muted-ink uppercase">{product.category.name}</p>
        )}
        <h3 className="font-sans text-sm leading-snug font-medium text-ink sm:text-base">
          <Link
            href={`/product/${product.slug}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl hover:underline hover:underline-offset-4"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="font-semibold text-ink">
            {hasVariants && <span className="font-normal text-muted-ink">From </span>}
            {formatINR(fromPrice(product))}
          </span>
          {onSale && !hasVariants && (
            <span className="text-sm text-muted-ink line-through">
              <span className="sr-only">Was </span>
              {formatINR(product.price)}
            </span>
          )}
        </p>
        {!soldOut && product.stock <= 3 && product.type === "product" && (
          <p className="text-xs text-peach-deep">Only {product.stock} left</p>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
