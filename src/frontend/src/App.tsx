import { Toaster } from "@/components/ui/sonner";
import type React from "react";
import { useEffect } from "react";
import NotificationBar from "./components/NotificationBar";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { BrowserRouter, Navigate, Route, Routes } from "./lib/router";
import { UserRole } from "./types/appTypes";
import { runAutoCleanup } from "./utils/autoCleanup";

import AIEnhancerPage from "./pages/AIEnhancerPage";
import AboutPage from "./pages/AboutPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminPinPage from "./pages/AdminPinPage";
import AgeCalculatorPage from "./pages/AgeCalculatorPage";
import CategoryPage from "./pages/CategoryPage";
import ChoosePlanPage from "./pages/ChoosePlanPage";
import DeliveryAppPage from "./pages/DeliveryAppPage";
import DeliveryOrderPage from "./pages/DeliveryOrderPage";
import DeliveryRegisterPage from "./pages/DeliveryRegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GameComingSoonPage from "./pages/GameComingSoonPage";
import HomePage from "./pages/HomePage";
import ImageResizerPage from "./pages/ImageResizerPage";
import JobsPage from "./pages/JobsPage";
import LoginPage from "./pages/LoginPage";
import ManagerDashboardPage from "./pages/ManagerDashboardPage";
import ManagerLoginPage from "./pages/ManagerLoginPage";
import NewsPage from "./pages/NewsPage";
import OrdersPage from "./pages/OrdersPage";
import PercentageCalculatorPage from "./pages/PercentageCalculatorPage";
import PrivacyPage from "./pages/PrivacyPage";
import ProviderDashboardPage from "./pages/ProviderDashboardPage";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import ProviderSubscribePage from "./pages/ProviderSubscribePage";
import ScrapCalculatorPage from "./pages/ScrapCalculatorPage";
import SearchPage from "./pages/SearchPage";
import SignupPage from "./pages/SignupPage";
import TermsPage from "./pages/TermsPage";
import UdhaarBookPage from "./pages/UdhaarBookPage";

function ProviderRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-primary">Load Ho Raha Hai...</span>
      </div>
    );
  if (!user || user.role !== UserRole.provider)
    return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const adminVerified = sessionStorage.getItem("adminVerified") === "true";
  if (!adminVerified) return <Navigate to="/admin/pin" replace />;
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-primary">Load Ho Raha Hai...</span>
      </div>
    );
  if (!user || user.role !== "manager")
    return <Navigate to="/manager-login" replace />;
  return <>{children}</>;
}

/** Udhaar Book is only for providers, admins, and super-admins. */
function UdhaarRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isFullAdmin } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-primary">Load Ho Raha Hai...</span>
      </div>
    );
  const isProvider = user?.role === UserRole.provider;
  if (!user || (!isProvider && !isFullAdmin))
    return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  useEffect(() => {
    // Apply saved theme color
    const savedColor = localStorage.getItem("dz_theme_color");
    if (savedColor) {
      document.documentElement.style.setProperty("--dz-accent", savedColor);
    }
    // Run auto-cleanup on app load — purges old orders/chats only
    runAutoCleanup();
  }, []);

  return (
    <>
      {/* Top notification bar — only visible when enabled by admin */}
      <NotificationBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/game" element={<GameComingSoonPage />} />
        <Route path="/category/:categoryName" element={<CategoryPage />} />
        <Route path="/provider/:userId" element={<ProviderProfilePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/scrap-calculator" element={<ScrapCalculatorPage />} />
        <Route
          path="/udhaar-book"
          element={
            <UdhaarRoute>
              <UdhaarBookPage />
            </UdhaarRoute>
          }
        />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/image-resizer" element={<ImageResizerPage />} />
        <Route path="/ai-enhancer" element={<AIEnhancerPage />} />
        {/* Student Tools */}
        <Route path="/age-calculator" element={<AgeCalculatorPage />} />
        <Route
          path="/percentage-calculator"
          element={<PercentageCalculatorPage />}
        />
        <Route path="/manager-login" element={<ManagerLoginPage />} />
        {/* Delivery Module */}
        <Route path="/delivery-register" element={<DeliveryRegisterPage />} />
        <Route path="/delivery-app" element={<DeliveryAppPage />} />
        <Route path="/delivery-order" element={<DeliveryOrderPage />} />
        <Route
          path="/manager"
          element={
            <ManagerRoute>
              <ManagerDashboardPage />
            </ManagerRoute>
          }
        />
        <Route
          path="/provider/choose-plan"
          element={
            <ProviderRoute>
              <ChoosePlanPage />
            </ProviderRoute>
          }
        />
        <Route
          path="/provider/subscribe"
          element={
            <ProviderRoute>
              <ProviderSubscribePage />
            </ProviderRoute>
          }
        />
        <Route
          path="/provider/dashboard"
          element={
            <ProviderRoute>
              <ProviderDashboardPage />
            </ProviderRoute>
          }
        />
        <Route path="/admin/pin" element={<AdminPinPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <SplashScreen>
            <AppRoutes />
          </SplashScreen>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
