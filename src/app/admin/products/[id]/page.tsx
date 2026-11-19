import type { Metadata } from "next";
import { ProductEditPage } from "@/components/admin/product-pages";

export const metadata: Metadata = { title: "Edit product" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductEditPage kind="product" id={(await params).id} />;
}
