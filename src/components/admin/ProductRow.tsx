import { useState } from 'react';
import toast from 'react-hot-toast';
import { getVariants, updateVariant, deleteVariant } from '../../api';
import type { Product, Variant } from '../../types';

interface ProductRowProps {
  product: Product;
  token: string;
  onSave: (payload: Product) => Promise<void>;
  onDelete: (product: Product) => Promise<void>;
}

export default function ProductRow({ product, token, onSave, onDelete }: ProductRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoaded, setVariantsLoaded] = useState(false);

  // Editable variant state
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);

  // Editable product fields form state
  const [productName, setProductName] = useState(product.productName);
  const [brand, setBrand] = useState(product.brand);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price);
  const [saving, setSaving] = useState(false);

  async function handleToggleEdit() {
    if (!isEditing && !variantsLoaded) {
      setLoadingVariants(true);
      try {
        const data = await getVariants(product.id, token);
        setVariants(data);
        setVariantsLoaded(true);
      } catch {
        toast.error('Could not load variants for this product.');
      } finally {
        setLoadingVariants(false);
      }
    }
    setIsEditing(!isEditing);
    setEditingVariantId(null);
  }

  async function handleSaveClick() {
    setSaving(true);
    try {
      await onSave({
        ...product,
        productName,
        brand,
        category,
        price: Number(price),
      });
      setIsEditing(false);
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  }

  function startEditingVariant(v: Variant) {
    setEditingVariantId(v.variantId);
    setEditSku(v.sku);
    setEditSize(v.size || '');
    setEditColor(v.color || '');
    setEditPrice(v.price);
    setEditStock(v.stock);
  }

  async function handleSaveVariant(variantId: number) {
    try {
      const updated = await updateVariant(variantId, {
        size: editSize || null,
        color: editColor || null,
        price: Number(editPrice),
        stock: Number(editStock),
      }, token);
      setVariants((prev) => prev.map((v) => (v.variantId === variantId ? updated : v)));
      setEditingVariantId(null);
      toast.success('Variant updated successfully.');
    } catch {
      toast.error('Could not update variant.');
    }
  }

  async function handleDeleteVariant(variantId: number) {
    if (!window.confirm('Delete this variant? This cannot be undone.')) return;
    try {
      const success = await deleteVariant(variantId, token);
      if (success !== false) {
        setVariants((prev) => prev.filter((v) => v.variantId !== variantId));
        toast.success('Variant deleted.');
      } else {
        toast.error('Delete did not succeed.');
      }
    } catch {
      toast.error('Could not delete variant.');
    }
  }

  return (
    <div className={`admin-user-row ${isEditing ? 'editing' : ''}`}>
      <div className="admin-user-avatar" style={{ borderRadius: '4px', overflow: 'hidden' }}>
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{product.category?.[0] || 'P'}</span>
        )}
      </div>

      {!isEditing ? (
        <>
          <div className="admin-user-info">
            <div className="admin-user-name-line">
              <span className="admin-user-name">{product.productName}</span>
            </div>
            <div className="admin-user-contact">
              <span>{product.brand}</span>
              <span className="admin-user-dot">&bull;</span>
              <span>{product.category}</span>
              <span className="admin-user-dot">&bull;</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{product.productCode}</span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700 }}>
            ₹{product.price}
          </div>
          <div className="admin-row-actions">
            <button type="button" className="admin-edit-btn" onClick={handleToggleEdit}>
              Edit
            </button>
            <button type="button" className="admin-delete-btn" onClick={() => onDelete(product)}>
              Delete
            </button>
          </div>
        </>
      ) : (
        <div className="admin-user-edit-fields">
          <div className="admin-name-inputs">
            <input
              className="auth-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product Name"
            />
            <input
              className="auth-input"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand"
            />
          </div>
          <div className="admin-name-inputs">
            <input
              className="auth-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
            />
            <input
              className="auth-input"
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="Price"
            />
          </div>

          {/* On-demand loaded variant list with text input fields */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase' }}>
              Variants ({loadingVariants ? 'Loading...' : variants.length})
            </span>
            {loadingVariants ? (
              <p style={{ fontSize: '13px', color: 'var(--slate)', margin: '6px 0' }}>Loading variants...</p>
            ) : variants.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                {variants.map((v) => (
                  <div key={v.variantId} style={{ background: 'var(--sand)', padding: '8px 10px', borderRadius: '4px', fontSize: '13px' }}>
                    {editingVariantId === v.variantId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <input 
                            className="auth-input" 
                            value={editSku} 
                            disabled 
                            title="SKU cannot be changed"
                            style={{ padding: '4px 8px', fontSize: '12px', opacity: 0.7, cursor: 'not-allowed', flex: 1 }} 
                          />
                          <input 
                            className="auth-input" 
                            value={editSize} 
                            onChange={(e) => setEditSize(e.target.value)} 
                            placeholder="Size" 
                            style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }} 
                          />
                          <input 
                            className="auth-input" 
                            value={editColor} 
                            onChange={(e) => setEditColor(e.target.value)} 
                            placeholder="Color" 
                            style={{ padding: '4px 8px', fontSize: '12px', flex: 1 }} 
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input className="auth-input" type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} placeholder="Price" style={{ padding: '4px 8px', fontSize: '12px' }} />
                          <input className="auth-input" type="number" value={editStock} onChange={(e) => setEditStock(Number(e.target.value))} placeholder="Stock" style={{ padding: '4px 8px', fontSize: '12px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button type="button" className="admin-save-btn" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => handleSaveVariant(v.variantId)}>Save Variant</button>
                          <button type="button" className="admin-cancel-btn" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => setEditingVariantId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
                        <span>SKU: {v.sku} | Size: {v.size || 'N/A'} | Color: {v.color || 'N/A'} | <strong>₹{v.price}</strong> (Stock: {v.stock})</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" className="admin-edit-btn" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => startEditingVariant(v)}>Edit</button>
                          <button type="button" className="admin-delete-btn" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => handleDeleteVariant(v.variantId)}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--slate)', margin: '6px 0' }}>No variants found.</p>
            )}
          </div>

          <div className="admin-row-actions" style={{ marginTop: '12px' }}>
            <button 
              type="button" 
              className="admin-save-btn" 
              onClick={handleSaveClick} 
              disabled={saving || editingVariantId !== null}
              style={{ opacity: (saving || editingVariantId !== null) ? 0.5 : 1, cursor: (saving || editingVariantId !== null) ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
            <button type="button" className="admin-cancel-btn" onClick={handleToggleEdit}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}