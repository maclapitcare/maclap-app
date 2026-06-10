import { Switch, Route, Redirect, useLocation, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineIndicator } from "@/components/offline-indicator";
import { setupAutoSync } from "@/lib/offline";
import { useState, useEffect, lazy, Suspense } from "react";

// Lazy-loaded pages — only downloaded when first visited
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Transactions = lazy(() => import("@/pages/transactions"));
const Notes = lazy(() => import("@/pages/notes"));
const Settings = lazy(() => import("@/pages/settings"));
const PendingPayments = lazy(() => import("@/pages/pending-payments"));
const MeterReadings = lazy(() => import("@/pages/meter-readings"));
const DeleteRecords = lazy(() => import("@/pages/delete-records"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function useHashLocation(): [string, (to: string) => void] {
  const [location, setLocation] = useState(window.location.hash.slice(1) || "/");

  useEffect(() => {
    const handleHashChange = () => {
      setLocation(window.location.hash.slice(1) || "/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (to: string) => {
    window.location.hash = to;
  };

  return [location, navigate];
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-16 min-h-screen">
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Transactions} />
            <Route path="/transactions" component={Transactions} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/meter-readings" component={MeterReadings} />
            <Route path="/notes" component={Notes} />
            <Route path="/settings" component={Settings} />
            <Route path="/pending" component={PendingPayments} />
            <Route path="/meter" component={MeterReadings} />
            <Route path="/delete" component={DeleteRecords} />
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
        </Suspense>
      </main>
      <BottomNav />
      <OfflineIndicator />
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated()) {
      setupAutoSync();
    }
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router hook={useHashLocation}>
          <Toaster />
          <Suspense fallback={<PageLoader />}>
            {isAuthenticated() ? <AuthenticatedApp /> : <Login />}
          </Suspense>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
