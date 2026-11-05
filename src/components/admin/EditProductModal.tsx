import { useState } from 'react';
import type { Product } from '../../types';
import { getErrorMessage, ApiError } from '../../api';

interface EditProductModalProps {
  product: Product;
  onSave: (payload: Product) => Promise<void>;
  onClose: () => void;
}

export default function EditProductModal({ product, onSave, onClose }: EditProductModalProps) {
  const [productName, setProductName] = useState(product.productName || '');
  const [brand, setBrand] = useState(product.brand || '');
  const [category, setCategory] = useState(product.category || '');
  const [subcategory, setSubcategory] = useState(product.subcategory || '');
  const [material, setMaterial] = useState(product.material || '');
  const [price, setPrice] = useState<number | ''>(product.price ?? '');
  const [discount, setDiscount] = useState<number | ''>(product.discount ?? 0);
  const [description, setDescription] = useState(product.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!productName.trim()) {
      errs.productName = 'Product name is required.';
    } else if (productName.trim().length < 3) {
      errs.productName = 'Product name must be at least 3 characters.';
    }

    if (!brand.trim()) {
      errs.brand = 'Brand name is required.';
    }

    if (!category.trim()) {
      errs.category = 'Category is required.';
    }

    if (price === '' || isNaN(Number(price))) {
      errs.price = 'Price is required.';
    } else if (Number(price) <= 0) {
      errs.price = 'Price must be greater than 0.';
    }

    if (discount !== '' && !isNaN(Number(discount))) {
      if (Number(discount) < 0) {
        errs.discount = 'Discount cannot be negative.';
      } else if (price !== '' && Number(discount) >= Number(price)) {
        errs.discount = 'Discount cannot be greater than or equal to price.';
      }
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
        ...product,
        productName: productName.trim(),
        brand: brand.trim(),
        category: category.trim(),
        subcategory: subcategory.trim() || '',
        material: material.trim() || '',
        price: Number(price),
        discount: discount !== '' ? Number(discount) : 0,
        description: description.trim() || '',
      });
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Could not update that product.');
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
      <div className="modal-card modal-card-wide modal-card-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Product</h2>
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
              <label className="auth-label">
                Product Code
                <input className="auth-input" value={product.productCode} disabled style={{ background: 'var(--sand, #f8f8f8)', cursor: 'not-allowed' }} />
              </label>

              <label className="auth-label">
                Product Name *
                <input
                  className={`auth-input ${fieldErrors.productName ? 'has-error' : ''}`}
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    if (fieldErrors.productName) setFieldErrors((prev) => ({ ...prev, productName: '' }));
                    if (error) setError(null);
                  }}
                  required
                />
                {fieldErrors.productName && (
                  <span className="field-error-msg">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {fieldErrors.productName}
                  </span>
                )}
              </label>

              <div className="auth-field-row">
                <label className="auth-label">
                  Brand *
                  <input
                    className={`auth-input ${fieldErrors.brand ? 'has-error' : ''}`}
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      if (fieldErrors.brand) setFieldErrors((prev) => ({ ...prev, brand: '' }));
                      if (error) setError(null);
                    }}
                    required
                  />
                  {fieldErrors.brand && (
                    <span className="field-error-msg">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {fieldErrors.brand}
                    </span>
                  )}
                </label>

                <label className="auth-label">
                  Category *
                  <input
                    className={`auth-input ${fieldErrors.category ? 'has-error' : ''}`}
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: '' }));
                      if (error) setError(null);
                    }}
                    required
                  />
                  {fieldErrors.category && (
                    <span className="field-error-msg">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {fieldErrors.category}
                    </span>
                  )}
                </label>
              </div>

              <div className="auth-field-row">
                <label className="auth-label">
                  Subcategory
                  <input
                    className="auth-input"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                  />
                </label>

                <label className="auth-label">
                  Material
                  <input
                    className="auth-input"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
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
                    inputMode="decimal"
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
                  Discount Amount (₹)
                  <input
                    className={`auth-input ${fieldErrors.discount ? 'has-error' : ''}`}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => {
                      setDiscount(e.target.value === '' ? '' : Number(e.target.value));
                      if (fieldErrors.discount) setFieldErrors((prev) => ({ ...prev, discount: '' }));
                      if (error) setError(null);
                    }}
                  />
                  {fieldErrors.discount && (
                    <span className="field-error-msg">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {fieldErrors.discount}
                    </span>
                  )}
                </label>
              </div>

              <label className="auth-label">
                Description
                <textarea
                  className="auth-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
            </div>
          </div>

          <div className="modal-actions modal-footer">
            <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
