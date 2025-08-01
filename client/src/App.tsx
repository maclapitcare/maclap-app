import { Switch, Route, Redirect, useLocation, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { BottomNav } from "@/components/bottom-nav";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { OfflineIndicator } from "@/components/offline-indicator";
import { setupAutoSync } from "@/lib/offline";
import { useState, useEffect } from "react";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Notes from "@/pages/notes";
import Settings from "@/pages/settings";
// Keep other pages for advanced menu access
import PendingPayments from "@/pages/pending-payments";
import MeterReadings from "@/pages/meter-readings";
import DeleteRecords from "@/pages/delete-records";

// Custom hook for GitHub Pages hash-based routing
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
  const [loading, setLoading] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-16 min-h-screen">
        <Switch>
          <Route path="/" component={Transactions} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/meter-readings" component={MeterReadings} />
          <Route path="/notes" component={Notes} />
          <Route path="/settings" component={Settings} />
          {/* Legacy routes for compatibility */}
          <Route path="/pending" component={PendingPayments} />
          <Route path="/meter" component={MeterReadings} />
          <Route path="/delete" component={DeleteRecords} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </main>
      <BottomNav />
      <OfflineIndicator />
      <LoadingOverlay isVisible={loading} message="Loading..." />
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Setup offline functionality when app loads
    if (isAuthenticated()) {
      setupAutoSync();
    }
  }, [isAuthenticated]);

  // Use hash-based routing for GitHub Pages
  const hashLocation = () => window.location.hash.slice(1) || "/";
  const navigate = (to: string) => {
    window.location.hash = to;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router hook={useHashLocation}>
          <Toaster />
          {isAuthenticated() ? <AuthenticatedApp /> : <Login />}
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
