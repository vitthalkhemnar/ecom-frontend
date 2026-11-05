import { useEffect, useState, useRef } from "react";
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
  confirmOrder,
  rollbackOrder,
  markOrderFailed,
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

  const orderItems: CreateOrderItem[] = location.state?.orderItems ?? [];

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

  // Initial redirect: only if cart was already empty upon opening checkout
  useEffect(() => {
    if (!orderPlacedRef.current && items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, []);

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

      toast.success("Address saved.");
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
    if (!isAuthenticated || items.length === 0 || selectedId === null) {
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
        totalAmount: totalPrice.toFixed(2),
        addressId: selectedId,
        items: effectiveOrderItems,
      });

      const currentOrderId = order.bookingId || (order as any).orderId;

      /*
       * STEP 2
       * Create Razorpay order using the bookingId.
       */
      let razorpayOrder;
      try {
        razorpayOrder = await createPaymentOrder({
          amount: totalPrice,
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

        prefill: { email: user.email, contact: user.phone },

        method: "upi",
        upi: { qr: true },

        handler: async (response: RazorpayPaymentResponse) => {
          orderPlacedRef.current = true;
          let paymentVerified = false;

          try {
            /*
             * STEP 4
             * Verify Razorpay payment signature on backend.
             */
            const isVerified = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (!isVerified) {
              try {
                await rollbackOrder(currentOrderId, "Payment verification signature mismatch");
              } catch (rbErr) {
                console.error("Order rollback error on verification mismatch:", rbErr);
              }
              toast.error("Payment failed. Please try again.");
              return;
            }

            // Payment successfully verified by payment-service
            paymentVerified = true;

            /*
             * STEP 5
             * Confirm order state to CONFIRMED.
             * This triggers the order confirmation email via Kafka.
             */
            await confirmOrder(currentOrderId);

            /*
             * STEP 6
             * Remove purchased items from cart only after confirmation.
             */
            try {
              for (const item of items) {
                await removeItem({
                  productId: item.productId,
                  variantId: item.variantId,
                  price: item.price,
                  quantity: item.quantity,
                });
              }
            } catch (cartError) {
              console.warn("Could not remove some items from cart:", cartError);
            }

            toast.success("Payment successful. Order placed!");

            /*
             * STEP 7
             * Navigate to order confirmation page.
             */
            navigate(`/orders/${currentOrderId}`);
          } catch (error: unknown) {
            console.error("Payment verification/post-payment error:", error);
            if (paymentVerified) {
              // Payment succeeded but downstream error occurred (e.g. during confirmOrder)
              // Mark order as FAILED (do NOT delete, as money was deducted)
              try {
                await markOrderFailed(currentOrderId, "System error after successful payment");
              } catch (failErr) {
                console.error("Failed to mark order as FAILED:", failErr);
              }
              toast.error("Payment succeeded, but an issue occurred while finalizing your order. Please contact support.");
            } else {
              // Payment verification failed or threw before payment was confirmed
              try {
                await rollbackOrder(currentOrderId, "Payment verification failed");
              } catch (rbErr) {
                console.error("Order rollback error on catch:", rbErr);
              }
              toast.error("Payment failed. Please try again.");
            }
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

      razorpay.on('payment.failed', async function (response: any) {
        setPlacingOrder(false);
        if (!orderPlacedRef.current) {
          try {
            await rollbackOrder(currentOrderId, response?.error?.description || "Payment failed at gateway");
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
      <h1 className="detail-title">Choose delivery address</h1>

      {addresses.length === 0 ? (
        <p className="state-msg">No saved addresses yet.</p>
      ) : (
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
                <span className="address-card-line">
                  {addr.building}, {addr.area}
                </span>

                <span className="address-card-line">
                  {addr.city}, {addr.state} — {addr.pincode}
                </span>

                <span className="address-card-line admin-cell-muted">
                  {addr.country}
                </span>
              </div>

              <div className="admin-row-actions">
                <button
                  type="button"
                  className="admin-edit-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingAddress(addr);
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="admin-delete-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteAddress(addr.addressId);
                  }}
                >
                  Delete
                </button>
              </div>
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        className="admin-cancel-btn"
        style={{ marginTop: 16 }}
        onClick={() => {
          setEditingAddress(undefined);
          setShowForm(true);
        }}
      >
        + Add new address
      </button>

      <div className="cart-total" style={{ marginTop: 32 }}>
        <span>Order total</span>
        <span>{formatINR(totalPrice)}</span>
      </div>

      <button
        type="button"
        className="checkout-btn"
        onClick={handlePlaceOrder}
        disabled={selectedId === null || placingOrder || items.length === 0}
      >
        {placingOrder ? "Processing payment…" : `Pay ${formatINR(totalPrice)}`}
      </button>

      {showForm && (
        <AddressFormModal
          address={editingAddress}
          onSave={handleSaveAddress}
          onClose={() => setShowForm(false)}
        />
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
