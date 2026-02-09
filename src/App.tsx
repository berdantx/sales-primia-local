import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { FilterProvider } from "@/contexts/FilterContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ConditionalHome } from "@/components/auth/ConditionalHome";
import { DynamicPwaIconProvider } from "@/components/pwa/DynamicPwaIconProvider";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Upload from "./pages/Upload";
import Transactions from "./pages/Transactions";
import TmbTransactions from "./pages/TmbTransactions";
import EduzzTransactions from "./pages/EduzzTransactions";
import ComparativeDashboard from "./pages/ComparativeDashboard";
import Goals from "./pages/Goals";
import Settings from "./pages/Settings";
import WebhookLogs from "./pages/WebhookLogs";
import WebhookConfig from "./pages/WebhookConfig";
import WebhookDocs from "./pages/WebhookDocs";
import Users from "./pages/Users";
import Clients from "./pages/Clients";
import Leads from "./pages/Leads";
import LeadsFunnel from "./pages/LeadsFunnel";
import AcceptInvite from "./pages/AcceptInvite";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FilterProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DynamicPwaIconProvider />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<ConditionalHome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/tmb-transactions" element={<TmbTransactions />} />
            <Route path="/eduzz-transactions" element={<EduzzTransactions />} />
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
            <Route path="/webhook-config" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <WebhookConfig />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['master']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute allowedRoles={['master']}>
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="/webhook-docs" element={
              <ProtectedRoute allowedRoles={['master', 'admin']}>
                <WebhookDocs />
              </ProtectedRoute>
            } />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/funnel" element={<LeadsFunnel />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/landing" element={<LandingPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FilterProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
