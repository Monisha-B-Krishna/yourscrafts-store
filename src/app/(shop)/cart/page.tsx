import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <h1 className="mb-8 text-3xl sm:text-4xl lg:text-5xl">Your cart</h1>
      <CartView />
    </div>
  );
}
