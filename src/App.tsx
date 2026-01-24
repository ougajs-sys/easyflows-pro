import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import bugsnagClient from "@/lib/bugsnag";
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
import Chat from "./pages/Chat";
import AIAgent from "./pages/AIAgent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
  resetKey: string;
}

class NavigationErrorBoundary extends React.Component<
  NavigationErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    bugsnagClient.notify(error);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentDidUpdate(prevProps: NavigationErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleWindowError = (event: ErrorEvent) => {
    if (!(event.error instanceof Error)) {
      return;
    }

    bugsnagClient.notify(event.error);
    if (!this.state.hasError) {
      this.setState({ hasError: true });
    }
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!(event.reason instanceof Error)) {
      return;
    }

    bugsnagClient.notify(event.reason);
    if (!this.state.hasError) {
      this.setState({ hasError: true });
    }
  };

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-2xl font-semibold mb-2">Un écran a rencontré un blocage</h1>
            <p className="text-muted-foreground mb-4">
              Réessayez pour relancer l&apos;affichage sans recharger toute la page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry}>Réessayer</Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Retour au tableau de bord</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return <NavigationErrorBoundary resetKey={location.key}>{children}</NavigationErrorBoundary>;
}

const App = () => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <RouteErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['appelant', 'superviseur', 'administrateur']}>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/orders"
                      element={
                        <ProtectedRoute allowedRoles={['appelant', 'superviseur', 'administrateur']}>
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
                        <ProtectedRoute allowedRoles={['appelant', 'superviseur', 'administrateur']}>
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
                        <ProtectedRoute allowedRoles={['appelant', 'superviseur', 'administrateur']}>
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
                      path="/admin/embed-forms"
                      element={
                        <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                          <EmbedFormsAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <Chat />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ai-agent"
                      element={
                        <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                          <AIAgent />
                        </ProtectedRoute>
                      }
                    />
                    {/* Public embeddable order form - no auth required */}
                    <Route path="/embed/order" element={<EmbedOrderForm />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </RouteErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
);

export default App;
