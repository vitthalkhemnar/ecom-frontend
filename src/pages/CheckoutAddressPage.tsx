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
  createPaymentOrder,
  verifyPayment,
  sendMail,
  getUserDetails,
  formatINR,
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
    } catch {
      toast.error("Could not save that address.");
      throw new Error("save failed");
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
    } catch {
      toast.error("Could not delete that address.");
    }
  }

  async function handlePlaceOrder() {
    if (!isAuthenticated || items.length === 0 || selectedId === null) {
      return;
    }

    setPlacingOrder(true);

    try {
      const userDetails = await getUserDetails();
      const user = Array.isArray(userDetails) ? userDetails[0] : userDetails;

      /*
       * STEP 1
       * Create your normal application order first.
       *
       * This gives us the bookingId which will be passed
       * to the Razorpay payment service as orderId.
       */
      const order = await createOrder({
        totalAmount: totalPrice.toFixed(2),
        addressId: selectedId,
        items: effectiveOrderItems,
      });

      /*
       * STEP 2
       * Create Razorpay order using the bookingId.
       */
      const razorpayOrder = await createPaymentOrder({
        amount: totalPrice,
        orderId: order.bookingId,
      });

      /*
       * STEP 3
       * Open Razorpay Checkout.
       */
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,

        amount: razorpayOrder.amount,

        currency: razorpayOrder.currency,

        name: "Bazaar",

        description: `Order #${order.bookingId}`,

        order_id: razorpayOrder.id,

        prefill: { email: user.email, contact: user.phone },

        method: "upi",
        upi: { qr: true },

        handler: async (response: RazorpayPaymentResponse) => {
          orderPlacedRef.current = true;
          const confirmedOrderId = order.bookingId || (order as any).orderId;

          try {
            /*
             * STEP 4
             * Verify Razorpay payment on backend.
             */
            const isVerified = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (!isVerified) {
              toast.error("Payment verification failed.");
              return;
            }

            /*
             * STEP 5
             * Send confirmation email (non-blocking).
             */
            try {
              if (user?.email) {
                await sendMail({
                  to: user.email,
                  data: {
                    bookingId: confirmedOrderId,
                    username: order.username || user.username,
                    status: order.status || "CONFIRMED",
                    totalAmount: order.totalAmount,
                    orderDate: new Date(order.createdAt || Date.now()).toLocaleString(
                      "en-IN",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      },
                    ),
                    items: (order.items || effectiveOrderItems).map((item) => ({
                      productName: item.productName,
                      variant:
                        [item.color, item.size].filter(Boolean).join(" · ") ||
                        "Standard",
                      quantity: String(item.quantity),
                      priceAtBooking: String(item.priceAtBooking),
                      lineTotal: (
                        Number(item.priceAtBooking) * Number(item.quantity)
                      ).toFixed(2),
                    })),
                  },
                });
              }
            } catch (mailError) {
              console.warn("Confirmation email could not be sent:", mailError);
            }

            /*
             * STEP 6
             * Remove purchased items from cart (non-blocking).
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
            navigate(`/orders/${confirmedOrderId}`);
          } catch (error) {
            console.error("Payment verification/post-payment error:", error);
            toast.error("Payment was completed, but order processing failed.");
          } finally {
            setPlacingOrder(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
            toast("Payment cancelled.");
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
      razorpay.open();
    } catch (error) {
      console.error("Order/payment initialization failed:", error);

      toast.error("Unable to start payment.");

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
    </div>
  );
}
