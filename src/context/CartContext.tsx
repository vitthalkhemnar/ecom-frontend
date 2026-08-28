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
  const { token, isAuthenticated } = useAuth();

  async function refreshCart() {
    if (!token) return;
    const data = await getCart(token);
    setItems(data);
  }

  async function addItem(payload: AddToCartRequest) {
    if (!token) return;
    const data = await addToCart(payload, token);
    setItems(data);
  }

  async function removeItem(payload: RemoveFromCartRequest) {
    if (!token) return;
    const data = await removeFromCart(payload, token);
    setItems(data);
  }

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setItems([]);
    }
  }, [isAuthenticated]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
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
