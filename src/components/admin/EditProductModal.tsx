import { useState } from 'react';
import type { Product } from '../../types';

interface EditProductModalProps {
  product: Product;
  onSave: (payload: Product) => Promise<void>;
  onClose: () => void;
}

export default function EditProductModal({ product, onSave, onClose }: EditProductModalProps) {
  const [productName, setProductName] = useState(product.productName);
  const [brand, setBrand] = useState(product.brand);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ ...product, productName, brand, category, price: Number(price) });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit product</h2>

        <div className="modal-fields">
          <label className="auth-label">
            Product code
            <input className="auth-input" value={product.productCode} disabled />
          </label>

          <label className="auth-label">
            Product name
            <input className="auth-input" value={productName} onChange={(e) => setProductName(e.target.value)} />
          </label>

          <div className="auth-field-row">
            <label className="auth-label">
              Brand
              <input className="auth-input" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </label>
            <label className="auth-label">
              Category
              <input className="auth-input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
          </div>

          <label className="auth-label">
            Price
            <input className="auth-input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
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