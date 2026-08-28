import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders, formatINR } from '../api';
import type { Order } from '../types';

type Status = 'loading' | 'ready' | 'error';

function statusClass(status: string): 'in' | 'low' | 'out' {
  if (status === 'CONFIRMED') return 'in';
  if (status === 'PENDING') return 'low';
  return 'out';
}

export default function OrdersListPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) return;
    getOrders(token)
      .then((data) => {
        setOrders(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to all products</Link>
      <h1 className="detail-title">Your orders</h1>

      {status === 'loading' && <p className="state-msg">Loading orders…</p>}
      {status === 'error' && <p className="state-msg error">Couldn't load your orders. Try again shortly.</p>}
      {status === 'ready' && orders.length === 0 && (
        <p className="state-msg">
          No orders yet. <Link to="/">Start shopping</Link>
        </p>
      )}

      {status === 'ready' && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <Link to={`/orders/${order.bookingId}`} className="order-row" key={order.bookingId}>
              <div className="order-row-info">
                <span className="order-row-id">Order #{order.bookingId}</span>
                <span className="order-row-meta">
                  {new Date(order.createdAt).toLocaleString()} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className={`variant-stock ${statusClass(order.status)}`}>{order.status}</span>
              <span className="order-row-total">{formatINR(Number(order.totalAmount))}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}