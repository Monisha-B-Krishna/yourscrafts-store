import type { Metadata } from "next";
import { ProductListPage } from "@/components/admin/product-pages";

export const metadata: Metadata = { title: "Artworks" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ProductListPage kind="art" searchParams={await searchParams} />;
}
