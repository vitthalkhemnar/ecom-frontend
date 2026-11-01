import { useState } from 'react';
import type { Product, CreateVariantRequest, Variant } from '../../types';
import { getErrorMessage, ApiError } from '../../api';

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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!size.trim() && !color.trim()) {
      errs.size = 'Please specify at least a size or color.';
      errs.color = 'Please specify at least a size or color.';
    }

    if (price === '' || isNaN(Number(price))) {
      errs.price = 'Price is required.';
    } else if (Number(price) <= 0) {
      errs.price = 'Price must be greater than 0.';
    }

    if (stock === '' || isNaN(Number(stock))) {
      errs.stock = 'Stock quantity is required.';
    } else if (Number(stock) < 0) {
      errs.stock = 'Stock quantity cannot be negative.';
    }

    return errs;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const valErrs = validate();
    if (Object.keys(valErrs).length > 0) {
      setFieldErrors(valErrs);
      setError(Object.values(valErrs)[0]);
      return;
    }

    setError(null);
    setFieldErrors({});
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
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to add variant. Please check your inputs.');
      setError(msg);
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>Add New Variant</h2>
            <div style={{ fontSize: '13px', color: 'var(--slate)', marginTop: '4px' }}>
              For product: <strong>{product.productName}</strong> ({product.productCode})
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--slate)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="modal-form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="modal-fields" noValidate>
          <div className="auth-field-row">
            <label className="auth-label">
              Size
              <input
                className={`auth-input ${fieldErrors.size ? 'has-error' : ''}`}
                placeholder="e.g. M, L, XL, 9, 10, NA"
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  if (fieldErrors.size) setFieldErrors((prev) => ({ ...prev, size: '' }));
                  if (error) setError(null);
                }}
              />
              {fieldErrors.size && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.size}
                </span>
              )}
            </label>
            <label className="auth-label">
              Color
              <input
                className={`auth-input ${fieldErrors.color ? 'has-error' : ''}`}
                placeholder="e.g. Navy Blue, Black, White"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (fieldErrors.color) setFieldErrors((prev) => ({ ...prev, color: '' }));
                  if (error) setError(null);
                }}
              />
              {fieldErrors.color && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.color}
                </span>
              )}
            </label>
          </div>

          <div className="auth-field-row">
            <label className="auth-label">
              Price (₹) *
              <input
                className={`auth-input ${fieldErrors.price ? 'has-error' : ''}`}
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value === '' ? '' : Number(e.target.value));
                  if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.price && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.price}
                </span>
              )}
            </label>
            <label className="auth-label">
              Stock Quantity *
              <input
                className={`auth-input ${fieldErrors.stock ? 'has-error' : ''}`}
                type="number"
                min="0"
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value === '' ? '' : Number(e.target.value));
                  if (fieldErrors.stock) setFieldErrors((prev) => ({ ...prev, stock: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.stock && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.stock}
                </span>
              )}
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
