import { useState } from 'react';
import type { AddressResponse, AddAddressRequest, UpdateAddressRequest } from '../types';
import { getErrorMessage, ApiError } from '../api';

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
  const [country, setCountry] = useState(address?.country ?? 'India');
  const [pincode, setPincode] = useState(address?.pincode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEditing = !!address;

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!building.trim()) {
      errs.building = 'Building / flat / house number is required.';
    }
    if (!area.trim()) {
      errs.area = 'Area / street address is required.';
    }
    if (!city.trim()) {
      errs.city = 'City is required.';
    }
    if (!state.trim()) {
      errs.state = 'State is required.';
    }
    if (!country.trim()) {
      errs.country = 'Country is required.';
    }
    const cleanPincode = pincode.trim();
    if (!cleanPincode) {
      errs.pincode = 'Pincode is required.';
    } else if (!/^\d{6}$/.test(cleanPincode)) {
      errs.pincode = 'Pincode must be exactly 6 digits.';
    }
    return errs;
  }

  async function handleSave() {
    const valErrs = validate();
    if (Object.keys(valErrs).length > 0) {
      setFieldErrors(valErrs);
      setError(Object.values(valErrs)[0]);
      return;
    }

    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const base = {
        building: building.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        pincode: pincode.trim(),
      };
      if (isEditing) {
        await onSave({ addressId: address.addressId, ...base });
      } else {
        await onSave(base);
      }
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to save address. Please check your inputs.');
      setError(msg);
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{isEditing ? 'Edit address' : 'Add delivery address'}</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--slate)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="modal-form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="modal-fields">
          <label className="auth-label">
            Building / house no. *
            <input
              className={`auth-input ${fieldErrors.building ? 'has-error' : ''}`}
              placeholder="e.g. Flat 402, Sunshine Heights"
              value={building}
              onChange={(e) => {
                setBuilding(e.target.value);
                if (fieldErrors.building) setFieldErrors((prev) => ({ ...prev, building: '' }));
                if (error) setError(null);
              }}
              required
            />
            {fieldErrors.building && (
              <span className="field-error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.building}
              </span>
            )}
          </label>

          <label className="auth-label">
            Area / street *
            <input
              className={`auth-input ${fieldErrors.area ? 'has-error' : ''}`}
              placeholder="e.g. MG Road, Near City Mall"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                if (fieldErrors.area) setFieldErrors((prev) => ({ ...prev, area: '' }));
                if (error) setError(null);
              }}
              required
            />
            {fieldErrors.area && (
              <span className="field-error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {fieldErrors.area}
              </span>
            )}
          </label>

          <div className="auth-field-row">
            <label className="auth-label">
              City *
              <input
                className={`auth-input ${fieldErrors.city ? 'has-error' : ''}`}
                placeholder="e.g. Bengaluru"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (fieldErrors.city) setFieldErrors((prev) => ({ ...prev, city: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.city && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.city}
                </span>
              )}
            </label>

            <label className="auth-label">
              State *
              <input
                className={`auth-input ${fieldErrors.state ? 'has-error' : ''}`}
                placeholder="e.g. Karnataka"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  if (fieldErrors.state) setFieldErrors((prev) => ({ ...prev, state: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.state && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.state}
                </span>
              )}
            </label>
          </div>

          <div className="auth-field-row">
            <label className="auth-label">
              Country *
              <input
                className={`auth-input ${fieldErrors.country ? 'has-error' : ''}`}
                placeholder="e.g. India"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (fieldErrors.country) setFieldErrors((prev) => ({ ...prev, country: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.country && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.country}
                </span>
              )}
            </label>

            <label className="auth-label">
              Pincode (6 digits) *
              <input
                className={`auth-input ${fieldErrors.pincode ? 'has-error' : ''}`}
                placeholder="e.g. 560001"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value.replace(/\D/g, ''));
                  if (fieldErrors.pincode) setFieldErrors((prev) => ({ ...prev, pincode: '' }));
                  if (error) setError(null);
                }}
                required
              />
              {fieldErrors.pincode && (
                <span className="field-error-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {fieldErrors.pincode}
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add address'}
          </button>
        </div>
      </div>
    </div>
  );
}