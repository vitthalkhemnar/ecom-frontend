import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../api';
import type { Order } from '../types';
import OrderCard from './OrderCard';

type Status = 'loading' | 'ready' | 'error';

export default function OrdersListPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  const fetchUserOrders = useCallback(() => {
    if (!isAuthenticated) return;
    setStatus('loading');
    getOrders()
      .then((data) => {
        setOrders(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  // Sort orders newest first
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [orders]);

  return (
    <div className="order-history-page">
      <div className="order-history-header-section">
        <div className="order-history-title-row">
          <h1 className="order-history-title">My Orders</h1>
        </div>
      </div>

      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      )}

      {status === 'error' && (
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap" style={{ color: 'var(--rust)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="order-empty-title">Couldn't load your orders</h2>
          <p className="order-empty-desc">
            An issue occurred while fetching your orders. Please verify your connection and try again.
          </p>
          <button type="button" onClick={fetchUserOrders} className="order-cta-btn">
            Retry Loading
          </button>
        </div>
      )}

      {status === 'ready' && sortedOrders.length === 0 && (
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 className="order-empty-title">No orders yet</h2>
          <p className="order-empty-desc">
            You haven't placed any orders yet. Discover our latest products and start shopping today!
          </p>
          <Link to="/" className="order-cta-btn">
            Explore Products
          </Link>
        </div>
      )}

      {status === 'ready' && sortedOrders.length > 0 && (
        <div className="order-cards-stack">
          {sortedOrders.map((order) => (
            <OrderCard key={order.bookingId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
