/** All money values are integers in paise (₹1 = 100 paise). */
export type Paise = number;

export type ProductType = "product" | "original_art" | "print";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
}

export interface ProductImage {
  url: string;
  alt: string;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price_delta: Paise;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  type: ProductType;
  price: Paise;
  sale_price: Paise | null;
  stock: number;
  tags: string[];
  is_featured: boolean;
  sales_count: number;
  dimensions: string | null;
  created_at: string;
  images: ProductImage[];
  variants: ProductVariant[];
  category: { name: string; slug: string } | null;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  banner_image: string | null;
}
