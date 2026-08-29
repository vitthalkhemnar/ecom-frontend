import type { Product, Variant, AuthResponse, LoginRequest, RegisterRequest, AddToCartRequest, CartItem, RemoveFromCartRequest, CreateOrderRequest, Order } from './types';

const AUTH_BASE_URL = 'http://localhost:9090';
const PRODUCT_BASE_URL = 'http://localhost:9091';
const ORDER_BASE_URL = 'http://localhost:9092';

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

async function request<T>(baseUrl: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    onUnauthorized?.();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>(AUTH_BASE_URL, '/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>(AUTH_BASE_URL, '/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(email: string): Promise<void> {
  return request<void>(AUTH_BASE_URL, '/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function getProducts(token: string): Promise<Product[]> {
  return request<Product[]>(PRODUCT_BASE_URL, '/product', {
    headers: authHeader(token),
  });
}

export function getVariants(productId: number | string, token: string): Promise<Variant[]> {
  return request<Variant[]>(PRODUCT_BASE_URL, `/variant/${productId}`, {
    headers: authHeader(token),
  });
}

export function formatINR(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function addToCart(payload: AddToCartRequest, token: string): Promise<CartItem[]> {
  return request<CartItem[]>(PRODUCT_BASE_URL, '/cart/add', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function removeFromCart(payload: RemoveFromCartRequest, token: string): Promise<CartItem[]> {
  return request<CartItem[]>(PRODUCT_BASE_URL, '/cart/remove', {
    method: 'DELETE',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function getCart(token: string): Promise<CartItem[]> {
  return request<CartItem[]>(PRODUCT_BASE_URL, '/cart', {
    headers: authHeader(token),
  });
}

export function createOrder(payload: CreateOrderRequest, token: string): Promise<Order> {
  return request<Order>(ORDER_BASE_URL, '/orders/create', {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function getOrders(token: string): Promise<Order[]> {
  return request<Order[]>(ORDER_BASE_URL, '/orders', {
    headers: authHeader(token),
  });
}

export function getOrderById(id: number | string, token: string): Promise<Order> {
  return request<Order>(ORDER_BASE_URL, `/orders/${id}`, {
    headers: authHeader(token),
  });
}