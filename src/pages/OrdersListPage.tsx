import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders, formatINR } from '../api';
import type { Order } from '../types';
import OrderCard from './OrderCard';

type Status = 'loading' | 'ready' | 'error';
type SortOption = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc';

const PAGE_SIZE = 5;

function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export default function OrdersListPage() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  // Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchUserOrders = () => {
    if (!isAuthenticated) return;
    setStatus('loading');
    getOrders()
      .then((data) => {
        setOrders(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => {
    fetchUserOrders();
  }, [isAuthenticated]);

  // Reset page to 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter((o) => (o.status || '').toUpperCase() === 'CONFIRMED').length;
    const pending = orders.filter((o) => (o.status || '').toUpperCase() === 'PENDING').length;
    const cancelled = orders.filter((o) => (o.status || '').toUpperCase() === 'CANCELLED').length;
    const totalSpent = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return { total, confirmed, pending, cancelled, totalSpent };
  }, [orders]);

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(
        (order) => (order.status || '').toUpperCase() === statusFilter.toUpperCase()
      );
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((order) => {
        const matchesId = String(order.bookingId).includes(query);
        const matchesItem = order.items.some((item) =>
          item.productName?.toLowerCase().includes(query)
        );
        return matchesId || matchesItem;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      const amountA = Number(a.totalAmount) || 0;
      const amountB = Number(b.totalAmount) || 0;

      switch (sortBy) {
        case 'oldest':
          return timeA - timeB;
        case 'amount-desc':
          return amountB - amountA;
        case 'amount-asc':
          return amountA - amountB;
        case 'newest':
        default:
          return timeB - timeA;
      }
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, safePage]);

  const startIndex = (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, filteredOrders.length);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  return (
    <div className="order-history-page">
      <Link to="/" className="back-link">
        ← Back to all products
      </Link>

      <div className="order-history-header-section">
        <div className="order-history-title-row">
          <div>
            <h1 className="order-history-title">Order History</h1>
            <p className="order-history-subtitle">
              View receipts, check order status, and track your past purchases.
            </p>
          </div>
        </div>

        {/* Top summary stats */}
        {status === 'ready' && orders.length > 0 && (
          <div className="order-stats-grid">
            <div className="order-stat-card">
              <div className="order-stat-icon highlight">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div className="order-stat-content">
                <span className="order-stat-label">Total Orders</span>
                <span className="order-stat-value">{stats.total}</span>
              </div>
            </div>

            <div className="order-stat-card">
              <div className="order-stat-icon success">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="order-stat-content">
                <span className="order-stat-label">Confirmed Orders</span>
                <span className="order-stat-value">{stats.confirmed}</span>
              </div>
            </div>

            <div className="order-stat-card">
              <div className="order-stat-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                </svg>
              </div>
              <div className="order-stat-content">
                <span className="order-stat-label">Total Spent</span>
                <span className="order-stat-value">{formatINR(stats.totalSpent)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
          <p className="state-msg">Loading your orders…</p>
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
            An issue occurred while fetching your order history. Please verify your connection and try again.
          </p>
          <button type="button" onClick={fetchUserOrders} className="order-cta-btn">
            Retry Loading
          </button>
        </div>
      )}

      {status === 'ready' && orders.length === 0 && (
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

      {status === 'ready' && orders.length > 0 && (
        <>
          {/* Controls: Search, Status tabs, Sorting */}
          <div className="order-controls-bar">
            <div className="order-controls-top">
              <div className="order-search-box">
                <span className="order-search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search by Order ID or product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="order-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="order-search-clear"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="order-sort-wrap">
                <label htmlFor="order-sort" className="order-sort-label">
                  Sort by:
                </label>
                <select
                  id="order-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="order-sort-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount-desc">Total: High to Low</option>
                  <option value="amount-asc">Total: Low to High</option>
                </select>
              </div>
            </div>

            <div className="order-tabs-row">
              <button
                type="button"
                className={`order-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All Orders
                <span className="order-tab-badge">{stats.total}</span>
              </button>

              <button
                type="button"
                className={`order-tab-btn ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                Confirmed
                <span className="order-tab-badge">{stats.confirmed}</span>
              </button>

              <button
                type="button"
                className={`order-tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('PENDING')}
              >
                Pending
                <span className="order-tab-badge">{stats.pending}</span>
              </button>

              {stats.cancelled > 0 && (
                <button
                  type="button"
                  className={`order-tab-btn ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('CANCELLED')}
                >
                  Cancelled
                  <span className="order-tab-badge">{stats.cancelled}</span>
                </button>
              )}
            </div>
          </div>

          {/* Orders Stack or Filter Empty State */}
          {filteredOrders.length === 0 ? (
            <div className="order-empty-state">
              <div className="order-empty-icon-wrap">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h2 className="order-empty-title">No matching orders found</h2>
              <p className="order-empty-desc">
                We couldn't find any orders matching your search or active filters.
              </p>
              <button type="button" onClick={clearFilters} className="order-reset-btn">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="order-cards-stack">
              {paginatedOrders.map((order) => (
                <OrderCard key={order.bookingId} order={order} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="order-pagination-wrapper">
              <div className="order-pagination-info">
                Showing <strong>{startIndex}</strong> to <strong>{endIndex}</strong> of{' '}
                <strong>{filteredOrders.length}</strong> {filteredOrders.length === 1 ? 'order' : 'orders'}
              </div>

              {totalPages > 1 && (
                <div className="order-pagination-controls">
                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    className="order-page-btn"
                    title="Previous page"
                  >
                    ← Prev
                  </button>

                  {getPageNumbers(safePage, totalPages).map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="order-page-ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => handlePageChange(p as number)}
                        className={`order-page-btn ${safePage === p ? 'active' : ''}`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => handlePageChange(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="order-page-btn"
                    title="Next page"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}