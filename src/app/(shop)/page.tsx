import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/shop/icons";
import { ProductGrid } from "@/components/shop/product-card";
import { Section } from "@/components/shop/section";
import { getActiveCollections, getHomeProducts, getSettings } from "@/lib/catalog";
import { instagramImages, productImageUrl } from "@/lib/seed/data";
import { CUSTOM_ORDER_MESSAGE, whatsappLink } from "@/lib/whatsapp";

// Rebuild the home page at most once a minute so new products show up quickly.
export const revalidate = 60;

const heroImages = [
  { src: productImageUrl("blush-rose-chocolate-bouquet"), alt: "Chocolate bouquet with blush roses" },
  { src: productImageUrl("diwali-diya-sweets-hamper"), alt: "Festive Diwali hamper" },
  { src: productImageUrl("monsoon-over-marine-drive"), alt: "Original painting of Marine Drive" },
];

export default async function HomePage() {
  const [settings, collections, newArrivals, bestsellers, deals, artwork] = await Promise.all([
    getSettings(),
    getActiveCollections(),
    getHomeProducts("new", 4),
    getHomeProducts("bestsellers", 4),
    getHomeProducts("deals", 4),
    getHomeProducts("artwork", 4),
  ]);
  const customOrderHref = whatsappLink(settings.whatsapp_number, CUSTOM_ORDER_MESSAGE);
  const edition = collections[0];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero */}
      <section aria-labelledby="hero-title" className="overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="max-w-xl">
            {edition && (
              <p className="mb-4 inline-flex rounded-full bg-peach-soft px-3 py-1 text-sm text-ink">
                ✿ {edition.name} is here
              </p>
            )}
            <h1 id="hero-title" className="text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              Handmade gifts, made to be remembered.
            </h1>
            <p className="mt-5 text-base text-muted-ink sm:text-lg">
              Chocolate bouquets, hampers, keepsakes and original paintings, each one crafted by
              hand by Monisha and shipped with love across India.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
              >
                Shop the collection
              </Link>
              <a
                href={customOrderHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/20 bg-cream px-7 font-medium text-ink hover:bg-peach-soft"
              >
                <WhatsAppIcon className="size-5" />
                Request a custom piece
              </a>
            </div>
          </div>
          <div className="grid grid-cols-5 grid-rows-2 gap-3 sm:gap-4">
            <div className="relative col-span-3 row-span-2 aspect-[3/4] overflow-hidden rounded-3xl bg-peach-soft">
              <Image src={heroImages[0].src} alt={heroImages[0].alt} fill priority unoptimized className="object-cover" sizes="(min-width:1024px) 30vw, 60vw" />
            </div>
            <div className="relative col-span-2 overflow-hidden rounded-3xl bg-peach-soft">
              <Image src={heroImages[1].src} alt={heroImages[1].alt} fill priority unoptimized className="object-cover" sizes="(min-width:1024px) 20vw, 40vw" />
            </div>
            <div className="relative col-span-2 overflow-hidden rounded-3xl bg-peach-soft">
              <Image src={heroImages[2].src} alt={heroImages[2].alt} fill unoptimized className="object-cover" sizes="(min-width:1024px) 20vw, 40vw" />
            </div>
          </div>
        </div>
      </section>

      {newArrivals.length > 0 && (
        <Section id="new-arrivals" eyebrow="Just made" title="New arrivals" href="/shop?sort=new">
          <ProductGrid products={newArrivals} />
        </Section>
      )}

      {bestsellers.length > 0 && (
        <Section id="bestsellers" eyebrow="Loved by many" title="Bestsellers" href="/shop?sort=popular">
          <ProductGrid products={bestsellers} />
        </Section>
      )}

      {deals.length > 0 && (
        <Section id="deals" eyebrow="For a little while" title="Current deals" href="/shop?sort=price-asc">
          <ProductGrid products={deals} />
        </Section>
      )}

      {artwork.length > 0 && (
        <div className="bg-peach-soft/60 py-14 sm:py-20">
          <Section
            id="artwork"
            eyebrow="From the artist’s easel"
            title="Featured artwork"
            href="/shop?category=paintings-and-prints"
            linkLabel="All art"
          >
            <ProductGrid products={artwork} />
          </Section>
        </div>
      )}

      {/* Instagram strip (static images until the owner replaces them) */}
      <Section id="instagram" eyebrow="@yours.craftswoman" title="From our Instagram">
        <ul className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {instagramImages.map((img) => (
            <li key={img.url}>
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-xl bg-peach-soft"
              >
                <Image src={img.url} alt={img.alt} fill unoptimized sizes="(min-width:1024px) 16vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-cream opacity-0 transition group-hover:bg-ink/30 group-hover:opacity-100">
                  <InstagramIcon className="size-7" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      {/* Custom order CTA */}
      <section aria-labelledby="custom-title" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center text-cream sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-peach/30" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-peach/20" aria-hidden="true" />
          <h2 id="custom-title" className="relative text-3xl sm:text-4xl">
            Have something special in mind?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-cream/80">
            Names, dates, colours, a painting of your favourite place: tell Monisha your idea on
            WhatsApp and she’ll make it just for you.
          </p>
          <a
            href={customOrderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-peach px-7 font-medium text-ink hover:bg-peach/85"
          >
            <WhatsAppIcon className="size-5" />
            Request a custom piece
          </a>
        </div>
      </section>
    </div>
  );
}
