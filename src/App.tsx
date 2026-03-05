import { Suspense, lazy } from "react";
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

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Upload = lazy(() => import("./pages/Upload"));
const Transactions = lazy(() => import("./pages/Transactions"));
const TmbTransactions = lazy(() => import("./pages/TmbTransactions"));
const TmbCancellations = lazy(() => import("./pages/TmbCancellations"));
const EduzzTransactions = lazy(() => import("./pages/EduzzTransactions"));
const EduzzCancellations = lazy(() => import("./pages/EduzzCancellations"));
const ComparativeDashboard = lazy(() => import("./pages/ComparativeDashboard"));
const Goals = lazy(() => import("./pages/Goals"));
const Settings = lazy(() => import("./pages/Settings"));
const WebhookLogs = lazy(() => import("./pages/WebhookLogs"));
const WebhookConfig = lazy(() => import("./pages/WebhookConfig"));
const WebhookDocs = lazy(() => import("./pages/WebhookDocs"));
const Users = lazy(() => import("./pages/Users"));
const Clients = lazy(() => import("./pages/Clients"));
import Leads from "./pages/Leads";
const LeadsFunnel = lazy(() => import("./pages/LeadsFunnel"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const DuplicateAudit = lazy(() => import("./pages/DuplicateAudit"));
const BackupDashboard = lazy(() => import("./pages/BackupDashboard"));
const BackupTestHarness = lazy(() => import("./pages/BackupTestHarness"));
const CorsDiagnostics = lazy(() => import("./pages/CorsDiagnostics"));
const Coproduction = lazy(() => import("./pages/Coproduction"));
const InternationalSales = lazy(() => import("./pages/InternationalSales"));
const IGPLExplainer = lazy(() => import("./pages/IGPLExplainer"));
const CispayTransactions = lazy(() => import("./pages/CispayTransactions"));

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
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              }
            >
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
                <Route path="/tmb-cancellations" element={<TmbCancellations />} />
                <Route path="/eduzz-cancellations" element={<EduzzCancellations />} />
                <Route path="/eduzz-transactions" element={<EduzzTransactions />} />
                <Route path="/cispay-transactions" element={<CispayTransactions />} />
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
                <Route path="/coproduction" element={<Coproduction />} />
                <Route path="/international-sales" element={<InternationalSales />} />
                <Route path="/igpl" element={<IGPLExplainer />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/leads/funnel" element={<LeadsFunnel />} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/duplicate-audit" element={
                  <ProtectedRoute allowedRoles={['master', 'admin']}>
                    <DuplicateAudit />
                  </ProtectedRoute>
                } />
                <Route path="/backup-dashboard" element={
                  <ProtectedRoute allowedRoles={['master']}>
                    <BackupDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/backup-test" element={
                  <ProtectedRoute allowedRoles={['master']}>
                    <BackupTestHarness />
                  </ProtectedRoute>
                } />
                <Route path="/cors-diagnostics" element={
                  <ProtectedRoute allowedRoles={['master']}>
                    <CorsDiagnostics />
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </FilterProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
