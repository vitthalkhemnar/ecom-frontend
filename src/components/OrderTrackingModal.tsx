import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getOrderTracking, changeOrderStatus, formatINR, getErrorMessage } from '../api';
import type { Order, OrderTracking } from '../types';

interface OrderTrackingModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const MILESTONES = [
  { key: 'CREATED', label: 'Order Placed', desc: 'Order received' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Payment approved' },
  { key: 'PROCESSING', label: 'Processing', desc: 'Ready for dispatch' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Package delivered' },
];

const AVAILABLE_STATUSES = ['CREATED', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'FAILED'] as const;

function getStageIndex(status: string): number {
  const norm = (status || '').toUpperCase();
  if (norm === 'DELIVERED') return 3;
  if (norm === 'PROCESSING' || norm === 'SHIPPED') return 2;
  if (norm === 'CONFIRMED') return 1;
  if (norm === 'CREATED' || norm === 'PENDING') return 0;
  return -1; // CANCELLED or FAILED
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: string) {
  const norm = (status || '').toUpperCase();
  if (norm === 'DELIVERED') {
    return {
      className: 'tracking-badge-delivered',
      label: 'Delivered',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    };
  }
  if (norm === 'CONFIRMED') {
    return {
      className: 'tracking-badge-confirmed',
      label: 'Confirmed',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    };
  }
  if (norm === 'CANCELLED' || norm === 'FAILED') {
    return {
      className: 'tracking-badge-cancelled',
      label: norm.replace('_', ' '),
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    };
  }
  return {
    className: 'tracking-badge-pending',
    label: norm.replace('_', ' ') || 'Placed',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };
}

export default function OrderTrackingModal({ order, onClose, onStatusUpdated }: OrderTrackingModalProps) {
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [selectedNextState, setSelectedNextState] = useState<string>('CONFIRMED');

  const orderId = order ? order.bookingId : null;

  const fetchTracking = useCallback(async (isRefresh = false) => {
    if (!orderId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getOrderTracking(orderId);
      setTrackingData(data);
    } catch (err) {
      console.warn('Could not fetch tracking from backend, falling back to order object:', err);
      if (order) {
        setTrackingData({
          orderId: order.bookingId,
          currentStatus: order.status || 'CREATED',
          createdAt: order.createdAt,
          totalAmount: order.totalAmount,
          user: order.user,
          address: order.address,
          items: order.items || [],
          logs: [],
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, order]);

  useEffect(() => {
    if (orderId) {
      fetchTracking();
    }
  }, [orderId, fetchTracking]);

  // Sync selected next state when tracking data loads or changes
  useEffect(() => {
    const current = trackingData?.currentStatus || order?.status || 'CREATED';
    if (current === 'CREATED') {
      setSelectedNextState('CONFIRMED');
    } else if (current === 'CONFIRMED') {
      setSelectedNextState('DELIVERED');
    } else {
      setSelectedNextState(current);
    }
  }, [trackingData?.currentStatus, order?.status]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const currentStatus = trackingData?.currentStatus || order.status || 'CREATED';
  const badge = getStatusBadge(currentStatus);
  const currentStageIdx = getStageIndex(currentStatus);
  const isCancelled = currentStatus.toUpperCase() === 'CANCELLED' || currentStatus.toUpperCase() === 'FAILED';
  const logs = trackingData?.logs || [];
  const reversedLogs = [...logs].reverse();

  const handleAdminStatusTransition = async () => {
    if (!orderId || !selectedNextState || selectedNextState === currentStatus) return;
    setTransitioning(true);
    try {
      await changeOrderStatus(orderId, currentStatus, selectedNextState);
      toast.success(`Order status updated: ${currentStatus} ➔ ${selectedNextState}`);
      await fetchTracking(true);
      onStatusUpdated?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update order state'));
    } finally {
      setTransitioning(false);
    }
  };

  const isDestructiveTarget = selectedNextState === 'CANCELLED' || selectedNextState === 'FAILED';

  return (
    <div
      className="tracking-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-modal-title"
    >
      <div
        className="tracking-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="tracking-modal-header">
          <div className="tracking-header-left">
            <div className="tracking-header-icon-wrap" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="tracking-header-text">
              <div className="tracking-header-meta">
                <h2 id="tracking-modal-title" className="tracking-modal-title">
                  <span className="tracking-title-full">Order Tracking </span>
                  <span className="tracking-title-compact">Order </span>#{order.bookingId}
                </h2>
                <span className={`tracking-header-status-badge ${badge.className}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              </div>
              <p className="tracking-header-subtitle">
                Placed on {formatDate(order.createdAt)} • Total: {formatINR(Number(order.totalAmount))}
              </p>
            </div>
          </div>

          <div className="tracking-header-actions">
            <button
              type="button"
              className={`tracking-refresh-btn ${refreshing ? 'rotating' : ''}`}
              onClick={() => fetchTracking(true)}
              title="Refresh tracking status"
              disabled={refreshing || loading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="tracking-close-btn"
              onClick={onClose}
              aria-label="Close tracking modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="tracking-modal-body">
          {loading ? (
            <div className="tracking-loading-wrap">
              <div className="tracking-spinner-ring" />
              <p className="tracking-loading-title">Loading tracking details...</p>
            </div>
          ) : (
            <>
              {/* 1. Fulfillment Milestones Stepper */}
              <section className="tracking-section-card">
                <h3 className="tracking-section-heading">Fulfillment Progress</h3>
                {!isCancelled ? (
                  <div className="tracking-stepper">
                    {MILESTONES.map((step, idx) => {
                      const isCompleted = currentStageIdx >= idx;
                      const isCurrent = currentStageIdx === idx;

                      return (
                        <div
                          key={step.key}
                          className={`tracking-step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                          <div className="tracking-step-line" />
                          <div className="tracking-step-node">
                            {isCompleted ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          <div className="tracking-step-info">
                            <span className="tracking-step-title">{step.label}</span>
                            <span className="tracking-step-desc">{step.desc}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="tracking-cancelled-notice">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <div>
                      <strong>Order {currentStatus}:</strong> Fulfillment has been stopped. Inventory stock was restored.
                    </div>
                  </div>
                )}
              </section>

              {/* 2. Admin Order Status Transition Control */}
              <section className="tracking-section-card tracking-transition-card">
                <div className="tracking-transition-header">
                  <h3 className="tracking-section-heading" style={{ margin: 0 }}>Update Order Status</h3>
                  <div className="tracking-current-status-tag">
                    Current: <strong>{currentStatus}</strong>
                  </div>
                </div>

                <div className="tracking-transition-form">
                  <div className="tracking-select-wrap">
                    <label htmlFor="admin-next-state" className="tracking-select-label">
                      Target Status:
                    </label>
                    <select
                      id="admin-next-state"
                      value={selectedNextState}
                      onChange={(e) => setSelectedNextState(e.target.value)}
                      className="tracking-status-select"
                      disabled={transitioning}
                    >
                      {AVAILABLE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st} {st === currentStatus ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminStatusTransition}
                    disabled={transitioning || selectedNextState === currentStatus}
                    className={`tracking-update-btn ${isDestructiveTarget ? 'destructive' : ''}`}
                  >
                    {transitioning ? (
                      <>
                        <span className="tracking-btn-spinner" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      'Update Status'
                    )}
                  </button>
                </div>

                {isDestructiveTarget && selectedNextState !== currentStatus && (
                  <p className="tracking-warning-hint">
                    Warning: Changing status to <strong>{selectedNextState}</strong> will immediately restore product inventory stock.
                  </p>
                )}
              </section>

              {/* 3. Audit Trail & Status History */}
              <section className="tracking-section-card">
                <div className="tracking-audit-header">
                  <h3 className="tracking-section-heading" style={{ margin: 0 }}>Activity & Audit Trail</h3>
                  <span className="tracking-audit-count">
                    {logs.length} {logs.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {reversedLogs.length === 0 ? (
                  <div className="tracking-empty-logs">
                    <p>No status transitions recorded for this order yet.</p>
                  </div>
                ) : (
                  <div className="tracking-audit-timeline">
                    {reversedLogs.map((logItem, index) => {
                      const isLatest = index === 0;
                      const logBadge = getStatusBadge(logItem.toState);

                      return (
                        <div
                          key={logItem.transLogId ? `log-${logItem.transLogId}` : `idx-${index}`}
                          className={`tracking-audit-item ${isLatest ? 'latest' : ''}`}
                        >
                          <div className="tracking-audit-marker">
                            <div className="tracking-audit-dot">
                              {logBadge.icon}
                            </div>
                            {index < reversedLogs.length - 1 && <div className="tracking-audit-line" />}
                          </div>

                          <div className="tracking-audit-body">
                            <div className="tracking-audit-top-row">
                              <div className="tracking-audit-states">
                                <span className={`tracking-state-pill ${logBadge.className}`}>
                                  {logItem.toState}
                                </span>
                                {logItem.fromState && (
                                  <span className="tracking-from-state">
                                    from <code>{logItem.fromState}</code>
                                  </span>
                                )}
                              </div>
                              <span className="tracking-audit-time">
                                {formatDate(logItem.createdAt)}
                              </span>
                            </div>

                            <div className="tracking-audit-meta">
                              <span className="tracking-audit-actor">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                By <strong>{logItem.createdBy || 'SYSTEM'}</strong>
                              </span>
                              {logItem.transLogId && (
                                <span className="tracking-audit-id">
                                  Ref #{logItem.transLogId}
                                </span>
                              )}
                            </div>

                            {logItem.description && logItem.description !== logItem.toState && (
                              <p className="tracking-audit-desc">{logItem.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="tracking-modal-footer">
          <span className="tracking-footer-summary">
            Order #{order.bookingId} • Total: {formatINR(Number(order.totalAmount))}
          </span>
          <button
            type="button"
            className="tracking-footer-close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
