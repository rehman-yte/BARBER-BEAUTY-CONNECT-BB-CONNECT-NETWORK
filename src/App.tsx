import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ExplorePage from './pages/ExplorePage';
import ShopDetail from './pages/ShopDetail';
import CustomerDashboard from './pages/CustomerDashboard';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerRegistration from './pages/PartnerRegistration';
import PartnerAuth from './pages/PartnerAuth';
import PartnerSignIn from './pages/PartnerSignIn';
import ForgotPassword from './pages/ForgotPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import CookiesPolicy from './pages/CookiesPolicy';
import AdminDashboard from './pages/AdminDashboard';
import AdminGateway from './pages/AdminGateway';
import ShopPage from './pages/ShopPage';
import CheckoutPage from './pages/CheckoutPage';
import MyShopping from './pages/MyShopping';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// --- 404 Component ---
const NotFound: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-10">
    <h1 className="text-6xl font-serif font-bold text-charcoal mb-4">404</h1>
    <p className="text-gray-500 uppercase tracking-widest text-xs">The requested gateway does not exist.</p>
    <Navigate to="/" replace />
  </div>
);

// --- Protected Route Helper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'customer' | 'partner' | 'admin' }> = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  
  const location = useLocation();
  
  if (loading) return null; 
  if (!user) {
    if (allowedRole === 'admin') return <Navigate to="/admin-login" replace />;
    // Redirect to Landing Page and trigger modal via search param, passing intended path
    return <Navigate to="/?auth=true" state={{ from: location.pathname }} replace />;
  }

  // Mandatory Onboarding Check for Partners
  if (user.role === 'partner' && (user.status === null || user.status === undefined) && !window.location.hash.includes('/onboarding') && !window.location.hash.includes('/shop') && !window.location.hash.includes('/checkout')) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (user.role === 'partner') {
      // STRICT PORTAL BOUNCE: Never allow partner in customer space
      return <Navigate to={user.status === null ? "/onboarding" : "/partner-dashboard"} replace />;
    }
    return <Navigate to="/customer-dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={
        user?.role === 'admin' ? <Navigate to="/admin-dashboard" replace /> :
        user?.role === 'partner' ? (user.status === null ? <Navigate to="/onboarding" replace /> : <Navigate to="/partner-dashboard" replace />) : 
        user?.role === 'customer' ? <Navigate to="/customer-dashboard" replace /> :
        <LandingPage />
      } />
      <Route path="/auth" element={
        user ? <Navigate to={
          user.role === 'admin' ? "/admin-dashboard" :
          user.role === 'partner' ? (user.status === null ? "/onboarding" : "/partner-dashboard") : 
          "/customer-dashboard"
        } replace /> : <AuthPage />
      } />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/cookies" element={<CookiesPolicy />} />
      
      {/* Shared and Customer Routes */}
      <Route path="/explore" element={<ProtectedRoute allowedRole="customer"><ExplorePage /></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="/shop/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute allowedRole="customer"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/my-shopping" element={<ProtectedRoute allowedRole="customer"><MyShopping /></ProtectedRoute>} />
      <Route path="/dashboard" element={<Navigate to="/customer-dashboard" replace />} />
      
      {/* Partner Routes */}
      <Route path="/onboarding" element={<ProtectedRoute allowedRole="partner"><PartnerRegistration /></ProtectedRoute>} />
      <Route path="/partner-auth" element={user ? <Navigate to={
        user.role === 'admin' ? "/admin-dashboard" :
        user.role === 'partner' ? (user.status === null ? "/onboarding" : "/partner-dashboard") : 
        "/customer-dashboard"
      } replace /> : <PartnerAuth />} />
      <Route path="/partner-signin" element={user ? <Navigate to={
        user.role === 'admin' ? "/admin-dashboard" :
        user.role === 'partner' ? (user.status === null ? "/onboarding" : "/partner-dashboard") : 
        "/customer-dashboard"
      } replace /> : <PartnerSignIn />} />
      <Route path="/partner-registration" element={user ? <Navigate to={
        user.role === 'admin' ? "/admin-dashboard" :
        user.role === 'partner' ? "/onboarding" : 
        "/customer-dashboard"
      } replace /> : <PartnerRegistration />} />
      <Route path="/partner-dashboard" element={<ProtectedRoute allowedRole="partner"><PartnerDashboard /></ProtectedRoute>} />
      
      {/* Admin Gateway */}
      <Route path="/admin-login" element={user ? <Navigate to={user.role === 'admin' ? "/admin-dashboard" : "/customer-dashboard"} replace /> : <AdminGateway />} />
      <Route path="/admin-dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/404" element={<NotFound />} />
      
      {/* Fallbacks */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    // SILENCE CONSOLE: Clear all previous network/permission errors for a clean test UI
    console.clear();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <HashRouter>
          <div className="min-h-screen flex flex-col bg-white">
            <Navbar />
            <main className="flex-grow w-full max-w-[1440px] mx-auto px-[5%] pt-[5rem]">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </HashRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;