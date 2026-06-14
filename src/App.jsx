import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Toaster as Sonner } from 'sonner';

import KitchenLayout from './components/layout/KitchenLayout';
import KCDashboard from './pages/KCDashboard';
import KCChecklist from './pages/KCChecklist';
import KCHistory from './pages/KCHistory';
import KCSessionDetail from './pages/KCSessionDetail';
import KCSettings from './pages/KCSettings';
import KCTempLog from './pages/KCTempLog';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import KCLogin from './pages/KCLogin';

const PUBLIC_PATHS = new Set(['/login', '/pricing', '/privacy', '/terms', '/cookies']);

const AuthenticatedApp = () => {
  const { pathname } = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading KitchenCheck...</span>
        </div>
      </div>
    );
  }

  if (pathname === '/login') {
    return <KCLogin />;
  }

  if (!isAuthenticated && !PUBLIC_PATHS.has(pathname)) {
    return <Navigate to="/login" replace />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      <Route element={<KitchenLayout />}>
        <Route path="/" element={<KCDashboard />} />
        <Route path="/checklist/:templateId" element={<KCChecklist />} />
        <Route path="/history" element={<KCHistory />} />
        <Route path="/history/:sessionId" element={<KCSessionDetail />} />
        <Route path="/settings" element={<KCSettings />} />
        <Route path="/temp-log" element={<KCTempLog />} />
      </Route>
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/login" element={<KCLogin />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <Sonner richColors position="top-center" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App