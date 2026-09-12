import { Link } from 'react-router-dom';

interface AddToCartResultModalProps {
  status: 'success' | 'error';
  productName: string;
  onClose: () => void;
}

export default function AddToCartResultModal({ status, productName, onClose }: AddToCartResultModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {status === 'success' ? (
          <>
            <h2 className="modal-title">Added to cart</h2>
            <p className="auth-note">{productName} is in your cart.</p>
            <div className="modal-actions">
              <button type="button" className="admin-cancel-btn" onClick={onClose}>
                Keep browsing
              </button>
              <Link to="/cart" className="modal-login-btn">
                Go to cart
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-title">Couldn't add to cart</h2>
            <p className="auth-note">Something went wrong adding {productName} to your cart. Please try again.</p>
            <div className="modal-actions">
              <button type="button" className="admin-save-btn" onClick={onClose}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}