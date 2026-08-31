import { useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getProducts, uploadProducts, updateProduct, deleteProduct } from '../../api';
import ProductRow from './ProductRow';
import type { Product } from '../../types';

type Status = 'loading' | 'ready' | 'error';
type SortKey = 'name' | 'brand' | 'price';

export default function ProductsTab() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const data = await getProducts(token);
      setProducts(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? products.filter((p) =>
          `${p.productName} ${p.brand} ${p.category} ${p.productCode}`.toLowerCase().includes(term)
        )
      : products;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return a.productName.localeCompare(b.productName);
      if (sortKey === 'brand') return a.brand.localeCompare(b.brand);
      return a.price - b.price;
    });
  }, [products, search, sortKey]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !file) return;

    setUploading(true);
    try {
      const responseText = await uploadProducts(file, token);
      toast.success(responseText || 'Products Imported Successfully.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload products.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(payload: Product) {
    if (!token) return;
    try {
      const updated = await updateProduct(payload, token);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`Updated ${updated.productName}`);
    } catch {
      toast.error('Could not update that product.');
      throw new Error('update failed');
    }
  }

  async function handleDelete(product: Product) {
    if (!token) return;
    if (!window.confirm(`Delete ${product.productName}? This can't be undone.`)) return;
    try {
      const success = await deleteProduct(product.id, token);
      if (success !== false) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        toast.success(`Deleted ${product.productName}`);
      } else {
        toast.error('Delete did not succeed.');
      }
    } catch {
      toast.error('Could not delete that product.');
    }
  }

  if (status === 'loading') return <p className="state-msg">Loading products…</p>;
  if (status === 'error') return <p className="state-msg error">Couldn't load products.</p>;

  return (
    <div style={{ position: 'relative' }}>
      {/* Full-Screen Blocking Loader Overlay using index.css classes */}
      {uploading && (
        <div className="upload-overlay">
          <div className="upload-spinner" />
          <div className="upload-title">
            Uploading and processing products...
          </div>
          <div className="upload-subtitle">
            Please do not refresh or leave the site.
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Section */}
      <div className="auth-card" style={{ maxWidth: '100%', margin: '0 0 24px 0', padding: '20px' }}>
        <h3 className="section-label" style={{ paddingTop: 0, borderTop: 'none', fontSize: '17px', marginBottom: '8px' }}>
          Bulk Product Upload (CSV)
        </h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files && setFile(e.target.files[0])}
              className="auth-input"
              style={{ flex: 1, padding: '8px', background: 'var(--sand)' }}
            />
            <button
              type="submit"
              className="auth-submit"
              disabled={!file || uploading}
              style={{ width: 'auto', padding: '10px 20px', margin: 0 }}
            >
              Upload CSV
            </button>
          </div>
          {file && (
            <div style={{ fontSize: '12.5px', color: 'var(--slate)' }}>
              Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </form>
      </div>

      {/* Controls: Search & Sort */}
      <div className="admin-controls">
        <input
          className="auth-input admin-search"
          placeholder="Search by product name, brand, category, code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="name">Sort by name</option>
          <option value="brand">Sort by brand</option>
          <option value="price">Sort by price</option>
        </select>
      </div>

      {/* Product List View */}
      {visibleProducts.length === 0 ? (
        <p className="state-msg">No products match "{search}".</p>
      ) : (
        <div className="admin-user-list">
          {visibleProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              token={token!}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}