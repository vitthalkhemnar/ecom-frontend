import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../api';
import type { Product } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((data) => {
        if (!cancelled) {
          setProducts(data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const visible = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="page">
      <div className="list-heading">
        <h1>All products</h1>
        {status === 'ready' && (
          <span className="result-count">{visible.length} of {products.length} items</span>
        )}
      </div>

      {status === 'ready' && categories.length > 1 && (
        <div className="chip-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {status === 'loading' && <p className="state-msg">Loading products…</p>}

      {status === 'error' && (
        <p className="state-msg error">
          Couldn't reach the product service at localhost:9091. Make sure it's running, then reload.
        </p>
      )}

      {status === 'ready' && visible.length === 0 && (
        <p className="state-msg">No products in this category yet.</p>
      )}

      {status === 'ready' && visible.length > 0 && (
        <div className="product-grid">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}