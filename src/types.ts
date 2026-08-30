export interface AuthResponse {
  token: string;
  username: string;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
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

export interface CreateOrderItem {
  productId: string;
  variantId: string;
  productName: string;
  size: string;
  color: string;
  quantity: string;
  priceAtBooking: string;
}

export interface OrderItem extends CreateOrderItem {
  bookingItemId: number;
}

export interface CreateOrderRequest {
  totalAmount: string;
  items: CreateOrderItem[];
}

export interface Order {
  bookingId: number;
  username: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: OrderItem[];
}

export interface User {
  id: number,
  username: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  isAdmin: boolean
}

export interface UserUpdateRequest {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isAdmin: boolean;
}