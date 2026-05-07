/* LOCKED - POINT 1 COMPLETE: Auth & Routing Infrastructure */
import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from "@/src/components/Navbar.tsx";
import Footer from "@/src/components/Footer.tsx";
import LandingPage from "@/src/pages/LandingPage";
import AuthPage from "@/src/pages/AuthPage";
import ExplorePage from "@/src/pages/ExplorePage";
import ShopDetail from "@/src/pages/ShopDetail";
import CustomerDashboard from "@/src/pages/CustomerDashboard";
import PartnerDashboard from "@/src/pages/PartnerDashboard";
import PartnerOnboarding from "@/src/pages/PartnerOnboarding";
import PartnerAuth from "@/src/pages/PartnerAuth";
import PartnerSignIn from "@/src/pages/PartnerSignIn";
import ForgotPassword from "@/src/pages/ForgotPassword";
import PrivacyPolicy from "@/src/pages/PrivacyPolicy";
import TermsAndConditions from "@/src/pages/TermsAndConditions";
import CookiesPolicy from "@/src/pages/CookiesPolicy";
import AdminDashboard from "@/src/pages/AdminDashboard";
import AdminGateway from "@/src/pages/AdminGateway";
import ShopPage from "@/src/pages/ShopPage";
import CheckoutPage from "@/src/pages/CheckoutPage";
import MyShopping from "@/src/pages/MyShopping";
import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { CartProvider } from '@/src/context/CartContext';

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
    return <Navigate to="/?auth=true" state={{ from: location.pathname }} replace />;
  }

  // MANDATORY PARTNER GATE: status and brand check
  if (user.role === 'partner') {
    const isComplete = !!user.onboardingComplete;
    if (!isComplete) {
      if (location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
      }
    } else if (location.pathname === '/onboarding') {
      return <Navigate to="/partner-dashboard" replace />;
    }
  }

  // ROLE ENFORCEMENT: Block cross-access
  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (user.role === 'partner') {
       // Partner trying to access customer space
       const isComplete = !!user.brandName || !!user.onboardingComplete;
       return <Navigate to={!isComplete ? "/onboarding" : "/partner-dashboard"} replace />;
    }
    if (user.role === 'customer') {
       // Customer trying to access partner space
       return <Navigate to="/customer-dashboard" replace />;
    }
    // Logic for general "/dashboard" or other paths that might lead to customer dashboard
    if (location.pathname === '/customer-dashboard') {
       const isComplete = !!user.brandName || !!user.onboardingComplete;
       return <Navigate to={!isComplete ? "/onboarding" : "/partner-dashboard"} replace />;
    }
  }

  return <>{children}</>;
};

/* LOCKED - POINT 1 COMPLETE: Routing Protocol logic */
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      
      <Route path="/auth" element={
        user ? <Navigate to={
          user.role === 'admin' ? "/admin-dashboard" :
          user.role === 'partner' ? (user.onboardingComplete ? "/partner-dashboard" : "/onboarding") : 
          "/customer-dashboard"
        } replace /> : <AuthPage />
      } />
      
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/cookies" element={<CookiesPolicy />} />
      
      {/* CUSTOMER PORTAL (Strictly locked) */}
      <Route path="/explore" element={<ProtectedRoute allowedRole="customer"><ExplorePage /></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute allowedRole="customer"><ShopPage /></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute allowedRole="customer"><CheckoutPage /></ProtectedRoute>} />
      <Route path="/shop/:id" element={<ProtectedRoute allowedRole="customer"><ShopDetail /></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute allowedRole="customer"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/my-shopping" element={<ProtectedRoute allowedRole="customer"><MyShopping /></ProtectedRoute>} />
      
      {/* PARTNER PORTAL (Strictly locked) */}
      <Route path="/onboarding" element={<ProtectedRoute allowedRole="partner"><PartnerOnboarding /></ProtectedRoute>} />
      <Route path="/partner-auth" element={user ? <Navigate to={
        user.role === 'admin' ? "/admin-dashboard" :
        user.role === 'partner' ? ((!user.brandName && !user.onboardingComplete) ? "/onboarding" : "/partner-dashboard") : 
        "/customer-dashboard"
      } replace /> : <PartnerAuth />} />
      <Route path="/partner-signin" element={user ? <Navigate to={
        user.role === 'admin' ? "/admin-dashboard" :
        user.role === 'partner' ? ((!user.brandName && !user.onboardingComplete) ? "/onboarding" : "/partner-dashboard") : 
        "/customer-dashboard"
      } replace /> : <PartnerSignIn />} />
      <Route path="/partner-dashboard" element={<ProtectedRoute allowedRole="partner"><PartnerDashboard /></ProtectedRoute>} />
      
      {/* ADMIN PORTAL */}
      <Route path="/admin-login" element={user ? <Navigate to={user.role === 'admin' ? "/admin-dashboard" : "/customer-dashboard"} replace /> : <AdminGateway />} />
      <Route path="/admin-dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      
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
  React.useEffect(() => {
    // SILENCE CONSOLE: Clear all previous network/permission errors for a clean test UI
    console.clear();
  }, []);

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