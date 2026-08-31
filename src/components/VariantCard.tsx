import { useState } from 'react';
import { formatINR } from '../api';
import { useCart } from '../context/CartContext';
import type { Variant } from '../types';
import { useAuth } from '../context/AuthContext';

interface VariantCardProps {
  variant: Variant;
}

function stockInfo(stock: number, active: boolean): { label: string; cls: 'in' | 'low' | 'out' } {
  if (!active) return { label: 'Inactive', cls: 'out' };
  if (stock <= 0) return { label: 'Out of stock', cls: 'out' };
  if (stock <= 10) return { label: `Only ${stock} left`, cls: 'low' };
  return { label: 'In stock', cls: 'in' };
}

export default function VariantCard({ variant }: VariantCardProps) {
  const { label, cls } = stockInfo(variant.stock, variant.active);
  const swatchLabel = variant.color ? variant.color.slice(0, 3).toUpperCase() : 'STD';
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const { isAuthenticated } = useAuth();

  const outOfStock = cls === 'out';

  async function handleAddToCart() {
    setAdding(true);
    try {
      await addItem({
        productId: String(variant.productId),
        variantId: String(variant.variantId),
        price: variant.price,
        quantity,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="variant-card">
      <div
        className="variant-swatch"
        style={variant.color ? { background: variant.color, color: 'transparent' } : undefined}
      >
        {!variant.color && swatchLabel}
      </div>
      <div className="variant-info">
        <span className="variant-attrs">
          {variant.color || 'Standard'}
          {variant.size ? ` · ${variant.size}` : ''}
        </span>
        <span className="variant-sku">{variant.sku}</span>
      </div>
      <span className={`variant-stock ${cls}`}>{label}</span>
      <span className="variant-price">{formatINR(variant.price)}</span>

      {!outOfStock && isAuthenticated && (
        <div className="variant-cart-controls">
          <div className="qty-stepper">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(variant.stock, q + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button type="button" className="add-to-cart-btn" onClick={handleAddToCart} disabled={adding}>
            {added ? 'Added' : adding ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      )}
    </div>
  );
}