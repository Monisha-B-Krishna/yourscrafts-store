"use client";

import Image from "next/image";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

const isSvg = (url: string) => url.endsWith(".svg");

/**
 * Product photos: main image + thumbnails. On desktop, hovering zooms into the
 * photo where the mouse is. Clicking (or tapping) opens a full-screen viewer
 * where the photo can be zoomed and panned.
 */
export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [index, setIndex] = useState(0);
  const [hoverOrigin, setHoverOrigin] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  if (images.length === 0) {
    return <div className="aspect-square rounded-3xl bg-peach-soft" aria-hidden="true" />;
  }

  const current = images[Math.min(index, images.length - 1)];
  const count = images.length;

  return (
    <div className="lg:sticky lg:top-40">
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setHoverOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        onPointerLeave={() => setHoverOrigin(null)}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl bg-peach-soft"
        aria-label={`Open full-screen view of ${current.alt || productName}`}
      >
        <Image
          src={current.url}
          alt={current.alt || productName}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          unoptimized={isSvg(current.url)}
          style={{ transformOrigin: hoverOrigin ?? "center", transform: hoverOrigin ? "scale(2)" : undefined }}
          className="object-cover transition-transform duration-150 ease-out"
        />
        <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-cream/90 px-3 py-1.5 text-xs font-medium text-ink shadow-sm">
          <ZoomInIcon className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Click to zoom</span>
          <span className="sm:hidden">Tap to zoom</span>
        </span>
      </button>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 sm:gap-3" aria-label="Product photos">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${count}: ${img.alt || productName}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-xl bg-peach-soft ring-2 ring-transparent ring-offset-2 ring-offset-cream transition sm:size-20",
                  i === index ? "ring-ink" : "opacity-80 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="80px" unoptimized={isSvg(img.url)} className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <PhotoViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        images={images}
        index={index}
        onIndexChange={setIndex}
        productName={productName}
      />
    </div>
  );
}

function PhotoViewer({
  open,
  onOpenChange,
  images,
  index,
  onIndexChange,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: ProductImage[];
  index: number;
  onIndexChange: (index: number) => void;
  productName: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const focusPoint = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const count = images.length;
  const current = images[Math.min(index, count - 1)];

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      onIndexChange((index + delta + count) % count);
    },
    [index, count, onIndexChange],
  );

  // After zooming in, scroll so the spot that was clicked stays in view.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !zoomed) return;
    el.scrollLeft = focusPoint.current.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = focusPoint.current.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoomed]);

  function toggleZoom(event?: React.MouseEvent) {
    if (event && !zoomed) {
      const r = event.currentTarget.getBoundingClientRect();
      focusPoint.current = { x: (event.clientX - r.left) / r.width, y: (event.clientY - r.top) / r.height };
    } else if (!zoomed) {
      focusPoint.current = { x: 0.5, y: 0.5 };
    }
    setZoomed((z) => !z);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setZoomed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        onKeyDown={(e) => {
          if (count > 1 && e.key === "ArrowRight") go(1);
          if (count > 1 && e.key === "ArrowLeft") go(-1);
        }}
        className="top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_1fr_auto] gap-0 rounded-none bg-cream p-0 ring-0 sm:max-w-none"
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <DialogTitle className="truncate font-sans text-sm font-medium">
            {productName}
            {count > 1 && <span className="ml-2 font-normal text-muted-ink">{index + 1} / {count}</span>}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleZoom()}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-peach-soft"
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
            >
              {zoomed ? <ZoomOutIcon className="size-5" /> : <ZoomInIcon className="size-5" />}
            </button>
            <DialogClose
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-peach-soft"
              aria-label="Close full-screen view"
            >
              <XIcon className="size-5" />
            </DialogClose>
          </div>
        </div>

        <div
          ref={scroller}
          className={cn("relative min-h-0 overflow-auto overscroll-contain", !zoomed && "flex items-center justify-center p-4")}
        >
          {current && (
            <button
              type="button"
              onClick={toggleZoom}
              className={cn(
                "relative block shrink-0",
                zoomed
                  ? "aspect-square w-[250%] cursor-zoom-out sm:w-[200%]"
                  : "aspect-square h-full max-h-full w-auto max-w-full cursor-zoom-in",
              )}
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
            >
              <Image
                src={current.url}
                alt={current.alt || productName}
                fill
                sizes={zoomed ? "250vw" : "100vw"}
                unoptimized={isSvg(current.url)}
                className="rounded-2xl object-contain"
              />
            </button>
          )}
        </div>

        {count > 1 && (
          <div className="flex items-center justify-center gap-4 border-t px-4 py-2">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-peach-soft"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon className="size-6" />
            </button>
            <span className="text-sm text-muted-ink tabular-nums">
              {index + 1} of {count}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-peach-soft"
              aria-label="Next photo"
            >
              <ChevronRightIcon className="size-6" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
