/* UNIFIED AUTHENTICATION & ROUTING SYSTEM v4.0 */
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ExplorePage from "./pages/ExplorePage";
import ShopDetail from "./pages/ShopDetail";
import CustomerDashboard from "./pages/CustomerDashboard";
import PartnerDashboard from "./pages/PartnerDashboard";
import PartnerOnboarding from "./pages/PartnerOnboarding";
import ForgotPassword from "./pages/ForgotPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import CookiesPolicy from "./pages/CookiesPolicy";
import AdminDashboard from "./pages/AdminDashboard";
import ShopPage from "./pages/ShopPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyShopping from "./pages/MyShopping";
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
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: 'customer' | 'partner' | 'admin' | string[] }> = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-bbBlue border-t-transparent rounded-full animate-spin"></div>
    </div>
  ); 

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  const isAllowed = !allowedRole || 
    (Array.isArray(allowedRole) ? allowedRole.includes(user.role!) : user.role === allowedRole);

  if (user.role === 'partner' && !user.onboardingComplete && location.pathname === '/partner/dashboard') {
    // If they are on dashboard but not complete, we still allow it per user request
    // However, if they are new (no onboarding at all), they use the join network button
  }

  if (allowedRole && !isAllowed) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'partner') return <Navigate to="/partner/dashboard" replace />;
    if (user.role === 'customer') return <Navigate to="/customer/explore" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      
      {/* UNIFIED AUTH PAGE */}
      <Route path="/auth" element={
        user ? <Navigate to={
          user.role === 'admin' ? "/admin/dashboard" :
          user.role === 'partner' ? (user.onboardingComplete ? "/partner/dashboard" : "/onboarding") : 
          "/customer/explore"
        } replace /> : <AuthPage />
      } />
      
      {/* REDIRECTS FOR LEGACY PATHS */}
      <Route path="/admin-login" element={<Navigate to="/auth?role=admin" replace />} />
      <Route path="/partner-auth" element={<Navigate to="/auth?role=partner" replace />} />
      <Route path="/partner-signup" element={<Navigate to="/onboarding" replace />} />
      <Route path="/partner/signup" element={<Navigate to="/onboarding" replace />} />
      
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/cookies" element={<CookiesPolicy />} />
      
      <Route path="/shop" element={<ProtectedRoute allowedRole={['customer', 'admin']}><ShopPage /></ProtectedRoute>} />
      
      {/* CUSTOMER PORTAL */}
      <Route path="/customer/explore" element={<ProtectedRoute allowedRole={['customer', 'admin']}><ExplorePage /></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute allowedRole="customer"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/my-shopping" element={<ProtectedRoute allowedRole={['customer', 'admin']}><MyShopping /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute allowedRole={['customer', 'admin']}><CheckoutPage /></ProtectedRoute>} />
      <Route path="/shop/:id" element={<ProtectedRoute allowedRole={['customer', 'admin']}><ShopDetail /></ProtectedRoute>} />
      
      {/* PARTNER PORTAL */}
      <Route path="/onboarding" element={<PartnerOnboarding />} />
      <Route path="/partner/dashboard" element={<ProtectedRoute allowedRole="partner"><PartnerDashboard /></ProtectedRoute>} />
      <Route path="/partner-dashboard" element={<Navigate to="/partner/dashboard" replace />} />
      
      {/* ADMIN PORTAL */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      
      {/* FALLBACKS */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

const LayoutWrapper: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-grow w-full pt-[5rem]">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <HashRouter>
          <LayoutWrapper />
        </HashRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
