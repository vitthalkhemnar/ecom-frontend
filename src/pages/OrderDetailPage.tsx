import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderById, formatINR } from '../api';
import type { Order } from '../types';

type Status = 'loading' | 'ready' | 'error';

function statusClass(status: string): 'in' | 'low' | 'out' {
  if (status === 'CONFIRMED') return 'in';
  if (status === 'PENDING') return 'low';
  return 'out';
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token || !id) return;
    setStatus('loading');
    getOrderById(id, token)
      .then((data) => {
        setOrder(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [id, token]);

  if (status === 'loading') {
    return (
      <div className="page">
        <p className="state-msg">Loading order…</p>
      </div>
    );
  }

  if (status === 'error' || !order) {
    return (
      <div className="page">
        <Link to="/orders" className="back-link">← Back to your orders</Link>
        <p className="state-msg error">Couldn't load this order.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/orders" className="back-link">← Back to your orders</Link>

      <div className="order-detail-header">
        <div>
          <h1 className="detail-title">Order #{order.bookingId}</h1>
          <p className="cart-row-meta">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`variant-stock ${statusClass(order.status)}`}>{order.status}</span>
      </div>

      <div className="cart-list">
        {order.items.map((item) => (
          <div className="cart-row" key={item.bookingItemId}>
            <Link to={`/product/${item.productId}`} className="cart-row-link">
              <div className="cart-row-media">
                <span className="media-placeholder">{item.productName}</span>
              </div>
              <div className="cart-row-info">
                <span className="cart-row-name">{item.productName}</span>
                <span className="cart-row-variant">
                  {item.color || 'Standard'}{item.size ? ` · ${item.size}` : ''}
                </span>
              </div>
            </Link>
            <div className="cart-row-side">
              <span className="cart-row-unit-price">{formatINR(Number(item.priceAtBooking))} × {item.quantity}</span>
              <span className="cart-row-line-total">
                {formatINR(Number(item.priceAtBooking) * Number(item.quantity))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-total">
        <span>Total</span>
        <span>{formatINR(Number(order.totalAmount))}</span>
      </div>
    </div>
  );
}