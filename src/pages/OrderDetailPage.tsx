import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderById, getAllAddress, getUserDetails, formatINR, cleanValue } from '../api';
import type { Order, AddressResponse, User } from '../types';

type Status = 'loading' | 'ready' | 'error';

function formatOrderDate(dateVal?: string | null): string {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(dateVal);
  }
}

function OrderItemThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <span style={{ fontSize: '9.5px', color: 'var(--slate)', fontWeight: 600, textAlign: 'center', lineHeight: 1.15, padding: '4px' }}>
        Image not available
      </span>
    );
  }
  return <img src={src} alt={alt} onError={() => setError(true)} />;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [fallbackAddress, setFallbackAddress] = useState<AddressResponse | null>(null);
  const [fallbackUser, setFallbackUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    setStatus('loading');

    getOrderById(id)
      .then(async (data) => {
        setOrder(data);

        // Fallback for address if not populated by backend
        if (!data.address && data.addressId) {
          try {
            const addrs = await getAllAddress();
            const matched = addrs.find((a) => a.addressId === data.addressId);
            if (matched) setFallbackAddress(matched);
          } catch {
            // Ignore fallback errors
          }
        }

        // Fallback for user if not populated by backend
        if (!data.user) {
          try {
            const u = await getUserDetails();
            if (u) setFallbackUser(u);
          } catch {
            // Ignore fallback errors
          }
        }

        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [id, isAuthenticated]);

  if (status === 'loading') {
    return (
      <div className="order-confirmation-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (status === 'error' || !order) {
    return (
      <div className="order-confirmation-container">
        <div className="confirmation-hero-card failed">
          <div className="confirmation-hero-icon failed" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="confirmation-hero-title">Order Not Found</h1>
          <p className="confirmation-hero-sub">
            We couldn't retrieve the details for this order. It may have expired or the order ID is invalid.
          </p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/" className="failure-action-shop-btn">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const normStatus = (order.status || '').toUpperCase();
  const isFailed = normStatus === 'FAILED' || normStatus === 'CANCELLED' || normStatus.includes('FAIL') || normStatus === 'PAYMENT_FAILED';
  const isDelivered = normStatus === 'DELIVERED';
  const statusType = isFailed ? 'failed' : isDelivered ? 'delivered' : 'confirmed';

  const formattedDate = formatOrderDate(order.createdAt);

  const resolvedUser = order.user || fallbackUser;
  const resolvedAddress = order.address || fallbackAddress;

  const firstName = resolvedUser?.firstName || '';
  const lastName = resolvedUser?.lastName || '';
  const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (resolvedUser?.username || order.username);

  return (
    <div className="order-confirmation-container">
      {/* Top Grid: Hero Card + Delivery Address (Beside each other on desktop, Delivery above items on mobile) */}
      <div className="confirmation-top-grid">
        {/* Confirmation Hero Card */}
        <div className={`confirmation-hero-card ${statusType}`}>
          <div className="confirmation-title-row">
            {isFailed ? (
              <span className="confirmation-badge-icon failed">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </span>
            ) : isDelivered ? (
              <span className="confirmation-badge-icon delivered">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </span>
            ) : (
              <span className="confirmation-badge-icon confirmed">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            <h1 className="confirmation-hero-title">
              {isFailed
                ? 'Order Failed'
                : isDelivered
                ? 'Order Delivered'
                : 'Order Confirmed'}
            </h1>
          </div>

          <p className="confirmation-hero-sub">
            {isFailed
              ? 'We were unable to complete your order. If money was debited from your account, an automatic full refund will be processed within 5–7 business days.'
              : isDelivered
              ? 'Your order has been delivered successfully. Thank you for shopping with us!'
              : 'Thank you for your order! Your payment was received and your package is being prepared for dispatch.'}
          </p>

          {isFailed && (
            <div className="confirmation-failure-notice">
              <div className="failure-notice-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Payment & Refund Information</span>
              </div>
              <ul className="failure-notice-list">
                <li><strong>Order not fulfilled:</strong> Items from this order will not be shipped.</li>
                <li><strong>Automatic refund:</strong> Any amount debited will be refunded back to your bank account within 5–7 business days.</li>
                <li><strong>Try again:</strong> You can review items in your cart and re-attempt checkout with a different payment method.</li>
              </ul>
              <div className="failure-notice-actions">
                <Link to="/cart" className="failure-action-cart-btn">
                  Return to Cart
                </Link>
                <Link to="/" className="failure-action-shop-btn">
                  Browse Products
                </Link>
              </div>
            </div>
          )}

          <div className="confirmation-meta-list">
            <div className="confirmation-meta-row">
              <span className="confirmation-meta-label">Order Number:</span>
              <span className="confirmation-meta-value order-id">#{order.bookingId}</span>
            </div>

            <div className="confirmation-meta-row">
              <span className="confirmation-meta-label">Date Placed:</span>
              <span className="confirmation-meta-value">{formattedDate}</span>
            </div>

            <div className="confirmation-meta-row">
              <span className="confirmation-meta-label">Payment Status:</span>
              <span className={`confirmation-meta-value ${isFailed ? 'failed' : 'paid'}`}>
                {isFailed ? 'Payment Failed' : 'Paid Online'}
              </span>
            </div>

            <div className="confirmation-meta-row">
              <span className="confirmation-meta-label">Order Status:</span>
              <span className="confirmation-meta-value">
                <span className={`confirmation-status-pill ${statusType}`}>
                  {order.status}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Address Card (Beside the Hero card on desktop, above items on mobile) */}
        <div className="confirmation-info-card confirmation-delivery-card">
          <h2 className="confirmation-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Delivery Address
          </h2>
          {resolvedAddress ? (
            <div className="confirmation-info-content">
              <div className="confirmation-address-name">{fullName}</div>
              <div className="confirmation-address-line">{resolvedAddress.building}</div>
              <div className="confirmation-address-line">{resolvedAddress.area}</div>
              <div className="confirmation-address-line">
                {resolvedAddress.city}, {resolvedAddress.state} — {resolvedAddress.pincode}
              </div>
              <div className="confirmation-address-line" style={{ color: 'var(--slate)' }}>
                {resolvedAddress.country}
              </div>
              {resolvedUser?.phone && (
                <div className="confirmation-address-phone">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Phone: <strong>{resolvedUser.phone}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div className="confirmation-info-content" style={{ color: 'var(--slate)' }}>
              Address information not available.
            </div>
          )}
        </div>
      </div>

      {/* Items Section - PURE INFORMATION, NO PRODUCT LINKS! */}
      <div className="confirmation-items-card">
        <h2 className="confirmation-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Items in this Order
          <span className="confirmation-items-count">{(order.items || []).length}</span>
        </h2>

        <div style={{ marginTop: '12px' }}>
          {(order.items || []).map((item) => {
            const unitPrice = Number(item.priceAtBooking);
            const qty = Number(item.quantity);
            const lineTotal = unitPrice * qty;
            const displayColor = cleanValue(item.color);
            const displaySize = cleanValue(item.size);
            const variantLabel = [displayColor, displaySize].filter(Boolean).join(' · ') || 'Standard';

            return (
              <div className="confirmation-item-row" key={item.bookingItemId}>
                <div className="confirmation-item-left">
                  {/* Thumbnail (Non-clickable) */}
                  <div className="confirmation-item-thumb">
                    <OrderItemThumbnail src={item.imageUrl} alt={item.productName} />
                  </div>

                  {/* Details (Pure Text - NO Links!) */}
                  <div className="confirmation-item-details">
                    {item.brand && (
                      <span className="confirmation-item-brand">{item.brand}</span>
                    )}
                    <span className="confirmation-item-name">{item.productName}</span>
                    <span className="confirmation-item-variant">
                      Variant: {variantLabel}
                    </span>
                    <span style={{ fontSize: '12.5px', color: 'var(--slate)' }}>
                      Quantity: <strong>{item.quantity}</strong>
                    </span>
                  </div>
                </div>

                {/* Pricing (Pure Text) */}
                <div className="confirmation-item-pricing">
                  <span className="confirmation-item-line-total">
                    {formatINR(lineTotal)}
                  </span>
                  <span className="confirmation-item-unit-qty">
                    {formatINR(unitPrice)} × {item.quantity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Summary */}
        <div className="confirmation-summary-section">
          <div className="confirmation-summary-row">
            <span>Items Subtotal</span>
            <span>{formatINR(Number(order.totalAmount))}</span>
          </div>
          <div className="confirmation-summary-row">
            <span>Delivery</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>FREE</span>
          </div>
          <div className="confirmation-summary-row total">
            <span>Total Amount</span>
            <span style={{ color: isFailed ? 'var(--rust, #dc2626)' : 'var(--mango-deep, #ea580c)' }}>
              {formatINR(Number(order.totalAmount))}
            </span>
          </div>
          {isFailed && (
            <div style={{ fontSize: '12.5px', color: '#b91c1c', marginTop: '6px', textAlign: 'right', fontWeight: 500 }}>
              • Order failed — No payment captured or refund eligible
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
