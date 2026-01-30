import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExplorePage from './components/ExplorePage';
import ShopDetail from './components/ShopDetail';
import CustomerDashboard from './pages/CustomerDashboard';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import CookiesPolicy from './components/CookiesPolicy';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- Protected Route Helper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; 
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/cookies" element={<CookiesPolicy />} />
      
      {/* Customer Routes (LOCKED) */}
      <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
      <Route path="/shop/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
      
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