import { formatINR } from '../api';
import type { Variant } from '../types';

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
    </div>
  );
}