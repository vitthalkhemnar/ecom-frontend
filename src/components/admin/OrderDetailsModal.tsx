import { useState } from 'react';
import type { Order } from '../../types';
import OrderTrackingModal from '../OrderTrackingModal';
import { cleanValue } from '../../api';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

function statusClass(status: string): 'in' | 'low' | 'out' {
  if (status === 'CONFIRMED') return 'in';
  if (status === 'PENDING') return 'low';
  return 'out';
}

export default function OrderDetailsModal({ order, onClose, onStatusUpdated }: OrderDetailsModalProps) {
  const [showTracking, setShowTracking] = useState(false);
  const total = Number(order.totalAmount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Order #{order.bookingId}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--slate)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="order-section-row">
          <div className="order-section-card">
            <span className="order-section-label">Order details</span>
            <div className="order-detail-grid">
              <span className="order-detail-key">Status</span>
              <span className={`variant-stock ${statusClass(order.status)}`}>{order.status}</span>

              <span className="order-detail-key">Placed on</span>
              <span>{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>

              <span className="order-detail-key">Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="order-section-card">
            <span className="order-section-label">Customer</span>
            <div className="order-detail-grid">
              <span className="order-detail-key">Name</span>
              <span>{order.user?.firstName} {order.user?.lastName}</span>
              <span className="order-detail-key">Email</span>
              <span>{order.user?.email}</span>
              <span className="order-detail-key">Phone</span>
              <span>{order.user?.phone}</span>
            </div>
          </div>
        </div>

        <div className="order-section-card">
          <span className="order-section-label">Items ({order.items.length})</span>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.bookingItemId}>
                  <td>{item.productName}</td>
                  <td className="admin-cell-muted">
                    {[cleanValue(item.color), cleanValue(item.size)].filter(Boolean).join(' · ') || 'Standard'}
                  </td>
                  <td>{item.quantity}</td>
                  <td>₹{item.priceAtBooking}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    ₹{(Number(item.priceAtBooking) * Number(item.quantity)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
          <button
            type="button"
            className="admin-edit-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--mango)', color: '#ffffff', border: 'none', padding: '8px 16px', fontWeight: 600 }}
            onClick={() => setShowTracking(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            Track & Manage
          </button>
        </div>

        {showTracking && (
          <OrderTrackingModal
            order={order}
            onClose={() => setShowTracking(false)}
            onStatusUpdated={onStatusUpdated}
          />
        )}
      </div>
    </div>
  );
}
