import { Link } from 'react-router-dom';

interface LoginPromptModalProps {
  onClose: () => void;
}

export default function LoginPromptModal({ onClose }: LoginPromptModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Log in to Bazaar</h2>
        <p className="auth-note">
          Log in to add items to your cart, place orders, and pick up where you left off.
        </p>
        <div className="modal-actions">
          <button type="button" className="admin-cancel-btn" onClick={onClose}>
            Maybe later
          </button>
          <Link to="/login" className="modal-login-btn">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}