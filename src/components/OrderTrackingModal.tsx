import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getOrderTracking, changeOrderStatus, formatINR, getErrorMessage, cleanValue } from '../api';
import type { Order, OrderTracking } from '../types';

interface OrderTrackingModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const MILESTONES = [
  { key: 'CREATED', label: 'Order Placed', desc: 'Order received & catalogued' },
  { key: 'CONFIRMED', label: 'Confirmed', desc: 'Payment verified & order approved' },
  { key: 'PROCESSING', label: 'Processing', desc: 'Packed & handed to courier' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Package delivered to recipient' },
];

function TrackingMiniThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <span style={{ fontSize: '8px', color: 'var(--slate)', fontWeight: 600, textAlign: 'center', lineHeight: 1.1, padding: '2px' }} title="Image not available">
        Image not available
      </span>
    );
  }
  return <img src={src} alt={alt} onError={() => setError(true)} />;
}

function getStageIndex(status: string): number {
  const norm = (status || '').toUpperCase();
  if (norm === 'DELIVERED') return 3;
  if (norm === 'PROCESSING') return 2;
  if (norm === 'CONFIRMED') return 1;
  if (norm === 'CREATED') return 0;
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };
}

export default function OrderTrackingModal({ order, onClose, onStatusUpdated }: OrderTrackingModalProps) {
  const { isAdmin } = useAuth();
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'table'>('timeline');
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

  // Handle ESC key to close modal
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
  const address = trackingData?.address || order.address;
  const items = trackingData?.items || order.items || [];

  const handleAdminStatusTransition = async () => {
    if (!orderId || !selectedNextState) return;
    setTransitioning(true);
    try {
      await changeOrderStatus(orderId, currentStatus, selectedNextState);
      toast.success(`Order state transitioned: ${currentStatus} ➔ ${selectedNextState}`);
      await fetchTracking(true);
      onStatusUpdated?.();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to update order state'));
    } finally {
      setTransitioning(false);
    }
  };

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
        {/* Modal Header */}
        <header className="tracking-modal-header">
          <div className="tracking-header-left">
            <div className="tracking-header-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div>
              <div className="tracking-header-meta">
                <span className="tracking-order-badge">Order #{order.bookingId}</span>
                {isAdmin && <span className="tracking-admin-badge">ADMIN CONSOLE</span>}
                <span className="tracking-placed-date">Placed on {formatDate(order.createdAt)}</span>
              </div>
              <h2 id="tracking-modal-title" className="tracking-modal-title">
                {isAdmin ? 'Order Operations & Audit Tracking' : 'Package Tracking & Status'}
              </h2>
            </div>
          </div>

          <div className="tracking-header-actions">
            <button
              type="button"
              className={`tracking-refresh-btn ${refreshing ? 'rotating' : ''}`}
              onClick={() => fetchTracking(true)}
              title="Refresh tracking status"
              id="tracking-refresh-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="tracking-close-btn"
              onClick={onClose}
              aria-label="Close tracking modal"
              id="tracking-modal-close-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Modal Scrollable Content */}
        <div className="tracking-modal-body">
          {loading ? (
            <div className="tracking-loading-wrap">
              <div className="tracking-spinner-container">
                <div className="tracking-spinner-ring" />
                <div className="tracking-spinner-glow" />
                <div className="tracking-spinner-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
              </div>
              <div className="tracking-loading-content">
                <p className="tracking-loading-title">Retrieving Tracking Telemetry</p>
                <p className="tracking-loading-subtitle">Syncing live shipment milestones & status audit trail...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Status Banner (Visible to Both User and Admin) */}
              <div className={`tracking-status-banner ${badge.className}`}>
                <div className="tracking-status-info">
                  <div className="tracking-status-indicator">
                    <span className="tracking-pulse-dot" />
                    <span className="tracking-status-label">{badge.label}</span>
                  </div>
                  <h3 className="tracking-status-headline">
                    {currentStatus === 'DELIVERED'
                      ? 'Package has been successfully delivered'
                      : isCancelled
                      ? 'Order was cancelled or terminated'
                      : 'Shipment is on schedule and progressing'}
                  </h3>
                  <p className="tracking-status-sub">
                    {currentStatus === 'DELIVERED'
                      ? 'Delivered to shipping destination address.'
                      : isCancelled
                      ? 'No further transit activities will be scheduled for this order.'
                      : 'Estimated delivery in 3–5 business days.'}
                  </p>
                </div>

                <div className="tracking-status-amount">
                  <span className="tracking-amount-label">Order Total</span>
                  <span className="tracking-amount-val">{formatINR(Number(order.totalAmount))}</span>
                </div>
              </div>

              {/* 2. Progress Milestones Stepper (Visible to Both User and Admin) */}
              {!isCancelled ? (
                <div className="tracking-stepper-card">
                  <h4 className="tracking-card-section-title">Fulfillment Milestones</h4>
                  <div className="tracking-stepper">
                    {MILESTONES.map((step, idx) => {
                      const isCompleted = currentStageIdx >= idx;
                      const isCurrent = currentStageIdx === idx;

                      return (
                        <div
                          key={step.key}
                          className={`tracking-step-item ${
                            isCompleted ? 'completed' : ''
                          } ${isCurrent ? 'current' : ''}`}
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
                </div>
              ) : (
                <div className="tracking-cancelled-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <div>
                    <strong>Order Terminated:</strong> This shipment was {currentStatus.toLowerCase()}.
                  </div>
                </div>
              )}

              {/* 3. Package Contents & Delivery Destination (Visible to Both User and Admin) */}
              <div className="tracking-grid-two">
                {/* Product details */}
                <div className="tracking-info-card">
                  <h4 className="tracking-card-section-title">Package Items ({items.length})</h4>
                  <div className="tracking-mini-items-list">
                    {items.map((item) => {
                      const displaySize = cleanValue(item.size);
                      const displayColor = cleanValue(item.color);
                      return (
                        <div key={item.bookingItemId || item.productId} className="tracking-mini-item">
                          <div className="tracking-mini-thumb">
                            <TrackingMiniThumbnail src={item.imageUrl} alt={item.productName} />
                          </div>
                          <div className="tracking-mini-details">
                            <span className="tracking-mini-name">{item.productName}</span>
                            <span className="tracking-mini-specs">
                              Qty: <strong>{item.quantity}</strong>
                              {displaySize ? ` · Size: ${displaySize}` : ''}
                              {displayColor ? ` · Color: ${displayColor}` : ''}
                            </span>
                          </div>
                          <span className="tracking-mini-price">
                            {formatINR(Number(item.priceAtBooking) * Number(item.quantity))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Address details */}
                <div className="tracking-info-card">
                  <h4 className="tracking-card-section-title">Shipping Address</h4>
                  {address ? (
                    <div className="tracking-address-content">
                      <div className="tracking-address-pin">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Delivery Destination</span>
                      </div>
                      <p className="tracking-address-text">
                        {address.building && <span>{address.building}, </span>}
                        {address.area && <span>{address.area}<br /></span>}
                        <span>{address.city}, {address.state} — {address.pincode}</span>
                        {address.country && <><br /><span className="tracking-country">{address.country}</span></>}
                      </p>
                      {order.user?.phone && (
                        <div className="tracking-address-contact">
                          Contact: <strong>{order.user.phone}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="tracking-address-empty">Address information stored for order #{order.bookingId}.</p>
                  )}
                </div>
              </div>

              {/* ============================================================== */}
              {/* ADMIN PERSPECTIVE ONLY: State Transition & Activity Audit Trail */}
              {/* ============================================================== */}
              {isAdmin && (
                <>
                  {/* Admin Order Operations: State Transition Control */}
                  <div className="tracking-admin-management-card">
                    <div className="tracking-admin-management-header">
                      <div className="tracking-admin-title-wrap">
                        <span className="tracking-admin-chip">ORDER OPERATIONS</span>
                        <h4 className="tracking-card-section-title" style={{ margin: 0 }}>
                          State Transition Control
                        </h4>
                      </div>
                      <span className="tracking-admin-status-note">
                        Current Status: <strong>{currentStatus}</strong>
                      </span>
                    </div>

                    <p className="tracking-admin-management-desc">
                      Update the order lifecycle status across fulfillment systems. Every transition is immutably recorded in the compliance audit trail with the actor credentials and timestamp.
                    </p>

                    <div className="tracking-admin-controls-row">
                      <div className="tracking-admin-input-group">
                        <label htmlFor="admin-next-state" className="tracking-admin-label">
                          Target Lifecycle State:
                        </label>
                        <select
                          id="admin-next-state"
                          value={selectedNextState}
                          onChange={(e) => setSelectedNextState(e.target.value)}
                          className="tracking-admin-select"
                          disabled={transitioning}
                        >
                          <option value="CREATED">CREATED</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="FAILED">FAILED</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAdminStatusTransition}
                        disabled={transitioning || selectedNextState === currentStatus}
                        className="tracking-admin-action-btn"
                        id="admin-transition-status-btn"
                      >
                        {transitioning ? 'Executing Transition...' : 'Update Order Status'}
                      </button>
                    </div>
                  </div>

                  {/* Activity & Fulfillment Audit Log */}
                  <div className="tracking-translog-card">
                    <div className="tracking-translog-header">
                      <div>
                        <div className="tracking-admin-title-wrap" style={{ marginBottom: '4px' }}>
                          <span className="tracking-admin-chip">AUDIT TRAIL</span>
                          <h4 className="tracking-card-section-title" style={{ margin: 0 }}>
                            Activity & Fulfillment Audit Log
                          </h4>
                        </div>
                        <p className="tracking-translog-subtitle">
                          Chronological record of status transitions, fulfillment events, and administrative authorizations
                        </p>
                      </div>

                      <div className="tracking-view-toggle">
                        <button
                          type="button"
                          className={`tracking-toggle-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                          onClick={() => setActiveTab('timeline')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="20" x2="12" y2="10" />
                            <line x1="18" y1="20" x2="18" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="16" />
                          </svg>
                          Timeline View
                        </button>
                        <button
                          type="button"
                          className={`tracking-toggle-btn ${activeTab === 'table' ? 'active' : ''}`}
                          onClick={() => setActiveTab('table')}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </svg>
                          Table View
                        </button>
                      </div>
                    </div>

                    {logs.length === 0 ? (
                      <div className="tracking-empty-logs">
                        <p>No transition events recorded for this order yet.</p>
                      </div>
                    ) : activeTab === 'timeline' ? (
                      /* Timeline View */
                      <div className="tracking-timeline-list">
                        {logs.map((logItem, index) => {
                          const isLatest = index === logs.length - 1;
                          const logBadge = getStatusBadge(logItem.toState);

                          return (
                            <div
                              key={logItem.transLogId ? `log-${logItem.transLogId}` : `idx-${index}`}
                              className={`tracking-timeline-item ${isLatest ? 'latest' : ''}`}
                            >
                              <div className="tracking-timeline-marker">
                                <div className="tracking-timeline-dot">
                                  {logBadge.icon}
                                </div>
                                {index < logs.length - 1 && <div className="tracking-timeline-track" />}
                              </div>

                              <div className="tracking-timeline-content">
                                <div className="tracking-timeline-top">
                                  <div className="tracking-timeline-badge-group">
                                    <span className={`tracking-log-status-pill ${logBadge.className}`}>
                                      {logItem.toState}
                                    </span>
                                    {logItem.fromState && (
                                      <span className="tracking-log-transition-text">
                                        from <code>{logItem.fromState}</code>
                                      </span>
                                    )}
                                  </div>
                                  <span className="tracking-timeline-timestamp">
                                    {formatDate(logItem.createdAt)}
                                  </span>
                                </div>

                                <h5 className="tracking-timeline-title">
                                  {logItem.title || `Status updated to ${logItem.toState}`}
                                </h5>

                                {logItem.description && (
                                  <p className="tracking-timeline-desc">{logItem.description}</p>
                                )}

                                <div className="tracking-timeline-meta-row">
                                  <span className="tracking-timeline-actor">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                      <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    Authorized by: <strong>{logItem.createdBy || 'SYSTEM'}</strong>
                                  </span>

                                  {logItem.transLogId && (
                                    <span className="tracking-translog-id-pill">
                                      Event Ref #{logItem.transLogId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Table View */
                      <div className="tracking-table-container">
                        <table className="tracking-data-table">
                          <thead>
                            <tr>
                              <th>Event Ref</th>
                              <th>Prior Status</th>
                              <th>New Status</th>
                              <th>Authorized By</th>
                              <th>Recorded At</th>
                              <th>Event Summary</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((logItem, index) => (
                              <tr key={logItem.transLogId ? `tbl-${logItem.transLogId}` : `tbl-${index}`}>
                                <td>
                                  <span className="tracking-table-id">
                                    {logItem.transLogId ? `#${logItem.transLogId}` : '—'}
                                  </span>
                                </td>
                                <td>
                                  {logItem.fromState ? (
                                    <span className="tracking-table-state from">{logItem.fromState}</span>
                                  ) : (
                                    <span className="tracking-table-state initial">INITIAL</span>
                                  )}
                                </td>
                                <td>
                                  <span className="tracking-table-state to">{logItem.toState}</span>
                                </td>
                                <td>
                                  <span className="tracking-table-actor">{logItem.createdBy || 'SYSTEM'}</span>
                                </td>
                                <td>
                                  <span className="tracking-table-time">{formatDate(logItem.createdAt)}</span>
                                </td>
                                <td>
                                  <span className="tracking-table-title">{logItem.title || logItem.toState}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="tracking-modal-footer">
          <div className="tracking-footer-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              {isAdmin
                ? 'Admin Console: Audit trail inspection & lifecycle state management enabled'
                : 'Tracking status synced with dispatch and delivery network'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
