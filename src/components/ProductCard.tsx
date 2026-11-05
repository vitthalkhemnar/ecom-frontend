import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatINR, parseProductImages } from '../api';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const images = parseProductImages(product.images);
  const image = !imageError && images.length > 0 ? images[0] : null;

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-media">
        {image ? (
          <img
            src={image}
            alt={product.productName}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="media-placeholder">Image not available</span>
        )}
      </div>
      <div className="product-body">
        <span className="product-eyebrow">{product.category}</span>
        <h3 className="product-name">{product.productName}</h3>
        <span className="product-brand">{product.brand}</span>
        <div className="price-row">
          <span className="price-now">{formatINR(product.price)}</span>
        </div>
      </div>
    </Link>
  );
}
