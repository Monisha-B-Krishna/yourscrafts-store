import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/shop/icons";
import { ProductGrid } from "@/components/shop/product-card";
import { Section } from "@/components/shop/section";
import { artist } from "@/content/artist";
import { getArtworks, getSettings } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About the artist",
  description:
    "Meet Monisha, the artist behind Yours Crafts Woman. Original paintings, art prints and handmade gifts, made by hand in India.",
};

const COMMISSION_MESSAGE =
  "Hi Monisha! I'd love to commission a painting. Here's what I have in mind (subject, size, colours): ";

// Varied tile shapes make the gallery feel like a wall of work, not a product grid.
const TILE_SHAPES = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[3/4]"];

export default async function ArtistPage() {
  const [artworks, settings] = await Promise.all([getArtworks(), getSettings()]);
  const originals = artworks.filter((p) => p.type === "original_art");
  const prints = artworks.filter((p) => p.type === "print");
  const gallery = artworks.flatMap((p) => p.images.map((img) => ({ ...img, product: p })));

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* Intro */}
      <section aria-labelledby="artist-title" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[5fr_6fr] lg:gap-16">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] bg-peach-soft lg:max-w-none">
            <Image
              src={artist.photo.src}
              alt={artist.photo.alt}
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              unoptimized={artist.photo.src.endsWith(".svg")}
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm tracking-wide text-peach-deep uppercase">{artist.eyebrow}</p>
            <h1 id="artist-title" className="mt-3 text-4xl leading-[1.1] sm:text-5xl">
              {artist.headline}
            </h1>
            <p className="mt-6 text-lg text-ink/85">{artist.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#originals"
                className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 font-medium text-cream hover:bg-ink/85"
              >
                See the paintings
              </Link>
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-ink/20 px-7 font-medium hover:bg-peach-soft"
              >
                <InstagramIcon className="size-5" />
                Follow on Instagram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section aria-labelledby="story-title" className="bg-peach-soft/60 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div>
            <h2 id="story-title" className="text-3xl sm:text-4xl">
              The story
            </h2>
            <div className="mt-6 space-y-4 text-ink/85">
              {artist.story.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <blockquote className="mt-8 border-l-4 border-peach pl-5 font-serif text-2xl leading-snug italic">
              “{artist.quote}”
              <footer className="mt-2 font-sans text-sm text-muted-ink not-italic">— {artist.name}</footer>
            </blockquote>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-cream">
            <Image
              src={artist.studioPhoto.src}
              alt={artist.studioPhoto.alt}
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              unoptimized={artist.studioPhoto.src.endsWith(".svg")}
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Gallery: every photo of every artwork */}
      {gallery.length > 0 && (
        <Section id="gallery" eyebrow="From the easel" title="Gallery">
          <ul className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
            {gallery.map((item, i) => (
              <li key={item.url} className="mb-3 break-inside-avoid sm:mb-4">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="group relative block overflow-hidden rounded-2xl bg-peach-soft"
                >
                  <div className={cn("relative w-full", TILE_SHAPES[i % TILE_SHAPES.length])}>
                    <Image
                      src={item.url}
                      alt={item.alt || item.product.name}
                      fill
                      sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
                      unoptimized={item.url.endsWith(".svg")}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-3 pt-8 pb-3 text-xs font-medium text-cream transition-opacity sm:text-sm sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                    {item.product.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {originals.length > 0 && (
        <Section id="originals" eyebrow="One of a kind" title="Original paintings">
          <p className="-mt-3 mb-8 max-w-2xl text-muted-ink">
            Each original is the only one in the world. Once it’s gone, it’s gone, though a print may be available.
          </p>
          <ProductGrid products={originals} />
        </Section>
      )}

      {prints.length > 0 && (
        <Section id="prints" eyebrow="Several sizes" title="Art prints">
          <p className="-mt-3 mb-8 max-w-2xl text-muted-ink">
            Prints of the paintings in a choice of sizes, so more people can take a little of that colour home.
          </p>
          <ProductGrid products={prints} />
        </Section>
      )}

      {/* Commission CTA */}
      <section aria-labelledby="commission-title" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center text-cream sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -top-16 -left-16 size-56 rounded-full bg-peach/30" aria-hidden="true" />
          <h2 id="commission-title" className="relative text-3xl sm:text-4xl">
            Commission a painting
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-cream/80">
            A place you love, a family home, a favourite flower: tell Monisha about it on WhatsApp.
          </p>
          <a
            href={whatsappLink(settings.whatsapp_number, COMMISSION_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-peach px-7 font-medium text-ink hover:bg-peach/85"
          >
            <WhatsAppIcon className="size-5" />
            Start a commission
          </a>
        </div>
      </section>
    </div>
  );
}
