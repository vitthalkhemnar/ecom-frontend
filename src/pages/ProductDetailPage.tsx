import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductVariantSelector from '../components/ProductVariantSelector';
import { getProductById, getVariants, formatINR, cleanValue } from '../api';
import type { Product, Variant } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
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
  
  // Display variant-specific image if available, else product image
  const variantImage = selectedVariant?.image ? cleanValue(selectedVariant.image) : null;
  const primaryImage = variantImage || (product.images && product.images.length > 0 ? product.images[0] : null);
  const image = !imageError && primaryImage ? primaryImage : null;
  const displayPrice = selectedVariant?.price ?? product.price;

  return (
    <div className="page">
      <div className="detail-grid">
        <div className="detail-media">
          {image ? (
            <img
              key={image}
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
            <span className="detail-price-now">{formatINR(displayPrice)}</span>
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

          <ProductVariantSelector
            product={product}
            variants={variants}
            onVariantChange={(variant) => {
              setSelectedVariant(variant);
              setImageError(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
