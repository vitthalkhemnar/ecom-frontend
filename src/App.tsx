import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import ProtectedRoute from './components/ProtectedRoute';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

function Header() {
  const { isAuthenticated, username, logout } = useAuth();
  return (
    <header className="site-header">
      <Link to="/" className="wordmark">Bazaar</Link>
      <span className="tagline">everything, in one aisle</span>
      <div className="header-auth">
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
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><ProductListPage /></ProtectedRoute>} />
          <Route path="/product/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;