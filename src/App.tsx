import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
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

function Header() {
  const { isAuthenticated } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  return (
    <header className="site-header">
      <Link to="/" className="wordmark">Bazaar</Link>
      <div className="header-search">
        <input
          className="header-search-input"
          type="text"
          placeholder="Search products, brands, categories…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="header-auth">
        {isAuthenticated ? (
          <>
            <CartIcon />
            <UserMenu />
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
      <SearchProvider>
        <CartProvider>
          <Toaster position="top-center" />
          <BrowserRouter>
            <Header />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/product/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrdersListPage /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;