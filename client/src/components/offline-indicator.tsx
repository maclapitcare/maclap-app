import { useState, useEffect } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { syncToFirebase, getPendingSyncCount } from "@/lib/offline";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      
      try {
        const result = await syncToFirebase();
        console.log(`Sync completed: ${result.success} success, ${result.failed} failed`);
      } catch (error) {
        console.error('Sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    const updatePendingCount = async () => {
      try {
        const count = await getPendingSyncCount();
        setPendingSync(count);
      } catch (error) {
        console.error('Error getting pending sync count:', error);
      }
    };

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count periodically
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (isSyncing) return "bg-blue-500";
    if (isOnline) return "bg-emerald-500";
    return "bg-amber-500";
  };

  const getStatusText = () => {
    if (isSyncing) return "Syncing...";
    if (isOnline) return "Online";
    return "Offline";
  };

  const getIcon = () => {
    if (isSyncing) return <Loader2 size={12} className="animate-spin" />;
    if (isOnline) return <Cloud size={12} />;
    return <CloudOff size={12} />;
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge
        className={`${getStatusColor()} text-white border-0 shadow-lg backdrop-blur-sm px-3 py-1 flex items-center space-x-2`}
      >
        {getIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
        {pendingSync > 0 && !isOnline && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {pendingSync}
          </span>
        )}
      </Badge>
    </div>
  );
}