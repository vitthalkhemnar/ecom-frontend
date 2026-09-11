import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllOrders } from '../../api';
import type { Order } from '../../types';
import OrderDetailsModal from './OrderDetailsModal';
import Pagination from './Pagination';

type Status = 'loading' | 'ready' | 'error';
type SortKey = 'date' | 'total' | 'username';

const PAGE_SIZE = 10;

function statusClass(status: string): 'in' | 'low' | 'out' {
  if (status === 'CONFIRMED') return 'in';
  if (status === 'PENDING') return 'low';
  return 'out';
}

export default function OrdersTab() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!token) return;
    getAllOrders(token)
      .then((data) => {
        setOrders(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  useEffect(() => {
    setPage(0);
  }, [search, sortKey]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? orders.filter((o) =>
          `${o.username} ${o.bookingId} ${o.status}`.toLowerCase().includes(term)
        )
      : orders;

    return [...filtered].sort((a, b) => {
      if (sortKey === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === 'total') return Number(b.totalAmount) - Number(a.totalAmount);
      return a.username.localeCompare(b.username);
    }).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  }, [orders, search, sortKey, page]);

  const totalPages = useMemo(() => {
    const term = search.trim().toLowerCase();
    const count = term
      ? orders.filter((o) => `${o.username} ${o.bookingId} ${o.status}`.toLowerCase().includes(term)).length
      : orders.length;
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [orders, search]);

  if (status === 'loading') return <p className="state-msg">Loading orders…</p>;
  if (status === 'error') return <p className="state-msg error">Couldn't load orders.</p>;

  return (
    <div>
      <div className="admin-controls">
        <input
          className="auth-input admin-search"
          placeholder="Search by username, order ID, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="admin-sort" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="date">Sort by date</option>
          <option value="total">Sort by total</option>
          <option value="username">Sort by customer</option>
        </select>
      </div>

      {visibleOrders.length === 0 ? (
        <p className="state-msg">No orders match "{search}".</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.bookingId}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>#{order.bookingId}</td>
                <td className="admin-cell-muted">@{order.username}</td>
                <td className="admin-cell-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>{order.items.length}</td>
                <td>
                  <span className={`variant-stock ${statusClass(order.status)}`}>{order.status}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{order.totalAmount}</td>
                <td>
                  <button type="button" className="admin-edit-btn" onClick={() => setViewingOrder(order)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {viewingOrder && (
        <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}
    </div>
  );
}