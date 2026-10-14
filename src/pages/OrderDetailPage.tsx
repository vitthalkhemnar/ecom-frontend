import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderById, getAllAddress, getUserDetails, formatINR } from '../api';
import type { Order, AddressResponse, User } from '../types';

type Status = 'loading' | 'ready' | 'error';

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
            const users = await getUserDetails();
            const u = Array.isArray(users) ? users[0] : users;
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
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
        <p className="state-msg" style={{ fontSize: '15px' }}>Loading order details…</p>
      </div>
    );
  }

  if (status === 'error' || !order) {
    return (
      <div className="order-confirmation-container">
        <div className="confirmation-hero-card failed">
          <h1 className="confirmation-hero-title">Order Not Found</h1>
          <p className="confirmation-hero-sub">
            We couldn't retrieve the details for this order. Please verify the order ID.
          </p>
          <div className="confirmation-actions-row">
            <Link to="/" className="confirmation-btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'DELIVERED';
  const isFailed = order.status === 'FAILED' || order.status === 'CANCELLED';
  const statusType = isFailed ? 'failed' : isDelivered ? 'delivered' : 'confirmed';

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const resolvedUser = order.user || fallbackUser;
  const resolvedAddress = order.address || fallbackAddress;

  const firstName = resolvedUser?.firstName || '';
  const lastName = resolvedUser?.lastName || '';
  const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (resolvedUser?.username || order.username);

  return (
    <div className="order-confirmation-container">
      {/* Confirmation Hero Card */}
      <div className={`confirmation-hero-card ${statusType}`}>
        <h1 className="confirmation-hero-title">
          {isFailed
            ? 'Order Failed'
            : isDelivered
            ? 'Order Delivered'
            : 'Order Confirmed'}
        </h1>

        <p className="confirmation-hero-sub">
          {isFailed
            ? 'This order could not be completed. If your payment was deducted, a refund will be issued.'
            : isDelivered
            ? 'Your order has been delivered successfully.'
            : 'Thank you for your order! Your payment was received and your package is being prepared.'}
        </p>

        <div className="confirmation-meta-bar">
          <div className="confirmation-meta-item">
            <span className="confirmation-meta-label">Order Number</span>
            <span className="confirmation-meta-val">#{order.bookingId}</span>
          </div>

          <div className="confirmation-meta-item">
            <span className="confirmation-meta-label">Date Placed</span>
            <span className="confirmation-meta-val">{formattedDate}</span>
          </div>

          <div className="confirmation-meta-item">
            <span className="confirmation-meta-label">Payment Status</span>
            <span className="confirmation-meta-val">
              {isFailed ? 'Failed' : 'Paid Online'}
            </span>
          </div>

          <div className="confirmation-meta-item">
            <span className="confirmation-meta-label">Order Status</span>
            <div>
              <span className={`confirmation-status-pill ${statusType}`}>
                {order.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Shipping Address & Customer Information */}
      <div className="confirmation-grid-two">
        {/* Shipping Address */}
        <div className="confirmation-info-card">
          <h2 className="confirmation-card-title">Shipping Address</h2>
          {resolvedAddress ? (
            <div className="confirmation-info-content">
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>{fullName}</div>
              <div>{resolvedAddress.building}</div>
              <div>{resolvedAddress.area}</div>
              <div>
                {resolvedAddress.city}, {resolvedAddress.state} — {resolvedAddress.pincode}
              </div>
              <div style={{ color: 'var(--slate)' }}>{resolvedAddress.country}</div>
              {resolvedUser?.phone && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--slate)' }}>
                  Phone: <span style={{ color: 'var(--ink)' }}>{resolvedUser.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="confirmation-info-content" style={{ color: 'var(--slate)' }}>
              Address information not available.
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className="confirmation-info-card">
          <h2 className="confirmation-card-title">Customer Information</h2>
          <div className="confirmation-info-content">
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: 'var(--slate)', fontSize: '12.5px', display: 'block', marginBottom: '2px' }}>
                Full Name
              </span>
              <span style={{ fontWeight: 600 }}>{fullName}</span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: 'var(--slate)', fontSize: '12.5px', display: 'block', marginBottom: '2px' }}>
                Phone Number
              </span>
              <span style={{ fontWeight: 500 }}>{resolvedUser?.phone || order.username}</span>
            </div>
            <div>
              <span style={{ color: 'var(--slate)', fontSize: '12.5px', display: 'block', marginBottom: '2px' }}>
                Email Address
              </span>
              <span style={{ fontWeight: 500 }}>{resolvedUser?.email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Section - PURE INFORMATION, NO PRODUCT LINKS! */}
      <div className="confirmation-items-card">
        <h2 className="confirmation-card-title" style={{ marginBottom: '6px' }}>
          Items Ordered ({order.items.length})
        </h2>

        <div style={{ marginTop: '12px' }}>
          {order.items.map((item) => {
            const unitPrice = Number(item.priceAtBooking);
            const qty = Number(item.quantity);
            const lineTotal = unitPrice * qty;

            return (
              <div className="confirmation-item-row" key={item.bookingItemId}>
                <div className="confirmation-item-left">
                  {/* Thumbnail (Non-clickable) */}
                  <div className="confirmation-item-thumb">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--slate)', fontWeight: 600 }}>ITEM</span>
                    )}
                  </div>

                  {/* Details (Pure Text - NO Links!) */}
                  <div className="confirmation-item-details">
                    {item.brand && (
                      <span className="confirmation-item-brand">{item.brand}</span>
                    )}
                    <span className="confirmation-item-name">{item.productName}</span>
                    <span className="confirmation-item-variant">
                      Variant: {item.color || 'Standard'}{item.size ? ` · ${item.size}` : ''}
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
            <span style={{ color: 'var(--mango-deep, #ea580c)' }}>
              {formatINR(Number(order.totalAmount))}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Only Continue Shopping */}
      <div className="confirmation-actions-row">
        <Link to="/" className="confirmation-btn-primary">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}