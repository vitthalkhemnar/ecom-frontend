import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../api';
import type { Order } from '../types';
import OrderCard from './OrderCard';

type Status = 'loading' | 'ready' | 'error';

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
      
      <h1 className="detail-title" style={{ margin: '16px 0 24px' }}>Your orders</h1>

      {status === 'loading' && <p className="state-msg">Loading orders…</p>}
      {status === 'error' && <p className="state-msg error">Couldn't load your orders. Try again shortly.</p>}
      {status === 'ready' && orders.length === 0 && (
        <p className="state-msg">
          No orders yet. <Link to="/">Start shopping</Link>
        </p>
      )}

      {status === 'ready' && orders.length > 0 && (
        <div className="product-grid">
          {orders.map((order) => (
            <OrderCard key={order.bookingId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}