import type { Metadata } from "next";
import { ProductEditPage } from "@/components/admin/product-pages";

export const metadata: Metadata = { title: "Add product" };

export default function Page() {
  return <ProductEditPage kind="product" id={null} />;
}
