import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CartIcon from './components/CartIcon.tsx';
import { CartProvider } from './context/CartContext.tsx';
import CartPage from './pages/CartPage.tsx';
import OrdersIcon from './components/OrdersIcon.tsx';
import OrdersListPage from './pages/OrdersListPage.tsx';
import OrderDetailPage from './pages/OrderDetailPage.tsx';
import { Toaster } from 'react-hot-toast';

function Header() {
  const { isAuthenticated, username, logout } = useAuth();
  return (
    <header className="site-header">
      <Link to="/" className="wordmark">Bazaar</Link>
      <span className="tagline">everything, in one aisle</span>
      <div className="header-auth">
        {isAuthenticated && <CartIcon />}
        {isAuthenticated && <OrdersIcon />}
        {isAuthenticated ? (
          <>
            <span className="header-username">Hi, {username}</span>
            <button className="header-logout" onClick={logout}>Log out</button>
          </>
        ) : (
          <Link to="/login" className="header-login-link">Log in</Link>
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Toaster position='top-center'></Toaster>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/" element={<ProtectedRoute><ProductListPage /></ProtectedRoute>} />
            <Route path="/product/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersListPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;