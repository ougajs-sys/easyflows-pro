import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import bugsnagClient from "@/lib/bugsnag";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { NotificationsProvider } from "@/hooks/useNotifications";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import queryClient from "@/config/react-query";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Admin = lazy(() => import("./pages/Admin"));
const Delivery = lazy(() => import("./pages/Delivery"));
const Profile = lazy(() => import("./pages/Profile"));
const Clients = lazy(() => import("./pages/Clients"));
const Payments = lazy(() => import("./pages/Payments"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const Notifications = lazy(() => import("./pages/Notifications"));
const SupervisorDashboard = lazy(() => import("./pages/SupervisorDashboard"));
const Synthesis = lazy(() => import("./pages/Synthesis"));
const Stock = lazy(() => import("./pages/Stock"));
const Training = lazy(() => import("./pages/Training"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Planning = lazy(() => import("./pages/Planning"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Roles = lazy(() => import("./pages/Roles"));
const WebhookTest = lazy(() => import("./pages/WebhookTest"));
const EmbedOrderForm = lazy(() => import("./pages/EmbedOrderForm"));
const EmbedFormsAdmin = lazy(() => import("./pages/EmbedFormsAdmin"));
const Chat = lazy(() => import("./pages/Chat"));
const AIAgent = lazy(() => import("./pages/AIAgent"));
const RevenueTracking = lazy(() => import("./pages/RevenueTracking"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Helper function to check if error should be ignored (non-critical)
const isNonCriticalError = (error: Error): boolean => {
  const nonCriticalPatterns = [
    /ResizeObserver/i,
    /Loading chunk/i,
    /ChunkLoadError/i,
    /Failed to fetch dynamically imported module/i,
    /NetworkError/i,
    /AbortError/i,
    /NotFoundError.*removeChild/i,
    /NotFoundError.*Node/i,
    /Invalid Date/i,
    /CSP/i,
    /Content Security Policy/i,
    /Script error/i,
    /translate_http/i,
  ];
  
  const errorMessage = error.message || String(error);
  return nonCriticalPatterns.some(pattern => pattern.test(errorMessage));
};

interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
  resetKey: string;
  queryClient?: typeof queryClient;
}

class NavigationErrorBoundary extends React.Component<
  NavigationErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    // Don't show error screen for non-critical errors
    if (isNonCriticalError(error)) {
      console.warn('Non-critical error in getDerivedStateFromError (logged only):', error.message);
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with additional context
    bugsnagClient.notify(error, (event) => {
      event.context = "NavigationErrorBoundary";
      event.addMetadata("errorInfo", {
        componentStack: errorInfo.componentStack,
      });
      event.addMetadata("location", {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    });
    
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
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

    // Check if this is a non-critical error we should just log
    if (isNonCriticalError(event.error)) {
      console.warn('Non-critical error (logged only):', event.error.message);
      bugsnagClient.notify(event.error, (bugEvent) => {
        bugEvent.context = "window.error.non-critical";
      });
      return; // Don't show error screen
    }

    // Log error with context
    bugsnagClient.notify(event.error, (bugEvent) => {
      bugEvent.context = "window.error";
      bugEvent.addMetadata("location", {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
      bugEvent.addMetadata("event", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
    
    if (!this.state.hasError) {
      this.setState({ hasError: true });
    }
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!(event.reason instanceof Error)) {
      return;
    }

    // Check if this is a non-critical error we should just log
    if (isNonCriticalError(event.reason)) {
      console.warn('Non-critical rejection (logged only):', event.reason.message);
      bugsnagClient.notify(event.reason, (bugEvent) => {
        bugEvent.context = "unhandledrejection.non-critical";
      });
      return; // Don't show error screen
    }

    // Log error with context
    bugsnagClient.notify(event.reason, (bugEvent) => {
      bugEvent.context = "unhandledrejection";
      bugEvent.addMetadata("location", {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
      bugEvent.addMetadata("promise", {
        reason: String(event.reason),
      });
    });
    
    if (!this.state.hasError) {
      this.setState({ hasError: true });
    }
  };

  handleRetry = () => {
    // Clear React Query cache to prevent stale data issues
    if (this.props.queryClient) {
      console.log("Clearing React Query cache before retry...");
      this.props.queryClient.clear();
    }
    
    // Reset error state
    this.setState({ hasError: false });
    
    // Log recovery attempt
    bugsnagClient.leaveBreadcrumb("User initiated error recovery from ErrorBoundary");
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

  return <NavigationErrorBoundary resetKey={location.key} queryClient={queryClient}>{children}</NavigationErrorBoundary>;
}

const suspenseFallback = (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

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
                  <Suspense fallback={suspenseFallback}>
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
                      <Route
                        path="/revenue-tracking"
                        element={
                          <ProtectedRoute allowedRoles={['administrateur', 'superviseur']}>
                            <RevenueTracking />
                          </ProtectedRoute>
                        }
                      />
                      {/* Public embeddable order form - no auth required */}
                      <Route path="/embed/order" element={<EmbedOrderForm />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </RouteErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
);

export default App;
