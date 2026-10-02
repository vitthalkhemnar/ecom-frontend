import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getVariants, updateVariant, deleteVariant, createVariant } from '../../api';
import EditVariantModal from './EditVariantModal';
import AddVariantModal from './AddVariantModal';
import type { Product, Variant, CreateVariantRequest } from '../../types';

interface VariantsModalProps {
  product: Product;
  onClose: () => void;
  onVariantsEmptied: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export default function VariantsModal({ product, onClose, onVariantsEmptied }: VariantsModalProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [addingVariant, setAddingVariant] = useState(false);

  useEffect(() => {
    getVariants(product.id)
      .then((data) => {
        setVariants(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [product.id]);

  async function handleCreateVariant(payload: CreateVariantRequest) {
    try {
      const created = await createVariant(payload);
      setVariants((prev) => [...prev, created]);
      toast.success('Variant added successfully.');
      return created;
    } catch (err: any) {
      toast.error(err.message || 'Could not add variant.');
      throw err;
    }
  }

  async function handleSaveVariant(payload: Partial<Variant>) {
    try {
      const updated = await updateVariant(payload);
      setVariants((prev) => prev.map((v) => (v.variantId === updated.variantId ? updated : v)));
      toast.success('Variant updated.');
    } catch {
      toast.error('Could not update variant.');
      throw new Error('update failed');
    }
  }

  async function handleDeleteVariant(variantId: number) {
    if (!window.confirm('Delete this variant? This cannot be undone.')) return;
    try {
      const success = await deleteVariant(variantId);
      if (success !== false) {
        const remaining = variants.filter((v) => v.variantId !== variantId);
        setVariants(remaining);
        toast.success('Variant deleted.');

        if (remaining.length === 0) {
          toast.success('Product removed — no variants left.');
          onVariantsEmptied();
          onClose();
        }
      } else {
        toast.error('Delete did not succeed.');
      }
    } catch {
      toast.error('Could not delete variant.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Variants — {product.productName}</h2>
          <button
            type="button"
            className="auth-submit"
            style={{ width: 'auto', margin: 0, padding: '8px 16px', fontSize: '13px' }}
            onClick={() => setAddingVariant(true)}
          >
            + Add Variant
          </button>
        </div>

        {status === 'loading' && <p className="state-msg">Loading variants…</p>}
        {status === 'error' && <p className="state-msg error">Couldn't load variants.</p>}

        {status === 'ready' && variants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p className="state-msg" style={{ margin: '0 0 12px 0' }}>No variants for this product yet.</p>
            <button
              type="button"
              className="auth-submit"
              style={{ width: 'auto', display: 'inline-block', margin: '0 auto', padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setAddingVariant(true)}
            >
              Create First Variant
            </button>
          </div>
        )}

        {status === 'ready' && variants.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Size</th>
                <th>Color</th>
                <th>Price</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.variantId}>
                  <td className="admin-cell-muted">{v.sku}</td>
                  <td>{v.size || '—'}</td>
                  <td>{v.color || '—'}</td>
                  <td>₹{v.price}</td>
                  <td>{v.stock}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" className="admin-edit-btn" onClick={() => setEditingVariant(v)}>
                        Edit
                      </button>
                      <button type="button" className="admin-delete-btn" onClick={() => handleDeleteVariant(v.variantId)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {editingVariant && (
        <EditVariantModal
          variant={editingVariant}
          onSave={handleSaveVariant}
          onClose={() => setEditingVariant(null)}
        />
      )}

      {addingVariant && (
        <AddVariantModal
          product={product}
          onSave={handleCreateVariant}
          onClose={() => setAddingVariant(false)}
        />
      )}
    </div>
  );
}