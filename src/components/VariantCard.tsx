import { useState } from 'react';
import { formatINR, cleanValue } from '../api';
import { useCart } from '../context/CartContext';
import type { Variant } from '../types';
import { useAuth } from '../context/AuthContext';
import AddToCartResultModal from './AddToCartResultModal';

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
  const displayColor = cleanValue(variant.color);
  const displaySize = cleanValue(variant.size);
  const swatchLabel = displayColor ? displayColor.slice(0, 3).toUpperCase() : 'STD';
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const { isAuthenticated, requireAuth } = useAuth();

  const outOfStock = cls === 'out';

  async function doAddToCart() {
    setAdding(true);
    try {
      await addItem({
        productId: String(variant.productId),
        variantId: String(variant.variantId),
        price: variant.price,
        quantity,
      });
      setResult('success');
    } catch {
      setResult('error');
    } finally {
      setAdding(false);
    }
  }

  function handleAddToCart() {
    if (!isAuthenticated) {
      requireAuth(() => {
        doAddToCart();
      });
      return;
    }
    doAddToCart();
  }

  return (
    <div className="variant-card">
      <div
        className="variant-swatch"
        style={displayColor ? { background: displayColor, color: 'transparent' } : undefined}
      >
        {!displayColor && swatchLabel}
      </div>
      <div className="variant-info">
        <span className="variant-attrs">
          {[displayColor, displaySize].filter(Boolean).join(' · ') || 'Standard'}
        </span>
      </div>
      <span className={`variant-stock ${cls}`}>{label}</span>
      <span className="variant-price">{formatINR(variant.price)}</span>

      {!outOfStock && (
        <div className="variant-cart-controls">
          {/* <div className="qty-stepper">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(variant.stock, q + 1))} aria-label="Increase quantity">+</button>
          </div> */}
          <button type="button" className="add-to-cart-btn" onClick={handleAddToCart} disabled={adding}>
            {adding ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      )}
      
      {result && (
        <AddToCartResultModal
          status={result}
          productName={`${displayColor || 'This item'}${displaySize ? ` (${displaySize})` : ''}`}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}
