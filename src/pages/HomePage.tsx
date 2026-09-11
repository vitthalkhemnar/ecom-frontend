import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import ProductCard from '../components/ProductCard';
import LoginPromptModal from '../components/LoginPromptModal';
import LocationBadge from '../components/LocationBadge';
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
  const [promptDismissed, setPromptDismissed] = useState(false);
  const { token, isAuthenticated } = useAuth();
  const { searchTerm } = useSearch();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getProducts(token!)
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
  }, [token]);

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
      <LocationBadge />

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

      {status === 'loading' && <p className="state-msg">Loading products…</p>}
      {status === 'error' && (
        <p className="state-msg error">Couldn't reach the product service. Make sure it's running, then reload.</p>
      )}
      {status === 'ready' && filtered.length === 0 && <p className="state-msg">No products match your search.</p>}

      {status === 'ready' && filtered.length > 0 && (
        <>
          <div className="product-grid">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
          {visibleCount < filtered.length && (
            <p className="state-msg" style={{ padding: '20px 0' }}>Loading more…</p>
          )}
        </>
      )}

      {!isAuthenticated && !promptDismissed && (
        <LoginPromptModal onClose={() => setPromptDismissed(true)} />
      )}
    </div>
  );
}