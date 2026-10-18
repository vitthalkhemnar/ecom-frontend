import {
  createContext,
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
  addItem: (payload: AddToCartRequest) => Promise<void>;
  removeItem: (payload: RemoveFromCartRequest) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { isAuthenticated } = useAuth();

  async function refreshCart() {
    if (!isAuthenticated) return;
    try {
      const data = await getCart();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Avoid uncaught rejection
    }
  }

  async function addItem(payload: AddToCartRequest) {
    if (!isAuthenticated) return;
    try {
      const data = await addToCart(payload);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Avoid uncaught rejection
    }
  }

  async function removeItem(payload: RemoveFromCartRequest) {
    if (!isAuthenticated) return;
    try {
      const data = await removeFromCart(payload);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // Avoid uncaught rejection
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setItems([]);
    }
  }, [isAuthenticated]);

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
      value={{ items, itemCount, totalPrice, addItem, removeItem, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a CartProvider");
  return ctx;
}
