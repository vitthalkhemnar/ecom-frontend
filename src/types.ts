export interface Product {
  id: number;
  productCode: string;
  productName: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  price: number;
  discount: number;
  material: string;
  attributes: Record<string, string | number>;
  images: string[];
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Variant {
  variantId: number;
  productId: number;
  sku: string;
  color: string | null;
  size: string | null;
  price: number;
  stock: number;
  image: string | null;
  active: boolean;
}