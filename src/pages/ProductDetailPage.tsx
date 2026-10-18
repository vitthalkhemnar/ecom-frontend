import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import VariantCard from '../components/VariantCard';
import { getProductById, getVariants, formatINR } from '../api';
import type { Product, Variant } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus('loading');

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

  // const original = product.price;
  // const savings = product.price * (product.discount / 100);
  // const now = original - savings;
  const attrEntries = Object.entries(product.attributes || {});
  const image = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div className="page">
      <div className="detail-grid">
        <div className="detail-media">
          {image ? (
            <img src={image} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="media-placeholder">{product.subcategory || product.category}</span>
          )}
        </div>

        <div>
          <span className="detail-eyebrow">{product.category} · {product.subcategory}</span>
          <h1 className="detail-title">{product.productName}</h1>
          <div className="detail-brand">{product.brand} · {product.productCode}</div>

          <div className="detail-price-row">
            <span className="detail-price-now">{formatINR(product.price)}</span>
            {/* {savings > 0 && <span className="detail-price-was">{formatINR(original)}</span>} */}
          </div>
          {/* {savings > 0 && (
            <div className="detail-savings">You save {formatINR(savings)}</div>
          )} */}

          <p className="detail-desc">{product.description}</p>

          {attrEntries.length > 0 && (
            <dl className="attr-table">
              {product.material && (
                <>
                  <dt>Material</dt>
                  <dd>{product.material}</dd>
                </>
              )}
              {attrEntries.map(([key, value]) => (
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