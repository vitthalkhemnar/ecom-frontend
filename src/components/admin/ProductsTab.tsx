import { useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getProducts, uploadProducts, updateProduct, deleteProduct } from '../../api';
import EditProductModal from './EditProductModal';
import VariantsModal from './VariantsModal';
import type { Product } from '../../types';
import Pagination from './Pagination';

type Status = 'loading' | 'ready' | 'error';
type SortKey = 'name' | 'brand' | 'price';

const PAGE_SIZE = 10;

export default function ProductsTab() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(0);

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

  useEffect(() => {
    setPage(0);
  }, [search, sortKey]);

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
    }).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }, [products, search, sortKey, page]);

  const totalPages = useMemo(() => {
    const term = search.trim().toLowerCase();
    const count = term
      ? products.filter((p) => `${p.productName} ${p.brand} ${p.category} ${p.productCode}`.toLowerCase().includes(term)).length
      : products.length;
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [products, search]);

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

  async function handleVariantsEmptied() {
    if (!token) return;
    try {
      const data = await getProducts(token);
      setProducts(data);
    } catch {
      toast.error('Product list may be out of date — refresh to see the latest.');
    }
  }

  if (status === 'loading') return <p className="state-msg">Loading products…</p>;
  if (status === 'error') return <p className="state-msg error">Couldn't load products.</p>;

  return (
    <div style={{ position: 'relative' }}>
      {uploading && (
        <div className="upload-overlay">
          <div className="upload-spinner" />
          <div className="upload-title">Uploading and processing products...</div>
          <div className="upload-subtitle">Please do not refresh or leave the site.</div>
        </div>
      )}

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

      {visibleProducts.length === 0 ? (
        <p className="state-msg">No products match "{search}".</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="admin-thumb">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.productName} />
                    ) : (
                      <span>{product.category?.[0] || 'P'}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div>{product.productName}</div>
                  <div className="admin-cell-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {product.productCode}
                  </div>
                </td>
                <td className="admin-cell-muted">{product.brand}</td>
                <td className="admin-cell-muted">{product.category}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{product.price}</td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-edit-btn" onClick={() => setVariantsProduct(product)}>
                      Variants
                    </button>
                    <button type="button" className="admin-edit-btn" onClick={() => setEditingProduct(product)}>
                      Edit
                    </button>
                    <button type="button" className="admin-delete-btn" onClick={() => handleDelete(product)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {editingProduct && (
        <EditProductModal product={editingProduct} onSave={handleSave} onClose={() => setEditingProduct(null)} />
      )}

      {variantsProduct && token && (
        <VariantsModal
          product={variantsProduct}
          token={token}
          onClose={() => setVariantsProduct(null)}
          onVariantsEmptied={handleVariantsEmptied}
        />
      )}
    </div>
  );
}