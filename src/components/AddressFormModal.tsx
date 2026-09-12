import { useState } from 'react';
import type { AddressResponse, AddAddressRequest, UpdateAddressRequest } from '../types';

interface AddressFormModalProps {
  address?: AddressResponse;
  onSave: (payload: AddAddressRequest | UpdateAddressRequest) => Promise<void>;
  onClose: () => void;
}

export default function AddressFormModal({ address, onSave, onClose }: AddressFormModalProps) {
  const [building, setBuilding] = useState(address?.building ?? '');
  const [area, setArea] = useState(address?.area ?? '');
  const [city, setCity] = useState(address?.city ?? '');
  const [state, setState] = useState(address?.state ?? '');
  const [country, setCountry] = useState(address?.country ?? '');
  const [pincode, setPincode] = useState(address?.pincode ?? '');
  const [saving, setSaving] = useState(false);

  const isEditing = !!address;

  async function handleSave() {
    setSaving(true);
    try {
      const base = { building, area, city, state, country, pincode };
      if (isEditing) {
        await onSave({ addressId: address.addressId, ...base });
      } else {
        await onSave(base);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditing ? 'Edit address' : 'Add address'}</h2>

        <div className="modal-fields">
          <label className="auth-label">
            Building / house no.
            <input className="auth-input" value={building} onChange={(e) => setBuilding(e.target.value)} />
          </label>
          <label className="auth-label">
            Area / street
            <input className="auth-input" value={area} onChange={(e) => setArea(e.target.value)} />
          </label>
          <div className="auth-field-row">
            <label className="auth-label">
              City
              <input className="auth-input" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="auth-label">
              State
              <input className="auth-input" value={state} onChange={(e) => setState(e.target.value)} />
            </label>
          </div>
          <div className="auth-field-row">
            <label className="auth-label">
              Country
              <input className="auth-input" value={country} onChange={(e) => setCountry(e.target.value)} />
            </label>
            <label className="auth-label">
              Pincode
              <input className="auth-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </div>
    </div>
  );
}