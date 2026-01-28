
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import ExplorePage from './components/ExplorePage';
import ShopDetail from './components/ShopDetail';
import CustomerDashboard from './components/CustomerDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- Protected Route Helper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: 'customer' | 'partner' }> = ({ children, role }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/auth" replace />;
  
  // If role is specified, check it
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // Handle Pending Partners
  if (user.role === 'partner' && user.status === 'pending') {
    // Keep pending partners on landing with a notification (handled in UI)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      
      {/* Private Routes - Only logged in customers can explore */}
      <Route path="/explore" element={<ProtectedRoute role="customer"><ExplorePage /></ProtectedRoute>} />
      <Route path="/shop/:id" element={<ProtectedRoute role="customer"><ShopDetail /></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
      
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
