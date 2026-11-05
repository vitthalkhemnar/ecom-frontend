import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductVariantSelector from '../components/ProductVariantSelector';
import {
  getProductById,
  getVariants,
  formatINR,
  cleanValue,
  getValidImageUrl,
  parseProductImages,
} from '../api';
import type { Product, Variant } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus('loading');
    setFailedUrls(new Set());
    setSelectedImageUrl(null);
    setSelectedVariant(null);

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

  const handleVariantChange = useCallback((variant: Variant | null) => {
    setSelectedVariant((prev) => {
      if (prev?.variantId === variant?.variantId) return prev;
      return variant;
    });
    const vImg = getValidImageUrl(variant?.image);
    if (vImg) {
      setSelectedImageUrl(vImg);
    }
  }, []);

  const handleImageError = useCallback((url: string) => {
    setFailedUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  // Candidate images: variant image (if present) followed by product images
  const allImages = useMemo(() => {
    const list: string[] = [];
    const variantImg = getValidImageUrl(selectedVariant?.image);
    if (variantImg && !list.includes(variantImg)) {
      list.push(variantImg);
    }
    const prodImages = parseProductImages(product?.images);
    for (const img of prodImages) {
      if (!list.includes(img)) {
        list.push(img);
      }
    }
    return list;
  }, [selectedVariant?.image, product?.images]);

  // Active image: user-selected image if valid & not failed, otherwise first non-failed candidate
  const activeImage = useMemo(() => {
    if (
      selectedImageUrl &&
      !failedUrls.has(selectedImageUrl) &&
      allImages.includes(selectedImageUrl)
    ) {
      return selectedImageUrl;
    }
    return allImages.find((url) => !failedUrls.has(url)) || null;
  }, [selectedImageUrl, failedUrls, allImages]);

  const validGalleryImages = useMemo(() => {
    return allImages.filter((url) => !failedUrls.has(url));
  }, [allImages, failedUrls]);

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
  const displayPrice = selectedVariant?.price ?? product.price;

  return (
    <div className="page">
      <div className="detail-grid">
        <div className="detail-media-container">
          <div className="detail-media">
            {activeImage ? (
              <img
                key={activeImage}
                src={activeImage}
                alt={product.productName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => handleImageError(activeImage)}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '24px',
                  color: 'var(--slate)',
                  width: '100%',
                  height: '100%',
                }}
              >
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.4 }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="media-placeholder" style={{ margin: 0 }}>
                  Image not available
                </span>
              </div>
            )}
          </div>

          {validGalleryImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
                overflowX: 'auto',
                paddingBottom: '4px',
              }}
              role="tablist"
              aria-label="Product image gallery"
            >
              {validGalleryImages.map((url, idx) => {
                const isSelected = activeImage === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSelectedImageUrl(url)}
                    style={{
                      width: '64px',
                      height: '64px',
                      padding: 0,
                      border: isSelected ? '2px solid var(--mango-deep)' : '1px solid var(--line)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: 'var(--paper)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      opacity: isSelected ? 1 : 0.7,
                      transition: 'opacity 0.15s ease, border-color 0.15s ease',
                    }}
                    aria-label={`View image ${idx + 1}`}
                    aria-selected={isSelected}
                  >
                    <img
                      src={url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => handleImageError(url)}
                    />
                  </button>
                );
              })}
            </div>
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
            onVariantChange={handleVariantChange}
          />
        </div>
      </div>
    </div>
  );
}
