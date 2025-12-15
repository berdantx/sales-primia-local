import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Transactions from "./pages/Transactions";
import TmbTransactions from "./pages/TmbTransactions";
import ComparativeDashboard from "./pages/ComparativeDashboard";
import Goals from "./pages/Goals";
import Settings from "./pages/Settings";
import WebhookLogs from "./pages/WebhookLogs";
import Users from "./pages/Users";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/tmb-transactions" element={<TmbTransactions />} />
            <Route path="/comparative" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <ComparativeDashboard />
              </ProtectedRoute>
            } />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/webhook-logs" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <WebhookLogs />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['master']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
