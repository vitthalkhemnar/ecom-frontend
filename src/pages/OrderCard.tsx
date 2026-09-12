import { Link } from 'react-router-dom';
import { formatINR } from '../api';
import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
}

function statusClass(status: string): 'in' | 'low' | 'out' {
  if (status === 'CONFIRMED') return 'in';
  if (status === 'PENDING') return 'low';
  return 'out';
}

export default function OrderCard({ order }: OrderCardProps) {
  return (
    <Link to={`/orders/${order.bookingId}`} className="product-card">
      <div className="product-body" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="product-eyebrow">Order #{order.bookingId}</span>
          <span className={`variant-stock ${statusClass(order.status)}`}>
            {order.status}
          </span>
        </div>
        <h3 className="product-name" style={{ fontSize: '15px', marginBottom: '4px' }}>
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </h3>
        <span className="product-brand" style={{ display: 'block', marginBottom: '16px' }}>
          {new Date(order.createdAt).toLocaleString()}
        </span>
        <div className="price-row">
          <span className="price-now">{formatINR(Number(order.totalAmount))}</span>
        </div>
      </div>
    </Link>
  );
}