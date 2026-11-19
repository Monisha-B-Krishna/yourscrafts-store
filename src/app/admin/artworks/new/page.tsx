import type { Metadata } from "next";
import { ProductEditPage } from "@/components/admin/product-pages";

export const metadata: Metadata = { title: "Add artwork" };

export default function Page() {
  return <ProductEditPage kind="art" id={null} />;
}
