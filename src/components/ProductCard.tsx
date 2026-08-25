import { Link } from 'react-router-dom';
import { formatINR } from '../api';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const original = product.price;
  const now = product.price - product.discount;
  const pctOff = original > 0 ? Math.round((product.discount / original) * 100) : 0;
  const image = product.images.length > 0 ? product.images[0] : null;

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-media">
        {pctOff > 0 && <span className="discount-tag">{pctOff}% OFF</span>}
        {image ? (
          <img src={image} alt={product.productName} loading="lazy" />
        ) : (
          <span className="media-placeholder">{product.subcategory || product.category}</span>
        )}
      </div>
      <div className="product-body">
        <span className="product-eyebrow">{product.category}</span>
        <h3 className="product-name">{product.productName}</h3>
        <span className="product-brand">{product.brand}</span>
        <div className="price-row">
          <span className="price-now">{formatINR(now)}</span>
          {product.discount > 0 && <span className="price-was">{formatINR(original)}</span>}
        </div>
      </div>
    </Link>
  );
}