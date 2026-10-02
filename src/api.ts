import type {
  Product,
  Variant,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  AddToCartRequest,
  CartItem,
  RemoveFromCartRequest,
  CreateOrderRequest,
  Order,
  User,
  UserUpdateRequest,
  SendMailRequest,
  AddAddressRequest,
  AddressResponse,
  UpdateAddressRequest,
  RazorpayOrderResponse,
  PaymentVerificationRequest,
  PaymentOrderRequest,
} from './types';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8080';

const AUTH_BASE_URL = GATEWAY_URL + '/user-service';
const PRODUCT_BASE_URL = GATEWAY_URL + '/product-service';
const ORDER_BASE_URL = GATEWAY_URL + '/order-service';
const EMAIL_BASE_URL = GATEWAY_URL + '/email-service';
const PAYMENT_BASE_URL = GATEWAY_URL + '/payment-service';

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
let activeToken: string | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export function setApiToken(token: string | null) {
  activeToken = token;
}

export function getToken(): string | null {
  if (activeToken) return activeToken;
  try {
    const stored = sessionStorage.getItem('bazaar_auth') || localStorage.getItem('bazaar_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        activeToken = parsed.token;
        return parsed.token;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  const token = localStorage.getItem('token');
  if (token) {
    activeToken = token;
    return token;
  }
  return null;
}

// Initial attempt to resolve token from storage
getToken();

function authHeader(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
    if (!path.startsWith('/auth/')) {
      onUnauthorized?.();
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = `Request to ${path} failed with status ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.message || errJson.error || errMsg;
    } catch {
      if (errText) errMsg = errText;
    }
    throw new Error(errMsg);
  }

  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }

  return JSON.parse(text) as Promise<T>;
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

export function getProducts(): Promise<Product[]> {
  return request<Product[]>(PRODUCT_BASE_URL, '/product', {
    headers: authHeader(),
  });
}

export function getProductById(productId: number | string): Promise<Product> {
  return request<Product>(PRODUCT_BASE_URL, `/product/${productId}`, {
    headers: authHeader(),
  });
}

export function getVariants(productId: number | string): Promise<Variant[]> {
  return request<Variant[]>(PRODUCT_BASE_URL, `/variant/${productId}`, {
    headers: authHeader(),
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

export function addToCart(payload: AddToCartRequest): Promise<CartItem[]> {
  const token = getToken();
  if (!token) return Promise.resolve([]);
  return request<CartItem[]>(PRODUCT_BASE_URL, '/cart/add', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function removeFromCart(payload: RemoveFromCartRequest): Promise<CartItem[]> {
  const token = getToken();
  if (!token) return Promise.resolve([]);
  return request<CartItem[]>(PRODUCT_BASE_URL, '/cart/remove', {
    method: 'DELETE',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function getCart(): Promise<CartItem[]> {
  const token = getToken();
  if (!token) return Promise.resolve([]);
  return request<CartItem[]>(PRODUCT_BASE_URL, '/cart', {
    headers: authHeader(),
  });
}

export function createOrder(payload: CreateOrderRequest): Promise<Order> {
  return request<Order>(ORDER_BASE_URL, '/orders/create', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function getOrders(): Promise<Order[]> {
  return request<Order[]>(ORDER_BASE_URL, '/orders', {
    headers: authHeader(),
  });
}

export function getAllOrders(): Promise<Order[]> {
  return request<Order[]>(ORDER_BASE_URL, '/orders/all-orders', {
    headers: authHeader(),
  });
}

export function getOrderById(id: number | string): Promise<Order> {
  return request<Order>(ORDER_BASE_URL, `/orders/${id}`, {
    headers: authHeader(),
  });
}

export function getUserDetails(): Promise<User[]> {
  return request<User[]>(AUTH_BASE_URL, '/user', {
    headers: authHeader(),
  });
}

export function getAdminUsers(): Promise<User[]> {
  return request<User[]>(AUTH_BASE_URL, '/user/all-users', {
    headers: authHeader(),
  });
}

export function updateUser(payload: UserUpdateRequest): Promise<User> {
  return request<User>(AUTH_BASE_URL, '/user', {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number): Promise<boolean> {
  return request<boolean>(AUTH_BASE_URL, `/user/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
}

export function uploadProducts(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${PRODUCT_BASE_URL}/product/upload`, {
    method: 'POST',
    headers: {
      ...authHeader(),
    },
    body: formData,
  }).then(async (res) => {
    if (res.status === 401 || res.status === 403) {
      onUnauthorized?.();
      throw new Error('Session expired');
    }
    const text = await res.text();
    if (!res.ok) {
      let errMsg = text || `Upload failed with status ${res.status}`;
      try {
        const errJson = JSON.parse(text);
        errMsg = errJson.message || errJson.error || errMsg;
      } catch {
        // use raw text
      }
      throw new Error(errMsg);
    }
    return text;
  });
}

export function updateProduct(payload: Product): Promise<Product> {
  return request<Product>(PRODUCT_BASE_URL, `/product`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number | string): Promise<boolean> {
  return request<boolean>(PRODUCT_BASE_URL, `/product/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
}

export function updateVariant(payload: Partial<Variant>): Promise<Variant> {
  return request<Variant>(PRODUCT_BASE_URL, `/variant`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function deleteVariant(variantId: number | string): Promise<boolean> {
  return request<boolean>(PRODUCT_BASE_URL, `/variant/${variantId}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
}

export function sendMail(payload: SendMailRequest): Promise<void> {
  return request<void>(EMAIL_BASE_URL, `/email`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function addAddress(payload: AddAddressRequest): Promise<AddressResponse[]> {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function getAllAddress(): Promise<AddressResponse[]> {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address`, {
    method: 'GET',
    headers: authHeader(),
  });
}

export function deleteAddress(addressId: number): Promise<AddressResponse[]> {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address/${addressId}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
}

export function updateAddress(payload: UpdateAddressRequest): Promise<AddressResponse[]> {
  return request<AddressResponse[]>(AUTH_BASE_URL, `/address`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });
}

export function createPaymentOrder(
  payload: PaymentOrderRequest
): Promise<RazorpayOrderResponse> {
  return request<RazorpayOrderResponse>(
    PAYMENT_BASE_URL,
    '/payment/order',
    {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload),
    }
  );
}

export function verifyPayment(
  payload: PaymentVerificationRequest
): Promise<boolean> {
  return request<boolean>(
    PAYMENT_BASE_URL,
    '/payment/verify',
    {
      method: 'POST',
      headers: authHeader(),
      body: JSON.stringify(payload),
    }
  );
}