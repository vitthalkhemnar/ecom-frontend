import type { Order } from '../../types';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
}

function statusClass(status: string): 'in' | 'low' | 'out' {
  if (status === 'CONFIRMED') return 'in';
  if (status === 'PENDING') return 'low';
  return 'out';
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const total = Number(order.totalAmount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Order #{order.bookingId}</h2>

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
              <span className="order-detail-key">Username</span>
              <span>@{order.username}</span>
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
                    {[item.color, item.size].filter(Boolean).join(' · ') || 'Standard'}
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

        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}