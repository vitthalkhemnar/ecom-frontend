import { useState } from 'react';
import type { Variant } from '../../types';

interface EditVariantModalProps {
  variant: Variant;
  onSave: (payload: Partial<Variant>) => Promise<void>;
  onClose: () => void;
}

export default function EditVariantModal({ variant, onSave, onClose }: EditVariantModalProps) {
  const [size, setSize] = useState(variant.size ?? '');
  const [color, setColor] = useState(variant.color ?? '');
  const [price, setPrice] = useState(variant.price);
  const [stock, setStock] = useState(variant.stock);
  const [active, setActive] = useState(variant.active);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        variantId: variant.variantId,
        size: size || null,
        color: color || null,
        price: Number(price),
        stock: Number(stock),
        active,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit variant</h2>

        <div className="modal-fields">
          <label className="auth-label">
            SKU
            <input className="auth-input" value={variant.sku} disabled />
          </label>

          <div className="auth-field-row">
            <label className="auth-label">
              Size
              <input className="auth-input" value={size} onChange={(e) => setSize(e.target.value)} />
            </label>
            <label className="auth-label">
              Color
              <input className="auth-input" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>

          <div className="auth-field-row">
            <label className="auth-label">
              Price
              <input className="auth-input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </label>
            <label className="auth-label">
              Stock
              <input className="auth-input" type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
            </label>
          </div>

          <label className="admin-role-toggle">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (visible to shoppers)
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}