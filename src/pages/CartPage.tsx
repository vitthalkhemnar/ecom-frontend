import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProducts, getVariants, formatINR } from '../api';
import type { CreateOrderItem, Product, Variant } from '../types';

export default function CartPage() {
  const { items, totalPrice, refreshCart, addItem, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, Variant[]>>({});
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [checkoutError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));
    const missing = uniqueProductIds.filter((id) => !(id in variantsByProduct));
    if (missing.length === 0) return;

    Promise.all(missing.map((id) => getVariants(id).then((v) => [id, v] as const)))
      .then((results) => {
        setVariantsByProduct((prev) => {
          const next = { ...prev };
          for (const [id, v] of results) next[id] = v;
          return next;
        });
      })
      .catch(() => {});
  }, [items, variantsByProduct]);

  function findProduct(productId: string): Product | undefined {
    return products.find((p) => String(p.id) === productId);
  }

  function findVariant(productId: string, variantId: string): Variant | undefined {
    return variantsByProduct[productId]?.find((v) => String(v.variantId) === variantId);
  }

  function getOrderItems() : CreateOrderItem[] {
    const orderItems: CreateOrderItem[] = items.map((item) => {
       const product = findProduct(item.productId);
       const variant = findVariant(item.productId, item.variantId);
       return {
         productId: item.productId,
         variantId: item.variantId,
         productName: product?.productName ?? `Product #${item.productId}`,
         size: variant?.size ?? '',
         color: variant?.color ?? '',
         quantity: String(item.quantity),
         priceAtBooking: String(item.price),
       };
     });
     return orderItems;
  }

  async function handleIncrease(productId: string, variantId: string, price: number) {
    const key = `${productId}-${variantId}`;
    setUpdatingKey(key);
    try {
      await addItem({ productId, variantId, price, quantity: 1 });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleDecrease(productId: string, variantId: string, price: number) {
    const key = `${productId}-${variantId}`;
    setUpdatingKey(key);
    try {
      await removeItem({ productId, variantId, price, quantity: 1 });
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <div className="page">
      <h1 className="detail-title">Your cart</h1>
      {items.length === 0 ? (
        <div className="order-empty-state" style={{ margin: '40px auto' }}>
          <div className="order-empty-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2 className="order-empty-title">Your cart is empty</h2>
          <p className="order-empty-desc">
            Explore our collection and find products you'll love.
          </p>
          <Link to="/" className="order-cta-btn">
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map((item) => {
              const key = `${item.productId}-${item.variantId}`;
              const product = findProduct(item.productId);
              const variant = findVariant(item.productId, item.variantId);
              const image = product?.images && product.images.length > 0 ? product.images[0] : null;

              return (
                <div className="cart-row" key={key}>
                  <Link to={`/product/${item.productId}`} className="cart-row-link">
                    <div className="cart-row-media">
                      {image ? (
                        <img src={image} alt={product?.productName ?? ''} />
                      ) : (
                        <span className="media-placeholder">
                          {product?.subcategory || product?.category || 'Item'}
                        </span>
                      )}
                    </div>

                    <div className="cart-row-info">
                      <span className="cart-row-eyebrow">
                        {product ? `${product.category} · ${product.subcategory}` : `Product #${item.productId}`}
                      </span>
                      <span className="cart-row-name">
                        {product ? product.productName : `Product #${item.productId}`}
                      </span>
                      {product && <span className="cart-row-brand">{product.brand}</span>}
                      <span className="cart-row-variant">
                        {variant ? (variant.color || 'Standard') : 'Variant'}
                        {variant?.size ? ` · ${variant.size}` : ''}
                        {variant ? ` · ${variant.sku}` : ''}
                      </span>
                    </div>
                  </Link>

                  <div className="cart-row-side">
                    <span className="cart-row-unit-price">{formatINR(item.price)} each</span>
                    <span className="cart-row-line-total">{formatINR(item.price * item.quantity)}</span>
                    <div className="qty-stepper">
                      <button
                        type="button"
                        onClick={() => handleDecrease(item.productId, item.variantId, item.price)}
                        disabled={updatingKey === key}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleIncrease(item.productId, item.variantId, item.price)}
                        disabled={updatingKey === key}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cart-total">
            <span>Total</span>
            <span>{formatINR(totalPrice)}</span>
          </div>
          {checkoutError && <p className="auth-error">{checkoutError}</p>}
          <button type="button" className="checkout-btn" 
            onClick={() => navigate('/checkout', { state: { orderItems: getOrderItems()}})} disabled={items.length === 0}>
            Proceed to checkout
          </button>
        </>
      )}
    </div>
  );
}