import { Link } from 'react-router-dom';
import { formatINR } from '../api';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

function statusBadge(status: string) {
  const norm = (status || '').toUpperCase();
  if (norm === 'CONFIRMED' || norm === 'DELIVERED') {
    return {
      className: 'order-status-badge confirmed',
      label: status,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    };
  }
  if (norm === 'PENDING' || norm === 'PROCESSING') {
    return {
      className: 'order-status-badge pending',
      label: status,
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    };
  }
  return {
    className: 'order-status-badge cancelled',
    label: status,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  };
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function OrderCard({ order }: OrderCardProps) {
  const badge = statusBadge(order.status);
  const totalItemCount = order.items.reduce(
    (sum, item) => sum + (parseInt(item.quantity, 10) || 1),
    0
  );

  return (
    <article className="order-history-card">
      <header className="order-history-header">
        <div className="order-header-group">
          <div className="order-header-meta-item">
            <span className="order-meta-label">Order Placed</span>
            <span className="order-meta-value">{formatDate(order.createdAt)}</span>
          </div>
          <div className="order-header-meta-item">
            <span className="order-meta-label">Total Amount</span>
            <span className="order-meta-value order-total-highlight">
              {formatINR(Number(order.totalAmount))}
            </span>
          </div>
          <div className="order-header-meta-item">
            <span className="order-meta-label">Order #</span>
            <span className="order-meta-value order-id-code">#{order.bookingId}</span>
          </div>
        </div>

        <div className="order-header-actions">
          <span className={badge.className}>
            {badge.icon}
            <span>{badge.label}</span>
          </span>
          <Link to={`/orders/${order.bookingId}`} className="order-view-details-btn">
            View Details
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="order-history-body">
        <div className="order-items-list">
          {order.items.map((item) => {
            const itemPrice = Number(item.priceAtBooking) || 0;
            const itemQty = parseInt(item.quantity, 10) || 1;
            const lineTotal = itemPrice * itemQty;
            const initial = item.productName ? item.productName.trim().charAt(0).toUpperCase() : 'P';

            return (
              <div key={item.bookingItemId} className="order-item-row">
                <div className="order-item-thumbnail" aria-hidden="true">
                  <span className="order-thumbnail-monogram">{initial}</span>
                </div>

                <div className="order-item-details">
                  <Link to={`/product/${item.productId}`} className="order-item-title">
                    {item.productName}
                  </Link>

                  <div className="order-item-specs">
                    {item.color && (
                      <span className="order-spec-tag">
                        Color: <strong>{item.color}</strong>
                      </span>
                    )}
                    {item.size && (
                      <span className="order-spec-tag">
                        Size: <strong>{item.size}</strong>
                      </span>
                    )}
                    <span className="order-spec-tag">
                      Qty: <strong>{itemQty}</strong>
                    </span>
                  </div>

                  <div className="order-item-pricing-mobile">
                    <span>{formatINR(itemPrice)} × {itemQty}</span>
                    <strong className="order-item-line-total">{formatINR(lineTotal)}</strong>
                  </div>
                </div>

                <div className="order-item-pricing-desktop">
                  <span className="order-unit-price">{formatINR(itemPrice)} × {itemQty}</span>
                  <span className="order-item-line-total">{formatINR(lineTotal)}</span>
                </div>

                <div className="order-item-actions">
                  <Link to={`/product/${item.productId}`} className="order-product-link-btn">
                    View Product
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="order-history-footer">
        <div className="order-footer-info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>
            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in this package
          </span>
        </div>

        <div className="order-footer-links">
          <Link to={`/orders/${order.bookingId}`} className="order-footer-action-link">
            Track / Invoice Details →
          </Link>
        </div>
      </footer>
    </article>
  );
}