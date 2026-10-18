import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CartIcon from './components/CartIcon.tsx';
import { CartProvider } from './context/CartContext.tsx';
import CartPage from './pages/CartPage.tsx';
import OrdersListPage from './pages/OrdersListPage.tsx';
import OrderDetailPage from './pages/OrderDetailPage.tsx';
import { Toaster } from 'react-hot-toast';
import UserMenu from './components/UserMenu.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import AdminRoute from './components/AdminRoute.tsx';
import AdminDashboardPage from './pages/AdminDashboardPage.tsx';
import { SearchProvider, useSearch } from './context/SearchContext.tsx';
import HomePage from './pages/HomePage.tsx';
import CheckoutAddressPage from './pages/CheckoutAddressPage.tsx';

function Header() {
  const { isAuthenticated } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = ['/login', '/signup', '/forgot-password', '/admin/login', '/admin-login'].includes(location.pathname);
  const isAdminDashboard = location.pathname.startsWith('/admin');
  const isCheckout = location.pathname === '/checkout';

  // Only show search on consumer browsing pages
  const showSearch = !isAuthPage && !isAdminDashboard && !isCheckout;
  // Only show cart on consumer pages
  const showCart = !isAuthPage && !isAdminDashboard;

  return (
    <header className="site-header">
      <Link to="/" className="wordmark">
        Bazaar
        {isAdminDashboard && (
          <span style={{ fontSize: '12px', opacity: 0.65, fontWeight: 500, marginLeft: '8px', letterSpacing: '0.05em' }}>
            ADMIN
          </span>
        )}
      </Link>

      {showSearch && (
        <div className="header-search">
          <input
            className="header-search-input"
            type="text"
            placeholder="Search products, brands, categories…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (location.pathname !== '/' && e.target.value) {
                navigate('/');
              }
            }}
          />
        </div>
      )}

      <div className="header-auth">
        {isAuthenticated ? (
          <>
            {showCart && <CartIcon />}
            <UserMenu />
          </>
        ) : (
          !isAuthPage && (
            <>
              {showCart && <CartIcon />}
              <Link to="/login" className="header-login-link">
                Log in
              </Link>
            </>
          )
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <Toaster position="top-center" />
          <BrowserRouter>
            <Header />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Admin Routes (Unclickable link, accessible via URL) */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />

              {/* Protected User Routes */}
              <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrdersListPage /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutAddressPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;