import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import VariantCard from '../components/VariantCard';
import { getProductById, getVariants, formatINR, cleanValue } from '../api';
import type { Product, Variant } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus('loading');
    setImageError(false);

    Promise.all([getProductById(id), getVariants(id)])
      .then(([productData, variantData]) => {
        if (cancelled) return;
        setProduct(productData || null);
        setVariants(variantData);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="page">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (status === 'error' || !product) {
    return (
      <div className="page">
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap" style={{ color: 'var(--rust)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="order-empty-title">Product not found</h2>
          <p className="order-empty-desc">The product you are looking for is currently unavailable or has been removed.</p>
          <Link to="/" className="order-cta-btn">
            Browse Catalog
          </Link>
        </div>
      </div>
    );
  }

  const attrEntries = Object.entries(product.attributes || {});
  const visibleAttrs = attrEntries.filter(([key, value]) => {
    const normKey = key.toLowerCase();
    if (normKey === 'sku' || normKey === 'product_code' || normKey === 'product_id' || normKey === 'id') {
      return false;
    }
    return Boolean(cleanValue(String(value)));
  });
  const hasMaterial = Boolean(cleanValue(product.material));
  const image = !imageError && product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div className="page">
      <div className="detail-grid">
        <div className="detail-media">
          {image ? (
            <img
              src={image}
              alt={product.productName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="media-placeholder">Image not available</span>
          )}
        </div>

        <div>
          <span className="detail-eyebrow">{product.category} · {product.subcategory}</span>
          <h1 className="detail-title">{product.productName}</h1>
          <div className="detail-brand">{product.brand}</div>

          <div className="detail-price-row">
            <span className="detail-price-now">{formatINR(product.price)}</span>
          </div>

          <p className="detail-desc">{product.description}</p>

          {(hasMaterial || visibleAttrs.length > 0) && (
            <dl className="attr-table">
              {hasMaterial && (
                <>
                  <dt>Material</dt>
                  <dd>{cleanValue(product.material)}</dd>
                </>
              )}
              {visibleAttrs.map(([key, value]) => (
                <span key={key} style={{ display: 'contents' }}>
                  <dt>{key.replaceAll('_', ' ')}</dt>
                  <dd>{String(value)}</dd>
                </span>
              ))}
            </dl>
          )}

          <h2 className="section-label" style={{ marginBottom: '14px' }}>Available variants</h2>

          {variants.length === 0 ? (
            <p className="state-msg">No variants listed for this product yet.</p>
          ) : (
            <div className="variant-list">
              {variants.map((variant) => (
                <VariantCard key={variant.variantId} variant={variant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
