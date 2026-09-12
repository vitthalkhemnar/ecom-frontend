import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  getAllAddress, addAddress, updateAddress, deleteAddress,
  createOrder, sendMail, getUserDetails, formatINR,
} from '../api';
import AddressFormModal from '../components/AddressFormModal';
import type { AddressResponse, AddAddressRequest, UpdateAddressRequest, CreateOrderItem } from '../types';

type Status = 'loading' | 'ready' | 'error';

export default function CheckoutAddressPage() {
  const { token } = useAuth();
  const { items, totalPrice, removeItem } = useCart();
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressResponse | undefined>(undefined);
  const [placingOrder, setPlacingOrder] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const orderItems = location.state?.orderItems;

  useEffect(() => {
    if (!token) return;
    getAllAddress(token)
      .then((data) => {
        setAddresses(data);
        if (data.length > 0) setSelectedId(data[0].addressId);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  async function handleSaveAddress(payload: AddAddressRequest | UpdateAddressRequest) {
    if (!token) return;
    try {
      const updated = 'addressId' in payload
        ? await updateAddress(payload, token)
        : await addAddress(payload, token);
      setAddresses(updated);
      if (!selectedId && updated.length > 0) setSelectedId(updated[updated.length - 1].addressId);
      toast.success('Address saved.');
    } catch {
      toast.error('Could not save that address.');
      throw new Error('save failed');
    }
  }

  async function handleDeleteAddress(addressId: number) {
    if (!token) return;
    if (!window.confirm('Delete this address?')) return;
    try {
      const updated = await deleteAddress(addressId, token);
      setAddresses(updated);
      if (selectedId === addressId) {
        setSelectedId(updated.length > 0 ? updated[0].addressId : null);
      }
      toast.success('Address deleted.');
    } catch {
      toast.error('Could not delete that address.');
    }
  }

  async function handlePlaceOrder() {
    if (!token || items.length === 0 || selectedId === null) return;
    setPlacingOrder(true);
    try {
      const order = await createOrder(
        { totalAmount: totalPrice.toFixed(2), addressId: selectedId, items: orderItems },
        token
      );

      try {
        const userDetails = await getUserDetails(token);
        const user = Array.isArray(userDetails) ? userDetails[0] : userDetails;
        if (user?.email) {
           await sendMail(
              {
                to: user.email,
                data: {
                  bookingId: order.bookingId,
                  username: order.username,
                  status: order.status,
                  totalAmount: order.totalAmount,
                  orderDate: new Date(order.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                  items: order.items.map((item) => ({
                    productName: item.productName,
                    variant: [item.color, item.size].filter(Boolean).join(' · ') || 'Standard',
                    quantity: item.quantity,
                    priceAtBooking: item.priceAtBooking,
                    lineTotal: (Number(item.priceAtBooking) * Number(item.quantity)).toFixed(2),
                  })),
                },
              },
              token
            );
        }
      } catch {
        toast.error('Order placed, but the confirmation email could not be sent.');
      }

      for (const item of items) {
        await removeItem({ productId: item.productId, variantId: item.variantId, price: item.price, quantity: item.quantity });
      }

      navigate(`/orders/${order.bookingId}`);
    } catch {
      toast.error('Could not place your order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  }

  if (status === 'loading') return <div className="page"><p className="state-msg">Loading addresses…</p></div>;
  if (status === 'error') return <div className="page"><p className="state-msg error">Couldn't load your addresses.</p></div>;

  return (
    <div className="page">
      <h1 className="detail-title">Choose delivery address</h1>

      {addresses.length === 0 ? (
        <p className="state-msg">No saved addresses yet.</p>
      ) : (
        <div className="address-list">
          {addresses.map((addr) => (
            <label key={addr.addressId} className={`address-card ${selectedId === addr.addressId ? 'selected' : ''}`}>
              <input
                type="radio"
                name="address"
                checked={selectedId === addr.addressId}
                onChange={() => setSelectedId(addr.addressId)}
              />
              <div className="address-card-body">
                <span className="address-card-line">{addr.building}, {addr.area}</span>
                <span className="address-card-line">{addr.city}, {addr.state} — {addr.pincode}</span>
                <span className="address-card-line admin-cell-muted">{addr.country}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" className="admin-edit-btn" onClick={(e) => { e.preventDefault(); setEditingAddress(addr); setShowForm(true); }}>
                  Edit
                </button>
                <button type="button" className="admin-delete-btn" onClick={(e) => { e.preventDefault(); handleDeleteAddress(addr.addressId); }}>
                  Delete
                </button>
              </div>
            </label>
          ))}
        </div>
      )}

      <button type="button" className="admin-cancel-btn" style={{ marginTop: 16 }} onClick={() => { setEditingAddress(undefined); setShowForm(true); }}>
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
        {placingOrder ? 'Placing order…' : 'Place order'}
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