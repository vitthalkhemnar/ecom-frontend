import { useState } from 'react';
import type { Variant } from '../../types';
import { getErrorMessage, ApiError, cleanValue } from '../../api';

interface EditVariantModalProps {
  variant: Variant;
  onSave: (payload: Partial<Variant>) => Promise<void>;
  onClose: () => void;
}

export default function EditVariantModal({ variant, onSave, onClose }: EditVariantModalProps) {
  const [size, setSize] = useState(cleanValue(variant.size));
  const [color, setColor] = useState(cleanValue(variant.color));
  const [price, setPrice] = useState<number | ''>(variant.price ?? '');
  const [stock, setStock] = useState<number | ''>(variant.stock ?? '');
  const [active, setActive] = useState(variant.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    const cleanS = cleanValue(size);
    const cleanC = cleanValue(color);
    if (!cleanS && !cleanC) {
      errs.size = 'Either Size or Color must be provided.';
      errs.color = 'Either Size or Color must be provided.';
    }

    if (price === '' || isNaN(Number(price))) {
      errs.price = 'Price is required.';
    } else if (Number(price) <= 0) {
      errs.price = 'Price must be greater than 0.';
    }

    if (stock === '' || isNaN(Number(stock))) {
      errs.stock = 'Stock is required.';
    } else if (Number(stock) < 0) {
      errs.stock = 'Stock cannot be negative.';
    }

    return errs;
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
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
        variantId: variant.variantId,
        size: cleanValue(size) || null,
        color: cleanValue(color) || null,
        price: Number(price),
        stock: Number(stock),
        active,
      });
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Could not update variant.');
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
      <div className="modal-card modal-card-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Variant</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--slate)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-form-flex" noValidate>
          <div className="modal-body">
            {error && (
              <div className="modal-form-error" style={{ marginBottom: '16px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="modal-fields">
              <div className="auth-field-row">
                <label className="auth-label">
                  Size
                  <input
                    className={`auth-input ${fieldErrors.size ? 'has-error' : ''}`}
                    value={size}
                    placeholder="e.g. M, L, 42"
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
                    value={color}
                    placeholder="e.g. Navy Blue"
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
                  Price (₹)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className={`auth-input ${fieldErrors.price ? 'has-error' : ''}`}
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
                      if (error) setError(null);
                    }}
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
                  Stock Quantity
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={`auth-input ${fieldErrors.stock ? 'has-error' : ''}`}
                    value={stock}
                    onChange={(e) => {
                      setStock(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.stock) setFieldErrors((prev) => ({ ...prev, stock: '' }));
                      if (error) setError(null);
                    }}
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

              <label className="auth-label auth-checkbox-label" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px', width: 'fit-content' }}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', margin: 0, flexShrink: 0 }}
                />
                <span>Active (available for purchase)</span>
              </label>
            </div>
          </div>

          <div className="modal-actions modal-footer">
            <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
