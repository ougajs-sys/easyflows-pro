import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ModulePage from "./pages/ModulePage";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Delivery from "./pages/Delivery";
import Profile from "./pages/Profile";
import Clients from "./pages/Clients";
import Payments from "./pages/Payments";
import FollowUps from "./pages/FollowUps";
import Notifications from "./pages/Notifications";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import Synthesis from "./pages/Synthesis";
import Stock from "./pages/Stock";
import Training from "./pages/Training";
import Integrations from "./pages/Integrations";
import Planning from "./pages/Planning";
import Campaigns from "./pages/Campaigns";
import Roles from "./pages/Roles";
import WebhookTest from "./pages/WebhookTest";
import EmbedOrderForm from "./pages/EmbedOrderForm";
import EmbedFormsAdmin from "./pages/EmbedFormsAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={['administrateur']}>
                    <Products />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute allowedRoles={['administrateur']}>
                    <Roles />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <SupervisorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['administrateur']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur', 'livreur']}>
                    <Delivery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <Stock />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={['appelant', 'superviseur', 'administrateur']}>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/utb"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <Integrations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/webhook-test"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <WebhookTest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/retargeting"
                element={
                  <ProtectedRoute allowedRoles={['appelant', 'superviseur', 'administrateur']}>
                    <FollowUps />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/synthesis"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <Synthesis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planning"
                element={
                  <ProtectedRoute>
                    <Planning />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <Campaigns />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/training"
                element={
                  <ProtectedRoute>
                    <Training />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <ModulePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/embed-forms"
                element={
                  <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                    <EmbedFormsAdmin />
                  </ProtectedRoute>
                }
              />
              {/* Public embeddable order form - no auth required */}
              <Route path="/embed/order" element={<EmbedOrderForm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
