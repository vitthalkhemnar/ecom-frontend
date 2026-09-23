import { useEffect, useState } from "react";
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
  const { token } = useAuth();
  const { items, totalPrice, removeItem } = useCart();

  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<
    AddressResponse | undefined
  >(undefined);
  const [placingOrder, setPlacingOrder] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const orderItems: CreateOrderItem[] = location.state?.orderItems ?? [];

  useEffect(() => {
    if (!token) return;

    getAllAddress(token)
      .then((data) => {
        setAddresses(data);

        if (data.length > 0) {
          setSelectedId(data[0].addressId);
        }

        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function handleSaveAddress(
    payload: AddAddressRequest | UpdateAddressRequest,
  ) {
    if (!token) return;

    try {
      const updated =
        "addressId" in payload
          ? await updateAddress(payload, token)
          : await addAddress(payload, token);

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
    if (!token) return;

    if (!window.confirm("Delete this address?")) return;

    try {
      const updated = await deleteAddress(addressId, token);

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
    if (!token || items.length === 0 || selectedId === null) {
      return;
    }

    setPlacingOrder(true);

    try {
      const userDetails = await getUserDetails(token);
      const user = Array.isArray(userDetails) ? userDetails[0] : userDetails;

      /*
       * STEP 1
       * Create your normal application order first.
       *
       * This gives us the bookingId which will be passed
       * to the Razorpay payment service as orderId.
       */
      const order = await createOrder(
        {
          totalAmount: totalPrice.toFixed(2),
          addressId: selectedId,
          items: orderItems,
        },
        token,
      );

      /*
       * STEP 2
       * Create Razorpay order using the bookingId.
       */
      const razorpayOrder = await createPaymentOrder(
        {
          amount: totalPrice,
          orderId: order.bookingId,
        },
        token,
      );

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
          try {
            /*
             * STEP 4
             * Verify Razorpay payment on backend.
             */
            const isVerified = await verifyPayment(
              {
                razorpayOrderId: response.razorpay_order_id,

                razorpayPaymentId: response.razorpay_payment_id,

                razorpaySignature: response.razorpay_signature,
              },
              token,
            );

            if (!isVerified) {
              toast.error("Payment verification failed.");
              return;
            }

            /*
             * Payment is successfully verified.
             *
             * Now continue with the existing
             * post-order processing.
             */

            /*
             * STEP 5
             * Send confirmation email.
             */
            try {
              if (user?.email) {
                await sendMail(
                  {
                    to: user.email,

                    data: {
                      bookingId: order.bookingId,
                      username: order.username,
                      status: order.status,
                      totalAmount: order.totalAmount,

                      orderDate: new Date(order.createdAt).toLocaleString(
                        "en-IN",
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                        },
                      ),

                      items: order.items.map((item) => ({
                        productName: item.productName,

                        variant:
                          [item.color, item.size].filter(Boolean).join(" · ") ||
                          "Standard",

                        quantity: item.quantity,

                        priceAtBooking: item.priceAtBooking,

                        lineTotal: (
                          Number(item.priceAtBooking) * Number(item.quantity)
                        ).toFixed(2),
                      })),
                    },
                  },
                  token,
                );
              }
            } catch {
              toast.error(
                "Order placed, but the confirmation email could not be sent.",
              );
            }

            /*
             * STEP 6
             * Remove purchased items from cart.
             */
            for (const item of items) {
              await removeItem({
                productId: item.productId,
                variantId: item.variantId,
                price: item.price,
                quantity: item.quantity,
              });
            }

            toast.success("Payment successful. Order placed!");

            /*
             * STEP 7
             * Navigate to existing order details.
             */
            navigate(`/orders/${order.bookingId}`);
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
        <p className="state-msg">Loading addresses…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page">
        <p className="state-msg error">Couldn't load your addresses.</p>
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
