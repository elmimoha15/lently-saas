import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnalysisProvider } from "@/contexts/AnalysisContext";
import { BillingProvider } from "@/contexts/BillingContext";
import { ProtectedRoute, PublicRoute, OnboardingRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Videos from "./pages/Videos";
import VideoAnalysis from "./pages/VideoAnalysis";
import AskAI from "./pages/AskAI";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Analyze from "./pages/Analyze";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BillingProvider>
            <AnalysisProvider>
              <Routes>
            {/* Public routes - show landing page for unauthenticated users */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/signin"
              element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Onboarding - requires auth but NOT completed onboarding */}
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <Onboarding />
                </OnboardingRoute>
              }
            />

            {/* Protected routes - require auth and completed onboarding */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos"
              element={
                <ProtectedRoute>
                  <Videos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/videos/:videoId"
              element={
                <ProtectedRoute>
                  <VideoAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AskAI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai/:videoId"
              element={
                <ProtectedRoute>
                  <AskAI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <Templates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analyze"
              element={
                <ProtectedRoute>
                  <Analyze />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AnalysisProvider>
        </BillingProvider>
      </AuthProvider>
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
