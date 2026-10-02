import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Product, CreateVariantRequest, Variant } from '../../types';

interface AddVariantModalProps {
  product: Product;
  onSave: (payload: CreateVariantRequest) => Promise<Variant>;
  onClose: () => void;
}

export default function AddVariantModal({ product, onSave, onClose }: AddVariantModalProps) {
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [price, setPrice] = useState<number | ''>(product.price);
  const [stock, setStock] = useState<number | ''>(10);
  const [image, setImage] = useState(product.images && product.images.length > 0 ? product.images[0] : '');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      toast.error('Please enter a valid price.');
      return;
    }
    if (stock === '' || isNaN(Number(stock)) || Number(stock) < 0) {
      toast.error('Please enter a valid stock quantity.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        productId: product.id,
        size: size.trim() || null,
        color: color.trim() || null,
        price: Number(price),
        stock: Number(stock),
        image: image.trim() || null,
        active,
      });
      onClose();
    } catch {
      // Error handled in parent handler
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add New Variant</h2>
        <div style={{ fontSize: '13px', color: 'var(--slate)', marginBottom: '16px' }}>
          For product: <strong>{product.productName}</strong> ({product.productCode})
        </div>

        <form onSubmit={handleSave} className="modal-fields">
          <div className="auth-field-row">
            <label className="auth-label">
              Size
              <input
                className="auth-input"
                placeholder="e.g. M, L, XL, 9, 10, NA"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </label>
            <label className="auth-label">
              Color
              <input
                className="auth-input"
                placeholder="e.g. Navy Blue, Black, White"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
          </div>

          <div className="auth-field-row">
            <label className="auth-label">
              Price (₹) *
              <input
                className="auth-input"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </label>
            <label className="auth-label">
              Stock Quantity *
              <input
                className="auth-input"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </label>
          </div>

          <label className="auth-label">
            Variant Image URL
            <input
              className="auth-input"
              placeholder="https://..."
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </label>

          <label className="admin-role-toggle">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active (immediately visible to shoppers)
          </label>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Adding…' : 'Add Variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
