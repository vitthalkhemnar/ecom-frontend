import { Link } from 'react-router-dom';
import { formatINR } from '../api';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // const original = product.price;
  // const savings = product.price * (product.discount / 100);
  // const now = original - savings;
  const image = product.images.length > 0 ? product.images[0] : null;

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-media">
        {/* {product.discount > 0 && <span className="discount-tag">{product.discount}% OFF</span>} */}
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
          <span className="price-now">{formatINR(product.price)}</span>
          {/* {product.discount > 0 && <span className="price-was">{formatINR(original)}</span>} */}
        </div>
      </div>
    </Link>
  );
}