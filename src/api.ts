import type { Product, Variant, AuthResponse, LoginRequest, RegisterRequest, AddToCartRequest, CartItem, RemoveFromCartRequest, CreateOrderRequest, Order, User, UserUpdateRequest, SendMailRequest, AddAddressRequest, AddressResponse, UpdateAddressRequest, RazorpayOrderResponse, PaymentVerificationRequest, PaymentOrderRequest } from './types';

const AUTH_BASE_URL = 'http://localhost:9090';
const PRODUCT_BASE_URL = 'http://localhost:9091';
const ORDER_BASE_URL = 'http://localhost:9092';
const EMAIL_BASE_URL = 'http://localhost:9093';
const PAYMENT_BASE_URL = 'http://localhost:9094';

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

  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }

  return JSON.parse(text) as Promise<T>;
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

export function getAllOrders(token: string): Promise<Order[]> {
  return request<Order[]>(ORDER_BASE_URL, '/orders/all-orders', {
    headers: authHeader(token),
  });
}

export function getOrderById(id: number | string, token: string): Promise<Order> {
  return request<Order>(ORDER_BASE_URL, `/orders/${id}`, {
    headers: authHeader(token),
  });
}

export function getUserDetails(token: string): Promise<User[]> {
  return request<User[]>(AUTH_BASE_URL, '/user', {
    headers: authHeader(token),
  });
}

export function getAdminUsers(token: string): Promise<User[]> {
  return request<User[]>(AUTH_BASE_URL, '/user/all-users', {
    headers: authHeader(token),
  });
}

export function updateUser(payload: UserUpdateRequest, token: string): Promise<User> {
  return request<User>(AUTH_BASE_URL, '/user', {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number, token: string): Promise<boolean> {
  return request<boolean>(AUTH_BASE_URL, `/user/${id}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
}

export function uploadProducts(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${PRODUCT_BASE_URL}/product/upload`, {
    method: 'POST',
    headers: {
      ...authHeader(token),
      // Note: Do NOT set 'Content-Type': 'application/json' when sending FormData,
      // as fetch needs to automatically set the multipart/boundary header.
    },
    body: formData,
  }).then(async (res) => {
    if (res.status === 401 || res.status === 403) {
      onUnauthorized?.();
      throw new Error('Session expired');
    }
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `Upload failed with status ${res.status}`);
    }
    return text;
  });
}

export function updateProduct(payload: Product, token: string): Promise<Product> {
  return request<Product>(PRODUCT_BASE_URL, `/product`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number | string, token: string): Promise<boolean> {
  return request<boolean>(PRODUCT_BASE_URL, `/product/${id}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
}

export function updateVariant(payload: Partial<Variant>, token: string): Promise<Variant> {
  return request<Variant>(PRODUCT_BASE_URL, `/variant`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function deleteVariant(variantId: number | string, token: string): Promise<boolean> {
  return request<boolean>(PRODUCT_BASE_URL, `/variant/${variantId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
}

export function sendMail(payload: SendMailRequest, token: string) {
  return request<void>(EMAIL_BASE_URL, `/email`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function addAddress(payload: AddAddressRequest, token: string) {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function getAllAddress(token: string) {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address`, {
    method: 'GET',
    headers: authHeader(token),
  });
}

export function deleteAddress(addressId: number, token: string) {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address/${addressId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });
}

export function updateAddress(payload: UpdateAddressRequest, token: string) {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address`, {
    method: 'PUT',
    headers: authHeader(token),
    body: JSON.stringify(payload),
  });
}

export function createPaymentOrder(
  payload: PaymentOrderRequest,
  token: string
): Promise<RazorpayOrderResponse> {
  return request<RazorpayOrderResponse>(
    PAYMENT_BASE_URL,
    '/payment/order',
    {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }
  );
}

export function verifyPayment(
  payload: PaymentVerificationRequest,
  token: string
): Promise<boolean> {
  return request<boolean>(
    PAYMENT_BASE_URL,
    '/payment/verify',
    {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }
  );
}