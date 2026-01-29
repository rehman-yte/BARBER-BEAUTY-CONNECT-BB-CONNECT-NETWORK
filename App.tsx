
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExplorePage from './components/ExplorePage';
import ShopDetail from './components/ShopDetail';
import CustomerDashboard from './pages/CustomerDashboard';
import PartnerDashboard from './pages/PartnerDashboard';
import PartnerRegistration from './components/PartnerRegistration';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import CookiesPolicy from './components/CookiesPolicy';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- Protected Route Helper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'customer' | 'partner' }> = ({ children, role }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; 
  if (!user) return <Navigate to="/auth" replace />;
  
  if (role && user.role !== role) {
    // If a partner tries to access a customer route, they go to partner dashboard, not home.
    if (user.role === 'partner') return <Navigate to="/partner-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      {/* Public / Landing Redirect for Partners */}
      <Route 
        path="/" 
        element={user?.role === 'partner' ? <Navigate to="/partner-dashboard" replace /> : <LandingPage />} 
      />
      
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/cookies" element={<CookiesPolicy />} />
      
      {/* Customer Routes (LOCKED) */}
      <Route path="/explore" element={<ProtectedRoute role="customer"><ExplorePage /></ProtectedRoute>} />
      <Route path="/shop/:id" element={<ProtectedRoute role="customer"><ShopDetail /></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
      
      {/* Partner Routes */}
      <Route path="/partner-register" element={<ProtectedRoute role="partner"><PartnerRegistration /></ProtectedRoute>} />
      <Route path="/partner-dashboard" element={<ProtectedRoute role="partner"><PartnerDashboard /></ProtectedRoute>} />
      
      {/* Fallbacks */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-white">
          <Navbar />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
