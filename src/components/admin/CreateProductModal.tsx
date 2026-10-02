import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CreateProductRequest, Product } from '../../types';

interface CreateProductModalProps {
  onCreate: (payload: CreateProductRequest) => Promise<Product>;
  onClose: () => void;
}

const CATEGORIES = [
  'Clothing',
  'Footwear',
  'Electronics',
  'Home & Kitchen',
  'Beauty & Personal Care',
  'Sports & Fitness',
  'Books',
];

export default function CreateProductModal({ onCreate, onClose }: CreateProductModalProps) {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [productCode, setProductCode] = useState('');
  const [material, setMaterial] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error('Product name is required.');
      return;
    }
    if (!brand.trim()) {
      toast.error('Brand is required.');
      return;
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      toast.error('Please enter a valid price.');
      return;
    }

    setSaving(true);
    try {
      const images = imageUrl.trim()
        ? imageUrl.split(',').map((url) => url.trim()).filter(Boolean)
        : [];

      await onCreate({
        productName: productName.trim(),
        brand: brand.trim(),
        category: category.trim(),
        subcategory: subcategory.trim() || undefined,
        price: Number(price),
        discount: discount !== '' ? Number(discount) : 0,
        productCode: productCode.trim() || undefined,
        material: material.trim() || undefined,
        description: description.trim() || undefined,
        images,
        attributes: {},
        status: 'ACTIVE',
      });
      onClose();
    } catch {
      // Error handling already reported in parent handler
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="modal-title">Create New Product</h2>

        <form onSubmit={handleSubmit} className="modal-fields">
          <label className="auth-label">
            Product Name *
            <input
              className="auth-input"
              placeholder="e.g. Allen Solly Men's Slim Fit Polo T-Shirt"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </label>

          <div className="auth-field-row">
            <label className="auth-label">
              Brand *
              <input
                className="auth-input"
                placeholder="e.g. Allen Solly"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
            </label>

            <label className="auth-label">
              Category *
              <select
                className="auth-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="auth-field-row">
            <label className="auth-label">
              Subcategory
              <input
                className="auth-input"
                placeholder="e.g. T-Shirt, Sneaker, Smartphone"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              />
            </label>

            <label className="auth-label">
              Material
              <input
                className="auth-input"
                placeholder="e.g. Cotton, Leather, Polyester"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
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
                placeholder="e.g. 1299"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </label>

            <label className="auth-label">
              Discount Amount (₹)
              <input
                className="auth-input"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 400"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
          </div>

          <label className="auth-label">
            Product Code (Optional)
            <input
              className="auth-input"
              placeholder="Leave empty to auto-generate (e.g. CLO-TSH-ALS-1001)"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
            />
          </label>

          <label className="auth-label">
            Image URL(s)
            <input
              className="auth-input"
              placeholder="https://... (comma-separate multiple URLs)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </label>

          <label className="auth-label">
            Description
            <textarea
              className="auth-input"
              rows={3}
              placeholder="Enter product details, specifications, and styling notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
