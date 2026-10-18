import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from '../context/SearchContext';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../api';
import type { Product } from '../types';
import { getCategoryIcon } from '../constants/CategoryIcons';

type Status = 'loading' | 'ready' | 'error';
const BATCH_SIZE = 12;

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>();
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const { searchTerm } = useSearch();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getProducts()
      .then((data) => {
        if (!cancelled) {
          setProducts(data || []);
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

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchesSearch = !term || `${p.productName} ${p.brand} ${p.category}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + BATCH_SIZE, filtered.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="page">
      {categories.length > 1 && (
        <div className="chip-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat !== 'All' && <span className="chip-icon">{getCategoryIcon(cat)}</span>}
              {cat}
            </button>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      )}

      {status === 'error' && (
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap" style={{ color: 'var(--rust)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="order-empty-title">Unable to load products</h2>
          <p className="order-empty-desc">
            Something went wrong while loading the catalog. Please try refreshing.
          </p>
          <button
            type="button"
            className="order-cta-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h2 className="order-empty-title">No products found</h2>
          <p className="order-empty-desc">
            We couldn't find any items matching your criteria. Try searching with different keywords or browse other categories.
          </p>
        </div>
      )}

      {status === 'ready' && filtered.length > 0 && (
        <>
          <div className="product-grid">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
          {visibleCount < filtered.length && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div className="loading-spinner" style={{ margin: '0 auto', width: '28px', height: '28px' }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}