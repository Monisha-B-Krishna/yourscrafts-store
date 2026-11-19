"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  url: string;
  alt: string;
}

const MAX_SIDE = 2000;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/**
 * Makes big phone photos smaller (longest side 2000px, WebP) before upload,
 * so pages load fast. Falls back to the original file if the browser can't.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_000_000 && file.type === "image/webp") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/**
 * Photos for a product: upload several at once, drag (or use the arrows) to
 * reorder, and describe each one for customers using screen readers.
 * The first photo is the main one shown in the shop.
 */
export function ImageUploader({
  images,
  onChange,
  bucket,
  altFallback,
  max = 12,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  bucket: "product-images" | "artworks";
  altFallback: string;
  max?: number;
}) {
  const [uploading, setUploading] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const room = max - images.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast(`Only ${max} photos per product, so some were skipped.`);
    setUploading(picked.length);
    const supabase = createClient();
    const added: UploadedImage[] = [];
    for (const file of picked) {
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error(`${file.name}: please use JPG, PNG or WebP (iPhone HEIC photos: share them as JPG first).`);
        continue;
      }
      const body = await shrink(file);
      if (body.size > MAX_BYTES) {
        toast.error(`${file.name} is too big even after shrinking (max 5 MB).`);
        continue;
      }
      const ext = body.type === "image/webp" ? "webp" : file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: body.type, cacheControl: "31536000" });
      if (error) {
        toast.error(`${file.name}: upload failed (${error.message}).`);
        continue;
      }
      added.push({ url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, alt: "" });
      setUploading((n) => n - 1);
    }
    setUploading(0);
    if (added.length) onChange([...images, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div>
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Photos, in the order shown in the shop">
          {images.map((img, i) => (
            <li
              key={img.url}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null) move(dragFrom, i);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              className={cn(
                "group flex cursor-grab flex-col rounded-2xl border bg-white p-2 active:cursor-grabbing",
                i === 0 ? "border-ink" : "border-border",
                dragFrom === i && "opacity-50",
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-peach-soft">
                <Image src={img.url} alt={img.alt || altFallback} fill sizes="200px" unoptimized className="object-cover" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-cream">Main photo</span>
                )}
              </div>
              <label className="mt-2 block">
                <span className="sr-only">Describe photo {i + 1}</span>
                <input
                  value={img.alt}
                  onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                  placeholder="Describe this photo"
                  maxLength={200}
                  className="h-9 w-full rounded-lg border border-input px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-peach-soft disabled:opacity-30">
                    <ArrowLeftIcon className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label={`Move photo ${i + 1} later`} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-peach-soft disabled:opacity-30">
                    <ArrowRightIcon className="size-4" aria-hidden="true" />
                  </button>
                  {i > 0 && (
                    <button type="button" onClick={() => move(i, 0)} aria-label={`Make photo ${i + 1} the main photo`} title="Make main photo" className="inline-flex size-8 items-center justify-center rounded-full hover:bg-peach-soft">
                      <StarIcon className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="inline-flex size-8 items-center justify-center rounded-full text-destructive hover:bg-destructive/5">
                  <Trash2Icon className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length < max && (
        <label
          htmlFor={inputId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom === null) void upload(e.dataTransfer.files);
          }}
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input px-4 py-8 text-center text-sm transition-colors hover:border-peach hover:bg-peach-soft/40 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/40",
            uploading > 0 && "pointer-events-none opacity-70",
          )}
        >
          <ImagePlusIcon className="size-7 text-peach-deep" aria-hidden="true" />
          <span className="font-medium">{uploading > 0 ? `Uploading ${uploading}…` : "Add photos"}</span>
          <span className="text-muted-ink">Tap to choose, or drop them here. JPG, PNG or WebP. Big photos are shrunk for you.</span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => void upload(e.target.files)}
            disabled={uploading > 0}
          />
        </label>
      )}
    </div>
  );
}
