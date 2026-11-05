import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  getAllAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  createOrder,
  rollbackOrder,
  createPaymentOrder,
  verifyPayment,
  getUserDetails,
  formatINR,
  getErrorMessage,
} from "../api";
import AddressFormModal from "../components/AddressFormModal";
import type {
  AddressResponse,
  AddAddressRequest,
  UpdateAddressRequest,
  CreateOrderItem,
} from "../types";

type Status = "loading" | "ready" | "error";

export default function CheckoutAddressPage() {
  const { isAuthenticated } = useAuth();
  const { items, totalPrice, removeItem } = useCart();

  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<
    AddressResponse | undefined
  >(undefined);
  const [placingOrder, setPlacingOrder] = useState(false);
  const orderPlacedRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  const orderItems: CreateOrderItem[] = useMemo(
    () => location.state?.orderItems ?? [],
    [location.state?.orderItems]
  );

  const effectiveOrderItems: CreateOrderItem[] = orderItems.length > 0
    ? orderItems
    : items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: `Product #${item.productId}`,
        size: '',
        color: '',
        quantity: String(item.quantity),
        priceAtBooking: String(item.price),
      }));

  const effectiveTotalPrice = useMemo(() => {
    if (orderItems.length > 0) {
      return orderItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.priceAtBooking) || 0;
        return acc + price * qty;
      }, 0);
    }
    return totalPrice;
  }, [orderItems, totalPrice]);

  // Initial redirect: only if neither cart nor direct order items exist
  useEffect(() => {
    if (!orderPlacedRef.current && items.length === 0 && orderItems.length === 0) {
      navigate('/cart', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, orderItems.length]);

  // Prevent browser navigation, back button, and tab closing while payment is processing
  useEffect(() => {
    if (!placingOrder) return;

    // Trap Browser Back Arrow using history.pushState + popstate
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      // Re-push state to keep user on checkout page
      window.history.pushState(null, '', window.location.href);
      toast.error("Payment in progress! Please do not use the browser back button.", {
        id: "payment-back-warning",
      });
    };

    // Trap page refresh or tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [placingOrder]);

  useEffect(() => {
    if (!isAuthenticated) return;

    getAllAddress()
      .then((data) => {
        setAddresses(data);

        if (data.length > 0) {
          setSelectedId(data[0].addressId);
        }

        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [isAuthenticated]);

  async function handleSaveAddress(
    payload: AddAddressRequest | UpdateAddressRequest,
  ) {
    if (!isAuthenticated) return;

    try {
      const updated =
        "addressId" in payload
          ? await updateAddress(payload)
          : await addAddress(payload);

      setAddresses(updated);

      if (!selectedId && updated.length > 0) {
        setSelectedId(updated[updated.length - 1].addressId);
      }

      setShowForm(false);
      setEditingAddress(undefined);
      toast.success("Address saved successfully.");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Could not save that address.");
      toast.error(msg);
      throw err;
    }
  }

  async function handleDeleteAddress(addressId: number) {
    if (!isAuthenticated) return;

    if (!window.confirm("Delete this address?")) return;

    try {
      const updated = await deleteAddress(addressId);

      setAddresses(updated);

      if (selectedId === addressId) {
        setSelectedId(updated.length > 0 ? updated[0].addressId : null);
      }

      toast.success("Address deleted.");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Could not delete that address."));
    }
  }

  async function handlePlaceOrder() {
    if (!isAuthenticated || effectiveOrderItems.length === 0 || selectedId === null) {
      return;
    }

    setPlacingOrder(true);
    orderPlacedRef.current = false;

    try {
      const userDetails = await getUserDetails();
      const user = Array.isArray(userDetails) ? userDetails[0] : userDetails;

      /*
       * STEP 1
       * Create your normal application order first in CREATED state.
       * (No confirmation email is sent here).
       */
      const order = await createOrder({
        totalAmount: effectiveTotalPrice.toFixed(2),
        addressId: selectedId,
        items: effectiveOrderItems,
      });

      const currentOrderId = (order.bookingId || (order as unknown as { orderId?: string }).orderId) as string | number;
      if (!currentOrderId) {
        throw new Error("Failed to receive booking ID for order");
      }

      /*
       * STEP 2
       * Create Razorpay order using the bookingId.
       */
      let razorpayOrder;
      try {
        razorpayOrder = await createPaymentOrder({
          amount: effectiveTotalPrice,
          orderId: currentOrderId,
        });
      } catch (payOrderErr) {
        try {
          await rollbackOrder(currentOrderId, "Payment order initialization failed");
        } catch (rbErr) {
          console.error("Order rollback error:", rbErr);
        }
        throw payOrderErr;
      }

      /*
       * STEP 3
       * Open Razorpay Checkout.
       */
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        name: "Bazaar",

        description: `Order #${currentOrderId}`,

        order_id: razorpayOrder.id,

        prefill: { email: user?.email, contact: user?.phone },

        method: "upi",
        upi: { qr: true },

        handler: async (response: RazorpayPaymentResponse) => {
          orderPlacedRef.current = true;

          try {
            /*
             * STEP 4
             * Verify Razorpay payment signature on backend.
             * Backend payment-service automatically publishes PaymentSuccessEvent / PaymentFailedEvent
             * to Kafka, updating order-service state asynchronously.
             */
            const isVerified = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: Number(currentOrderId),
            });

            if (!isVerified) {
              toast.error("Payment failed. Please try again.");
              return;
            }

            /*
             * STEP 5
             * Remove purchased items from cart after successful payment.
             */
            try {
              for (const item of effectiveOrderItems) {
                await removeItem({
                  productId: item.productId,
                  variantId: item.variantId,
                  price: Number(item.priceAtBooking) || 0,
                  quantity: Number(item.quantity) || 1,
                });
              }
            } catch (cartError) {
              console.warn("Could not remove some items from cart:", cartError);
            }

            toast.success("Payment successful. Order placed!");

            /*
             * STEP 6
             * Navigate to order confirmation page.
             */
            navigate(`/orders/${currentOrderId}`);
          } catch (error: unknown) {
            console.error("Payment verification error:", error);
            toast.error("Payment failed. Please try again.");
          } finally {
            setPlacingOrder(false);
          }
        },

        modal: {
          ondismiss: async () => {
            setPlacingOrder(false);
            if (!orderPlacedRef.current) {
              try {
                await rollbackOrder(currentOrderId, "Payment cancelled by user");
              } catch (rbErr) {
                console.warn("Order rollback error on dismiss:", rbErr);
              }
              toast.error("Payment failed. Please try again.");
            }
          },
        },

        theme: {
          color: "#3399cc",
        },
      };

      /*
       * STEP 3 continued
       * Create and open Razorpay popup.
       */
      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', async function (response: unknown) {
        setPlacingOrder(false);
        if (!orderPlacedRef.current) {
          try {
            const resObj = response as { error?: { description?: string } } | undefined;
            await rollbackOrder(currentOrderId, resObj?.error?.description || "Payment failed at gateway");
          } catch (rbErr) {
            console.warn("Order rollback error on payment.failed:", rbErr);
          }
          toast.error("Payment failed. Please try again.");
        }
      });

      razorpay.open();
    } catch (error: unknown) {
      console.error("Order/payment initialization failed:", error);
      toast.error(getErrorMessage(error, "Unable to start payment."));
      setPlacingOrder(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="page">
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div className="loading-spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page">
        <div className="order-empty-state">
          <div className="order-empty-icon-wrap" style={{ color: 'var(--rust)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="order-empty-title">Unable to load addresses</h2>
          <p className="order-empty-desc">An error occurred while retrieving your delivery addresses. Please try again.</p>
          <button type="button" className="order-cta-btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="detail-title">Choose Delivery Address</h1>

      {showForm ? (
        <div className="checkout-address-inline-section" id="checkout-address-inline-section">
          <AddressFormModal
            inline
            address={editingAddress}
            onSave={handleSaveAddress}
            onClose={() => {
              setShowForm(false);
              setEditingAddress(undefined);
            }}
          />
        </div>
      ) : (
        <>
          {addresses.length === 0 ? (
            <div className="empty-address-container" style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--paper)', borderRadius: '8px', border: '1px solid var(--line)', margin: '16px 0' }}>
              <p className="state-msg" style={{ margin: '0 0 16px' }}>No saved delivery addresses found.</p>
              <button
                type="button"
                className="auth-submit"
                style={{ width: 'auto', display: 'inline-block', margin: '0 auto', padding: '10px 24px' }}
                onClick={() => {
                  setEditingAddress(undefined);
                  setShowForm(true);
                }}
              >
                + Add Delivery Address
              </button>
            </div>
          ) : (
            <>
              <div className="address-list">
                {addresses.map((addr) => (
                  <label
                    key={addr.addressId}
                    className={`address-card ${
                      selectedId === addr.addressId ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedId === addr.addressId}
                      onChange={() => setSelectedId(addr.addressId)}
                    />

                    <div className="address-card-body">
                      <span className="address-card-line address-card-bold">
                        {addr.building}, {addr.area}
                      </span>

                      <span className="address-card-line">
                        {addr.city}, {addr.state} — {addr.pincode}
                      </span>

                      <span className="address-card-line admin-cell-muted">
                        {addr.country}
                      </span>
                    </div>

                    <div className="address-card-actions">
                      <button
                        type="button"
                        className="address-btn address-edit-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingAddress(addr);
                          setShowForm(true);
                        }}
                        title="Edit address"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="address-btn address-delete-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteAddress(addr.addressId);
                        }}
                        title="Delete address"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="add-new-address-btn"
                onClick={() => {
                  setEditingAddress(undefined);
                  setShowForm(true);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add new address</span>
              </button>
            </>
          )}

          <div className="cart-total" style={{ marginTop: 32 }}>
            <span>Order total</span>
            <span>{formatINR(effectiveTotalPrice)}</span>
          </div>

          <button
            type="button"
            className="checkout-btn"
            onClick={handlePlaceOrder}
            disabled={selectedId === null || placingOrder || effectiveOrderItems.length === 0}
          >
            {placingOrder ? "Processing payment…" : `Pay ${formatINR(effectiveTotalPrice)}`}
          </button>
        </>
      )}

      {/* Full-Screen Freeze Overlay while Payment is Processing */}
      {placingOrder && (
        <div className="payment-freeze-overlay" role="dialog" aria-modal="true" aria-label="Processing Payment">
          <div className="payment-freeze-card">
            <div className="payment-freeze-spinner" />
            <div className="payment-freeze-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="payment-freeze-title">Processing Payment Securely</h3>
            <p className="payment-freeze-desc">
              Please wait while your transaction is being processed.
            </p>
            <div className="payment-freeze-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Do not refresh, close the tab, or press the browser back button.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
