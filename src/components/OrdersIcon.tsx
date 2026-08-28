import { Link } from 'react-router-dom';

export default function OrdersIcon() {
  return (
    <Link to="/orders" className="cart-icon" aria-label="Order history">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 2h6a2 2 0 0 1 2 2v18l-5-3-5 3V4a2 2 0 0 1 2-2z" />
      </svg>
    </Link>
  );
}