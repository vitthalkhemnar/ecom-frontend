export interface AuthResponse {
  token: string;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  phone: string;
}

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

export interface CartItem {
  productId: string;
  variantId: string;
  price: number;
  quantity: number;
}

export interface AddToCartRequest {
  productId: string;
  variantId: string;
  price: number;
  quantity: number;
}

export interface RemoveFromCartRequest {
  productId: string;
  variantId: string;
  price: number;
  quantity: number;
}