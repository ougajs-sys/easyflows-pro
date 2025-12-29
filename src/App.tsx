import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ModulePage from "./pages/ModulePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/roles" element={<ModulePage />} />
          <Route path="/supervisor" element={<ModulePage />} />
          <Route path="/admin" element={<ModulePage />} />
          <Route path="/delivery" element={<ModulePage />} />
          <Route path="/stock" element={<ModulePage />} />
          <Route path="/notifications" element={<ModulePage />} />
          <Route path="/payment" element={<ModulePage />} />
          <Route path="/clients" element={<ModulePage />} />
          <Route path="/utb" element={<ModulePage />} />
          <Route path="/retargeting" element={<ModulePage />} />
          <Route path="/synthesis" element={<ModulePage />} />
          <Route path="/planning" element={<ModulePage />} />
          <Route path="/training" element={<ModulePage />} />
          <Route path="/campaigns" element={<ModulePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
