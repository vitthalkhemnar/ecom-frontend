import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import VariantCard from '../components/VariantCard';
import { getProducts, getVariants, formatINR } from '../api';
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

    Promise.all([getProducts(), getVariants(id)])
      .then(([products, variantData]) => {
        if (cancelled) return;
        const match = products.find((p) => String(p.id) === String(id));
        setProduct(match || null);
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
        <p className="state-msg">Loading product…</p>
      </div>
    );
  }

  if (status === 'error' || !product) {
    return (
      <div className="page">
        <Link to="/" className="back-link">← Back to all products</Link>
        <p className="state-msg error">
          Couldn't load this product. Check that the product and variant services at
          localhost:9091 are running, then try again.
        </p>
      </div>
    );
  }

  const original = product.price;
  const now = product.price - product.discount;
  const savings = product.discount;
  const attrEntries = Object.entries(product.attributes);
  const image = product.images.length > 0 ? product.images[0] : null;

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to all products</Link>

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
            <span className="detail-price-now">{formatINR(now)}</span>
            {savings > 0 && <span className="detail-price-was">{formatINR(original)}</span>}
          </div>
          {savings > 0 && (
            <div className="detail-savings">You save {formatINR(savings)}</div>
          )}

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
                <>
                  <dt key={`${key}-label`}>{key.replaceAll('_', ' ')}</dt>
                  <dd key={`${key}-value`}>{String(value)}</dd>
                </>
              ))}
            </dl>
          )}

          <h2 className="section-label">Available variants</h2>
          <p className="section-sub">
            {variants.length} variant{variants.length !== 1 ? 's' : ''} for this product
          </p>

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