import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import LandingPage from '@/pages/LandingPage';

export function ConditionalHome() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
}
