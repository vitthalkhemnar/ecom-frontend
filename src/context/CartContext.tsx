import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  CartItem,
  AddToCartRequest,
  RemoveFromCartRequest,
} from "../types";
import { addToCart, removeFromCart, getCart } from "../api";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  isLoaded: boolean;
  addItem: (payload: AddToCartRequest) => Promise<void>;
  removeItem: (payload: RemoveFromCartRequest) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoaded(true);
      return;
    }
    try {
      const data = await getCart();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Avoid uncaught rejection
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  const addItem = useCallback(async (payload: AddToCartRequest) => {
    if (!isAuthenticated) return;
    try {
      const data = await addToCart(payload);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Avoid uncaught rejection
    }
  }, [isAuthenticated]);

  const removeItem = useCallback(async (payload: RemoveFromCartRequest) => {
    if (!isAuthenticated) return;
    try {
      const data = await removeFromCart(payload);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Avoid uncaught rejection
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setItems([]);
      setIsLoaded(true);
    }
  }, [isAuthenticated, refreshCart]);

  // Count distinct products in the cart so multiple quantities of the same product count as one
  const itemCount = new Set(
    items.map((item) => item.productId).filter(Boolean),
  ).size;
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, itemCount, totalPrice, isLoaded, addItem, removeItem, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
